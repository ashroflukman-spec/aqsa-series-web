import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import {
  addListeningSeconds,
  dismissSignInInvite,
  isSignInInviteDue,
  markResumedEpisode,
  noteSignInVisit,
  recordListeningDelta,
} from "../lib/signInInvite.ts";

function storage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    clear: () => values.clear(),
  };
}

beforeEach(() => {
  globalThis.localStorage = storage();
  globalThis.sessionStorage = storage();
});

test("counts advancing playback but ignores seeking and large jumps", () => {
  assert.equal(recordListeningDelta(20, 24.5, false), 4.5);
  assert.equal(recordListeningDelta(20, 200, true), 0);
  assert.equal(recordListeningDelta(20, 200, false), 0);
  assert.equal(recordListeningDelta(20, 19, false), 0);
});

test("invites only after ten minutes of actual listening", () => {
  addListeningSeconds(599);
  assert.equal(isSignInInviteDue(), false);
  addListeningSeconds(1);
  assert.equal(isSignInInviteDue(), true);
});

test("returning listener can be invited after another minute of a resumed episode", () => {
  noteSignInVisit();
  markResumedEpisode();
  addListeningSeconds(100);
  assert.equal(isSignInInviteDue(), false);
  sessionStorage.clear();
  noteSignInVisit();
  markResumedEpisode();
  addListeningSeconds(59);
  assert.equal(isSignInInviteDue(), false);
  addListeningSeconds(1);
  assert.equal(isSignInInviteDue(), true);
});

test("dismissal suppresses invitation for thirty days", () => {
  addListeningSeconds(600);
  dismissSignInInvite(1_000_000);
  assert.equal(isSignInInviteDue(1_000_000 + 29 * 24 * 60 * 60 * 1000), false);
  assert.equal(isSignInInviteDue(1_000_000 + 30 * 24 * 60 * 60 * 1000), true);
});
