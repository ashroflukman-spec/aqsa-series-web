export const EPISODES_PER_SIGN_IN_OFFER = 3;
export const EPISODE_SIGN_IN_PROGRESS_KEY = "aqsa_episode_sign_in_progress_v1";

type EpisodeIdentity = { seriesId: string; episodeId: string };
export type EpisodeOfferProgress = { playedEpisodeKeys: string[] };

export const emptyEpisodeOfferProgress = (): EpisodeOfferProgress => ({ playedEpisodeKeys: [] });

export function parseEpisodeOfferProgress(value: unknown): EpisodeOfferProgress {
  if (!value || typeof value !== "object" || !("playedEpisodeKeys" in value)) return emptyEpisodeOfferProgress();
  const keys = value.playedEpisodeKeys;
  if (!Array.isArray(keys)) return emptyEpisodeOfferProgress();
  return { playedEpisodeKeys: [...new Set(keys.filter((key): key is string => typeof key === "string"))].slice(0, EPISODES_PER_SIGN_IN_OFFER - 1) };
}

export function episodePosition(queue: EpisodeIdentity[], episode: EpisodeIdentity): number {
  const index = queue.findIndex((item) =>
    item.seriesId === episode.seriesId && item.episodeId === episode.episodeId
  );
  return index < 0 ? 0 : index + 1;
}

export function advanceEpisodeOffer(progress: EpisodeOfferProgress, episode: EpisodeIdentity, signedIn: boolean) {
  if (signedIn) return { progress: emptyEpisodeOfferProgress(), shouldOffer: false };

  const key = JSON.stringify([episode.seriesId, episode.episodeId]);
  if (progress.playedEpisodeKeys.includes(key)) return { progress, shouldOffer: false };

  const playedEpisodeKeys = [...progress.playedEpisodeKeys, key];
  if (playedEpisodeKeys.length >= EPISODES_PER_SIGN_IN_OFFER) {
    return { progress: emptyEpisodeOfferProgress(), shouldOffer: true };
  }
  return { progress: { playedEpisodeKeys }, shouldOffer: false };
}
