import assert from "node:assert/strict";
import { test } from "node:test";
import { episodePosition, needsEpisodeSignIn } from "../lib/episodeAccess.ts";

const queue = Array.from({ length: 5 }, (_, index) => ({ seriesId: "series-a", episodeId: `episode-${index + 1}` }));

test("the first three published episodes in a series remain open to guests", () => {
  for (const episode of queue.slice(0, 3)) {
    assert.equal(needsEpisodeSignIn(queue, episode, false), false);
  }
});

test("the fourth and later episodes require sign-in, including direct selection", () => {
  assert.equal(episodePosition(queue, queue[3]), 4);
  assert.equal(needsEpisodeSignIn(queue, queue[3], false), true);
  assert.equal(needsEpisodeSignIn(queue, queue[4], false), true);
  assert.equal(needsEpisodeSignIn(queue, queue[3], true), false);
});

test("an episode from another series cannot inherit this series position", () => {
  assert.equal(episodePosition(queue, { seriesId: "series-b", episodeId: "episode-4" }), 0);
  assert.equal(needsEpisodeSignIn(queue, { seriesId: "series-b", episodeId: "episode-4" }, false), true);
});
