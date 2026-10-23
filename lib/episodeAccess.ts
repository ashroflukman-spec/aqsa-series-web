export const FREE_EPISODE_COUNT = 3;

type EpisodeIdentity = { seriesId: string; episodeId: string };

export function episodePosition(queue: EpisodeIdentity[], episode: EpisodeIdentity): number {
  const index = queue.findIndex((item) =>
    item.seriesId === episode.seriesId && item.episodeId === episode.episodeId
  );
  return index < 0 ? 0 : index + 1;
}

export function needsEpisodeSignIn(queue: EpisodeIdentity[], episode: EpisodeIdentity, signedIn: boolean): boolean {
  const position = episodePosition(queue, episode);
  return !signedIn && (position === 0 || position > FREE_EPISODE_COUNT);
}
