export const SIGN_IN_OFFER_EPISODE = 4;

type EpisodeIdentity = { seriesId: string; episodeId: string };

export function episodePosition(queue: EpisodeIdentity[], episode: EpisodeIdentity): number {
  const index = queue.findIndex((item) =>
    item.seriesId === episode.seriesId && item.episodeId === episode.episodeId
  );
  return index < 0 ? 0 : index + 1;
}

export function shouldOfferEpisodeSignIn(queue: EpisodeIdentity[], episode: EpisodeIdentity, signedIn: boolean): boolean {
  const position = episodePosition(queue, episode);
  return !signedIn && position >= SIGN_IN_OFFER_EPISODE;
}
