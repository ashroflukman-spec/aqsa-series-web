import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminFirestore } from "../../../lib/adminFirestore";
import { isAuthorizedAdmin } from "../../../lib/verifyAdminRequest";

export const runtime = "nodejs";

const SHARD_COUNT = 16;
const collectionName = "episodePlayCounterShards";
const episodeIdPattern = /^[A-Za-z0-9_-]{1,128}$/;

export async function POST(request: NextRequest) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (request.headers.get("origin") !== request.nextUrl.origin ||
      (fetchSite && fetchSite !== "same-origin") ||
      !request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ error: "Permintaan tidak sah." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const episodeId = body?.episodeId;
  if (typeof episodeId !== "string" || !episodeIdPattern.test(episodeId)) {
    return NextResponse.json({ error: "Episod tidak sah." }, { status: 400 });
  }

  try {
    const firestore = adminFirestore();
    const episode = await firestore.collection("episodes").doc(episodeId).get();
    const data = episode.data();
    if (!episode.exists || data?.isPublished !== true || data?.isDeleted === true ||
        typeof data?.audioUrl !== "string" || !data.audioUrl.trim() ||
        typeof data?.seriesId !== "string" || !data.seriesId) {
      return NextResponse.json({ error: "Episod tidak tersedia." }, { status: 404 });
    }

    const series = await firestore.collection("series").doc(data.seriesId).get();
    if (!series.exists || series.data()?.isPublished !== true || series.data()?.isDeleted === true) {
      return NextResponse.json({ error: "Siri tidak tersedia." }, { status: 404 });
    }

    const shard = Math.floor(Math.random() * SHARD_COUNT).toString().padStart(2, "0");
    await firestore.collection(collectionName).doc(`${episodeId}_${shard}`).set({
      episodeId,
      total: FieldValue.increment(1),
    }, { merge: true });
    return NextResponse.json({ counted: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Gagal merekod mainan episod:", error);
    return NextResponse.json({ error: "Statistik episod belum tersedia." }, { status: 503 });
  }
}

export async function GET(request: NextRequest) {
  if (!(await isAuthorizedAdmin(request))) {
    return NextResponse.json({ error: "Tidak dibenarkan." }, { status: 401 });
  }

  try {
    const firestore = adminFirestore();
    const [counterSnapshot, episodeSnapshot, seriesSnapshot] = await Promise.all([
      firestore.collection(collectionName).get(),
      firestore.collection("episodes").get(),
      firestore.collection("series").get(),
    ]);

    const playsByEpisode = new Map<string, number>();
    for (const item of counterSnapshot.docs) {
      const data = item.data();
      if (typeof data.episodeId !== "string") continue;
      playsByEpisode.set(data.episodeId,
        (playsByEpisode.get(data.episodeId) || 0) + Math.max(0, Number(data.total) || 0));
    }
    const seriesTitles = new Map(seriesSnapshot.docs.map((item) => [item.id, String(item.data().title || item.id)]));
    const episodes = episodeSnapshot.docs.map((item) => {
      const data = item.data();
      return {
        id: item.id,
        title: String(data.title || item.id),
        seriesTitle: seriesTitles.get(String(data.seriesId || "")) || "Siri tidak tersedia",
        plays: playsByEpisode.get(item.id) || 0,
        isDeleted: data.isDeleted === true,
        isPublished: data.isPublished === true,
      };
    }).sort((a, b) => b.plays - a.plays || a.title.localeCompare(b.title, "ms"));

    return NextResponse.json({
      total: [...playsByEpisode.values()].reduce((sum, count) => sum + count, 0),
      episodes,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Gagal membaca statistik mainan episod:", error);
    return NextResponse.json({ error: "Statistik episod belum tersedia." }, { status: 503 });
  }
}
