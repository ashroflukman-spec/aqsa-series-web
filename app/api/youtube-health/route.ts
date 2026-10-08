import { NextRequest, NextResponse } from "next/server";
import { lookupVideoLinks } from "../../../lib/youtubeHealthServer";
import { isAuthorizedAdmin } from "../../../lib/verifyAdminRequest";

export async function POST(request: NextRequest) {
  if (!(await isAuthorizedAdmin(request))) {
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
  if (!process.env.YOUTUBE_API_KEY) {
    return NextResponse.json({ error: "Kunci YouTube API belum dikonfigurasi." }, { status: 503 });
  }

  try {
    const results = await lookupVideoLinks(uniqueIds);
    return NextResponse.json({ results }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Tidak dapat menghubungi YouTube. Status video tidak diubah." }, { status: 502 });
  }
}
