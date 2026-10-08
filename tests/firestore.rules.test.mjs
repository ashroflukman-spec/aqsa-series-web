import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, test } from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { collection, doc, getDoc, getDocs, query, setDoc, where } from "firebase/firestore";

let environment;
let publicDb;
let adminDb;

before(async () => {
  environment = await initializeTestEnvironment({
    projectId: "demo-aqsa-series-rules",
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: await readFile("firestore.rules", "utf8"),
    },
  });

  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    for (const name of ["series", "episodes", "videos"]) {
      await setDoc(doc(db, name, "published"), { isPublished: true, isDeleted: false });
      await setDoc(doc(db, name, "draft"), { isPublished: false, isDeleted: false });
      await setDoc(doc(db, name, "deleted"), { isPublished: true, isDeleted: true });
    }
    await setDoc(doc(db, "speakers", "active"), { isDeleted: false });
    await setDoc(doc(db, "speakers", "deleted"), { isDeleted: true });
  });

  publicDb = environment.unauthenticatedContext().firestore();
  adminDb = environment.authenticatedContext("admin", {
    email: "ashroflukman@gmail.com",
  }).firestore();
});

after(async () => {
  await environment?.cleanup();
});

test("public can query only published, active content", async () => {
  for (const name of ["series", "episodes", "videos"]) {
    const snapshot = await assertSucceeds(getDocs(query(
      collection(publicDb, name),
      where("isPublished", "==", true),
      where("isDeleted", "==", false)
    )));
    assert.deepEqual(snapshot.docs.map((item) => item.id), ["published"]);
    await assertFails(getDocs(collection(publicDb, name)));
    await assertFails(getDoc(doc(publicDb, name, "draft")));
    await assertFails(getDoc(doc(publicDb, name, "deleted")));
  }
});

test("public can read only active speakers", async () => {
  const snapshot = await assertSucceeds(getDocs(query(
    collection(publicDb, "speakers"),
    where("isDeleted", "==", false)
  )));
  assert.deepEqual(snapshot.docs.map((item) => item.id), ["active"]);
  await assertFails(getDoc(doc(publicDb, "speakers", "deleted")));
});

test("admin retains full read and write access", async () => {
  const snapshot = await assertSucceeds(getDocs(collection(adminDb, "series")));
  assert.equal(snapshot.size, 3);
  await assertSucceeds(setDoc(doc(adminDb, "series", "new-draft"), {
    isPublished: false,
    isDeleted: false,
  }));
  await assertFails(setDoc(doc(publicDb, "series", "public-write"), {
    isPublished: true,
    isDeleted: false,
  }));
});
