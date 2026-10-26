const COUNT_WINDOW_MS = 30 * 60 * 1000;
const STORAGE_PREFIX = "aqsa-episode-play-count-v1:";
const recentPlays = new Map<string, number>();
const pendingPlays = new Set<string>();

// Count a playback session, not each press of the play/pause button.
export async function recordEpisodePlay(episodeId: string): Promise<void> {
  if (!episodeId || pendingPlays.has(episodeId)) return;

  const key = `${STORAGE_PREFIX}${episodeId}`;
  let lastPlay = recentPlays.get(episodeId) || 0;
  try {
    lastPlay = Math.max(lastPlay, Number(sessionStorage.getItem(key)) || 0);
  } catch { /* Some browsers block session storage. */ }
  if (Date.now() - lastPlay < COUNT_WINDOW_MS) return;

  pendingPlays.add(episodeId);
  try {
    const response = await fetch("/api/episode-plays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ episodeId }),
    });
    if (!response.ok) return;

    const countedAt = Date.now();
    recentPlays.set(episodeId, countedAt);
    try { sessionStorage.setItem(key, String(countedAt)); } catch { /* In-memory guard still applies. */ }
  } catch { /* Playback must still work when statistics are unavailable. */ }
  finally { pendingPlays.delete(episodeId); }
}
