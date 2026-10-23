import type { User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { isAdminEmail } from "./admin";
import { db } from "./firebase";

export function canSyncListening(user: User | null): user is User {
  return !!user && (isAdminEmail(user.email) || user.providerData.some((provider) => provider.providerId === "google.com"));
}

export type ListenerProfile = { interests: string[]; createdAt: number };
const pendingProfiles = new Map<string, Promise<ListenerProfile>>();

export function ensureListenerProfile(user: User): Promise<ListenerProfile> {
  const pending = pendingProfiles.get(user.uid);
  if (pending) return pending;
  const request = (async () => {
    const reference = doc(db, "users", user.uid);
    const snapshot = await getDoc(reference);
    if (snapshot.exists()) {
      const data = snapshot.data();
      return {
        interests: Array.isArray(data.interests) ? data.interests.filter((item): item is string => typeof item === "string") : [],
        createdAt: typeof data.createdAt === "number" ? data.createdAt : Date.now(),
      };
    }
    const createdAt = Date.now();
    await setDoc(reference, {
      displayName: user.displayName?.slice(0, 120) || "",
      email: user.email || "",
      interests: [],
      createdAt,
      updatedAt: createdAt,
    });
    return { interests: [], createdAt };
  })().finally(() => pendingProfiles.delete(user.uid));
  pendingProfiles.set(user.uid, request);
  return request;
}
