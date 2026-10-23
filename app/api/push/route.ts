import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminFirestore } from "../../../lib/adminFirestore";
import { parseSubscription, subscriptionId } from "../../../lib/pushServer";

export const runtime = "nodejs";

function sameOrigin(request: NextRequest) {
  return request.headers.get("origin") === request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Tidak dibenarkan." }, { status: 403 });
  try {
    const input = await request.json();
    const subscription = parseSubscription(input?.subscription);
    if (!subscription) return NextResponse.json({ error: "Langganan tidak sah." }, { status: 400 });
    const reference = adminFirestore().collection("pushSubscriptions").doc(subscriptionId(subscription.endpoint));
    const existing = await reference.get();
    const unreadCount = existing.exists ? Number(existing.data()?.unreadCount || 0) : 0;
    const language = input?.language === "en" || input?.language === "ar" ? input.language : "ms";
    await reference.set({ ...subscription, language, unreadCount, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return NextResponse.json({ unreadCount });
  } catch (error) {
    console.error("Gagal menyimpan langganan push:", error);
    return NextResponse.json({ error: "Langganan tidak dapat disimpan." }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Tidak dibenarkan." }, { status: 403 });
  const subscription = parseSubscription((await request.json().catch(() => null))?.subscription);
  if (!subscription) return NextResponse.json({ error: "Langganan tidak sah." }, { status: 400 });
  await adminFirestore().collection("pushSubscriptions").doc(subscriptionId(subscription.endpoint)).update({ unreadCount: 0, updatedAt: FieldValue.serverTimestamp() }).catch(() => null);
  return NextResponse.json({ unreadCount: 0 });
}

export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Tidak dibenarkan." }, { status: 403 });
  const subscription = parseSubscription((await request.json().catch(() => null))?.subscription);
  if (!subscription) return NextResponse.json({ error: "Langganan tidak sah." }, { status: 400 });
  await adminFirestore().collection("pushSubscriptions").doc(subscriptionId(subscription.endpoint)).delete();
  return NextResponse.json({ ok: true });
}
