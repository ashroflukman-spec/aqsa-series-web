"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../components/AuthProvider";
import SeriesEpisodeCarousel, {
  type CarouselEpisode,
} from "../components/SeriesEpisodeCarousel";
import { useLanguage } from "../components/LanguageProvider";
import { localizeContent, type TranslatableContent } from "../lib/localizedContent";
import { videoCategoryLabel } from "../lib/videoCategory";
import InstallAppCard from "../components/InstallAppCard";
import ContentFeedback from "../components/ContentFeedback";

const COPY = {
  ms: { tagline: "Siri Pengetahuan Baitulmaqdis Kita Bermula Di Sini", search: "Cari siri...", admin: "Panel Admin", nowPlaying: "Sedang Dimainkan", item: "item", resume: "Sambung", videoHighlight: "Video Pilihan", seeAll: "Lihat Semua", fullLibrary: "Pustaka Penuh", seeAllVideos: "Lihat Semua Video", videosHint: "Teruskan ke Pustaka Video Aqsa Series", swipeOrTap: "Leret atau tekan", results: "Hasil Carian", popular: "Siri Audio Popular", series: "siri", loading: "Sedang memuatkan kandungan...", noSeries: "Belum ada siri untuk dipaparkan.", noResults: "Tiada siri sepadan dengan carian.", clearSearch: "Kosongkan carian", failed: "Kandungan belum dapat dimuatkan", failedDetail: "Sila cuba lagi sebentar lagi.", offlineDetail: "Peranti anda tidak bersambung ke internet. Semak sambungan dan cuba lagi.", retry: "Cuba lagi", videoSlide: "Pergi ke video pilihan", speaker: "Penyampai", unknownSpeaker: "Penyampai tidak diketahui", unspecified: "Tidak dinyatakan" },
  en: { tagline: "Your journey through Baitulmaqdis begins here", search: "Search series...", admin: "Admin dashboard", nowPlaying: "Continue Listening", item: "item", resume: "Resume", videoHighlight: "Featured Videos", seeAll: "View All", fullLibrary: "Full Library", seeAllVideos: "Explore All Videos", videosHint: "Open the Aqsa Series video library", swipeOrTap: "Swipe or tap", results: "Search Results", popular: "Popular Audio Series", series: "series", loading: "Loading content...", noSeries: "No series available yet.", noResults: "No series match your search.", clearSearch: "Clear search", failed: "Content could not be loaded", failedDetail: "Please try again shortly.", offlineDetail: "Your device is offline. Check your connection and try again.", retry: "Try again", videoSlide: "Go to featured video", speaker: "Speaker", unknownSpeaker: "Unknown speaker", unspecified: "Not specified" },
  ar: { tagline: "رحلتك في معرفة بيت المقدس تبدأ هنا", search: "ابحث عن سلسلة...", admin: "لوحة الإدارة", nowPlaying: "تابع الاستماع", item: "عنصر", resume: "متابعة", videoHighlight: "فيديوهات مختارة", seeAll: "عرض الكل", fullLibrary: "المكتبة الكاملة", seeAllVideos: "استكشف جميع الفيديوهات", videosHint: "افتح مكتبة فيديو سلسلة الأقصى", swipeOrTap: "اسحب أو اضغط", results: "نتائج البحث", popular: "السلاسل الصوتية الشائعة", series: "سلاسل", loading: "جارٍ تحميل المحتوى...", noSeries: "لا توجد سلاسل متاحة بعد.", noResults: "لا توجد سلاسل تطابق بحثك.", clearSearch: "مسح البحث", failed: "تعذّر تحميل المحتوى", failedDetail: "يرجى المحاولة مرة أخرى بعد قليل.", offlineDetail: "جهازك غير متصل بالإنترنت. تحقق من الاتصال وحاول مرة أخرى.", retry: "إعادة المحاولة", videoSlide: "الانتقال إلى الفيديو المختار", speaker: "المتحدث", unknownSpeaker: "متحدث غير معروف", unspecified: "غير مذكور" },
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

type SpeakerItem = {
  id: string;
  name: string;
  fullName?: string;
  displayName?: string;
  slug?: string;
  isDeleted?: boolean;
};

type RecentItem = {
  seriesId: string;
  episodeId: string;
  seriesTitle: string;
  episodeTitle: string;
};

type EpisodeItem = CarouselEpisode & {
  displayOrder: number;
  isPublished: boolean;
  isDeleted: boolean;
};

type VideoItem = {
  id: string;
  title: string;
  speaker: string;
  category: string;
  youtubeUrl: string;
  youtubeId: string;
  description?: string;
  thumbnailUrl?: string;
  sortOrder?: number;
  isPinned?: boolean;
  createdAt?: { seconds?: number } | null;
  isPublished: boolean;
  isDeleted?: boolean;
};

function extractYouTubeId(url: string) {
  if (!url) return "";

  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&]+)/,
    /(?:youtu\.be\/)([^?&]+)/,
    /(?:youtube\.com\/embed\/)([^?&]+)/,
    /(?:youtube\.com\/shorts\/)([^?&]+)/,
    /(?:youtube\.com\/live\/)([^?&]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }

  return "";
}

function getYouTubeThumbnail(youtubeId: string) {
  if (!youtubeId) return "";
  return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
}

export default function Page() {
  const router = useRouter();
  const { user } = useAuth();
  const { language } = useLanguage();
  const copy = COPY[language];

  const [search, setSearch] = useState("");
  const [series, setSeries] = useState<SeriesItem[]>([]);
  const [episodes, setEpisodes] = useState<EpisodeItem[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [speakerMap, setSpeakerMap] = useState<Record<string, string>>({});
  const [recentlyPlayed, setRecentlyPlayed] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [isSplashExiting, setIsSplashExiting] = useState(false);
  const [isSplashEntered, setIsSplashEntered] = useState(false);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [activeVideoSlide, setActiveVideoSlide] = useState(0);
  const [isVideosTransitioning, setIsVideosTransitioning] = useState(false);

  const videoSliderRef = useRef<HTMLDivElement | null>(null);
  const videosRedirectTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const timer = window.setTimeout(() => setShowSplash(false), 0);
      return () => window.clearTimeout(timer);
    }

    const enterTimer = setTimeout(() => {
      setIsSplashEntered(true);
    }, 80);

    const exitTimer = setTimeout(() => {
      setIsSplashExiting(true);
    }, 2100);

    const removeTimer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError("");
        const [seriesSnapshot, episodesSnapshot, speakersSnapshot, videosSnapshot] = await Promise.all([
          getDocs(query(collection(db, "series"), orderBy("sortOrder", "asc"))),
          getDocs(collection(db, "episodes")),
          getDocs(collection(db, "speakers")),
          getDocs(query(collection(db, "videos"), orderBy("sortOrder", "asc"))),
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

        setSeries(seriesData);

        const episodesData: EpisodeItem[] = episodesSnapshot.docs
          .map((docItem) => ({
            id: docItem.id,
            title: docItem.data().title ?? "",
            seriesId: docItem.data().seriesId ?? "",
            coverUrl: docItem.data().coverUrl ?? "",
            imageUrl: docItem.data().imageUrl ?? "",
            durationSeconds: docItem.data().durationSeconds ?? 0,
            displayOrder: docItem.data().displayOrder ?? 0,
            isPublished: docItem.data().isPublished ?? false,
            isDeleted: docItem.data().isDeleted ?? false,
            translations: docItem.data().translations ?? undefined,
          }))
          .filter((item) => item.isPublished === true && item.isDeleted !== true)
          .sort((a, b) => a.displayOrder - b.displayOrder);

        setEpisodes(episodesData);

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

        setSpeakerMap(nextSpeakerMap);

        const videosData: VideoItem[] = videosSnapshot.docs
          .map((docItem) => {
            const rawYoutubeUrl = docItem.data().youtubeUrl ?? "";
            const rawYoutubeId =
              docItem.data().youtubeId ?? extractYouTubeId(rawYoutubeUrl);

            return {
  id: docItem.id,
  title: docItem.data().title ?? "",
  speaker: docItem.data().speaker ?? "",
  category: docItem.data().category ?? "Umum",
  youtubeUrl: rawYoutubeUrl,
  youtubeId: rawYoutubeId,
  description: docItem.data().description ?? "",
  thumbnailUrl:
    docItem.data().thumbnailUrl ?? getYouTubeThumbnail(rawYoutubeId),
  sortOrder: docItem.data().sortOrder ?? 0,
  isPinned: docItem.data().isPinned ?? false,
  createdAt: docItem.data().createdAt ?? null,
  isPublished: docItem.data().isPublished ?? false,
  isDeleted: docItem.data().isDeleted ?? false,
};
          })
          .filter((item) => item.isPublished === true && item.isDeleted !== true);

        setVideos(videosData);
      } catch {
        setError(navigator.onLine ? "failed" : "offline");
      } finally {
        setLoading(false);
      }
    }

    fetchData();

    const saved = localStorage.getItem("recentlyPlayed");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRecentlyPlayed([parsed[0]]);
        } else {
          setRecentlyPlayed([]);
        }
      } catch {
        setRecentlyPlayed([]);
      }
    }
  }, [retryCount]);

  const normalized = search.trim().toLowerCase();

  const filteredSeries = useMemo(() => {
    return series.filter((item) => {
      const speakerName = speakerMap[item.speakerId] || "";
      const localizedTitle = localizeContent("series", item, language).title;
      return (
        item.title.toLowerCase().includes(normalized) ||
        localizedTitle.toLowerCase().includes(normalized) ||
        speakerName.toLowerCase().includes(normalized)
      );
    });
  }, [series, speakerMap, normalized, language]);

  const episodesBySeries = useMemo(() => {
    const grouped: Record<string, CarouselEpisode[]> = {};
    for (const episode of episodes) {
      (grouped[episode.seriesId] ??= []).push(episode);
    }
    return grouped;
  }, [episodes]);

  const highlightVideos = useMemo(() => {
  return [...videos]
    .sort((a, b) => {
      if (!!a.isPinned !== !!b.isPinned) {
        return a.isPinned ? -1 : 1;
      }

      const aTime = a.createdAt?.seconds ?? 0;
      const bTime = b.createdAt?.seconds ?? 0;

      return bTime - aTime;
    })
    .slice(0, 5);
}, [videos]);

  function getSpeakerName(speakerId: string) {
    return speakerMap[speakerId] || speakerId || copy.unknownSpeaker;
  }

  const navigateToVideos = useCallback(() => {
    if (isVideosTransitioning) return;

    setIsVideosTransitioning(true);

    window.setTimeout(() => {
      router.push("/videos");
    }, 260);
  }, [isVideosTransitioning, router]);

  function handleVideoSliderScroll() {
    const container = videoSliderRef.current;
    if (!container) return;

    const children = Array.from(container.children) as HTMLElement[];
    if (children.length === 0) return;

    const scrollLeft = container.scrollLeft;
    let nearestIndex = 0;
    let smallestDistance = Number.POSITIVE_INFINITY;

    children.forEach((child, index) => {
      const distance = Math.abs(child.offsetLeft - scrollLeft);
      if (distance < smallestDistance) {
        smallestDistance = distance;
        nearestIndex = index;
      }
    });

    setActiveVideoSlide(nearestIndex);
  }

  useEffect(() => {
    if (videosRedirectTimerRef.current) {
      window.clearTimeout(videosRedirectTimerRef.current);
      videosRedirectTimerRef.current = null;
    }

    if (activeVideoSlide === highlightVideos.length && highlightVideos.length > 0) {
      videosRedirectTimerRef.current = window.setTimeout(() => {
        navigateToVideos();
      }, 420);
    }

    return () => {
      if (videosRedirectTimerRef.current) {
        window.clearTimeout(videosRedirectTimerRef.current);
        videosRedirectTimerRef.current = null;
      }
    };
  }, [activeVideoSlide, highlightVideos.length, navigateToVideos]);

  return (
    <main className="relative flex min-h-screen justify-center overflow-hidden bg-gradient-to-b from-[#0f1115] to-[#1a1d24] text-white">
      {showSplash && (
        <div
          className={`pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-[#0f1115] transition-opacity duration-900 ${
            isSplashExiting ? "opacity-0" : "opacity-100"
          }`}
        >
          <div className="absolute inset-0 overflow-hidden">
            <div
              className={`absolute inset-0 pointer-events-none ${
                isSplashEntered ? "opacity-100" : "opacity-0"
              } transition-opacity duration-[2000ms]`}
              style={{
                background:
                  "radial-gradient(circle at 50% 20%, rgba(255,255,255,0.05), transparent 40%)",
              }}
            />

            <div
              className={`absolute left-1/2 top-1/2 h-[240px] w-[240px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#7A1F2B] blur-[85px] transition-all duration-[1800ms] ease-out ${
                isSplashEntered ? "opacity-25 scale-100" : "opacity-0 scale-75"
              } ${isSplashExiting ? "opacity-0 scale-[1.3]" : ""}`}
            />

            <div
              className={`absolute left-1/2 top-1/2 h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500/10 blur-[130px] transition-all duration-[2200ms] ease-out ${
                isSplashEntered ? "opacity-100 scale-100" : "opacity-0 scale-90"
              } ${isSplashExiting ? "opacity-0 scale-[1.18]" : ""}`}
            />

            <div
              className={`absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.035] blur-[180px] transition-all duration-[2400ms] ease-out ${
                isSplashEntered ? "opacity-100 scale-100" : "opacity-0 scale-95"
              } ${isSplashExiting ? "opacity-0 scale-[1.08]" : ""}`}
            />
          </div>

          <div className="absolute inset-0">
            <div
              className={`absolute left-1/2 top-24 -z-10 h-[160px] w-[360px] rounded-full bg-red-500/12 blur-3xl transition-all duration-[1800ms] ease-out ${
                isSplashEntered ? "opacity-80" : "opacity-0"
              } ${isSplashExiting ? "opacity-0" : ""}`}
              style={{
                transform: "translate(-50%, 0)",
                animation: isSplashEntered
                  ? "aqsa-breath 2.4s ease-in-out infinite"
                  : "none",
              }}
            />

            <div
              className={`absolute left-1/2 top-24 -z-10 h-[110px] w-[260px] rounded-full bg-[#7A1F2B]/30 blur-[55px] transition-all duration-[1800ms] ease-out ${
                isSplashEntered ? "opacity-100" : "opacity-0"
              } ${isSplashExiting ? "opacity-0" : ""}`}
              style={{
                transform: "translate(-50%, 0)",
                animation: isSplashEntered
                  ? "aqsa-drift 3.2s ease-in-out infinite"
                  : "none",
              }}
            />

            <div
              className={`absolute left-1/2 top-24 -z-10 h-[110px] w-[260px] -translate-x-1/2 rounded-full bg-[#7A1F2B]/35 blur-[55px] transition-all duration-[1800ms] ease-out ${
                isSplashEntered ? "opacity-100 scale-100" : "opacity-0 scale-75"
              } ${isSplashExiting ? "opacity-0 scale-[1.18]" : ""}`}
            />

            <Image
              src="/logo-icon.png"
              alt="Aqsa Series"
              width={360}
              height={90}
              priority
              className={`absolute left-1/2 top-24 -translate-x-1/2 h-16 w-auto object-contain transition-all duration-[1600ms] ease-out ${
                isSplashEntered
                  ? "opacity-100 scale-100 brightness-100 blur-0 drop-shadow-[0_0_42px_rgba(255,0,0,0.28)]"
                  : "opacity-0 scale-[0.92] brightness-[0.45] blur-[1.5px]"
              } ${isSplashExiting ? "opacity-0 scale-[1.06] blur-[1px]" : ""}`}
            />

            <div
              className={`absolute left-1/2 top-[calc(6rem+68px)] h-[2px] w-24 -translate-x-1/2 rounded-full bg-gradient-to-r from-transparent via-red-300/70 to-transparent transition-all duration-[1800ms] ease-out ${
                isSplashEntered ? "opacity-80 scale-x-100" : "opacity-0 scale-x-75"
              } ${isSplashExiting ? "opacity-0 scale-x-110" : ""}`}
            />
          </div>
        </div>
      )}

      {isVideosTransitioning && (
        <div className="pointer-events-none absolute inset-0 z-40 bg-[#0f1115] animate-[aqsaFadeIn_260ms_ease-out_forwards]" />
      )}

      <div
        className={`w-full max-w-md px-6 py-10 pb-[calc(13rem+env(safe-area-inset-bottom))] transition-all duration-1000 delay-300 ${
          showSplash ? "opacity-0 translate-y-3" : "opacity-100 translate-y-0"
        }`}
      >
        <div className="mb-10">
          <div className="rounded-[30px] border border-white/10 bg-white/[0.04] px-5 py-6 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <div className="flex flex-col items-center text-center">
              <Image
                src="/logo-icon.png"
                alt="Aqsa Series"
                width={360}
                height={90}
                priority
                className="h-20 w-auto object-contain drop-shadow-[0_0_28px_rgba(255,0,0,0.32)]"
              />

              <p className="mt-3 text-sm text-gray-400">
                {copy.tagline}
              </p>

              {user && (
                <button
                  onClick={() => router.push("/admin")}
                  className="mt-4 rounded-full border border-white/10 bg-[#1f232b] px-4 py-2 text-[11px] font-medium text-white/85 transition hover:bg-[#2a2f39]"
                >
                  {copy.admin}
                </button>
              )}
            </div>

            <div className="mt-5">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={copy.search}
                aria-label={copy.search}
                className="w-full rounded-full border border-white/10 bg-[#16191f] px-5 py-3.5 text-sm text-white shadow-inner outline-none placeholder:text-gray-500 focus:border-[#7A1F2B] focus:ring-2 focus:ring-[#7A1F2B]/20"
              />
            </div>
          </div>
        </div>

        <InstallAppCard surface="home" />

        {recentlyPlayed.length > 0 && normalized === "" && (
          <div className="mb-10">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-white/80">
                  {copy.nowPlaying}
                </h2>
                <div className="mt-2 h-[2px] w-14 rounded-full bg-[#D4AF37]" />
              </div>

              <span className="text-xs text-white/70">
                {recentlyPlayed.length} {copy.item}
              </span>
            </div>

            <div className="space-y-4">
              {recentlyPlayed.map((item, index) => (
                <button
                  key={item.seriesId + item.episodeId + index}
                  type="button"
                  onClick={() =>
                    router.push("/player/" + item.seriesId + "/" + item.episodeId)
                  }
                  className="group block w-full overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.04] text-start shadow-[0_14px_40px_rgba(0,0,0,0.22)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-white/15 hover:bg-white/[0.06] hover:shadow-[0_20px_54px_rgba(0,0,0,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8D28A]"
                >
                  <div className="flex items-center gap-4 p-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7A1F2B] via-[#3a1620] to-[#151820] shadow-inner">
                      <div className="flex items-end gap-[3px]">
                        <span className="h-3 w-1 rounded-full bg-white/80" />
                        <span className="h-6 w-1 rounded-full bg-white/90" />
                        <span className="h-4 w-1 rounded-full bg-white/80" />
                        <span className="h-7 w-1 rounded-full bg-white/90" />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#E8D28A]">
                          {copy.resume}...
                        </span>
                      </div>

                      <div className="mt-3 line-clamp-2 text-[16px] font-semibold leading-[1.35] text-white">
                        {localizeContent("episode", { id: item.episodeId, title: item.episodeTitle }, language).title}
                      </div>

                      <div className="mt-1 text-sm text-white/75">
                        {localizeContent("series", { id: item.seriesId, title: item.seriesTitle }, language).title}
                      </div>

                      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                        <div className="h-full w-1/3 rounded-full bg-[#D4AF37]" />
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {normalized === "" && highlightVideos.length > 0 && (
          <div className="mb-10">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-white/80">
                  {copy.videoHighlight}
                </h2>
                <div className="mt-2 h-[2px] w-14 rounded-full bg-[#7A1F2B]" />
              </div>

              <button
  onClick={() => router.push("/videos")}
  className="min-h-11 rounded-lg px-2 text-sm text-white/80 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8D28A]"
>
  {copy.seeAll} {language === "ar" ? "←" : "→"}
</button>
            </div>

            <div className="-mx-6 overflow-x-auto px-6 pb-2 video-highlight-scroll">
              <div
                ref={videoSliderRef}
                onScroll={handleVideoSliderScroll}
                className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 video-highlight-scroll"
              >
                {highlightVideos.map((video) => (
                  <button
                    key={video.id}
                    type="button"
                    onClick={() => router.push(`/videos?video=${video.id}`)}
                    className="group w-[86%] shrink-0 snap-start overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.04] text-start shadow-[0_14px_40px_rgba(0,0,0,0.22)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-white/15 hover:bg-white/[0.06] hover:shadow-[0_20px_54px_rgba(0,0,0,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8D28A]"
                  >
                    <div className="relative h-48">
                      {video.thumbnailUrl ? (
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-[#20252f] to-[#12151b]" />
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />

                      <div className="absolute start-4 top-4">
                        <span className="rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#E8D28A]">
                          {videoCategoryLabel(video.category, language)}
                        </span>
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="line-clamp-2 text-[18px] font-semibold leading-[1.35] text-white">
                        {video.title}
                      </div>

                      <div className="mt-1.5 text-sm text-white/75">
                        {video.speaker || copy.unspecified}
                      </div>
                    </div>
                  </button>
                ))}

                <button
                  type="button"
                  onClick={navigateToVideos}
                  className="group w-[86%] shrink-0 snap-start overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.04] text-start shadow-[0_14px_40px_rgba(0,0,0,0.22)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-white/15 hover:bg-white/[0.06] hover:shadow-[0_20px_54px_rgba(0,0,0,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8D28A]"
                >
                  <div className="relative flex h-full min-h-[264px] flex-col justify-between overflow-hidden p-5">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#7A1F2B]/35 via-[#1b2029] to-[#10141b]" />
                    <div className="absolute right-[-20px] top-[-20px] h-28 w-28 rounded-full bg-white/[0.06] blur-3xl" />
                    <div className="absolute left-[-10px] bottom-[-20px] h-28 w-28 rounded-full bg-[#D4AF37]/10 blur-3xl" />

                    <div className="relative">
                      <span className="rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#E8D28A]">
                        {copy.fullLibrary}
                      </span>
                    </div>

                    <div className="relative mt-12">
                      <div className="text-[24px] font-semibold leading-[1.2] text-white">
                        {copy.seeAllVideos}
                      </div>
                      <div className="mt-2 text-sm text-white/75">
                        {copy.videosHint}
                      </div>
                    </div>

                    <div className="relative mt-8 flex items-center justify-between">
                      <div className="text-sm font-medium text-white/80">
                        {copy.swipeOrTap} {language === "ar" ? "←" : "→"}
                      </div>

                      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.06]">
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          className="text-white"
                        >
                          <path
                            d="M9 6L15 12L9 18"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-center gap-2">
              {highlightVideos.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    const container = videoSliderRef.current;
                    if (!container) return;

                    const child = container.children[index] as HTMLElement | undefined;
                    if (!child) return;

                    container.scrollTo({
                      left: child.offsetLeft,
                      behavior: "smooth",
                    });
                    setActiveVideoSlide(index);
                  }}
                  className="flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8D28A]"
                  aria-label={`${copy.videoSlide} ${index + 1}`}
                >
                  <span aria-hidden="true" className={`h-2 rounded-full transition-all duration-200 ${activeVideoSlide === index ? "w-5 bg-white/90" : "w-2 bg-white/45"}`} />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-white/80">
              {normalized ? copy.results : copy.popular}
            </h2>
            <div className="mt-2 h-[2px] w-14 rounded-full bg-[#7A1F2B]" />
          </div>

          {!normalized && filteredSeries.length > 0 && (
            <span className="text-xs text-white/70">
              {filteredSeries.length} {copy.series}
            </span>
          )}
        </div>

        {loading && <ContentFeedback kind="loading" title={copy.loading} />}

        {!loading && error && <ContentFeedback kind="error" title={copy.failed} detail={error === "offline" ? copy.offlineDetail : copy.failedDetail} offline={error === "offline"} actionLabel={copy.retry} onAction={() => setRetryCount((count) => count + 1)} />}

        {!loading && !error && filteredSeries.length === 0 && <ContentFeedback kind="empty" title={normalized ? copy.noResults : copy.noSeries} actionLabel={normalized ? copy.clearSearch : undefined} onAction={normalized ? () => setSearch("") : undefined} />}

        {!loading && !error && filteredSeries.length > 0 && (
          <div className="space-y-9">
            {filteredSeries.map((item) => (
              <SeriesEpisodeCarousel
                key={item.id}
                series={item}
                speakerName={getSpeakerName(item.speakerId)}
                episodes={episodesBySeries[item.id] ?? []}
                onOpenSeries={() => router.push("/series/" + item.id)}
                onOpenEpisode={(episode) =>
                  router.push("/player/" + item.id + "/" + episode.id)
                }
              />
            ))}
          </div>
        )}
      </div>

      <style jsx global>{`
        .video-highlight-scroll {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .video-highlight-scroll::-webkit-scrollbar {
          display: none;
        }

        @keyframes aqsaFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </main>
  );
}
