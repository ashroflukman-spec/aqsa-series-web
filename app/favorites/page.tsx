"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "../../components/LanguageProvider";
import { localizeContent } from "../../lib/localizedContent";
import ContentFeedback from "../../components/ContentFeedback";

const COPY = {
  ms: { title: "Aktiviti Anda", subtitle: "Aktiviti mendengar anda", continue: "Sambung Dengar", loading: "Sedang memuatkan aktiviti...", empty: "Tiada aktiviti pendengaran lagi.", emptyDetail: "Mula dengar episod dalam pustaka untuk melihatnya di sini.", explore: "Teroka pustaka" },
  en: { title: "Your Activity", subtitle: "Your listening activity", continue: "Continue Listening", loading: "Loading activity...", empty: "No listening activity yet.", emptyDetail: "Play an episode from the library to see it here.", explore: "Explore library" },
  ar: { title: "نشاطك", subtitle: "نشاط الاستماع الخاص بك", continue: "متابعة الاستماع", loading: "جارٍ تحميل النشاط...", empty: "لا يوجد نشاط استماع بعد.", emptyDetail: "شغّل حلقة من المكتبة لتظهر هنا.", explore: "تصفح المكتبة" },
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
  const [loading, setLoading] = useState(true);

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
      setLoading(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main className="min-h-screen bg-[#0f1115] text-white flex justify-center">
      <div className="w-full max-w-md px-6 py-10 pb-[calc(11rem+env(safe-area-inset-bottom))]">
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

        {loading ? <ContentFeedback kind="loading" title={copy.loading} /> : continueListening.length === 0 ? (
          <ContentFeedback kind="empty" title={copy.empty} detail={copy.emptyDetail} actionLabel={copy.explore} onAction={() => router.push("/library")} />
        ) : (
          <div className="space-y-3">
            {continueListening.map((item, index) => (
              <button
                key={item.seriesId + item.episodeId + index}
                type="button"
                onClick={() =>
                  router.push("/player/" + item.seriesId + "/" + item.episodeId)
                }
                className="block w-full min-h-14 bg-[#1f232b] rounded-2xl p-4 text-start hover:bg-[#262b35] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8D28A]"
              >
                <div className="text-sm font-semibold">
                  {localizeContent("episode", { id: item.episodeId, title: item.episodeTitle }, language).title}
                </div>

                <div className="text-xs text-gray-400 mt-1">
                  {localizeContent("series", { id: item.seriesId, title: item.seriesTitle }, language).title}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
