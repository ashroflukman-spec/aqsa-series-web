import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminFirestore } from "../../../../lib/adminFirestore";
import { configureWebPush, type StoredSubscription } from "../../../../lib/pushServer";
import { isAuthorizedAdmin } from "../../../../lib/verifyAdminRequest";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  if (!(await isAuthorizedAdmin(request))) return NextResponse.json({ error: "Tidak dibenarkan." }, { status: 401 });
  try {
    const input = await request.json();
    const kind = input?.kind;
    const ids: string[] = Array.isArray(input?.ids) ? input.ids : [];
    if ((kind !== "episode" && kind !== "video") || ids.length < 1 || ids.length > 40 ||
      ids.some((id) => typeof id !== "string" || !/^[A-Za-z0-9_-]{1,120}$/.test(id))) {
      return NextResponse.json({ error: "Kandungan tidak sah." }, { status: 400 });
    }
    const push = configureWebPush();
    const db = adminFirestore();
    const uniqueIds = [...new Set(ids)];
    const collection = kind === "episode" ? "episodes" : "videos";
    const documents = await db.getAll(...uniqueIds.map((id) => db.collection(collection).doc(id)));
    const published = documents.filter((doc) => doc.exists && doc.data()?.isPublished === true && doc.data()?.isDeleted === false);
    if (published.length !== uniqueIds.length) return NextResponse.json({ error: "Sebahagian kandungan belum diterbitkan." }, { status: 409 });
    if (kind === "episode") {
      const seriesIds = [...new Set(published.map((doc) => String(doc.data()?.seriesId || "")))];
      const series = await db.getAll(...seriesIds.map((id) => db.collection("series").doc(id)));
      if (series.some((doc) => !doc.exists || doc.data()?.isPublished !== true || doc.data()?.isDeleted === true)) {
        return NextResponse.json({ error: "Siri audio belum diterbitkan." }, { status: 409 });
      }
    }
    const first = published[0];
    const firstTitle = String(first.data()?.title || "Aqsa Series").slice(0, 140);
    const titleTranslations = {
      en: String(first.data()?.translations?.en?.title || "").slice(0, 140),
      ar: String(first.data()?.translations?.ar?.title || "").slice(0, 140),
    };
    const suffix = published.length > 1 ? ` +${published.length - 1}` : "";
    const title = firstTitle + suffix;
    const url = kind === "episode" ? `/player/${encodeURIComponent(String(first.data()?.seriesId))}/${first.id}` : `/videos?video=${first.id}`;
    const eventId = `${kind}-${createHash("sha256").update([...uniqueIds].sort().join(",")).digest("hex").slice(0, 32)}`;
    const eventRef = db.collection("notifications").doc(eventId);
    const created = await db.runTransaction(async (transaction) => {
      const existing = await transaction.get(eventRef);
      if (existing.exists) return false;
      transaction.create(eventRef, { kind, title, titleTranslations, suffix, url, createdAt: FieldValue.serverTimestamp() });
      return true;
    });
    if (!created) return NextResponse.json({ alreadySent: true });

    const subscriptions = await db.collection("pushSubscriptions").limit(500).get();
    let delivered = 0;
    let failed = 0;
    for (let index = 0; index < subscriptions.docs.length; index += 20) {
      const chunk = subscriptions.docs.slice(index, index + 20);
      await Promise.all(chunk.map(async (doc) => {
        const data = doc.data() as StoredSubscription;
        const unreadCount = Math.min(99, Math.max(0, Number(data.unreadCount || 0)) + 1);
        try {
          const language = data.language === "en" || data.language === "ar" ? data.language : "ms";
          const heading = kind === "episode"
            ? { ms: "Episod audio baharu", en: "New audio episode", ar: "حلقة صوتية جديدة" }[language]
            : { ms: "Video baharu", en: "New video", ar: "فيديو جديد" }[language];
          const translatedTitle = language === "ms" ? title : (titleTranslations[language] || firstTitle) + suffix;
          await push.sendNotification(data, JSON.stringify({ title: heading, body: translatedTitle, url, notificationId: eventId, badgeCount: unreadCount, icon: "/icon.png" }), { TTL: 86400 });
          delivered += 1;
          await doc.ref.update({ unreadCount, updatedAt: FieldValue.serverTimestamp() });
        } catch (error) {
          failed += 1;
          const status = (error as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) await doc.ref.delete();
          else console.error("Push gagal dihantar:", status || error);
        }
      }));
    }
    return NextResponse.json({ created: true, delivered, failed, limited: subscriptions.size === 500 });
  } catch (error) {
    console.error("Notifikasi kandungan gagal:", error);
    return NextResponse.json({ error: "Notifikasi belum dapat dihantar." }, { status: 503 });
  }
}
