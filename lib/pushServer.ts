import { createHash } from "node:crypto";
import webpush from "web-push";

export type StoredSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  unreadCount?: number;
  language?: "ms" | "en" | "ar";
};

export function subscriptionId(endpoint: string) {
  return createHash("sha256").update(endpoint).digest("hex");
}

export function parseSubscription(value: unknown): StoredSubscription | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  const keys = data.keys as Record<string, unknown> | undefined;
  if (typeof data.endpoint !== "string" || data.endpoint.length > 2000 ||
    typeof keys?.p256dh !== "string" || typeof keys.auth !== "string" ||
    keys.p256dh.length > 200 || keys.auth.length > 200) return null;
  try {
    const url = new URL(data.endpoint);
    const host = url.hostname;
    if (url.protocol !== "https:" || !(
      host === "fcm.googleapis.com" || host === "updates.push.services.mozilla.com" ||
      host === "web.push.apple.com" || host.endsWith(".push.apple.com")
    )) return null;
  } catch { return null; }
  return { endpoint: data.endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } };
}

export function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) throw new Error("Kunci VAPID belum dikonfigurasi.");
  webpush.setVapidDetails("mailto:ashroflukman@gmail.com", publicKey, privateKey);
  return webpush;
}
