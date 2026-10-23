import { NextResponse } from "next/server";
import { adminFirestore } from "../../../lib/adminFirestore";

export const runtime = "nodejs";

export async function GET() {
  try {
    const snapshot = await adminFirestore().collection("notifications").orderBy("createdAt", "desc").limit(30).get();
    const items = snapshot.docs.map((doc) => ({
      id: doc.id,
      kind: doc.data().kind,
      title: doc.data().title,
      titleTranslations: doc.data().titleTranslations,
      suffix: doc.data().suffix,
      url: doc.data().url,
      createdAt: doc.data().createdAt?.toMillis?.() ?? 0,
    }));
    return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Gagal memuatkan notifikasi:", error);
    return NextResponse.json({ error: "Notifikasi belum tersedia." }, { status: 503 });
  }
}
