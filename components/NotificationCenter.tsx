"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, BellRing, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLanguage } from "./LanguageProvider";
import { useInstall } from "./InstallProvider";
import { getAppOverlayRoot } from "./appOverlayRoot";

type Notice = { id: string; kind: "episode" | "video"; title: string; titleTranslations?: { en?: string; ar?: string }; suffix?: string; url: string; createdAt: number };
const READ_KEY = "aqsa-notifications-read-at";
const COPY = {
  ms: { title: "Notifikasi", description: "Episod audio dan video baharu", enable: "Aktifkan notifikasi percuma", enabled: "Notifikasi aktif", disable: "Matikan notifikasi", disabled: "Notifikasi disekat dalam tetapan peranti.", install: "Pada iPhone, pasang Aqsa Series di skrin utama dahulu untuk menerima notifikasi dan angka ikon.", unsupported: "Pelayar ini belum menyokong notifikasi push.", empty: "Belum ada makluman baharu.", episode: "Episod audio", video: "Video", close: "Tutup", loading: "Memuatkan…", failed: "Notifikasi belum dapat diaktifkan. Cuba lagi." },
  en: { title: "Notifications", description: "New audio episodes and videos", enable: "Enable free notifications", enabled: "Notifications on", disable: "Turn off notifications", disabled: "Notifications are blocked in your device settings.", install: "On iPhone, add Aqsa Series to your Home Screen first to receive notifications and icon badges.", unsupported: "This browser does not support push notifications yet.", empty: "No new updates yet.", episode: "Audio episode", video: "Video", close: "Close", loading: "Loading…", failed: "Could not enable notifications. Try again." },
  ar: { title: "الإشعارات", description: "حلقات صوتية وفيديوهات جديدة", enable: "تفعيل الإشعارات المجانية", enabled: "الإشعارات مفعّلة", disable: "إيقاف الإشعارات", disabled: "الإشعارات محظورة في إعدادات الجهاز.", install: "على iPhone، أضف Aqsa Series إلى الشاشة الرئيسية أولاً لتلقي الإشعارات وشارة الأيقونة.", unsupported: "هذا المتصفح لا يدعم الإشعارات الفورية بعد.", empty: "لا توجد تحديثات جديدة.", episode: "حلقة صوتية", video: "فيديو", close: "إغلاق", loading: "جار التحميل…", failed: "تعذّر تفعيل الإشعارات. حاول مجددًا." },
} as const;

type BadgeNavigator = Navigator & { setAppBadge?: (count: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
function vapidBytes(key: string) {
  return Uint8Array.from(atob(key.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(key.length / 4) * 4, "=")), (char) => char.charCodeAt(0));
}
async function currentSubscription() {
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export default function NotificationCenter({ surface }: { surface: "home" | "settings" }) {
  const { language } = useLanguage();
  const { platform, installed } = useInstall();
  const copy = COPY[language];
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notice[]>([]);
  const [unread, setUnread] = useState(0);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(() =>
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported");
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const dialogRef = useRef<HTMLElement>(null);
  const isIos = platform.startsWith("ios-");

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const data = await response.json();
      const notices: Notice[] = Array.isArray(data.items) ? data.items : [];
      setItems(notices);
      const readAt = Number(localStorage.getItem(READ_KEY) || 0);
      const count = notices.filter((item) => item.createdAt > readAt).length;
      setUnread(count);
      await (navigator as BadgeNavigator).setAppBadge?.(count).catch(() => {});
    } catch { /* Keep the last loaded state while offline. */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    if ("Notification" in window && Notification.permission === "granted" && "serviceWorker" in navigator) {
      void currentSubscription().then(async (subscription) => {
        if (!subscription) return;
        const response = await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription: subscription.toJSON(), language }) });
        if (response.ok) setEnabled(true);
      }).catch(() => {});
    }
    const onMessage = (event: MessageEvent) => { if (event.data?.type === "aqsa:new-notification") void refresh(); };
    const onStorage = (event: StorageEvent) => { if (event.key === READ_KEY) void refresh(); };
    navigator.serviceWorker?.addEventListener("message", onMessage);
    window.addEventListener("storage", onStorage);
    return () => {
      window.clearTimeout(timer);
      navigator.serviceWorker?.removeEventListener("message", onMessage);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh, language]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", escape);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", escape); };
  }, [open]);

  async function showCenter() {
    setOpen(true);
    setUnread(0);
    localStorage.setItem(READ_KEY, String(Date.now()));
    await (navigator as BadgeNavigator).clearAppBadge?.().catch(() => {});
    try {
      const subscription = await currentSubscription();
      if (subscription) await fetch("/api/push", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription: subscription.toJSON() }) });
    } catch { /* The in-app center still works without push. */ }
  }

  async function enablePush() {
    if (isIos && !installed) { setError(copy.install); return; }
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) { setError(copy.unsupported); return; }
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) { setError(copy.failed); return; }
    setBusy(true);
    setError("");
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") { setError(copy.disabled); return; }
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      const expected = vapidBytes(publicKey);
      if (subscription?.options.applicationServerKey) {
        const current = new Uint8Array(subscription.options.applicationServerKey);
        if (current.length !== expected.length || current.some((byte, index) => byte !== expected[index])) {
          await subscription.unsubscribe(); subscription = null;
        }
      }
      subscription ||= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: expected });
      const response = await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription: subscription.toJSON(), language }) });
      if (!response.ok) throw new Error();
      setEnabled(true);
      setError("");
    } catch { setError(copy.failed); }
    finally { setBusy(false); }
  }

  async function disablePush() {
    setBusy(true);
    try {
      const subscription = await currentSubscription();
      if (subscription) {
        const response = await fetch("/api/push", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription: subscription.toJSON() }) });
        if (!response.ok) throw new Error();
        await subscription.unsubscribe();
      }
      await (navigator as BadgeNavigator).clearAppBadge?.().catch(() => {});
      setEnabled(false);
      setError("");
    } catch { setError(copy.failed); }
    finally { setBusy(false); }
  }

  return <>
    {surface === "home" ? (
      <button type="button" onClick={() => void showCenter()} aria-label={`${copy.title}${unread ? ` (${unread})` : ""}`} className="relative mt-4 flex min-h-11 items-center gap-2 rounded-full border border-[#D4AF37]/25 bg-[#1f232b] px-4 text-xs font-semibold text-[#E8D28A]">
        <Bell size={17} />{copy.title}{unread > 0 && <span className="rounded-full bg-[#9e2136] px-1.5 py-0.5 text-[10px] text-white">{unread > 99 ? "99+" : unread}</span>}
      </button>
    ) : (
      <button type="button" onClick={() => void showCenter()} className="flex min-h-14 w-full items-center justify-between rounded-2xl border border-white/5 bg-[#1f232b] p-5 text-start text-sm font-semibold text-white">
        <span className="flex items-center gap-3"><Bell size={19} className="text-[#E8D28A]" />{copy.title}</span>
        {unread > 0 && <span className="rounded-full bg-[#9e2136] px-2 py-1 text-xs text-white">{unread > 99 ? "99+" : unread}</span>}
      </button>
    )}
    {open && createPortal(<div role="presentation" onClick={() => setOpen(false)} className="fixed inset-0 z-[1001] flex items-center justify-center bg-black/75 px-3 py-[calc(1rem+env(safe-area-inset-top))] backdrop-blur-sm">
      <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={copy.title} onClick={(event) => event.stopPropagation()} className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-[28px] border border-white/15 bg-[#191c23] p-5 text-white shadow-2xl outline-none">
        <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-[#E8D28A]"><BellRing size={20} /><h2 className="text-lg font-bold text-white">{copy.title}</h2></div><p className="mt-1 text-xs text-white/55">{copy.description}</p></div><button type="button" onClick={() => setOpen(false)} aria-label={copy.close} className="rounded-full p-2 text-white/60 hover:bg-white/10"><X size={18} /></button></div>
        {!enabled && <div className="mt-5 rounded-2xl border border-[#D4AF37]/25 bg-[#D4AF37]/[0.06] p-4"><p className="text-sm leading-6 text-white/80">{isIos && !installed ? copy.install : permission === "denied" ? copy.disabled : copy.description}</p><button type="button" disabled={busy || permission === "denied" || (isIos && !installed)} onClick={() => void enablePush()} className="mt-3 min-h-11 w-full rounded-xl bg-[#7A1F2B] px-4 text-sm font-semibold text-white disabled:opacity-45">{busy ? copy.loading : copy.enable}</button></div>}
        {enabled && <div className="mt-5 rounded-xl bg-emerald-500/10 p-3 text-xs text-emerald-200"><p>{copy.enabled}</p><button type="button" disabled={busy} onClick={() => void disablePush()} className="mt-2 min-h-10 rounded-lg border border-white/15 px-3 text-xs text-white/70 disabled:opacity-50">{copy.disable}</button></div>}
        {error && <p role="alert" className="mt-3 text-xs text-amber-200">{error}</p>}
        <div className="mt-5 space-y-2">{loading ? <p className="text-sm text-white/50">{copy.loading}</p> : items.length === 0 ? <p className="text-sm text-white/50">{copy.empty}</p> : items.map((item) => <button key={item.id} type="button" onClick={() => { setOpen(false); router.push(item.url); }} className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-3 text-start"><span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#E8D28A]">{item.kind === "episode" ? copy.episode : copy.video}</span><span className="mt-1 block text-sm font-semibold text-white">{language === "ms" ? item.title : (item.titleTranslations?.[language] || item.title.replace(/ \+\d+$/, "")) + (item.suffix || "")}</span></button>)}</div>
      </section>
    </div>, getAppOverlayRoot())}
  </>;
}
