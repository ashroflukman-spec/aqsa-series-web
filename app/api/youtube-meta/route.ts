import { NextRequest, NextResponse } from "next/server";

function extractYouTubeId(url: string) {
  if (!url) return "";

  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&]+)/,
    /(?:youtu\.be\/)([^?&]+)/,
    /(?:youtube\.com\/embed\/)([^?&]+)/,
    /(?:youtube\.com\/shorts\/)([^?&]+)/,
    /(?:youtube\.com\/live\/)([^?&]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }

  return "";
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const youtubeUrl = searchParams.get("url") ?? "";
    const youtubeIdParam = searchParams.get("youtubeId") ?? "";

    const youtubeId = youtubeIdParam || extractYouTubeId(youtubeUrl);

    if (!youtubeId) {
      return NextResponse.json(
        { error: "YouTube ID tidak dapat dikesan daripada URL." },
        { status: 400 }
      );
    }

    const apiKey = process.env.YOUTUBE_API_KEY;

    console.log("YOUTUBE_API_KEY exists:", !!process.env.YOUTUBE_API_KEY);

    if (!apiKey) {
      return NextResponse.json(
        { error: "YOUTUBE_API_KEY belum ditetapkan dalam environment semasa." },
        { status: 500 }
      );
    }

    const apiUrl =
      `https://www.googleapis.com/youtube/v3/videos` +
      `?part=snippet&id=${encodeURIComponent(youtubeId)}` +
      `&key=${encodeURIComponent(apiKey)}`;

    const response = await fetch(apiUrl, {
      method: "GET",
      cache: "no-store",
    });

    const data = await response.json();
    const item = data?.items?.[0];

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error?.message || "Gagal mendapatkan metadata YouTube." },
        { status: response.status }
      );
    }

    if (!item?.snippet) {
      return NextResponse.json(
        { error: "Video tidak dijumpai atau metadata tidak tersedia." },
        { status: 404 }
      );
    }

    const snippet = item.snippet;
    const thumbnails = snippet.thumbnails || {};

    const thumbnailUrl =
      thumbnails.maxres?.url ||
      thumbnails.standard?.url ||
      thumbnails.high?.url ||
      thumbnails.medium?.url ||
      thumbnails.default?.url ||
      "";

    return NextResponse.json({
      youtubeId,
      title: snippet.title ?? "",
      description: snippet.description ?? "",
      channelTitle: snippet.channelTitle ?? "",
      publishedAt: snippet.publishedAt ?? "",
      thumbnailUrl,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Ralat semasa import metadata YouTube." },
      { status: 500 }
    );
  }
}