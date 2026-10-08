"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useLanguage } from "../../components/LanguageProvider";
import { localizeContent, type TranslatableContent } from "../../lib/localizedContent";
import ContentFeedback from "../../components/ContentFeedback";

const COPY = {
  ms: { back: "Kembali", title: "Pustaka", subtitle: "Semua siri dan episod yang tersedia.", loading: "Sedang memuatkan pustaka...", empty: "Belum ada siri dalam pustaka.", failed: "Pustaka belum dapat dimuatkan", failedDetail: "Sila cuba lagi sebentar lagi.", offlineDetail: "Peranti anda tidak bersambung ke internet. Semak sambungan dan cuba lagi.", retry: "Cuba lagi", speaker: "Penyampai", unknownSpeaker: "Penyampai tidak diketahui" },
  en: { back: "Back", title: "Library", subtitle: "Browse all available series and episodes.", loading: "Loading library...", empty: "No series in the library yet.", failed: "Library could not be loaded", failedDetail: "Please try again shortly.", offlineDetail: "Your device is offline. Check your connection and try again.", retry: "Try again", speaker: "Speaker", unknownSpeaker: "Unknown speaker" },
  ar: { back: "رجوع", title: "المكتبة", subtitle: "تصفح جميع السلاسل والحلقات المتاحة.", loading: "جارٍ تحميل المكتبة...", empty: "لا توجد سلاسل في المكتبة بعد.", failed: "تعذّر تحميل المكتبة", failedDetail: "يرجى المحاولة مرة أخرى بعد قليل.", offlineDetail: "جهازك غير متصل بالإنترنت. تحقق من الاتصال وحاول مرة أخرى.", retry: "إعادة المحاولة", speaker: "المتحدث", unknownSpeaker: "متحدث غير معروف" },
} as const;

type SeriesItem = {
  id: string;
  title: string;
  speakerId: string;
  coverUrl: string;
  isPublished: boolean;
  sortOrder: number;
  isDeleted?: boolean;
  translations?: TranslatableContent["translations"];
};

type EpisodeItem = {
  id: string;
  title: string;
  seriesId: string;
  speakerId: string;
  audioUrl?: string;
  durationSeconds?: number;
  displayOrder?: number;
  isPublished?: boolean;
  isDeleted?: boolean;
  translations?: TranslatableContent["translations"];
};

type SpeakerItem = {
  id: string;
  name?: string;
  fullName?: string;
  displayName?: string;
  slug?: string;
  isDeleted?: boolean;
};

function formatDuration(seconds = 0) {
  if (!seconds || seconds <= 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export default function LibraryPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const copy = COPY[language];

  const [series, setSeries] = useState<SeriesItem[]>([]);
  const [episodes, setEpisodes] = useState<EpisodeItem[]>([]);
  const [speakerMap, setSpeakerMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError("");
        const seriesQuery = query(
          collection(db, "series"),
          orderBy("sortOrder", "asc")
        );
        const [seriesSnapshot, episodesSnapshot, speakersSnapshot] = await Promise.all([
          getDocs(seriesQuery),
          getDocs(collection(db, "episodes")),
          getDocs(collection(db, "speakers")),
        ]);

        const seriesData: SeriesItem[] = seriesSnapshot.docs
          .map((docItem) => ({
            id: docItem.id,
            title: docItem.data().title ?? "",
            speakerId: docItem.data().speakerId ?? "",
            coverUrl: docItem.data().coverUrl ?? "",
            isPublished: docItem.data().isPublished ?? false,
            sortOrder: docItem.data().sortOrder ?? 0,
            isDeleted: docItem.data().isDeleted ?? false,
            translations: docItem.data().translations ?? undefined,
          }))
          .filter((item) => item.isPublished === true && item.isDeleted !== true);

        const episodesData: EpisodeItem[] = episodesSnapshot.docs
          .map((docItem) => ({
            id: docItem.id,
            title: docItem.data().title ?? "",
            seriesId: docItem.data().seriesId ?? "",
            speakerId: docItem.data().speakerId ?? "",
            audioUrl: docItem.data().audioUrl ?? "",
            durationSeconds: docItem.data().durationSeconds ?? 0,
            displayOrder: docItem.data().displayOrder ?? 0,
            isPublished: docItem.data().isPublished ?? false,
            isDeleted: docItem.data().isDeleted ?? false,
            translations: docItem.data().translations ?? undefined,
          }))
          .filter((item) => item.isPublished === true && item.isDeleted !== true)
          .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

        const speakersData: SpeakerItem[] = speakersSnapshot.docs
          .map((docItem) => ({
            id: docItem.id,
            name: docItem.data().name ?? "",
            fullName: docItem.data().fullName ?? "",
            displayName: docItem.data().displayName ?? "",
            slug: docItem.data().slug ?? "",
            isDeleted: docItem.data().isDeleted ?? false,
          }))
          .filter((item) => item.isDeleted !== true);

        const nextSpeakerMap: Record<string, string> = {};

        for (const speaker of speakersData) {
          const displayName =
            speaker.displayName?.trim() ||
            speaker.fullName?.trim() ||
            speaker.name?.trim() ||
            speaker.slug?.trim() ||
            speaker.id;

          nextSpeakerMap[speaker.id] = displayName;

          if (speaker.slug?.trim()) {
            nextSpeakerMap[speaker.slug.trim()] = displayName;
          }
        }

        setSeries(seriesData);
        setEpisodes(episodesData);
        setSpeakerMap(nextSpeakerMap);
      } catch {
        setError(navigator.onLine ? "failed" : "offline");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [retryCount]);

  function getSpeakerName(speakerId: string) {
    return speakerMap[speakerId] || speakerId || copy.unknownSpeaker;
  }

  function getEpisodesBySeries(seriesId: string) {
    return episodes.filter((ep) => ep.seriesId === seriesId);
  }

  return (
    <main className="min-h-screen bg-[#0f1115] text-white flex justify-center">
      <div className="w-full max-w-md px-6 py-10 pb-[calc(11rem+env(safe-area-inset-bottom))]">
        <div className="mb-6">
          <button
            onClick={() => router.push("/")}
            className="min-h-11 rounded-lg px-2 text-sm text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8D28A]"
          >
            {language === "ar" ? "→" : "←"} {copy.back}
          </button>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-bold">{copy.title}</h1>
          <p className="mt-2 text-sm text-gray-400">
            {copy.subtitle}
          </p>
        </div>

        {loading && <ContentFeedback kind="loading" title={copy.loading} />}

        {!loading && error && <ContentFeedback kind="error" title={copy.failed} detail={error === "offline" ? copy.offlineDetail : copy.failedDetail} offline={error === "offline"} actionLabel={copy.retry} onAction={() => setRetryCount((count) => count + 1)} />}

        {!loading && !error && series.length === 0 && <ContentFeedback kind="empty" title={copy.empty} />}

        {!loading && !error && series.length > 0 && (
          <div className="space-y-8">
            {series.map((item) => {
              const seriesEpisodes = getEpisodesBySeries(item.id);

              return (
                <div key={item.id}>
                  <button
                    type="button"
                    onClick={() => router.push("/series/" + item.id)}
                    className="mb-3 block w-full rounded-2xl overflow-hidden bg-[#1f232b] text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8D28A]"
                  >
                    <div className="relative h-44">
                      {item.coverUrl && item.coverUrl.trim() !== "" ? (
                        <img
                          src={item.coverUrl}
                          alt={localizeContent("series", item, language).title}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-[#20252f] to-[#12151b]" />
                      )}

                      <div className="absolute inset-0 bg-black/45" />

                      <div className="absolute bottom-4 inset-x-4">
                        <div className="text-lg font-semibold leading-snug">
                          {localizeContent("series", item, language).title}
                        </div>

                        <div className="mt-1 text-sm text-gray-300">
                          {copy.speaker} · {getSpeakerName(item.speakerId)}
                        </div>
                      </div>
                    </div>
                  </button>

                  {seriesEpisodes.length > 0 && (
                    <div className="space-y-3">
                      {seriesEpisodes.map((ep) => (
                        <button
                          key={ep.id}
                          type="button"
                          onClick={() =>
                            router.push("/player/" + ep.seriesId + "/" + ep.id)
                          }
                          className="block w-full min-h-14 bg-[#1f232b] rounded-2xl p-4 text-start hover:bg-[#262b35] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8D28A]"
                        >
                          <div className="text-sm font-semibold">{localizeContent("episode", ep, language).title}</div>
                          <div className="text-xs text-gray-400 mt-1">
                            {localizeContent("series", item, language).title} • {formatDuration(ep.durationSeconds || 0)}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
