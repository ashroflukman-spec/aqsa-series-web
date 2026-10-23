import assert from "node:assert/strict";
import { test } from "node:test";
import { episodePosition, shouldOfferEpisodeSignIn } from "../lib/episodeAccess.ts";

const queue = Array.from({ length: 5 }, (_, index) => ({ seriesId: "series-a", episodeId: `episode-${index + 1}` }));

test("the first three episodes do not trigger the sign-in offer", () => {
  for (const episode of queue.slice(0, 3)) {
    assert.equal(shouldOfferEpisodeSignIn(queue, episode, false), false);
  }
});

test("playing episode four or later offers guest sign-in without restricting playback", () => {
  assert.equal(episodePosition(queue, queue[3]), 4);
  assert.equal(shouldOfferEpisodeSignIn(queue, queue[3], false), true);
  assert.equal(shouldOfferEpisodeSignIn(queue, queue[4], false), true);
  assert.equal(shouldOfferEpisodeSignIn(queue, queue[3], true), false);
});

test("an episode from another series cannot inherit the sign-in offer position", () => {
  assert.equal(episodePosition(queue, { seriesId: "series-b", episodeId: "episode-4" }), 0);
  assert.equal(shouldOfferEpisodeSignIn(queue, { seriesId: "series-b", episodeId: "episode-4" }, false), false);
});
