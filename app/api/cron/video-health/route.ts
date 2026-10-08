import { NextRequest, NextResponse } from "next/server";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { lookupVideoLinks, type LinkResult } from "../../../../lib/youtubeHealthServer";

export const runtime = "nodejs";
export const maxDuration = 60;

const VALID_YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

function adminFirestore() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("Akaun servis Firestore belum dikonfigurasi.");

  const credentials: unknown = JSON.parse(raw);
  if (typeof credentials !== "object" || credentials === null ||
    !("project_id" in credentials) || credentials.project_id !== "aqsa-siries" ||
    !("client_email" in credentials) || typeof credentials.client_email !== "string" ||
    !("private_key" in credentials) || typeof credentials.private_key !== "string") {
    throw new Error("Akaun servis Firestore tidak sah.");
  }

  const app = getApps()[0] ?? initializeApp({
    credential: cert({
      projectId: credentials.project_id,
      clientEmail: credentials.client_email,
      privateKey: credentials.private_key,
    }),
  });
  return getFirestore(app);
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Jadual belum dikonfigurasi." }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Tidak dibenarkan." }, { status: 401 });
  }

  try {
    const db = adminFirestore();
    const snapshot = await db.collection("videos").get();
    const videos = snapshot.docs
      .map((doc) => ({ doc, youtubeId: doc.data().youtubeId as unknown }))
      .filter(({ doc }) => doc.data().isDeleted !== true);

    const ids = [...new Set(videos
      .map(({ youtubeId }) => youtubeId)
      .filter((id): id is string => typeof id === "string" && VALID_YOUTUBE_ID.test(id)))];
    const results = new Map<string, LinkResult>();

    for (let index = 0; index < ids.length; index += 50) {
      for (const result of await lookupVideoLinks(ids.slice(index, index + 50))) {
        results.set(result.id, result);
      }
    }

    let issues = 0;
    for (let index = 0; index < videos.length; index += 400) {
      const batch = db.batch();
      for (const video of videos.slice(index, index + 400)) {
        const id = typeof video.youtubeId === "string" ? video.youtubeId : "";
        const result = results.get(id) ?? {
          status: "review" as const,
          reason: "ID YouTube tidak sah. Sila betulkan pautan video.",
        };
        if (result.status !== "ok") issues += 1;
        batch.update(video.doc.ref, {
          linkStatus: result.status,
          linkReason: result.reason,
          linkCheckedAt: FieldValue.serverTimestamp(),
          linkCheckedYoutubeId: id,
        });
      }
      await batch.commit();
    }

    return NextResponse.json({ checked: videos.length, issues }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Semakan video berjadual gagal:", error);
    return NextResponse.json({ error: "Semakan video berjadual gagal; sila semak log." }, { status: 503 });
  }
}
