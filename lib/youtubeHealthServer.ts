export type LinkStatus = "ok" | "missing" | "notEmbeddable" | "regionBlocked" | "review";

export type LinkResult = { id: string; status: LinkStatus; reason: string };

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

function classifyVideo(video: YouTubeVideo | undefined): Omit<LinkResult, "id"> {
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

export async function lookupVideoLinks(ids: string[]): Promise<LinkResult[]> {
  const youtubeKey = process.env.YOUTUBE_API_KEY;
  if (!youtubeKey) throw new Error("Kunci YouTube API belum dikonfigurasi.");

  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part", "status,contentDetails");
  url.searchParams.set("id", ids.join(","));
  url.searchParams.set("key", youtubeKey);

  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error("Semakan YouTube gagal. Status video tidak diubah.");

  const data: unknown = await response.json();
  if (typeof data !== "object" || data === null || !("items" in data) || !Array.isArray(data.items)) {
    throw new Error("Respons YouTube tidak lengkap. Status video tidak diubah.");
  }

  const found = new Map<string, YouTubeVideo>(
    (data.items as YouTubeVideo[]).map((item) => [item.id, item])
  );
  return ids.map((id) => ({ id, ...classifyVideo(found.get(id)) }));
}
