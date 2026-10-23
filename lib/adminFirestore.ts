import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

export function adminFirestore() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("Akaun servis Firestore belum dikonfigurasi.");
  const credentials = JSON.parse(raw);
  if (credentials?.project_id !== "aqsa-siries" || !credentials.client_email || !credentials.private_key) {
    throw new Error("Akaun servis Firestore tidak sah.");
  }
  const app = getApps()[0] ?? initializeApp({
    credential: cert({
      projectId: credentials.project_id,
      clientEmail: credentials.client_email,
      privateKey: credentials.private_key,
    }),
  });
  return getFirestore(app);
}
