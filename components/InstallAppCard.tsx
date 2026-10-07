"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, Share2, X } from "lucide-react";
import { useInstall } from "./InstallProvider";
import { useLanguage } from "./LanguageProvider";

const DISMISS_KEY = "aqsa-install-nudge-until";
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
const SITE_URL = "https://www.aqsaseries.com";
type IosGuideBrowser = "safari" | "chrome" | "other";

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
    browser: "Pelayar",
    safari: "Safari",
    chrome: "Chrome",
    otherBrowser: "Pelayar ini",
    iosOther: "Jika pilihan ini tiada dalam pelayar anda, buka pautan ini di **Safari**:",
    iosSteps: ["Dalam **Safari**, tekan **Share** (atau **Page Menu** → **Share**).", "Pilih **Add to Home Screen**.", "Aktifkan **Open as Web App** jika tersedia, kemudian tekan **Add**."],
    iosChromeSteps: ["Dalam **Chrome**, tekan **Share** di sebelah kanan bar alamat.", "Pilih **Add to Home Screen**.", "Semak nama, kemudian tekan **Add**."],
    iosOtherSteps: ["Tekan **Share** dalam pelayar ini.", "Jika ada, pilih **Add to Home Screen**, kemudian **Add**."],
    androidSteps: ["Buka laman ini dalam **Chrome** dan tekan **More** (⋮).", "Pilih **Install app** atau **Install and create shortcut** → **Create shortcut**.", "Sahkan **Install** atau **Add**."],
    desktopSteps: ["Buka menu pelayar atau ikon **Install** di bar alamat.", "Pilih **Install Aqsa Series** dan sahkan."],
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
    browser: "Browser",
    safari: "Safari",
    chrome: "Chrome",
    otherBrowser: "This browser",
    iosOther: "If this option is missing in your browser, open this link in **Safari**:",
    iosSteps: ["In **Safari**, tap **Share** (or **Page Menu** → **Share**).", "Choose **Add to Home Screen**.", "Turn on **Open as Web App** if available, then tap **Add**."],
    iosChromeSteps: ["In **Chrome**, tap **Share** to the right of the address bar.", "Choose **Add to Home Screen**.", "Check the name, then tap **Add**."],
    iosOtherSteps: ["Tap **Share** in this browser.", "If available, choose **Add to Home Screen**, then **Add**."],
    androidSteps: ["Open this site in **Chrome** and tap **More** (⋮).", "Choose **Install app** or **Install and create shortcut** → **Create shortcut**.", "Confirm **Install** or **Add**."],
    desktopSteps: ["Open the browser menu or the **Install** icon in the address bar.", "Choose **Install Aqsa Series** and confirm."],
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
    browser: "المتصفح",
    safari: "Safari",
    chrome: "Chrome",
    otherBrowser: "هذا المتصفح",
    iosOther: "إذا لم يظهر هذا الخيار في متصفحك، فافتح الرابط في **Safari**:",
    iosSteps: ["في **Safari**، اضغط **Share** (أو **Page Menu**، ثم **Share**).", "اختر **Add to Home Screen**.", "فعّل **Open as Web App** إن ظهر، ثم اضغط **Add**."],
    iosChromeSteps: ["في **Chrome**، اضغط **Share** بجوار شريط العنوان.", "اختر **Add to Home Screen**.", "راجع الاسم، ثم اضغط **Add**."],
    iosOtherSteps: ["اضغط **Share** في هذا المتصفح.", "إن ظهر الخيار، اختر **Add to Home Screen** ثم **Add**."],
    androidSteps: ["افتح الموقع في **Chrome** واضغط **More** (⋮).", "اختر **Install app** أو **Install and create shortcut** ثم **Create shortcut**.", "أكد **Install** أو **Add**."],
    desktopSteps: ["افتح قائمة المتصفح أو رمز **Install** في شريط العنوان.", "اختر **Install Aqsa Series** ثم أكد."],
    copied: "تم نسخ الرابط",
    copy: "نسخ الرابط",
  },
} as const;

function renderGuideText(value: string) {
  return value.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith("**") && part.endsWith("**")
      ? <bdi key={index} dir="ltr"><strong className="font-bold text-[#E8D28A]">{part.slice(2, -2)}</strong></bdi>
      : part
  );
}

export default function InstallAppCard({ surface }: { surface: "home" | "settings" }) {
  const { language } = useLanguage();
  const { platform, installed, canPrompt, promptInstall } = useInstall();
  const copy = COPY[language];
  const [guideOpen, setGuideOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [iosGuideBrowser, setIosGuideBrowser] = useState<IosGuideBrowser | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDismissed(Number(localStorage.getItem(DISMISS_KEY) || 0) > Date.now());
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!guideOpen) return;
    const previousOverflow = document.body.style.overflow;
    const trigger = triggerRef.current;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setGuideOpen(false);
    };
    window.addEventListener("keydown", onEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onEscape);
      trigger?.focus();
    };
  }, [guideOpen]);

  if (platform === "unknown") return null;
  if (surface === "home" && (installed || dismissed || platform === "other")) return null;

  const isIos = platform === "ios-safari" || platform === "ios-chrome" || platform === "ios-other";
  const selectedBrowser = iosGuideBrowser ?? (platform === "ios-chrome" ? "chrome" : platform === "ios-safari" ? "safari" : "other");
  const steps = isIos && selectedBrowser === "safari" ? copy.iosSteps
    : isIos && selectedBrowser === "chrome" ? copy.iosChromeSteps
    : isIos ? copy.iosOtherSteps
    : platform === "android" ? copy.androidSteps : copy.desktopSteps;

  async function handleInstall() {
    if (canPrompt) {
      const result = await promptInstall();
      if (result !== "unavailable") return;
    }
    setIosGuideBrowser(null);
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
          <button ref={triggerRef} type="button" onClick={handleInstall} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#D4AF37]/30 bg-[#7A1F2B] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#8b2533] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8D28A]">
            {canPrompt ? <Download size={17} /> : <Share2 size={17} />}
            {canPrompt ? copy.install : copy.guide}
          </button>
        )}
      </section>

      {guideOpen && createPortal(
        <div role="presentation" onClick={() => setGuideOpen(false)} className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/75 px-3 py-[calc(1rem+env(safe-area-inset-top))] backdrop-blur-sm">
          <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={copy.title} onClick={(event) => event.stopPropagation()} className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-[28px] border border-white/15 bg-[#191c23] p-5 text-white shadow-2xl outline-none">
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

            {isIos && (
              <div className={`mt-5 grid gap-2 ${platform === "ios-other" ? "grid-cols-3" : "grid-cols-2"}`} role="group" aria-label={copy.browser}>
                {(["safari", "chrome"] as const).map((browser) => (
                  <button key={browser} type="button" dir="ltr" onClick={() => setIosGuideBrowser(browser)} aria-pressed={selectedBrowser === browser} className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-bold transition ${selectedBrowser === browser ? "border-[#D4AF37]/60 bg-[#7A1F2B] text-white" : "border-white/15 bg-white/5 text-white/70"}`}>
                    {browser === "safari" ? copy.safari : copy.chrome}
                  </button>
                ))}
                {platform === "ios-other" && (
                  <button type="button" onClick={() => setIosGuideBrowser("other")} aria-pressed={selectedBrowser === "other"} className={`min-h-11 rounded-xl border px-2 py-2 text-sm font-semibold transition ${selectedBrowser === "other" ? "border-[#D4AF37]/60 bg-[#7A1F2B] text-white" : "border-white/15 bg-white/5 text-white/70"}`}>
                    {copy.otherBrowser}
                  </button>
                )}
              </div>
            )}

            <ol className="mt-5 space-y-3">
              {steps.map((step, index) => (
                <li key={step} className="flex items-start gap-3 text-sm leading-6 text-white/85">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#7A1F2B] text-xs font-bold text-white">{index + 1}</span>
                  <span>{renderGuideText(step)}</span>
                </li>
              ))}
            </ol>
            {isIos && selectedBrowser === "other" && (
              <div className="mt-5 rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/10 p-3 text-sm">
                <p>{renderGuideText(copy.iosOther)}</p>
                <p className="mt-1 break-all font-medium text-[#E8D28A]" dir="ltr">{SITE_URL}</p>
                <button type="button" onClick={copyLink} className="mt-3 rounded-lg border border-[#D4AF37]/35 px-3 py-2 text-xs font-semibold text-[#E8D28A]">{copied ? copy.copied : copy.copy}</button>
              </div>
            )}
            <button type="button" onClick={() => setGuideOpen(false)} className="mt-6 min-h-11 w-full rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white">{copy.close}</button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
