export type ListeningProgress = {
  seriesId: string;
  episodeId: string;
  seriesTitle: string;
  episodeTitle: string;
  coverUrl: string;
  positionSeconds: number;
  durationSeconds: number;
  completed: boolean;
  updatedAt: number;
};

const RECENT_KEY = "recentlyPlayed";
const CONTINUE_KEY = "continueListening";
const OWNER_KEY = "aqsa-listening-owner";
export const LISTENING_CHANGED_EVENT = "aqsa:listening-changed";

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.slice(0, maxLength) : "";
}

export function parseListeningProgress(value: unknown): ListeningProgress | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  const seriesId = cleanText(data.seriesId, 120);
  const episodeId = cleanText(data.episodeId, 120);
  if (!seriesId || !episodeId || seriesId.includes("/") || episodeId.includes("/")) return null;

  const position = Number(data.positionSeconds);
  const duration = Number(data.durationSeconds);
  const updatedAt = Number(data.updatedAt);
  return {
    seriesId,
    episodeId,
    seriesTitle: cleanText(data.seriesTitle, 200) || "Aqsa Series",
    episodeTitle: cleanText(data.episodeTitle, 200) || "Tanpa Tajuk",
    coverUrl: cleanText(data.coverUrl, 1000),
    positionSeconds: Number.isFinite(position) ? Math.max(0, Math.floor(position)) : 0,
    durationSeconds: Number.isFinite(duration) ? Math.max(0, Math.floor(duration)) : 0,
    completed: data.completed === true,
    updatedAt: Number.isFinite(updatedAt) && updatedAt > 0 ? updatedAt : 1,
  };
}

export function readListeningProgress(): ListeningProgress[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(value)
      ? value.map(parseListeningProgress).filter((item): item is ListeningProgress => item !== null).slice(0, 10)
      : [];
  } catch {
    return [];
  }
}

export function mergeListeningProgress(...groups: ListeningProgress[][]): ListeningProgress[] {
  const byEpisode = new Map<string, ListeningProgress>();
  for (const item of groups.flat()) {
    const previous = byEpisode.get(item.episodeId);
    if (!previous || item.updatedAt > previous.updatedAt) byEpisode.set(item.episodeId, item);
  }
  return [...byEpisode.values()].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 10);
}

export function writeListeningProgress(items: ListeningProgress[]): void {
  try {
    const recent = mergeListeningProgress(items);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
    localStorage.setItem(CONTINUE_KEY, JSON.stringify(recent.slice(0, 1)));
    window.dispatchEvent(new Event(LISTENING_CHANGED_EVENT));
  } catch {
    // Listening remains available even when browser storage is unavailable.
  }
}

export function switchListeningOwner(uid: string | null): boolean {
  try {
    const previous = localStorage.getItem(OWNER_KEY);
    const next = uid || "guest";
    if (previous && previous !== "guest" && previous !== next) {
      writeListeningProgress([]);
      localStorage.setItem(OWNER_KEY, next);
      return true;
    }
    localStorage.setItem(OWNER_KEY, next);
  } catch {
    // Browser storage can be unavailable in private or restricted contexts.
  }
  return false;
}

export function saveListeningProgress(item: ListeningProgress): ListeningProgress {
  writeListeningProgress(mergeListeningProgress([item], readListeningProgress()));
  return item;
}

export function resumePosition(episodeId: string): number {
  const item = readListeningProgress().find((entry) => entry.episodeId === episodeId);
  if (!item || item.completed) return 0;
  if (item.durationSeconds > 0 && item.positionSeconds >= item.durationSeconds - 5) return 0;
  return item.positionSeconds;
}
