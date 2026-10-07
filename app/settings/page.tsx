"use client";

import { useEffect, useState } from "react";
import { useLanguage, type AppLanguage } from "../../components/LanguageProvider";
import InstallAppCard from "../../components/InstallAppCard";

const COPY = {
  ms: {
    title: "Tetapan",
    subtitle: "Tetapan asas Aqsa Series",
    language: "Bahasa",
    languageHelp: "Pilih bahasa antaramuka dan kandungan yang tersedia",
    autoPlay: "Main automatik episod seterusnya",
    autoPlayHelp: "Mainkan episod seterusnya secara automatik",
    miniPlayer: "Paparkan pemain mini",
    miniPlayerHelp: "Paparkan pemain mini di bahagian bawah skrin",
    compact: "Mod ringkas",
    compactHelp: "Gunakan paparan yang lebih ringkas",
    about: "Tentang Aqsa Series",
    aboutText: "Aqsa Series ialah platform audio untuk siri ilmu, tadabbur, sejarah, dan pembangunan ummah. Tetapan di halaman ini disimpan pada peranti anda.",
  },
  en: {
    title: "Settings",
    subtitle: "Aqsa Series preferences",
    language: "Language",
    languageHelp: "Choose the interface and available content language",
    autoPlay: "Auto-play next episode",
    autoPlayHelp: "Automatically play the next episode",
    miniPlayer: "Show mini player",
    miniPlayerHelp: "Show the mini player at the bottom of the screen",
    compact: "Compact mode",
    compactHelp: "Use a more compact layout",
    about: "About Aqsa Series",
    aboutText: "Aqsa Series is an audio platform for learning, reflection, history, and community development. Your preferences are saved on this device.",
  },
  ar: {
    title: "الإعدادات",
    subtitle: "تفضيلات سلسلة الأقصى",
    language: "اللغة",
    languageHelp: "اختر لغة الواجهة والمحتوى المتاح",
    autoPlay: "تشغيل الحلقة التالية تلقائيًا",
    autoPlayHelp: "تشغيل الحلقة التالية تلقائيًا",
    miniPlayer: "إظهار المشغل المصغر",
    miniPlayerHelp: "إظهار المشغل المصغر أسفل الشاشة",
    compact: "الوضع المختصر",
    compactHelp: "استخدام عرض أكثر اختصارًا",
    about: "حول سلسلة الأقصى",
    aboutText: "سلسلة الأقصى منصة صوتية للمعرفة والتدبر والتاريخ وبناء الأمة. تُحفظ تفضيلاتك على هذا الجهاز.",
  },
} as const;

const LANGUAGE_OPTIONS: { code: AppLanguage; label: string }[] = [
  { code: "ms", label: "Melayu" },
  { code: "en", label: "English" },
  { code: "ar", label: "العربية" },
];

export default function SettingsPage() {
  const { language, setLanguage } = useLanguage();
  const copy = COPY[language];
  const [autoPlayNext, setAutoPlayNext] = useState(true);
  const [showMiniPlayer, setShowMiniPlayer] = useState(true);
  const [compactMode, setCompactMode] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedAutoPlay = localStorage.getItem("setting-autoPlayNext");
      const savedMiniPlayer = localStorage.getItem("setting-showMiniPlayer");
      const savedCompactMode = localStorage.getItem("setting-compactMode");

      if (savedAutoPlay !== null) setAutoPlayNext(savedAutoPlay === "true");
      if (savedMiniPlayer !== null) setShowMiniPlayer(savedMiniPlayer === "true");
      if (savedCompactMode !== null) setCompactMode(savedCompactMode === "true");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function toggleAutoPlayNext() {
    const updated = !autoPlayNext;
    setAutoPlayNext(updated);
    localStorage.setItem("setting-autoPlayNext", String(updated));
    window.dispatchEvent(new Event("aqsa:settings-changed"));
  }

  function toggleShowMiniPlayer() {
    const updated = !showMiniPlayer;
    setShowMiniPlayer(updated);
    localStorage.setItem("setting-showMiniPlayer", String(updated));
    window.dispatchEvent(new Event("aqsa:settings-changed"));
  }

  function toggleCompactMode() {
    const updated = !compactMode;
    setCompactMode(updated);
    localStorage.setItem("setting-compactMode", String(updated));
    window.dispatchEvent(new Event("aqsa:settings-changed"));
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0f1115] to-[#1a1d24] text-white flex justify-center">
      <div className="w-full max-w-md px-6 py-10 pb-32">
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-center">
            {copy.title}
          </h1>

          <p className="text-center text-sm text-gray-400 mt-2">
            {copy.subtitle}
          </p>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-white/5 bg-[#1f232b] p-5">
            <p className="text-sm font-semibold">{copy.language}</p>
            <p className="mt-1 text-xs text-gray-400">{copy.languageHelp}</p>
            <div className="mt-4 grid grid-cols-3 gap-2" role="group" aria-label={copy.language}>
              {LANGUAGE_OPTIONS.map((option) => (
                <button
                  key={option.code}
                  type="button"
                  lang={option.code}
                  onClick={() => setLanguage(option.code)}
                  aria-pressed={language === option.code}
                  className={`min-h-11 rounded-xl border px-2 py-2 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8D28A] ${
                    language === option.code
                      ? "border-[#D4AF37]/55 bg-[#7A1F2B] text-white"
                      : "border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-[#1f232b] p-5 border border-white/5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">
                  {copy.autoPlay}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {copy.autoPlayHelp}
                </p>
              </div>

              <button
                onClick={toggleAutoPlayNext}
                aria-label={copy.autoPlay}
                aria-pressed={autoPlayNext}
                className={`w-14 h-8 rounded-full relative transition ${
                  autoPlayNext ? "bg-[#7A1F2B]" : "bg-gray-600"
                }`}
              >
                <span
                  className={`absolute top-1 h-6 w-6 rounded-full bg-white transition ${
                    autoPlayNext ? "left-7" : "left-1"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-[#1f232b] p-5 border border-white/5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">
                  {copy.miniPlayer}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {copy.miniPlayerHelp}
                </p>
              </div>

              <button
                onClick={toggleShowMiniPlayer}
                aria-label={copy.miniPlayer}
                aria-pressed={showMiniPlayer}
                className={`w-14 h-8 rounded-full relative transition ${
                  showMiniPlayer ? "bg-[#7A1F2B]" : "bg-gray-600"
                }`}
              >
                <span
                  className={`absolute top-1 h-6 w-6 rounded-full bg-white transition ${
                    showMiniPlayer ? "left-7" : "left-1"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-[#1f232b] p-5 border border-white/5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">
                  {copy.compact}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {copy.compactHelp}
                </p>
              </div>

              <button
                onClick={toggleCompactMode}
                aria-label={copy.compact}
                aria-pressed={compactMode}
                className={`w-14 h-8 rounded-full relative transition ${
                  compactMode ? "bg-[#7A1F2B]" : "bg-gray-600"
                }`}
              >
                <span
                  className={`absolute top-1 h-6 w-6 rounded-full bg-white transition ${
                    compactMode ? "left-7" : "left-1"
                  }`}
                />
              </button>
            </div>
          </div>

          <InstallAppCard surface="settings" />

          <div className="rounded-2xl bg-[#14161b] p-5 border border-white/5">
            <p className="text-sm font-semibold mb-2">
              {copy.about}
            </p>

            <p className="text-xs text-gray-400 leading-6">
              {copy.aboutText}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
