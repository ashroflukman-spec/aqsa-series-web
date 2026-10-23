import assert from "node:assert/strict";
import { test } from "node:test";
import {
  advanceEpisodeOffer,
  emptyEpisodeOfferProgress,
  episodePosition,
  parseEpisodeOfferProgress,
} from "../lib/episodeAccess.ts";

const episode = (seriesId, episodeId) => ({ seriesId, episodeId });

test("the offer appears after three distinct episodes, including across series", () => {
  let progress = emptyEpisodeOfferProgress();
  for (const item of [episode("series-a", "1"), episode("series-a", "2")]) {
    const result = advanceEpisodeOffer(progress, item, false);
    assert.equal(result.shouldOffer, false);
    progress = result.progress;
  }

  const third = advanceEpisodeOffer(progress, episode("series-b", "1"), false);
  assert.equal(third.shouldOffer, true);
  assert.deepEqual(third.progress, emptyEpisodeOfferProgress());
});

test("replaying the same episode does not increase the count", () => {
  const first = advanceEpisodeOffer(emptyEpisodeOfferProgress(), episode("series-a", "1"), false);
  const replay = advanceEpisodeOffer(first.progress, episode("series-a", "1"), false);
  assert.equal(replay.shouldOffer, false);
  assert.deepEqual(replay.progress, first.progress);
  const second = advanceEpisodeOffer(replay.progress, episode("series-a", "2"), false);
  assert.equal(second.shouldOffer, false);
});

test("closing the offer starts another three-episode cycle", () => {
  let progress = emptyEpisodeOfferProgress();
  for (const id of ["1", "2", "3"]) progress = advanceEpisodeOffer(progress, episode("series-a", id), false).progress;
  for (const id of ["4", "5"]) {
    const result = advanceEpisodeOffer(progress, episode("series-a", id), false);
    assert.equal(result.shouldOffer, false);
    progress = result.progress;
  }
  assert.equal(advanceEpisodeOffer(progress, episode("series-a", "6"), false).shouldOffer, true);
});

test("signed-in listeners never receive the offer", () => {
  const progress = advanceEpisodeOffer(emptyEpisodeOfferProgress(), episode("series-a", "1"), false).progress;
  assert.deepEqual(advanceEpisodeOffer(progress, episode("series-a", "2"), true), {
    progress: emptyEpisodeOfferProgress(), shouldOffer: false,
  });
});

test("stored progress is validated before reuse", () => {
  assert.deepEqual(parseEpisodeOfferProgress({ playedEpisodeKeys: ["a", "a", 4, "b"] }), { playedEpisodeKeys: ["a", "b"] });
  assert.deepEqual(parseEpisodeOfferProgress("invalid"), emptyEpisodeOfferProgress());
  assert.equal(episodePosition([episode("series-a", "1")], episode("series-b", "1")), 0);
});
