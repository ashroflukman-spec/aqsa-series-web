import type { User } from "firebase/auth";
import { isAdminEmail } from "./admin";

export function canSyncListening(user: User | null): user is User {
  return !!user && (isAdminEmail(user.email) || user.providerData.some((provider) => provider.providerId === "google.com"));
}
