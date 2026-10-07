"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Download, Share2, X } from "lucide-react";
import { useInstall } from "./InstallProvider";
import { useLanguage } from "./LanguageProvider";

const DISMISS_KEY = "aqsa-install-nudge-until";
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
const SITE_URL = "https://www.aqsaseries.com";

const COPY = {
  ms: {
    title: "Simpan Aqsa Series di skrin utama",
    description: "Buka terus dari ikon telefon anda.",
    install: "Pasang aplikasi",
    guide: "Lihat cara",
    close: "Tutup panduan",
    dismiss: "Sembunyikan cadangan",
    installed: "Aqsa Series sudah ada di skrin utama",
    intro: "Ikut langkah ringkas ini untuk menambah ikon Aqsa Series.",
    iosOther: "Buka alamat ini dalam Safari dahulu:",
    iosSteps: ["Dalam Safari, tekan Kongsi (atau menu halaman → Kongsi).", "Pilih Tambah ke Skrin Utama.", "Tekan Tambah. Pilih Buka sebagai Aplikasi Web jika pilihan itu muncul."],
    androidSteps: ["Buka laman ini dalam Chrome dan tekan menu ⋮.", "Pilih Pasang aplikasi atau Tambah ke skrin utama.", "Sahkan Pasang atau Tambah."],
    desktopSteps: ["Buka menu pelayar atau ikon pemasangan di bar alamat.", "Pilih Pasang Aqsa Series dan sahkan."],
    copied: "Pautan disalin",
    copy: "Salin pautan",
  },
  en: {
    title: "Add Aqsa Series to your Home Screen",
    description: "Open it straight from your phone's icon.",
    install: "Install app",
    guide: "Show steps",
    close: "Close guide",
    dismiss: "Hide suggestion",
    installed: "Aqsa Series is already on your Home Screen",
    intro: "Follow these quick steps to add the Aqsa Series icon.",
    iosOther: "First, open this address in Safari:",
    iosSteps: ["In Safari, tap Share (or Page Menu → Share).", "Choose Add to Home Screen.", "Tap Add. Select Open as Web App if it appears."],
    androidSteps: ["Open this site in Chrome and tap the ⋮ menu.", "Choose Install app or Add to Home screen.", "Confirm Install or Add."],
    desktopSteps: ["Open the browser menu or the install icon in the address bar.", "Choose Install Aqsa Series and confirm."],
    copied: "Link copied",
    copy: "Copy link",
  },
  ar: {
    title: "أضف Aqsa Series إلى الشاشة الرئيسية",
    description: "افتحه مباشرة من أيقونة هاتفك.",
    install: "تثبيت التطبيق",
    guide: "عرض الخطوات",
    close: "إغلاق الدليل",
    dismiss: "إخفاء الاقتراح",
    installed: "Aqsa Series موجود بالفعل على الشاشة الرئيسية",
    intro: "اتبع هذه الخطوات لإضافة أيقونة Aqsa Series.",
    iosOther: "افتح هذا العنوان في Safari أولًا:",
    iosSteps: ["في Safari، اضغط مشاركة (أو قائمة الصفحة ← مشاركة).", "اختر إضافة إلى الشاشة الرئيسية.", "اضغط إضافة. اختر فتح كتطبيق ويب إذا ظهر الخيار."],
    androidSteps: ["افتح الموقع في Chrome واضغط القائمة ⋮.", "اختر تثبيت التطبيق أو إضافة إلى الشاشة الرئيسية.", "أكد التثبيت أو الإضافة."],
    desktopSteps: ["افتح قائمة المتصفح أو رمز التثبيت في شريط العنوان.", "اختر تثبيت Aqsa Series ثم أكد."],
    copied: "تم نسخ الرابط",
    copy: "نسخ الرابط",
  },
} as const;

export default function InstallAppCard({ surface }: { surface: "home" | "settings" }) {
  const { language } = useLanguage();
  const { platform, installed, canPrompt, promptInstall } = useInstall();
  const copy = COPY[language];
  const [guideOpen, setGuideOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDismissed(Number(localStorage.getItem(DISMISS_KEY) || 0) > Date.now());
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!guideOpen) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setGuideOpen(false);
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [guideOpen]);

  if (platform === "unknown") return null;
  if (surface === "home" && (installed || dismissed || platform === "other")) return null;

  const steps = platform === "ios-safari" || platform === "ios-other"
    ? copy.iosSteps
    : platform === "android" ? copy.androidSteps : copy.desktopSteps;

  async function handleInstall() {
    if (canPrompt) {
      const result = await promptInstall();
      if (result !== "unavailable") return;
    }
    setGuideOpen(true);
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + SEVEN_DAYS));
    setDismissed(true);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(SITE_URL);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <section className={`relative rounded-2xl border border-[#D4AF37]/25 bg-gradient-to-br from-[#24202a] to-[#181b22] p-4 shadow-[0_14px_35px_rgba(0,0,0,0.2)] ${surface === "home" ? "mb-9" : ""}`} aria-label={copy.title}>
        {surface === "home" && (
          <button type="button" onClick={dismiss} aria-label={copy.dismiss} className="absolute end-3 top-3 rounded-full p-1.5 text-white/45 hover:bg-white/10 hover:text-white">
            <X size={16} />
          </button>
        )}
        <div className="flex items-center gap-3 pe-6">
          <Image src="/icon.png" alt="" width={52} height={52} className="h-13 w-13 shrink-0 rounded-xl" />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold leading-snug text-white">{installed ? copy.installed : copy.title}</h2>
            {!installed && <p className="mt-1 text-xs text-white/55">{copy.description}</p>}
          </div>
        </div>
        {!installed && (
          <button type="button" onClick={handleInstall} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#D4AF37]/30 bg-[#7A1F2B] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#8b2533] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8D28A]">
            {canPrompt ? <Download size={17} /> : <Share2 size={17} />}
            {canPrompt ? copy.install : copy.guide}
          </button>
        )}
      </section>

      {guideOpen && (
        <div role="presentation" onClick={() => setGuideOpen(false)} className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 px-3 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center">
          <div role="dialog" aria-modal="true" aria-label={copy.title} onClick={(event) => event.stopPropagation()} className="w-full max-w-md rounded-[28px] border border-white/15 bg-[#191c23] p-5 text-white shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <Image src="/icon.png" alt="" width={48} height={48} className="h-12 w-12 rounded-xl" />
                <div>
                  <h2 className="text-base font-bold">{copy.title}</h2>
                  <p className="mt-1 text-xs text-white/55">{copy.intro}</p>
                </div>
              </div>
              <button type="button" onClick={() => setGuideOpen(false)} aria-label={copy.close} className="rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white"><X size={18} /></button>
            </div>

            {platform === "ios-other" && (
              <div className="mt-5 rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/10 p-3 text-sm">
                <p>{copy.iosOther}</p>
                <p className="mt-1 break-all font-medium text-[#E8D28A]" dir="ltr">{SITE_URL}</p>
                <button type="button" onClick={copyLink} className="mt-3 rounded-lg border border-[#D4AF37]/35 px-3 py-2 text-xs font-semibold text-[#E8D28A]">{copied ? copy.copied : copy.copy}</button>
              </div>
            )}

            <ol className="mt-5 space-y-3">
              {steps.map((step, index) => (
                <li key={step} className="flex items-start gap-3 text-sm leading-6 text-white/85">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#7A1F2B] text-xs font-bold text-white">{index + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <button type="button" onClick={() => setGuideOpen(false)} className="mt-6 min-h-11 w-full rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white">{copy.close}</button>
          </div>
        </div>
      )}
    </>
  );
}
