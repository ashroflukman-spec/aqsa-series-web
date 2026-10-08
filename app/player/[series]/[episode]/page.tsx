"use client";

import ShareEpisodeButton from "../../../../components/ShareEpisodeButton";
import { useAudio } from "../../../../components/AudioProvider";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import {
  Play,
  Pause,
  Bookmark,
  SkipBack,
  SkipForward,
  Trash2,
} from "lucide-react";
import { db } from "../../../../lib/firebase";
import { useLanguage } from "../../../../components/LanguageProvider";
import { localizeContent, type TranslatableContent } from "../../../../lib/localizedContent";
import ContentFeedback from "../../../../components/ContentFeedback";

const COPY = {
  ms: { missingEpisode: "Episod tidak dijumpai", missingSeries: "Siri tidak dijumpai", loadFailed: "Gagal memuatkan episod", offline: "Peranti anda tidak bersambung ke internet.", retry: "Cuba lagi", loading: "Memuatkan episod...", back: "Kembali ke Senarai Episod", playing: "Sedang Dimainkan", paused: "Dijeda", untitled: "Tanpa Tajuk", speaker: "Penyampai", unknownSpeaker: "Penyampai tidak diketahui", addMarker: "Tambah penanda", markerExists: "Penanda sudah ada sekitar", markerAdded: "Penanda ditambah pada", previous: "Sebelum", next: "Seterusnya", play: "Main", pause: "Jeda", noAudio: "Audio belum dimuat naik.", description: "Huraian Episod", noDescription: "Tiada huraian untuk episod ini.", reviewMarkers: "Penanda Ulang Kaji", markersHelp: "Simpan poin penting untuk ulang kaji kemudian", markersEmpty: "Belum ada penanda. Tekan butang penanda semasa audio sedang berjalan.", deleteMarker: "Padam penanda", marker: "Penanda", note: "Tulis nota atau poin penting di sini...", originalContent: "Huraian dalam bahasa asal", shareDescription: "Dengar episod ini di Aqsa Series." },
  en: { missingEpisode: "Episode not found", missingSeries: "Series not found", loadFailed: "Unable to load episode", offline: "Your device is offline.", retry: "Try again", loading: "Loading episode...", back: "Back to episodes", playing: "Now Playing", paused: "Paused", untitled: "Untitled", speaker: "Speaker", unknownSpeaker: "Unknown speaker", addMarker: "Add marker", markerExists: "A marker already exists near", markerAdded: "Marker added at", previous: "Previous", next: "Next", play: "Play", pause: "Pause", noAudio: "Audio has not been uploaded.", description: "Episode Description", noDescription: "No description for this episode.", reviewMarkers: "Review Markers", markersHelp: "Save important points to review later", markersEmpty: "No markers yet. Add one while listening.", deleteMarker: "Delete marker", marker: "Marker", note: "Write a note or important point here...", originalContent: "Description shown in its original language", shareDescription: "Listen to this episode on Aqsa Series." },
  ar: { missingEpisode: "لم يُعثر على الحلقة", missingSeries: "لم يُعثر على السلسلة", loadFailed: "تعذّر تحميل الحلقة", offline: "جهازك غير متصل بالإنترنت.", retry: "إعادة المحاولة", loading: "جارٍ تحميل الحلقة...", back: "العودة إلى الحلقات", playing: "قيد التشغيل", paused: "متوقف مؤقتًا", untitled: "بلا عنوان", speaker: "المتحدث", unknownSpeaker: "متحدث غير معروف", addMarker: "إضافة علامة", markerExists: "توجد علامة بالقرب من", markerAdded: "أُضيفت علامة عند", previous: "السابق", next: "التالي", play: "تشغيل", pause: "إيقاف مؤقت", noAudio: "لم يُرفع الملف الصوتي بعد.", description: "وصف الحلقة", noDescription: "لا يوجد وصف لهذه الحلقة.", reviewMarkers: "علامات المراجعة", markersHelp: "احفظ النقاط المهمة للرجوع إليها لاحقًا", markersEmpty: "لا توجد علامات بعد. أضف علامة أثناء الاستماع.", deleteMarker: "حذف العلامة", marker: "علامة", note: "اكتب ملاحظة أو نقطة مهمة هنا...", originalContent: "يُعرض الوصف بلغته الأصلية", shareDescription: "استمع إلى هذه الحلقة على Aqsa Series." },
} as const;

type EpisodeData = {
  id: string;
  title?: string;
  audioUrl?: string;
  seriesId?: string;
  speakerId?: string;
  isDeleted?: boolean;
  isPublished?: boolean;
  imageUrl?: string;
  coverUrl?: string;
  description?: string;
  speakerName?: string;
  originalChapterLabel?: string;
  durationSeconds?: number;
  displayOrder?: number;

  shareTitle?: string;
  shareDescription?: string;
  shareNote?: string;
  shareCtaText?: string;
  shareImageUrl?: string;
  shareStatus?: "draft" | "ready";
  translations?: TranslatableContent["translations"];
};

type SeriesData = {
  id?: string;
  title?: string;
  coverUrl?: string;
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

type MarkerItem = {
  id: string;
  time: number;
  label: string;
  note?: string;
};

function formatTime(seconds = 0) {
  if (!Number.isFinite(seconds)) return "0:00";
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export default function PlayerPage() {
  const params = useParams();
  const router = useRouter();
  const { language } = useLanguage();
  const copy = COPY[language];

  const {
    activeEpisode,
    isPlaying,
    currentTime,
    duration,
    playEpisode,
    toggleCurrent,
    seekAudio,
    playNext,
    playPrev,
  } = useAudio();

  const [episode, setEpisode] = useState<EpisodeData | null>(null);
  const [series, setSeries] = useState<SeriesData | null>(null);
  const [seriesEpisodes, setSeriesEpisodes] = useState<EpisodeData[]>([]);
  const [speakerMap, setSpeakerMap] = useState<Record<string, string>>({});
  const [error, setError] = useState<{ routeKey: string; message: string } | null>(null);
  const [loadedRouteKey, setLoadedRouteKey] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const routeSyncPendingRef = useRef(true);

  const [isMarkerFlash, setIsMarkerFlash] = useState(false);
  const [markers, setMarkers] = useState<MarkerItem[]>([]);
  const [toast, setToast] = useState("");

  const localizedSeries = series ? localizeContent("series", { ...series, id: series.id || "", title: series.title || "" }, language) : null;
  const currentLocalizedEpisode = episode ? localizeContent("episode", { ...episode, title: episode.title || "" }, language) : null;

  const episodeId = String(params.episode || "");
  const seriesId = String(params.series || "");
  const routeKey = `${seriesId}/${episodeId}`;
  const isCurrentEpisode = activeEpisode?.seriesId === seriesId && activeEpisode.episodeId === episodeId;
  const pageIsPlaying = isCurrentEpisode && isPlaying;
  const pageCurrentTime = isCurrentEpisode ? currentTime : 0;
  const pageDuration = isCurrentEpisode ? duration : episode?.durationSeconds || 0;

  const markerStorageKey = useMemo(
    () => `aqsa_markers_${seriesId}_${episodeId}`,
    [seriesId, episodeId]
  );

  const saveMarkersToStorage = (nextMarkers: MarkerItem[]) => {
    setMarkers(nextMarkers);
    localStorage.setItem(markerStorageKey, JSON.stringify(nextMarkers));
  };

  const getSpeakerName = useCallback((speakerId?: string, fallbackName?: string) => {
    if (speakerId && speakerMap[speakerId]) return speakerMap[speakerId];
    if (fallbackName?.trim()) return fallbackName;
    return speakerId || copy.unknownSpeaker;
  }, [speakerMap, copy.unknownSpeaker]);

  const episodeQueue = useMemo(() => seriesEpisodes.map((ep) => ({
    seriesId: ep.seriesId || seriesId,
    episodeId: ep.id,
    seriesTitle: series?.title || "Aqsa Series",
    episodeTitle: ep.title || "Tanpa Tajuk",
    audioUrl: ep.audioUrl || "",
    coverUrl: series?.coverUrl || ep.coverUrl || ep.imageUrl || "",
    speakerName: getSpeakerName(ep.speakerId, ep.speakerName),
  })), [seriesEpisodes, series, seriesId, getSpeakerName]);

  const syncEpisodeToProvider = useCallback(async (targetEpisode: EpisodeData) => {
    const target = {
      seriesId: targetEpisode.seriesId || seriesId,
      episodeId: targetEpisode.id,
      seriesTitle: series?.title || "Aqsa Series",
      episodeTitle: targetEpisode.title || "Tanpa Tajuk",
      audioUrl: targetEpisode.audioUrl || "",
      coverUrl: series?.coverUrl || targetEpisode.coverUrl || targetEpisode.imageUrl || "",
      speakerName: getSpeakerName(targetEpisode.speakerId, targetEpisode.speakerName),
    };

    await playEpisode(target, episodeQueue);
  }, [episodeQueue, getSpeakerName, playEpisode, series, seriesId]);

  useEffect(() => {
    let cancelled = false;
    routeSyncPendingRef.current = true;

    async function fetchData() {
      try {
        const episodeRef = doc(db, "episodes", episodeId);
        const episodeSnap = await getDoc(episodeRef);

        if (!episodeSnap.exists()) {
          if (!cancelled) setError({ routeKey, message: "missingEpisode" });
          return;
        }

        const episodeData = episodeSnap.data();

        if (
          episodeData.seriesId !== seriesId ||
          episodeData.isDeleted === true ||
          episodeData.isPublished === false
        ) {
          if (!cancelled) setError({ routeKey, message: "missingEpisode" });
          return;
        }

        const currentEpisode: EpisodeData = {
  id: episodeSnap.id,
  title: episodeData.title ?? "",
  audioUrl: episodeData.audioUrl ?? "",
  seriesId: episodeData.seriesId ?? "",
  speakerId: episodeData.speakerId ?? "",
  isDeleted: episodeData.isDeleted ?? false,
  isPublished: episodeData.isPublished ?? true,
  imageUrl: episodeData.imageUrl ?? "",
  coverUrl: episodeData.coverUrl ?? "",
  description: episodeData.description ?? "",
  speakerName: episodeData.speakerName ?? "",
  originalChapterLabel: episodeData.originalChapterLabel ?? "",
  durationSeconds: episodeData.durationSeconds ?? 0,
  displayOrder: episodeData.displayOrder ?? 0,

  shareTitle: episodeData.shareTitle ?? "",
  shareDescription: episodeData.shareDescription ?? "",
  shareNote: episodeData.shareNote ?? "",
  shareCtaText: episodeData.shareCtaText ?? "",
  shareImageUrl: episodeData.shareImageUrl ?? "",
  shareStatus: episodeData.shareStatus ?? "draft",
  translations: episodeData.translations ?? undefined,
};

        const seriesRef = doc(db, "series", seriesId);
        const seriesSnap = await getDoc(seriesRef);

        if (!seriesSnap.exists()) {
          if (!cancelled) setError({ routeKey, message: "missingSeries" });
          return;
        }

        const seriesData = seriesSnap.data();
        if (seriesData.isDeleted === true || seriesData.isPublished === false) {
          if (!cancelled) setError({ routeKey, message: "missingSeries" });
          return;
        }

        const currentSeries: SeriesData = {
          id: seriesSnap.id,
          title: seriesData.title ?? "",
          coverUrl: seriesData.coverUrl ?? "",
          isDeleted: seriesData.isDeleted ?? false,
          translations: seriesData.translations ?? undefined,
        };

        const episodesSnap = await getDocs(collection(db, "episodes"));
        const filteredEpisodes: EpisodeData[] = episodesSnap.docs
          .map((docItem) => ({
            id: docItem.id,
            title: docItem.data().title ?? "",
            audioUrl: docItem.data().audioUrl ?? "",
            seriesId: docItem.data().seriesId ?? "",
            speakerId: docItem.data().speakerId ?? "",
            isDeleted: docItem.data().isDeleted ?? false,
            isPublished: docItem.data().isPublished ?? true,
            imageUrl: docItem.data().imageUrl ?? "",
            coverUrl: docItem.data().coverUrl ?? "",
            description: docItem.data().description ?? "",
            speakerName: docItem.data().speakerName ?? "",
            originalChapterLabel: docItem.data().originalChapterLabel ?? "",
            durationSeconds: docItem.data().durationSeconds ?? 0,
            displayOrder: docItem.data().displayOrder ?? 0,
            translations: docItem.data().translations ?? undefined,
          }))
          .filter(
            (ep) =>
              ep.seriesId === seriesId &&
              ep.isDeleted !== true &&
              ep.isPublished !== false
          )
          .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

        const speakersSnap = await getDocs(collection(db, "speakers"));
        const speakersData: SpeakerItem[] = speakersSnap.docs
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

        if (cancelled) return;
        setEpisode(currentEpisode);
        setSeries(currentSeries);
        setSeriesEpisodes(filteredEpisodes);
        setSpeakerMap(nextSpeakerMap);
        setLoadedRouteKey(routeKey);
      } catch {
        if (!cancelled) setError({ routeKey, message: navigator.onLine ? "loadFailed" : "offline" });
      }
    }

    if (episodeId && seriesId) {
      fetchData();
    }
    return () => {
      cancelled = true;
    };
  }, [episodeId, seriesId, routeKey, retryCount]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = localStorage.getItem(markerStorageKey);

      if (!saved) {
        setMarkers([]);
        return;
      }

      try {
        const parsed = JSON.parse(saved);
        setMarkers(Array.isArray(parsed) ? parsed : []);
      } catch {
        setMarkers([]);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [markerStorageKey]);

  useEffect(() => {
    if (loadedRouteKey !== routeKey || !activeEpisode) return;

    const isSameEpisode =
      activeEpisode.seriesId === seriesId && activeEpisode.episodeId === episodeId;

    if (routeSyncPendingRef.current) {
      if (isSameEpisode) routeSyncPendingRef.current = false;
      return;
    }

    if (!isSameEpisode) {
      routeSyncPendingRef.current = true;
      router.push(`/player/${activeEpisode.seriesId}/${activeEpisode.episodeId}`);
    }
  }, [activeEpisode, loadedRouteKey, routeKey, seriesId, episodeId, router]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 1600);
    return () => clearTimeout(timer);
  }, [toast]);

  const currentEpisodeIndex = seriesEpisodes.findIndex(
    (ep) => ep.id === episodeId
  );

  const prevEpisode =
    currentEpisodeIndex > 0 ? seriesEpisodes[currentEpisodeIndex - 1] : null;

  const nextEpisode =
    currentEpisodeIndex >= 0 &&
    currentEpisodeIndex < seriesEpisodes.length - 1
      ? seriesEpisodes[currentEpisodeIndex + 1]
      : null;

  const handlePrevEpisode = async () => {
    if (!prevEpisode) return;
    if (isCurrentEpisode) await playPrev();
    else {
      await syncEpisodeToProvider(prevEpisode);
      router.push(`/player/${seriesId}/${prevEpisode.id}`);
    }
  };

  const handleNextEpisode = async () => {
    if (!nextEpisode) return;
    if (isCurrentEpisode) await playNext();
    else {
      await syncEpisodeToProvider(nextEpisode);
      router.push(`/player/${seriesId}/${nextEpisode.id}`);
    }
  };

  const togglePlayPause = async () => {
    try {
      if (isCurrentEpisode) await toggleCurrent();
      else if (episode) await syncEpisodeToProvider(episode);
    } catch (err) {
      console.error("Gagal play/pause:", err);
    }
  };

  const jumpToMarker = async (time: number) => {
    try {
      if (!isCurrentEpisode && episode) await syncEpisodeToProvider(episode);
      seekAudio(time);

      if (isCurrentEpisode && !isPlaying) {
        await toggleCurrent();
      }
    } catch (err: unknown) {
      if (!(err instanceof Error && err.name === "AbortError")) {
        console.error("Gagal lompat ke marker:", err);
      }
    }
  };

  const addMarker = () => {
    if (!episode?.audioUrl || !isCurrentEpisode) return;

    const time = pageCurrentTime || 0;
    const isDuplicate = markers.some(
      (marker) => Math.abs(marker.time - time) < 2
    );

    if (isDuplicate) {
      setToast(`${copy.markerExists} ${formatTime(time)}`);
      return;
    }

    const newMarker: MarkerItem = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      time,
      label: `${copy.marker} ${markers.length + 1}`,
      note: "",
    };

    const updated = [...markers, newMarker].sort((a, b) => a.time - b.time);
    saveMarkersToStorage(updated);
    setToast(`${copy.markerAdded} ${formatTime(time)}`);
    setIsMarkerFlash(true);

    setTimeout(() => {
      setIsMarkerFlash(false);
    }, 500);
  };

  const deleteMarker = (id: string) => {
    const updated = markers.filter((marker) => marker.id !== id);
    saveMarkersToStorage(updated);
  };

  const updateMarkerNote = (id: string, note: string) => {
    const updated = markers.map((marker) =>
      marker.id === id ? { ...marker, note } : marker
    );
    saveMarkersToStorage(updated);
  };

  const progressPercent = pageDuration > 0 ? (pageCurrentTime / pageDuration) * 100 : 0;

  const coverImage =
    series?.coverUrl ||
    episode?.coverUrl ||
    episode?.imageUrl ||
    "https://images.unsplash.com/photo-1521295121783-8a321d551ad2?q=80&w=1200&auto=format&fit=crop";

 const seriesTitle = (localizedSeries?.title || "").trim().toLowerCase();
const episodeTitle = (currentLocalizedEpisode?.title || "").trim().toLowerCase();
const showSeriesTitle = !!seriesTitle && seriesTitle !== episodeTitle;

const shareTitle = currentLocalizedEpisode?.title || "Aqsa Series";
const shareDescription =
  currentLocalizedEpisode?.description || copy.shareDescription;

const shareNote = language === "ms" ? episode?.shareNote || "" : "";

const shareUrl =
  typeof window !== "undefined"
    ? `${window.location.origin}/share/${seriesId}/${episodeId}`
    : `/share/${seriesId}/${episodeId}`;


  if (error?.routeKey === routeKey) {
    const retryable = error.message === "loadFailed" || error.message === "offline";
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0f1115] px-6 pb-[calc(10rem+env(safe-area-inset-bottom))] text-white">
        <div className="w-full max-w-md space-y-4">
          <ContentFeedback kind="error" title={copy[error.message as keyof typeof copy] || copy.loadFailed} offline={error.message === "offline"} actionLabel={retryable ? copy.retry : undefined} onAction={retryable ? () => { setError(null); setLoadedRouteKey(""); setRetryCount((count) => count + 1); } : undefined} />
          <button type="button" onClick={() => router.push(error.message === "missingSeries" ? "/library" : `/series/${seriesId}`)} className="min-h-11 rounded-xl px-3 text-sm font-semibold text-[#E8D28A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8D28A]">{copy.back}</button>
        </div>
      </main>
    );
  }

  if (loadedRouteKey !== routeKey || !episode) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0f1115] text-white">
        <p>{copy.loading}</p>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen justify-center overflow-hidden bg-[#0f1115] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-80px] h-[380px] w-[380px] -translate-x-1/2 rounded-full bg-[#7A1F2B] opacity-15 blur-[120px]" />
        <div className="absolute left-1/2 top-[320px] h-[320px] w-[320px] -translate-x-1/2 rounded-full bg-[#D4AF37] opacity-[0.07] blur-[130px]" />
      </div>

      <div className="relative w-full max-w-md px-5 py-8 pb-56">
        <button
          onClick={() => router.push(`/series/${seriesId}`)}
          className="mb-6 text-sm text-gray-400 transition hover:text-white/80"
        >
          {language === "ar" ? "→" : "←"} {copy.back}
        </button>

        <div className="overflow-hidden rounded-[32px] border border-white/10 bg-[#171a20] shadow-[0_28px_90px_rgba(0,0,0,0.48)]">
          <div className="relative h-80 overflow-hidden">
            <img
              src={coverImage}
              alt={currentLocalizedEpisode?.title || copy.untitled}
              className="h-full w-full object-cover"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/12" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.10),transparent_35%)]" />

            <div className="absolute left-5 top-5 flex items-end gap-[3px] rounded-2xl border border-white/10 bg-black/25 px-3 py-2 backdrop-blur-md">
              {pageIsPlaying ? (
                <>
                  <span className="eq-smooth h-3 w-1 rounded-full bg-white/90 animate-[equalize_1.4s_cubic-bezier(0.4,0,0.2,1)_infinite]" />
                  <span
                    className="eq-smooth h-5 w-1 rounded-full bg-white/90 animate-[equalize_1.2s_cubic-bezier(0.4,0,0.2,1)_infinite]"
                    style={{ animationDelay: "0.1s" }}
                  />
                  <span
                    className="eq-smooth h-7 w-1 rounded-full bg-white/90 animate-[equalize_1.6s_cubic-bezier(0.4,0,0.2,1)_infinite]"
                    style={{ animationDelay: "0.2s" }}
                  />
                  <span
                    className="eq-smooth h-4 w-1 rounded-full bg-white/90 animate-[equalize_1.1s_cubic-bezier(0.4,0,0.2,1)_infinite]"
                    style={{ animationDelay: "0.05s" }}
                  />
                  <span
                    className="eq-smooth h-6 w-1 rounded-full bg-white/90 animate-[equalize_1.35s_cubic-bezier(0.4,0,0.2,1)_infinite]"
                    style={{ animationDelay: "0.15s" }}
                  />
                </>
              ) : (
                <>
                  <span className="h-3 w-1 rounded-full bg-white/35" />
                  <span className="h-5 w-1 rounded-full bg-white/35" />
                  <span className="h-7 w-1 rounded-full bg-white/35" />
                  <span className="h-4 w-1 rounded-full bg-white/35" />
                  <span className="h-6 w-1 rounded-full bg-white/35" />
                </>
              )}
            </div>

            <div className="absolute right-4 top-4 rounded-full border border-white/15 bg-black/25 px-3 py-1 text-[11px] text-white/90 backdrop-blur-md">
              {pageIsPlaying ? copy.playing : copy.paused}
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-5">
              <div className="rounded-[26px] border border-white/10 bg-black/20 p-4 backdrop-blur-md">
                {showSeriesTitle && (
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/55">
                    {localizedSeries?.title}
                  </p>
                )}

                <h1
                  className={`text-[30px] font-extrabold leading-[1.1] tracking-tight ${
                    showSeriesTitle ? "mt-2" : ""
                  }`}
                >
                  {currentLocalizedEpisode?.title || copy.untitled}
                </h1>
              </div>
            </div>
          </div>

          <div className="border-t border-white/6 bg-[#2f3238]/95 p-4 backdrop-blur-xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
                  {copy.speaker}
                </p>
                <p className="mt-1 text-sm font-medium text-white/90">
                  {getSpeakerName(episode.speakerId, episode.speakerName)}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-4">
                <button
                  type="button"
                  onClick={addMarker}
                  aria-label={copy.addMarker}
                  disabled={!episode.audioUrl || !isCurrentEpisode}
                  className={`relative flex h-[68px] w-[68px] items-center justify-center rounded-full border border-[#D4AF37]/45 bg-[#D4AF37]/10 shadow-[0_0_22px_rgba(212,175,55,0.18)] backdrop-blur-xl transition duration-300 active:scale-95 disabled:opacity-40 ${
                    isMarkerFlash
                      ? "ring-4 ring-[#D4AF37]/25 shadow-[0_0_34px_rgba(212,175,55,0.28)]"
                      : ""
                  }`}
                >
                  <div className="absolute inset-[1px] rounded-full bg-gradient-to-br from-white/[0.12] via-transparent to-transparent" />
                  <Bookmark
                    size={26}
                    className="relative z-10 text-[#E8C96A]"
                    fill="none"
                    strokeWidth={2.2}
                  />
                </button>

                <button
                  type="button"
                  onClick={togglePlayPause}
                  aria-label={pageIsPlaying ? copy.pause : copy.play}
                  disabled={!episode.audioUrl}
                  className="relative flex h-[68px] w-[68px] items-center justify-center rounded-full bg-red-500 text-white shadow-[0_18px_36px_rgba(239,68,68,0.32)] transition duration-300 active:scale-95 disabled:opacity-40"
                >
                  <div className="absolute inset-[1px] rounded-full bg-gradient-to-br from-white/20 via-transparent to-black/10" />
                  {pageIsPlaying ? (
                    <Pause size={28} fill="currentColor" className="relative z-10" />
                  ) : (
                    <Play
                      size={28}
                      fill="currentColor"
                      className="relative z-10 ml-1"
                    />
                  )}
                </button>
              </div>
            </div>

            <div className="mb-2" dir="ltr">
              <div className="relative h-6">
                <div className="absolute top-1/2 h-2 w-full -translate-y-1/2 rounded-full bg-white/15" />

                <div
                  className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-gradient-to-r from-[#E24B5B] to-[#B91C32]"
                  style={{ width: `${progressPercent}%` }}
                />

                {pageDuration > 0 &&
                  markers.map((marker) => {
                    const left = `${(marker.time / pageDuration) * 100}%`;

                    return (
                      <button
                        key={marker.id}
                        type="button"
                        onClick={() => jumpToMarker(marker.time)}
                        title={`${marker.label} - ${formatTime(marker.time)}`}
                        className="absolute top-1/2 z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.35)]"
                        style={{ left }}
                      />
                    );
                  })}

                <input
                  type="range"
                  min={0}
                  max={pageDuration || 0}
                  step={0.1}
                  value={pageCurrentTime}
                  onChange={(e) => seekAudio(Number(e.target.value))}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  disabled={!episode.audioUrl || !isCurrentEpisode}
                />

                <div
                  className="absolute top-1/2 z-20 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-white bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.26)]"
                  style={{ left: `calc(${progressPercent}% - 8px)` }}
                />
              </div>

              <div className="mt-2 flex justify-between text-sm font-medium text-white/75">
                <span>{formatTime(pageCurrentTime)}</span>
                <span>{formatTime(pageDuration)}</span>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={handlePrevEpisode}
                disabled={!prevEpisode}
                className="rounded-[22px] border border-white/12 bg-[#24272d] px-4 py-3 text-base font-semibold text-white/90 shadow-[0_10px_26px_rgba(0,0,0,0.14)] transition duration-300 hover:bg-[#2c3037] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="flex items-center justify-center gap-2">
                  <SkipBack size={18} />
                  {copy.previous}
                </span>
              </button>

              <button
                type="button"
                onClick={togglePlayPause}
                disabled={!episode.audioUrl}
                className="rounded-[22px] border border-white/12 bg-[#24272d] px-4 py-3 text-base font-semibold text-white/90 shadow-[0_10px_26px_rgba(0,0,0,0.14)] transition duration-300 hover:bg-[#2c3037] active:scale-[0.985] disabled:opacity-40"
              >
                {pageIsPlaying ? copy.pause : copy.play}
              </button>

              <button
                type="button"
                onClick={handleNextEpisode}
                disabled={!nextEpisode}
                className="rounded-[22px] border border-white/12 bg-[#24272d] px-4 py-3 text-base font-semibold text-white/90 shadow-[0_10px_26px_rgba(0,0,0,0.14)] transition duration-300 hover:bg-[#2c3037] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="flex items-center justify-center gap-2">
                  {copy.next}
                  <SkipForward size={18} />
                </span>
              </button>
            </div>

           <div className="mt-4">
  <ShareEpisodeButton
    title={shareTitle}
    description={shareDescription}
    shareUrl={shareUrl}
  />
</div> 

            {!episode.audioUrl && (
              <p className="mt-4 text-sm text-gray-400">{copy.noAudio}</p>
            )}
          </div>
        </div>

        {(episode.description || shareNote || episode.speakerName || episode.speakerId) && (
          <div className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_14px_40px_rgba(0,0,0,0.2)] backdrop-blur-xl">
            <div className="mb-3">
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.22em] text-white/50">
                {copy.description}
              </h2>
              <div className="mt-2 h-[2px] w-14 rounded-full bg-[#7A1F2B]" />
            </div>

            {episode.description ? (
              <p className="text-[15px] leading-7 text-white/88">
                {currentLocalizedEpisode?.description}
              </p>
            ) : (
              <p className="text-sm text-white/50">{copy.noDescription}</p>
            )}

            {episode.description && !currentLocalizedEpisode?.descriptionTranslated && (
              <p className="mt-2 text-xs text-[#D4AF37]">{copy.originalContent}</p>
            )}

            {shareNote && (
  <div className="mt-4 rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/10 px-4 py-3 text-sm text-[#E8D28A]">
    {shareNote}
  </div>
)}

          </div>
        )}

        <div className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_14px_40px_rgba(0,0,0,0.2)] backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold">{copy.reviewMarkers}</h3>
              <p className="mt-1 text-xs text-white/45">
                {copy.markersHelp}
              </p>
            </div>

            <span className="rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/10 px-3 py-1 text-xs font-medium text-[#E8D28A]">
              {markers.length} {copy.marker.toLowerCase()}
            </span>
          </div>

          {markers.length === 0 ? (
            <div className="rounded-[22px] border border-white/10 bg-black/10 px-4 py-4 text-sm text-white/60">
              {copy.markersEmpty}
            </div>
          ) : (
            <div className="space-y-2.5">
              {markers.map((marker) => (
                <div
                  key={marker.id}
                  className="group rounded-[22px] border border-white/10 bg-black/10 px-4 py-4 transition duration-300 hover:border-white/15 hover:bg-white/[0.04]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => jumpToMarker(marker.time)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="font-semibold text-white/92 transition group-hover:text-[#F3D77A]">
                        {marker.label}
                      </div>
                      <div className="mt-1 text-sm text-white/60">
                        {formatTime(marker.time)}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteMarker(marker.id)}
                      className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/75 transition hover:bg-white/10"
                      aria-label={copy.deleteMarker}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <textarea
                    value={marker.note || ""}
                    onChange={(e) => updateMarkerNote(marker.id, e.target.value)}
                    placeholder={copy.note}
                    className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/85 outline-none placeholder:text-white/35 focus:border-[#D4AF37]/35"
                    rows={2}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {toast && (
          <div className="mt-4 rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/10 px-4 py-3 text-sm font-medium text-[#F5E7A1] shadow-[0_0_24px_rgba(212,175,55,0.08)]">
            {toast}
          </div>
        )}
      </div>
    </main>
  );
}
