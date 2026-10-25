import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminFirestore } from "../../../lib/adminFirestore";
import { isAuthorizedAdmin } from "../../../lib/verifyAdminRequest";

export const runtime = "nodejs";

const SHARD_COUNT = 16;
const collectionName = "visitorCounterShards";

export async function POST(request: NextRequest) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (request.headers.get("origin") !== request.nextUrl.origin ||
      (fetchSite && fetchSite !== "same-origin") ||
      !request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ error: "Permintaan tidak sah." }, { status: 403 });
  }

  try {
    const shard = Math.floor(Math.random() * SHARD_COUNT).toString().padStart(2, "0");
    await adminFirestore().collection(collectionName).doc(shard).set({ total: FieldValue.increment(1) }, { merge: true });
    return NextResponse.json({ counted: true });
  } catch (error) {
    console.error("Gagal merekod lawatan tanpa identiti:", error);
    return NextResponse.json({ error: "Lawatan belum dapat direkodkan." }, { status: 503 });
  }
}

export async function GET(request: NextRequest) {
  if (!(await isAuthorizedAdmin(request))) {
    return NextResponse.json({ error: "Tidak dibenarkan." }, { status: 401 });
  }

  try {
    const snapshot = await adminFirestore().collection(collectionName).get();
    const total = snapshot.docs.reduce((sum, item) => sum + Math.max(0, Number(item.data().total || 0)), 0);
    return NextResponse.json({ total }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Gagal membaca jumlah pelawat:", error);
    return NextResponse.json({ error: "Statistik pelawat belum tersedia." }, { status: 503 });
  }
}
