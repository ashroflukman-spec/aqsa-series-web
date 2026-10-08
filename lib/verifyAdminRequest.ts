import type { NextRequest } from "next/server";
import { isAdminEmail } from "./admin";
import { firebaseConfig } from "./firebaseConfig";

export async function isAuthorizedAdmin(request: NextRequest) {
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return false;

  try {
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseConfig.apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: token }),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return false;
    const data = await response.json();
    const account = data?.users?.[0];
    return account?.disabled !== true && isAdminEmail(account?.email);
  } catch {
    return false;
  }
}
