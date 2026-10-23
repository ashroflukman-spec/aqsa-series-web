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
let listenerDb;
let otherListenerDb;

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
  listenerDb = environment.authenticatedContext("listener-one", {
    email: "listener@example.com",
  }).firestore();
  otherListenerDb = environment.authenticatedContext("listener-two", {
    email: "other@example.com",
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

test("listeners can save only their own profile and listening progress", async () => {
  const profile = {
    displayName: "Listener",
    email: "listener@example.com",
    interests: ["history"],
    createdAt: 100,
    updatedAt: 100,
  };
  const progress = {
    seriesId: "series-one",
    episodeId: "episode-one",
    seriesTitle: "Series",
    episodeTitle: "Episode",
    coverUrl: "",
    positionSeconds: 45,
    durationSeconds: 120,
    completed: false,
    updatedAt: 100,
  };

  await assertSucceeds(setDoc(doc(listenerDb, "users", "listener-one"), profile));
  await assertSucceeds(setDoc(doc(listenerDb, "users", "listener-one", "listening", "episode-one"), progress));
  await assertSucceeds(getDoc(doc(listenerDb, "users", "listener-one")));
  await assertSucceeds(getDocs(collection(listenerDb, "users", "listener-one", "listening")));
  await assertSucceeds(getDocs(collection(adminDb, "users")));

  await assertFails(getDoc(doc(otherListenerDb, "users", "listener-one")));
  await assertFails(getDoc(doc(otherListenerDb, "users", "listener-one", "listening", "episode-one")));
  await assertFails(setDoc(doc(otherListenerDb, "users", "listener-one"), profile));
  await assertFails(setDoc(doc(publicDb, "users", "anonymous"), profile));
  await assertFails(setDoc(doc(listenerDb, "series", "listener-draft"), {
    isPublished: true,
    isDeleted: false,
  }));
});

test("profile and progress fields are restricted", async () => {
  await assertFails(setDoc(doc(listenerDb, "users", "bad-profile"), {
    displayName: "Listener",
    email: "listener@example.com",
    interests: ["history"],
    createdAt: 100,
    updatedAt: 100,
  }));
  await assertFails(setDoc(doc(otherListenerDb, "users", "listener-two"), {
    displayName: "Other",
    email: "other@example.com",
    interests: ["unsupported"],
    createdAt: 100,
    updatedAt: 100,
  }));
  await assertFails(setDoc(doc(listenerDb, "users", "listener-one", "listening", "wrong-id"), {
    seriesId: "series-one",
    episodeId: "episode-one",
    seriesTitle: "Series",
    episodeTitle: "Episode",
    coverUrl: "",
    positionSeconds: 0,
    durationSeconds: 10,
    completed: false,
    updatedAt: 101,
  }));
});
