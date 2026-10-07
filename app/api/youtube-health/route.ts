import { NextRequest, NextResponse } from "next/server";
import { isAdminEmail } from "../../../lib/admin";
import { firebaseConfig } from "../../../lib/firebaseConfig";

type YouTubeVideo = {
  id: string;
  status?: {
    privacyStatus?: string;
    uploadStatus?: string;
    embeddable?: boolean;
  };
  contentDetails?: {
    regionRestriction?: { allowed?: string[]; blocked?: string[] };
  };
};

type LinkStatus = "ok" | "missing" | "notEmbeddable" | "regionBlocked" | "review";

function classifyVideo(video: YouTubeVideo | undefined): { status: LinkStatus; reason: string } {
  if (!video) {
    return { status: "missing", reason: "Tidak ditemui melalui YouTube API; mungkin dipadam atau dijadikan private." };
  }

  if (video.status?.privacyStatus === "private" || ["deleted", "failed", "rejected"].includes(video.status?.uploadStatus ?? "")) {
    return { status: "missing", reason: "Video tidak tersedia kepada penonton umum." };
  }

  if (video.status?.embeddable === false) {
    return { status: "notEmbeddable", reason: "Pemilik video tidak membenarkan video dimainkan dalam aplikasi." };
  }

  const region = video.contentDetails?.regionRestriction;
  if (region?.blocked?.includes("MY") || (region?.allowed && !region.allowed.includes("MY"))) {
    return { status: "regionBlocked", reason: "Video disekat untuk penonton di Malaysia." };
  }

  if (video.status?.uploadStatus && video.status.uploadStatus !== "processed") {
    return { status: "review", reason: "Video masih diproses atau belum sedia dimainkan." };
  }

  return { status: "ok", reason: "" };
}

async function isAuthorized(request: NextRequest) {
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return false;

  try {
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseConfig.apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: token }),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return false;
    const data = await response.json();
    const account = data?.users?.[0];
    return account?.disabled !== true && isAdminEmail(account?.email);
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Akses admin diperlukan." }, { status: 401 });
  }

  let ids: unknown;
  try {
    ids = (await request.json())?.ids;
  } catch {
    return NextResponse.json({ error: "Data permintaan tidak sah." }, { status: 400 });
  }

  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 50 || ids.some((id) => typeof id !== "string" || !/^[A-Za-z0-9_-]{11}$/.test(id))) {
    return NextResponse.json({ error: "Hantar antara 1 hingga 50 ID YouTube yang sah." }, { status: 400 });
  }

  const uniqueIds = [...new Set(ids as string[])];
  const youtubeKey = process.env.YOUTUBE_API_KEY;
  if (!youtubeKey) {
    return NextResponse.json({ error: "Kunci YouTube API belum dikonfigurasi." }, { status: 503 });
  }

  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "status,contentDetails");
    url.searchParams.set("id", uniqueIds.join(","));
    url.searchParams.set("key", youtubeKey);

    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15000) });
    if (!response.ok) {
      return NextResponse.json({ error: "Semakan YouTube gagal. Status video tidak diubah." }, { status: 502 });
    }

    const data = await response.json();
    if (!Array.isArray(data?.items)) {
      return NextResponse.json({ error: "Respons YouTube tidak lengkap. Status video tidak diubah." }, { status: 502 });
    }

    const found = new Map<string, YouTubeVideo>(data.items.map((item: YouTubeVideo) => [item.id, item]));
    const results = uniqueIds.map((id) => ({ id, ...classifyVideo(found.get(id)) }));

    return NextResponse.json({ results }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Tidak dapat menghubungi YouTube. Status video tidak diubah." }, { status: 502 });
  }
}
