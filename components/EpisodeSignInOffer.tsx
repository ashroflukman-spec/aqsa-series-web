"use client";

import Image from "next/image";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, RefreshCw, X } from "lucide-react";
import { auth } from "../lib/firebase";
import { trackUsageEvent } from "../lib/usageAnalytics";
import { useAudio } from "./AudioProvider";
import { useAuth } from "./AuthProvider";
import { useLanguage } from "./LanguageProvider";
import { getAppOverlayRoot } from "./appOverlayRoot";

const COPY = {
  ms: {
    eyebrow: "PREMIUM PERCUMA", title: "Lebih mudah ulang kaji",
    body: "Semua episod boleh didengar tanpa akaun. Aktifkan akaun percuma untuk alat ulang kaji dan kemajuan mendengar yang diselaraskan.",
    markerBody: "Penanda masa dan nota tersedia dengan akaun percuma. Anda tetap boleh mendengar tanpa log masuk.",
    markers: "Tandakan detik penting dalam setiap episod",
    notes: "Tulis nota ringkas pada setiap penanda",
    sync: "Sambung mendengar di peranti lain",
    preview: "Pratonton ciri", sample: "Tangkap layar aplikasi", previousSlide: "Pratonton sebelumnya", nextSlide: "Pratonton seterusnya",
    google: "Aktifkan dengan Google", later: "Terus dengar tanpa akaun", close: "Tutup",
    disclosure: "Tiada bayaran atau langganan. Nama dan e-mel Google digunakan untuk akaun. Penanda dan nota kekal pada peranti ini; kemajuan mendengar diselaraskan.",
    error: "Log masuk tidak berjaya. Sila cuba lagi.", blocked: "Benarkan pop-up untuk laman ini dan cuba lagi.", episode: "Episod",
  },
  en: {
    eyebrow: "FREE PREMIUM", title: "Make every episode count",
    body: "Every episode is free to listen to. Activate a free account for study tools and synced listening progress.",
    markerBody: "Timestamp markers and notes are available with a free account. You can keep listening without signing in.",
    markers: "Mark important moments in each episode",
    notes: "Add a short note to every marker",
    sync: "Resume listening on another device",
    preview: "Feature preview", sample: "App screenshot in Malay", previousSlide: "Previous preview", nextSlide: "Next preview",
    google: "Activate with Google", later: "Keep listening without an account", close: "Close",
    disclosure: "No payment or subscription. Your Google name and email are used for your account. Markers and notes stay on this device; listening progress syncs.",
    error: "Sign-in failed. Please try again.", blocked: "Allow pop-ups for this site and try again.", episode: "Episode",
  },
  ar: {
    eyebrow: "مزايا إضافية مجانية", title: "راجع ما يهمك بسهولة",
    body: "جميع الحلقات متاحة دون حساب. فعّل حسابًا مجانيًا لأدوات المراجعة ومزامنة تقدم الاستماع.",
    markerBody: "العلامات الزمنية والملاحظات متاحة بحساب مجاني. يمكنك مواصلة الاستماع دون تسجيل الدخول.",
    markers: "ضع علامة على اللحظات المهمة في كل حلقة",
    notes: "أضف ملاحظة قصيرة إلى كل علامة",
    sync: "استأنف الاستماع على جهاز آخر",
    preview: "معاينة المزايا", sample: "لقطة شاشة للتطبيق باللغة الملايوية", previousSlide: "المعاينة السابقة", nextSlide: "المعاينة التالية",
    google: "التفعيل باستخدام Google", later: "تابع الاستماع دون حساب", close: "إغلاق",
    disclosure: "لا رسوم ولا اشتراك. يُستخدم اسمك وبريدك من Google لحسابك. تبقى العلامات والملاحظات على هذا الجهاز، ويُزامَن تقدم الاستماع.",
    error: "تعذر تسجيل الدخول. حاول مرة أخرى.", blocked: "اسمح بالنوافذ المنبثقة لهذا الموقع وحاول مجددًا.", episode: "الحلقة",
  },
} as const;

export default function EpisodeSignInOffer() {
  const { user, loading } = useAuth();
  const { signInOffer, dismissSignInOffer } = useAudio();
  const { language } = useLanguage();
  const copy = COPY[language];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const slides = [
    { image: "/feature-previews/markers.jpg", title: copy.markers, top: "-166%" },
    { image: "/feature-previews/notes.jpg", title: copy.notes, top: "-96%" },
  ];

  function showSlide(index: number) {
    const next = Math.max(0, Math.min(slides.length - 1, index));
    const element = carouselRef.current;
    if (!element) return;
    element.scrollTo({ left: next * element.clientWidth, behavior: "smooth" });
    setActiveSlide(next);
  }

  const dismiss = useCallback(() => {
    dismissSignInOffer();
    setError("");
    setActiveSlide(0);
    void trackUsageEvent("aqsa_episode_sign_in_dismissed");
  }, [dismissSignInOffer]);

  useEffect(() => {
    if (!signInOffer || user) return;
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
  }, [signInOffer, user, busy, dismiss]);

  async function signIn() {
    setError("");
    setBusy(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
      dismissSignInOffer();
      void trackUsageEvent("aqsa_sign_in", { method: "google", source: signInOffer?.source === "marker" ? "marker_offer" : "episode_offer" });
    } catch (cause) {
      const code = typeof cause === "object" && cause && "code" in cause ? String(cause.code) : "";
      if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") {
        setError(code === "auth/popup-blocked" ? copy.blocked : copy.error);
      }
    } finally {
      setBusy(false);
    }
  }

  if (!signInOffer || user || loading) return null;

  return createPortal(
    <div role="presentation" onClick={() => { if (!busy) dismiss(); }} className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-sm">
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="episode-sign-in-title" onClick={(event) => event.stopPropagation()} className="flex max-h-[90dvh] w-full max-w-sm flex-col overflow-hidden rounded-[28px] border border-white/15 bg-[#1a1d24] text-white shadow-[0_24px_70px_rgba(0,0,0,0.65)] outline-none">
        <div className="min-h-0 overflow-y-auto px-5 pb-4 pt-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex items-start justify-between gap-3">
          <Image src="/icon.png" width={46} height={46} alt="" className="size-[46px] rounded-2xl" />
          <button type="button" onClick={dismiss} disabled={busy} aria-label={copy.close} className="rounded-full p-2 text-white/55 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-[#E8D28A]"><X size={19} /></button>
        </div>
        <p className="mt-4 text-[11px] font-bold tracking-[0.26em] text-white/55" dir="ltr">{copy.eyebrow}</p>
        <h2 id="episode-sign-in-title" className="mt-2 text-xl font-bold leading-snug">{copy.title}</h2>
        <p className="mt-3 text-sm leading-6 text-white/65">{signInOffer.source === "marker" ? copy.markerBody : copy.body}</p>
        <div className="mt-5 flex items-center justify-between gap-3 text-xs text-white/50">
          <span>{copy.preview}</span><span>{copy.sample}</span>
        </div>
        <div ref={carouselRef} role="region" aria-label={copy.preview} dir="ltr" onScroll={(event) => setActiveSlide(Math.round(event.currentTarget.scrollLeft / event.currentTarget.clientWidth))} className="mt-2 flex snap-x snap-mandatory overflow-x-auto rounded-2xl [scrollbar-width:none]">
          {slides.map((slide) => (
            <div key={slide.image} className="w-full shrink-0 snap-center overflow-hidden rounded-2xl border border-white/10 bg-[#111319]">
              <div className="relative h-[170px] overflow-hidden">
                <Image src={slide.image} width={1265} height={712} unoptimized alt={slide.title} className="absolute max-w-none" style={{ width: "280%", height: "auto", left: "-88%", top: slide.top }} />
              </div>
              <p className="border-t border-white/10 px-3 py-3 text-sm font-medium text-white/85">{slide.title}</p>
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5" aria-hidden="true">{slides.map((slide, index) => <span key={slide.image} className={`h-1.5 rounded-full transition-all ${index === activeSlide ? "w-5 bg-[#D4AF37]" : "w-1.5 bg-white/30"}`} />)}</div>
          <div className="flex gap-2">
            <button type="button" onClick={() => showSlide(activeSlide - 1)} disabled={activeSlide === 0} aria-label={copy.previousSlide} className="flex size-8 items-center justify-center rounded-full border border-white/15 text-white/80 disabled:opacity-35"><ChevronLeft size={17} /></button>
            <button type="button" onClick={() => showSlide(activeSlide + 1)} disabled={activeSlide === slides.length - 1} aria-label={copy.nextSlide} className="flex size-8 items-center justify-center rounded-full border border-white/15 text-white/80 disabled:opacity-35"><ChevronRight size={17} /></button>
          </div>
        </div>
        <p className="mt-3 flex items-center gap-2 text-sm text-white/75"><RefreshCw size={16} className="shrink-0 text-[#E8D28A]" />{copy.sync}</p>
        <p className="mt-3 text-xs leading-5 text-white/40">{copy.disclosure}</p>
        {error ? <p role="alert" className="mt-3 rounded-xl border border-red-500/25 bg-red-950/30 p-3 text-xs text-red-200">{error}</p> : null}
        </div>
        <div className="shrink-0 border-t border-white/10 bg-[#1a1d24] px-5 pb-4 pt-3">
        <button type="button" disabled={busy} onClick={() => void signIn()} className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-[#7A1F2B] px-4 text-sm font-semibold text-white transition hover:bg-[#8d2936] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8D28A]">
          <span aria-hidden="true" className="flex size-6 items-center justify-center rounded-full bg-white text-sm font-bold text-[#4285F4]">G</span>
          {copy.google}
        </button>
        <button type="button" disabled={busy} onClick={dismiss} className="mt-2 min-h-11 w-full rounded-xl text-sm font-medium text-white/75 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-[#E8D28A]">{copy.later}</button>
        </div>
      </div>
    </div>,
    getAppOverlayRoot()
  );
}
