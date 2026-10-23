import { auth } from "./firebase";

export async function announcePublished(kind: "episode" | "video", ids: string[]) {
  if (!ids.length) return true;
  const token = await auth.currentUser?.getIdToken();
  if (!token) return false;
  try {
    for (let index = 0; index < ids.length; index += 40) {
      const response = await fetch("/api/admin/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ kind, ids: ids.slice(index, index + 40) }),
      });
      if (!response.ok) return false;
      const result = await response.json();
      if (result.failed || result.limited) return false;
    }
    return true;
  } catch { return false; }
}
