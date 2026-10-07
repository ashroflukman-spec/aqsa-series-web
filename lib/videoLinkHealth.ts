import type { User } from "firebase/auth";
import { doc, serverTimestamp, Timestamp, writeBatch } from "firebase/firestore";
import { db } from "./firebase";

export type VideoLinkStatus = "ok" | "missing" | "notEmbeddable" | "regionBlocked" | "review";

export type MonitoredVideo = {
  id: string;
  title: string;
  youtubeId: string;
  isDeleted?: boolean;
  linkStatus?: VideoLinkStatus;
  linkReason?: string;
  linkCheckedAt?: Timestamp | null;
  linkCheckedYoutubeId?: string;
};

export function effectiveLinkStatus(video: MonitoredVideo): VideoLinkStatus | "unchecked" {
  if (video.linkCheckedYoutubeId !== video.youtubeId || !video.linkCheckedAt) return "unchecked";
  return video.linkStatus ?? "unchecked";
}

export function needsLinkCheck(video: MonitoredVideo, now = Date.now()) {
  const checkedAt = video.linkCheckedAt?.toMillis?.();
  return effectiveLinkStatus(video) === "unchecked" || !checkedAt || now - checkedAt >= 24 * 60 * 60 * 1000;
}

type LinkResult = { id: string; status: VideoLinkStatus; reason: string };
const validStatuses = new Set<VideoLinkStatus>(["ok", "missing", "notEmbeddable", "regionBlocked", "review"]);

export async function checkVideoLinks(user: User, videos: MonitoredVideo[]) {
  const active = videos.filter((video) => !video.isDeleted);
  if (active.length === 0) return;

  const ids = [...new Set(active.map((video) => video.youtubeId).filter((id) => /^[A-Za-z0-9_-]{11}$/.test(id)))];
  const results = new Map<string, LinkResult>();
  const token = await user.getIdToken();

  for (let index = 0; index < ids.length; index += 50) {
    const chunk = ids.slice(index, index + 50);
    const response = await fetch("/api/youtube-health", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ids: chunk }),
      cache: "no-store",
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body?.error || "Semakan YouTube gagal.");
    if (!Array.isArray(body?.results) || body.results.length !== chunk.length) {
      throw new Error("Respons semakan YouTube tidak lengkap. Tiada status diubah.");
    }
    for (const result of body.results as LinkResult[]) {
      if (!chunk.includes(result.id) || !validStatuses.has(result.status) || typeof result.reason !== "string") {
        throw new Error("Respons semakan YouTube tidak sah. Tiada status diubah.");
      }
      results.set(result.id, result);
    }
    if (chunk.some((id) => !results.has(id))) {
      throw new Error("Respons semakan YouTube tidak lengkap. Tiada status diubah.");
    }
  }

  for (let index = 0; index < active.length; index += 400) {
    const batch = writeBatch(db);
    for (const video of active.slice(index, index + 400)) {
      const result = results.get(video.youtubeId) ?? {
        status: "review" as const,
        reason: "ID YouTube tidak sah. Sila betulkan pautan video.",
      };
      batch.update(doc(db, "videos", video.id), {
        linkStatus: result.status,
        linkReason: result.reason,
        linkCheckedAt: serverTimestamp(),
        linkCheckedYoutubeId: video.youtubeId,
      });
    }
    await batch.commit();
  }
}
