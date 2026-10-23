"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LockKeyhole, X } from "lucide-react";
import { auth } from "../lib/firebase";
import { trackUsageEvent } from "../lib/usageAnalytics";
import { useAudio } from "./AudioProvider";
import { useAuth } from "./AuthProvider";
import { useLanguage } from "./LanguageProvider";
import { getAppOverlayRoot } from "./appOverlayRoot";

const COPY = {
  ms: {
    eyebrow: "AQSA SERIES", title: "Teruskan siri ini",
    body: "Tiga episod pertama boleh didengar tanpa akaun. Log masuk dengan Google untuk mendengar episod keempat dan seterusnya.",
    google: "Teruskan dengan Google", later: "Kembali ke siri", close: "Tutup",
    disclosure: "Nama dan e-mel Google digunakan untuk akaun serta penyegerakan kemajuan mendengar.",
    error: "Log masuk tidak berjaya. Sila cuba lagi.", blocked: "Benarkan pop-up untuk laman ini dan cuba lagi.", episode: "Episod",
  },
  en: {
    eyebrow: "AQSA SERIES", title: "Continue this series",
    body: "The first three episodes are available without an account. Sign in with Google to listen to episode four and beyond.",
    google: "Continue with Google", later: "Back to series", close: "Close",
    disclosure: "Your Google name and email are used for your account and listening progress sync.",
    error: "Sign-in failed. Please try again.", blocked: "Allow pop-ups for this site and try again.", episode: "Episode",
  },
  ar: {
    eyebrow: "AQSA SERIES", title: "تابع هذه السلسلة",
    body: "يمكنك الاستماع إلى الحلقات الثلاث الأولى دون حساب. سجّل الدخول باستخدام Google للاستماع إلى الحلقة الرابعة وما بعدها.",
    google: "المتابعة باستخدام Google", later: "العودة إلى السلسلة", close: "إغلاق",
    disclosure: "يُستخدم اسمك وبريدك من Google للحساب ومزامنة تقدم الاستماع.",
    error: "تعذر تسجيل الدخول. حاول مرة أخرى.", blocked: "اسمح بالنوافذ المنبثقة لهذا الموقع وحاول مجددًا.", episode: "الحلقة",
  },
} as const;

export default function EpisodeSignInGate() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { signInRequired, dismissSignInRequired } = useAudio();
  const { language } = useLanguage();
  const copy = COPY[language];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);

  const dismiss = useCallback(() => {
    dismissSignInRequired();
    setError("");
    void trackUsageEvent("aqsa_episode_sign_in_dismissed");
  }, [dismissSignInRequired]);

  useEffect(() => {
    if (!signInRequired || user) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) dismiss();
    };
    window.addEventListener("keydown", onEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onEscape);
    };
  }, [signInRequired, user, busy, dismiss]);

  async function signIn() {
    setError("");
    setBusy(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
      void trackUsageEvent("aqsa_sign_in", { method: "google", source: "episode_four" });
    } catch (cause) {
      const code = typeof cause === "object" && cause && "code" in cause ? String(cause.code) : "";
      if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") {
        setError(code === "auth/popup-blocked" ? copy.blocked : copy.error);
      }
    } finally {
      setBusy(false);
    }
  }

  if (!signInRequired || user || loading) return null;

  return createPortal(
    <div role="presentation" onClick={() => { if (!busy) dismiss(); }} className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-sm">
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="episode-sign-in-title" onClick={(event) => event.stopPropagation()} className="max-h-[90dvh] w-full max-w-sm overflow-y-auto rounded-[28px] border border-[#D4AF37]/25 bg-[#1a1d24] p-6 text-white shadow-[0_24px_70px_rgba(0,0,0,0.65)] outline-none">
        <div className="flex items-start justify-between gap-3">
          <Image src="/icon.png" width={54} height={54} alt="" className="size-[54px] rounded-2xl" />
          <button type="button" onClick={dismiss} disabled={busy} aria-label={copy.close} className="rounded-full p-2 text-white/55 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-[#E8D28A]"><X size={19} /></button>
        </div>
        <p className="mt-6 text-[11px] font-bold tracking-[0.26em] text-[#E8D28A]" dir="ltr">{copy.eyebrow}</p>
        <h2 id="episode-sign-in-title" className="mt-2 text-xl font-bold leading-snug">{copy.title}</h2>
        <p className="mt-3 text-sm leading-6 text-white/65">{copy.body}</p>
        <div className="mt-5 flex items-center gap-3 rounded-xl border border-[#D4AF37]/25 bg-[#D4AF37]/[0.06] p-3 text-sm text-[#E8D28A]">
          <LockKeyhole size={18} className="shrink-0" />
          <span className="min-w-0 truncate">{signInRequired.position > 0 ? `${copy.episode} ${signInRequired.position}: ` : ""}{signInRequired.episode.episodeTitle}</span>
        </div>
        <button type="button" disabled={busy} onClick={() => void signIn()} className="mt-6 flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-[#7A1F2B] px-4 text-sm font-semibold text-white transition hover:bg-[#8d2936] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8D28A]">
          <span aria-hidden="true" className="flex size-6 items-center justify-center rounded-full bg-white text-sm font-bold text-[#4285F4]">G</span>
          {copy.google}
        </button>
        <button type="button" disabled={busy} onClick={() => { const seriesId = signInRequired.episode.seriesId; dismiss(); router.push(`/series/${seriesId}`); }} className="mt-2 min-h-11 w-full rounded-xl text-sm font-medium text-white/75 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-[#E8D28A]">{copy.later}</button>
        <p className="mt-3 text-xs leading-5 text-white/40">{copy.disclosure}</p>
        {error ? <p role="alert" className="mt-3 rounded-xl border border-red-500/25 bg-red-950/30 p-3 text-xs text-red-200">{error}</p> : null}
      </div>
    </div>,
    getAppOverlayRoot()
  );
}
