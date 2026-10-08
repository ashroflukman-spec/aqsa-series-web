import assert from "node:assert/strict";
import test from "node:test";
import { lookupVideoLinks } from "../lib/youtubeHealthServer.ts";

test("public embed clears a false processing warning without hiding missing videos", async () => {
  const previousKey = process.env.YOUTUBE_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.YOUTUBE_API_KEY = "test-key";
  const requested = [];

  globalThis.fetch = async (input) => {
    const url = new URL(input);
    requested.push(url);
    if (url.hostname === "www.googleapis.com") {
      return Response.json({
        items: [{ id: "bKljL6ijZ0E", status: { privacyStatus: "public", uploadStatus: "uploaded", embeddable: true } }],
      });
    }
    if (url.hostname === "www.youtube.com" && url.pathname === "/oembed") {
      assert.equal(url.searchParams.get("url"), "https://www.youtube.com/watch?v=bKljL6ijZ0E");
      return Response.json({ title: "Public interview" });
    }
    throw new Error(`Unexpected request: ${url}`);
  };

  try {
    assert.deepEqual(await lookupVideoLinks(["bKljL6ijZ0E", "oJCqeN550us"]), [
      { id: "bKljL6ijZ0E", status: "ok", reason: "" },
      { id: "oJCqeN550us", status: "missing", reason: "Tidak ditemui melalui YouTube API; mungkin dipadam atau dijadikan private." },
    ]);
    assert.equal(requested.length, 2);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.YOUTUBE_API_KEY;
    else process.env.YOUTUBE_API_KEY = previousKey;
  }
});
