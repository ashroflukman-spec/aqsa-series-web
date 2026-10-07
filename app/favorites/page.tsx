"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "../../components/LanguageProvider";
import { localizeContent } from "../../lib/localizedContent";

const COPY = {
  ms: { title: "Aktiviti Anda", subtitle: "Aktiviti mendengar anda", continue: "Sambung Dengar", empty: "Tiada aktiviti pendengaran lagi." },
  en: { title: "Your Activity", subtitle: "Your listening activity", continue: "Continue Listening", empty: "No listening activity yet." },
  ar: { title: "نشاطك", subtitle: "نشاط الاستماع الخاص بك", continue: "متابعة الاستماع", empty: "لا يوجد نشاط استماع بعد." },
} as const;

type ContinueListeningItem = {
  seriesId: string;
  episodeId: string;
  seriesTitle: string;
  episodeTitle: string;
};

export default function FavoritesPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const copy = COPY[language];

  const [continueListening, setContinueListening] = useState<ContinueListeningItem[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = localStorage.getItem("continueListening");

      if (saved) {
        try {
          const parsed = JSON.parse(saved);

          if (Array.isArray(parsed)) {
            setContinueListening(parsed);
          } else {
            setContinueListening([]);
          }
        } catch {
          setContinueListening([]);
        }
      } else {
        setContinueListening([]);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main className="min-h-screen bg-[#0f1115] text-white flex justify-center">
      <div className="w-full max-w-md px-6 py-10 pb-32">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">{copy.title}</h1>
          <p className="text-sm text-gray-400 mt-2">
            {copy.subtitle}
          </p>
        </div>

        <div className="mb-4">
          <h2 className="text-sm text-gray-400 uppercase tracking-wider">
            {copy.continue}
          </h2>
        </div>

        {continueListening.length === 0 ? (
          <div className="rounded-2xl bg-[#1f232b] p-5 text-sm text-gray-400">
            {copy.empty}
          </div>
        ) : (
          <div className="space-y-3">
            {continueListening.map((item, index) => (
              <div
                key={item.seriesId + item.episodeId + index}
                onClick={() =>
                  router.push("/player/" + item.seriesId + "/" + item.episodeId)
                }
                className="bg-[#1f232b] rounded-2xl p-4 cursor-pointer hover:bg-[#262b35] transition"
              >
                <div className="text-sm font-semibold">
                  {localizeContent("episode", { id: item.episodeId, title: item.episodeTitle }, language).title}
                </div>

                <div className="text-xs text-gray-400 mt-1">
                  {localizeContent("series", { id: item.seriesId, title: item.seriesTitle }, language).title}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
