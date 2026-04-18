"use client";

import { useAudio } from "../../../../components/AudioProvider";
import { useEffect, useMemo, useState } from "react";
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
};

type SeriesData = {
  id?: string;
  title?: string;
  coverUrl?: string;
  isDeleted?: boolean;
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
  const [error, setError] = useState("");

  const [isMarkerFlash, setIsMarkerFlash] = useState(false);
  const [markers, setMarkers] = useState<MarkerItem[]>([]);
  const [toast, setToast] = useState("");

  const episodeId = String(params.episode || "");
  const seriesId = String(params.series || "");

  const markerStorageKey = useMemo(
    () => `aqsa_markers_${seriesId}_${episodeId}`,
    [seriesId, episodeId]
  );

  const saveMarkersToStorage = (nextMarkers: MarkerItem[]) => {
    setMarkers(nextMarkers);
    localStorage.setItem(markerStorageKey, JSON.stringify(nextMarkers));
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const episodeRef = doc(db, "episodes", episodeId);
        const episodeSnap = await getDoc(episodeRef);

        if (!episodeSnap.exists()) {
          setError("Episode tidak dijumpai");
          return;
        }

        const episodeData = episodeSnap.data();

        if (episodeData.seriesId !== seriesId || episodeData.isDeleted === true) {
          setError("Episode tidak dijumpai");
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
        };

        setEpisode(currentEpisode);

        const seriesRef = doc(db, "series", seriesId);
        const seriesSnap = await getDoc(seriesRef);

        if (seriesSnap.exists()) {
          const seriesData = seriesSnap.data();

          if (seriesData.isDeleted === true) {
            setError("Series tidak dijumpai");
            return;
          }

          setSeries({
            id: seriesSnap.id,
            title: seriesData.title ?? "",
            coverUrl: seriesData.coverUrl ?? "",
            isDeleted: seriesData.isDeleted ?? false,
          });
        }

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
          }))
          .filter(
            (ep) =>
              ep.seriesId === seriesId &&
              ep.isDeleted !== true &&
              ep.isPublished !== false
          )
          .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

        setSeriesEpisodes(filteredEpisodes);

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

        setSpeakerMap(nextSpeakerMap);
      } catch {
        setError("Gagal memuatkan episod");
      }
    }

    if (episodeId && seriesId) {
      fetchData();
    }
  }, [episodeId, seriesId]);

  useEffect(() => {
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
  }, [markerStorageKey]);

  useEffect(() => {
  if (!episode || !series) return;
  if (!episode.audioUrl) return;

  // Kalau provider belum ada episod aktif, sync page semasa ke provider
  if (!activeEpisode) {
    syncEpisodeToProvider(episode);
    return;
  }

  const isSameEpisode =
    activeEpisode.seriesId === (episode.seriesId || seriesId) &&
    activeEpisode.episodeId === episode.id;

  // Kalau provider sudah pegang episod lain, jangan paksa balik ke page semasa.
  // Biar effect route-sync yang tolak page ke episod provider itu.
  if (!isSameEpisode) return;
}, [episode, series, activeEpisode, seriesId]);

  useEffect(() => {
    if (!activeEpisode) return;

    const activeSeriesId = activeEpisode.seriesId;
    const activeEpisodeId = activeEpisode.episodeId;

    if (activeSeriesId !== seriesId || activeEpisodeId !== episodeId) {
      router.push(`/player/${activeSeriesId}/${activeEpisodeId}`);
    }
  }, [activeEpisode, seriesId, episodeId, router]);

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

  const updateContinueListening = (targetEpisode: EpisodeData) => {
    if (!series) return;

    const item = {
      seriesId: series.id,
      episodeId: targetEpisode.id,
      seriesTitle: series.title || "Aqsa Series",
      episodeTitle: targetEpisode.title || "Tanpa Tajuk",
    };

    try {
      localStorage.setItem("continueListening", JSON.stringify([item]));

      const existingRecent = localStorage.getItem("recentlyPlayed");
      let recentList = existingRecent ? JSON.parse(existingRecent) : [];

      if (!Array.isArray(recentList)) {
        recentList = [];
      }

      recentList = recentList.filter(
        (x: any) =>
          !(x.seriesId === item.seriesId && x.episodeId === item.episodeId)
      );

      recentList.unshift(item);
      localStorage.setItem(
        "recentlyPlayed",
        JSON.stringify(recentList.slice(0, 10))
      );
    } catch {}
  };

  function getSpeakerName(speakerId?: string, fallbackName?: string) {
    if (speakerId && speakerMap[speakerId]) return speakerMap[speakerId];
    if (fallbackName && fallbackName.trim() !== "") return fallbackName;
    if (speakerId) return speakerId;
    return "Penyampai tidak diketahui";
  }

  function buildQueue() {
    return seriesEpisodes.map((ep) => ({
      seriesId: ep.seriesId || seriesId,
      episodeId: ep.id,
      seriesTitle: series?.title || "Aqsa Series",
      episodeTitle: ep.title || "Tanpa Tajuk",
      audioUrl: ep.audioUrl || "",
      coverUrl: series?.coverUrl || ep.coverUrl || ep.imageUrl || "",
      speakerName: getSpeakerName(ep.speakerId, ep.speakerName),
    }));
  }

  async function syncEpisodeToProvider(targetEpisode: EpisodeData) {
    const queue = buildQueue();

    const target = {
      seriesId: targetEpisode.seriesId || seriesId,
      episodeId: targetEpisode.id,
      seriesTitle: series?.title || "Aqsa Series",
      episodeTitle: targetEpisode.title || "Tanpa Tajuk",
      audioUrl: targetEpisode.audioUrl || "",
      coverUrl:
        series?.coverUrl ||
        targetEpisode.coverUrl ||
        targetEpisode.imageUrl ||
        "",
      speakerName: getSpeakerName(
        targetEpisode.speakerId,
        targetEpisode.speakerName
      ),
    };

    await playEpisode(target, queue);
  }

  const goToEpisode = async (targetEpisode: EpisodeData) => {
    updateContinueListening(targetEpisode);
    await syncEpisodeToProvider(targetEpisode);
    router.push(`/player/${targetEpisode.seriesId || seriesId}/${targetEpisode.id}`);
  };

  const handlePrevEpisode = async () => {
    if (!prevEpisode) return;
    updateContinueListening(prevEpisode);
    await playPrev();
  };

  const handleNextEpisode = async () => {
    if (!nextEpisode) return;
    updateContinueListening(nextEpisode);
    await playNext();
  };

  const togglePlayPause = async () => {
    try {
      await toggleCurrent();
    } catch (err) {
      console.error("Gagal play/pause:", err);
    }
  };

  const jumpToMarker = async (time: number) => {
    try {
      seekAudio(time);

      if (!isPlaying) {
        await toggleCurrent();
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        console.error("Gagal lompat ke marker:", err);
      }
    }
  };

  const addMarker = () => {
    if (!episode?.audioUrl) return;

    const time = currentTime || 0;
    const isDuplicate = markers.some(
      (marker) => Math.abs(marker.time - time) < 2
    );

    if (isDuplicate) {
      setToast(`Marker sudah ada sekitar ${formatTime(time)}`);
      return;
    }

    const newMarker: MarkerItem = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      time,
      label: `Marker ${markers.length + 1}`,
      note: "",
    };

    const updated = [...markers, newMarker].sort((a, b) => a.time - b.time);
    saveMarkersToStorage(updated);
    setToast(`Marker ditambah pada ${formatTime(time)}`);
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

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const coverImage =
    series?.coverUrl ||
    episode?.coverUrl ||
    episode?.imageUrl ||
    "https://images.unsplash.com/photo-1521295121783-8a321d551ad2?q=80&w=1200&auto=format&fit=crop";

  const seriesTitle = (series?.title || "").trim().toLowerCase();
  const episodeTitle = (episode?.title || "").trim().toLowerCase();
  const showSeriesTitle = !!seriesTitle && seriesTitle !== episodeTitle;

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0f1115] text-white">
        <h1 className="text-xl">{error}</h1>
      </main>
    );
  }

  if (!episode) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0f1115] text-white">
        <p>Memuatkan episod...</p>
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
          ← Kembali ke Senarai Episod
        </button>

        <div className="overflow-hidden rounded-[32px] border border-white/10 bg-[#171a20] shadow-[0_28px_90px_rgba(0,0,0,0.48)]">
          <div className="relative h-80 overflow-hidden">
            <img
              src={coverImage}
              alt={episode.title || "Cover episode"}
              className="h-full w-full object-cover"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/12" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.10),transparent_35%)]" />

            <div className="absolute left-5 top-5 flex items-end gap-[3px] rounded-2xl border border-white/10 bg-black/25 px-3 py-2 backdrop-blur-md">
              {isPlaying ? (
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
              Sedang Dimainkan
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-5">
              <div className="rounded-[26px] border border-white/10 bg-black/20 p-4 backdrop-blur-md">
                {showSeriesTitle && (
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/55">
                    {series?.title}
                  </p>
                )}

                <h1
                  className={`text-[30px] font-extrabold leading-[1.1] tracking-tight ${
                    showSeriesTitle ? "mt-2" : ""
                  }`}
                >
                  {episode.title || "Tanpa Tajuk"}
                </h1>
              </div>
            </div>
          </div>

          <div className="border-t border-white/6 bg-[#2f3238]/95 p-4 backdrop-blur-xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
                  Penyampai
                </p>
                <p className="mt-1 text-sm font-medium text-white/90">
                  {getSpeakerName(episode.speakerId, episode.speakerName)}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-4">
                <button
                  type="button"
                  onClick={addMarker}
                  aria-label="Tambah marker"
                  disabled={!episode.audioUrl}
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
                  aria-label={isPlaying ? "Pause" : "Play"}
                  disabled={!episode.audioUrl}
                  className="relative flex h-[68px] w-[68px] items-center justify-center rounded-full bg-red-500 text-white shadow-[0_18px_36px_rgba(239,68,68,0.32)] transition duration-300 active:scale-95 disabled:opacity-40"
                >
                  <div className="absolute inset-[1px] rounded-full bg-gradient-to-br from-white/20 via-transparent to-black/10" />
                  {isPlaying ? (
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

            <div className="mb-2">
              <div className="relative h-6">
                <div className="absolute top-1/2 h-2 w-full -translate-y-1/2 rounded-full bg-white/15" />

                <div
                  className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-gradient-to-r from-[#E24B5B] to-[#B91C32]"
                  style={{ width: `${progressPercent}%` }}
                />

                {duration > 0 &&
                  markers.map((marker) => {
                    const left = `${(marker.time / duration) * 100}%`;

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
                  max={duration || 0}
                  step={0.1}
                  value={currentTime}
                  onChange={(e) => seekAudio(Number(e.target.value))}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  disabled={!episode.audioUrl}
                />

                <div
                  className="absolute top-1/2 z-20 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-white bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.26)]"
                  style={{ left: `calc(${progressPercent}% - 8px)` }}
                />
              </div>

              <div className="mt-2 flex justify-between text-sm font-medium text-white/75">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
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
                  Prev
                </span>
              </button>

              <button
                type="button"
                onClick={togglePlayPause}
                disabled={!episode.audioUrl}
                className="rounded-[22px] border border-white/12 bg-[#24272d] px-4 py-3 text-base font-semibold text-white/90 shadow-[0_10px_26px_rgba(0,0,0,0.14)] transition duration-300 hover:bg-[#2c3037] active:scale-[0.985] disabled:opacity-40"
              >
                {isPlaying ? "Pause" : "Play"}
              </button>

              <button
                type="button"
                onClick={handleNextEpisode}
                disabled={!nextEpisode}
                className="rounded-[22px] border border-white/12 bg-[#24272d] px-4 py-3 text-base font-semibold text-white/90 shadow-[0_10px_26px_rgba(0,0,0,0.14)] transition duration-300 hover:bg-[#2c3037] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="flex items-center justify-center gap-2">
                  Next
                  <SkipForward size={18} />
                </span>
              </button>
            </div>

            {!episode.audioUrl && (
              <p className="mt-4 text-sm text-gray-400">Audio belum dimuat naik.</p>
            )}
          </div>
        </div>

        {(episode.description || episode.speakerName || episode.speakerId) && (
          <div className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_14px_40px_rgba(0,0,0,0.2)] backdrop-blur-xl">
            <div className="mb-3">
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.22em] text-white/50">
                Huraian Episod
              </h2>
              <div className="mt-2 h-[2px] w-14 rounded-full bg-[#7A1F2B]" />
            </div>

            {episode.description ? (
              <p className="text-[15px] leading-7 text-white/88">
                {episode.description}
              </p>
            ) : (
              <p className="text-sm text-white/50">Tiada huraian untuk episod ini.</p>
            )}
          </div>
        )}

        <div className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_14px_40px_rgba(0,0,0,0.2)] backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold">Marker Ulangkaji</h3>
              <p className="mt-1 text-xs text-white/45">
                Simpan poin penting untuk ulangkaji kemudian
              </p>
            </div>

            <span className="rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/10 px-3 py-1 text-xs font-medium text-[#E8D28A]">
              {markers.length} marker
            </span>
          </div>

          {markers.length === 0 ? (
            <div className="rounded-[22px] border border-white/10 bg-black/10 px-4 py-4 text-sm text-white/60">
              Belum ada marker. Tekan butang marker semasa audio sedang berjalan.
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
                      aria-label="Padam marker"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <textarea
                    value={marker.note || ""}
                    onChange={(e) => updateMarkerNote(marker.id, e.target.value)}
                    placeholder="Tulis nota atau point penting di sini..."
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