import { app } from "./firebase";

export const ANALYTICS_CONSENT_KEY = "aqsa-analytics-consent";
export const ANALYTICS_CONSENT_EVENT = "aqsa:analytics-consent-changed";

type AnalyticsSdk = typeof import("firebase/analytics");
type AnalyticsInstance = import("firebase/analytics").Analytics;

let instancePromise: Promise<{ sdk: AnalyticsSdk; analytics: AnalyticsInstance } | null> | null = null;

export function hasAnalyticsConsent(): boolean {
  try {
    return typeof window !== "undefined" && localStorage.getItem(ANALYTICS_CONSENT_KEY) === "granted";
  } catch {
    return false;
  }
}

async function analyticsInstance() {
  if (!instancePromise) {
    instancePromise = (async () => {
      const sdk = await import("firebase/analytics");
      if (!await sdk.isSupported()) return null;
      const analytics = sdk.getAnalytics(app);
      sdk.setConsent({ analytics_storage: hasAnalyticsConsent() ? "granted" : "denied" });
      sdk.setAnalyticsCollectionEnabled(analytics, hasAnalyticsConsent());
      return { sdk, analytics };
    })().catch(() => null);
  }
  return instancePromise;
}

export async function trackUsageEvent(name: string, parameters?: Record<string, string | number>): Promise<void> {
  if (!hasAnalyticsConsent()) return;
  const instance = await analyticsInstance();
  if (!instance || !hasAnalyticsConsent()) return;
  instance.sdk.logEvent(instance.analytics, name, parameters);
}

export function setAnalyticsConsent(enabled: boolean): void {
  localStorage.setItem(ANALYTICS_CONSENT_KEY, enabled ? "granted" : "denied");
  window.dispatchEvent(new Event(ANALYTICS_CONSENT_EVENT));
  if (instancePromise) {
    void instancePromise.then((instance) => {
      if (!instance) return;
      instance.sdk.setConsent({ analytics_storage: enabled ? "granted" : "denied" });
      instance.sdk.setAnalyticsCollectionEnabled(instance.analytics, enabled);
    });
  }
}
