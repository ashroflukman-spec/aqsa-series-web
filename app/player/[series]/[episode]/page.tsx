"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

type MarkerItem = {
  id: string;
  time: number;
  label: string;
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
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [episode, setEpisode] = useState<EpisodeData | null>(null);
  const [series, setSeries] = useState<SeriesData | null>(null);
  const [seriesEpisodes, setSeriesEpisodes] = useState<EpisodeData[]>([]);
  const [error, setError] = useState("");

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMarkerFlash, setIsMarkerFlash] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [markers, setMarkers] = useState<MarkerItem[]>([]);
  const [toast, setToast] = useState("");

  const episodeId = String(params.episode || "");
  const seriesId = String(params.series || "");

  const markerStorageKey = useMemo(
    () => `aqsa_markers_${seriesId}_${episodeId}`,
    [seriesId, episodeId]
  );

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

        if (
          episodeData.seriesId !== seriesId ||
          episodeData.isDeleted === true
        ) {
          setError("Episode tidak dijumpai");
          return;
        }

        const currentEpisode: EpisodeData = {
          id: episodeSnap.id,
          ...episodeData,
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
            ...seriesData,
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

setSeriesEpisodes(filteredEpisodes);     } catch {
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
      if (Array.isArray(parsed)) {
        setMarkers(parsed);
      } else {
        setMarkers([]);
      }
    } catch {
      setMarkers([]);
    }
  }, [markerStorageKey]);

  useEffect(() => {
    localStorage.setItem(markerStorageKey, JSON.stringify(markers));
  }, [markers, markerStorageKey]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 1600);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => {
      const realDuration = Math.round(audio.duration || 0);
      setDuration(realDuration || episode?.durationSeconds || 0);
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime || 0);
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);

      if (nextEpisode) {
        goToEpisode(nextEpisode);
      }
    };

    const onPause = () => {
      setIsPlaying(false);
    };

    const onPlay = () => {
      setIsPlaying(true);
    };

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("play", onPlay);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("play", onPlay);
    };
  }, [episode?.audioUrl, episode?.durationSeconds, seriesEpisodes]);

  useEffect(() => {
    setCurrentTime(0);
    setDuration(episode?.durationSeconds || 0);
    setIsPlaying(false);
  }, [episodeId]);

  const currentEpisodeIndex = seriesEpisodes.findIndex((ep) => ep.id === episodeId);
  const prevEpisode =
    currentEpisodeIndex > 0 ? seriesEpisodes[currentEpisodeIndex - 1] : null;
  const nextEpisode =
    currentEpisodeIndex >= 0 && currentEpisodeIndex < seriesEpisodes.length - 1
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
        (x: any) => !(x.seriesId === item.seriesId && x.episodeId === item.episodeId)
      );

      recentList.unshift(item);
      localStorage.setItem("recentlyPlayed", JSON.stringify(recentList.slice(0, 10)));
    } catch {}
  };

  const goToEpisode = (targetEpisode: EpisodeData) => {
    updateContinueListening(targetEpisode);
    router.push(`/player/${seriesId}/${targetEpisode.id}`);
  };

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio || !episode?.audioUrl) return;

    try {
      if (audio.paused) {
        await audio.play();
      } else {
        audio.pause();
      }
    } catch (err) {
      console.error("Gagal play/pause:", err);
    }
  };

  const seekAudio = (value: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value;
    setCurrentTime(value);
  };

  const jumpToMarker = async (time: number) => {
    const audio = audioRef.current;
    if (!audio || !episode?.audioUrl) return;

    audio.currentTime = time;
    setCurrentTime(time);

    try {
      await audio.play();
    } catch (err) {
      console.error("Gagal lompat ke marker:", err);
    }
  };

  const addMarker = () => {
    const audio = audioRef.current;
    if (!audio || !episode?.audioUrl) return;

    const time = audio.currentTime || 0;

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
    };

    const updated = [...markers, newMarker].sort((a, b) => a.time - b.time);
    setMarkers(updated);
    setToast(`Marker ditambah pada ${formatTime(time)}`);
    setIsMarkerFlash(true);

    setTimeout(() => {
      setIsMarkerFlash(false);
    }, 500);
  };

  const deleteMarker = (id: string) => {
    setMarkers((prev) => prev.filter((marker) => marker.id !== id));
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const coverImage =
    series?.coverUrl ||
    episode?.coverUrl ||
    episode?.imageUrl ||
    "https://images.unsplash.com/photo-1521295121783-8a321d551ad2?q=80&w=1200&auto=format&fit=crop";

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
    <main className="flex min-h-screen justify-center bg-[#0f1115] text-white">
      <div className="w-full max-w-md px-5 py-8 pb-56">
        <button
          onClick={() => router.back()}
          className="mb-6 text-sm text-gray-400"
        >
          ← Kembali
        </button>

        <div className="overflow-hidden rounded-[30px] border border-white/10 bg-[#1a1d24] shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
          <div className="relative h-72 overflow-hidden">
            <img
              src={coverImage}
              alt={episode.title || "Cover episode"}
              className="h-full w-full object-cover"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/10" />

            <div className="absolute left-5 top-5 flex items-end gap-[3px] rounded-2xl border border-white/10 bg-black/25 px-3 py-2 backdrop-blur">
              {isPlaying ? (
                <>
                  <span
                    className="eq-smooth h-3 w-1 rounded-full bg-white/90 animate-[equalize_1.4s_cubic-bezier(0.4,0,0.2,1)_infinite]"
                  />
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

            <div className="absolute right-4 top-4 rounded-full border border-white/15 bg-black/25 px-3 py-1 text-[11px] text-white/90 backdrop-blur">
              1 episod
            </div>

            <div className="absolute bottom-4 left-4 right-4">
              <h1 className="text-3xl font-extrabold leading-tight">
                {episode.title || "Tanpa Tajuk"}
              </h1>
              <p className="mt-1 text-sm text-white/85">
                {series?.title || "Aqsa Series"}
              </p>
            </div>
          </div>

          <div className="bg-[#3a3a3f] p-4">
            <audio ref={audioRef} src={episode.audioUrl || ""} className="hidden" />

            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium tracking-wide text-white/85">
                  {episode.speakerName || "Ustaz Ashrof Lukman"}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-4">
                <button
                  type="button"
                  onClick={addMarker}
                  aria-label="Tambah marker"
                  disabled={!episode.audioUrl}
                  className={`flex h-[68px] w-[68px] items-center justify-center rounded-full border border-[#D4AF37]/55 bg-[#D4AF37]/12 shadow-[0_0_22px_rgba(212,175,55,0.22)] transition active:scale-95 disabled:opacity-40 ${
                    isMarkerFlash
                      ? "ring-4 ring-[#D4AF37]/30 shadow-[0_0_30px_rgba(212,175,55,0.32)]"
                      : ""
                  }`}
                >
                  <Bookmark
                    size={26}
                    className="text-[#D4AF37]"
                    fill="none"
                    strokeWidth={2.2}
                  />
                </button>

                <button
                  type="button"
                  onClick={togglePlayPause}
                  aria-label={isPlaying ? "Pause" : "Play"}
                  disabled={!episode.audioUrl}
                  className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-red-500 text-white shadow-2xl transition active:scale-95 disabled:opacity-40"
                >
                  {isPlaying ? (
                    <Pause size={28} fill="currentColor" />
                  ) : (
                    <Play size={28} fill="currentColor" className="ml-1" />
                  )}
                </button>
              </div>
            </div>

            <div className="mb-2">
              <div className="relative h-6">
                <div className="absolute top-1/2 h-2 w-full -translate-y-1/2 rounded-full bg-white/20" />

                <div
                  className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-red-500"
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
                        className="absolute top-1/2 z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-[#D4AF37] shadow"
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
                  className="absolute top-1/2 z-20 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-white bg-red-500 shadow"
                  style={{ left: `calc(${progressPercent}% - 8px)` }}
                />
              </div>

              <div className="mt-2 flex justify-between text-sm font-medium text-white/80">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => prevEpisode && goToEpisode(prevEpisode)}
                disabled={!prevEpisode}
                className="flex items-center justify-center gap-2 rounded-[20px] border border-white/15 bg-[#2b2b2f] px-4 py-3 text-base font-semibold shadow-md transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <SkipBack size={18} />
                Prev
              </button>

              <button
                type="button"
                onClick={togglePlayPause}
                disabled={!episode.audioUrl}
                className="rounded-[20px] border border-white/15 bg-[#2b2b2f] px-4 py-3 text-base font-semibold shadow-md transition active:scale-[0.98] disabled:opacity-40"
              >
                {isPlaying ? "Pause" : "Play"}
              </button>

              <button
                type="button"
                onClick={() => nextEpisode && goToEpisode(nextEpisode)}
                disabled={!nextEpisode}
                className="flex items-center justify-center gap-2 rounded-[20px] border border-white/15 bg-[#2b2b2f] px-4 py-3 text-base font-semibold shadow-md transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <SkipForward size={18} />
              </button>
            </div>

            {!episode.audioUrl && (
              <p className="mt-4 text-sm text-gray-400">
                Audio belum dimuat naik.
              </p>
            )}
          </div>
        </div>

        {(episode.description || episode.speakerName) && (
          <div className="px-1 pb-2 pt-5">
            {episode.description && (
              <p className="text-[15px] leading-7 text-white/90">
                {episode.description}
              </p>
            )}
            {episode.speakerName && (
              <p className="mt-4 text-sm text-white/70">
                Speaker: {episode.speakerName}
              </p>
            )}
          </div>
        )}

        <div className="mt-6 rounded-[24px] border border-white/10 bg-white/5 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-bold">Marker Ulangkaji</h3>
            <span className="text-sm text-white/65">{markers.length} marker</span>
          </div>

          {markers.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-white/65">
              Belum ada marker. Tekan butang marker semasa audio sedang berjalan.
            </div>
          ) : (
            <div className="space-y-2">
              {markers.map((marker) => (
                <div
                  key={marker.id}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/10 px-4 py-3"
                >
                  <button
                    type="button"
                    onClick={() => jumpToMarker(marker.time)}
                    className="text-left"
                  >
                    <div className="font-semibold">{marker.label}</div>
                    <div className="text-sm text-white/70">
                      {formatTime(marker.time)}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteMarker(marker.id)}
                    className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/80 transition hover:bg-white/10"
                    aria-label="Padam marker"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {toast && (
          <div className="mt-4 rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/10 px-4 py-3 text-sm font-medium text-[#F5E7A1]">
            {toast}
          </div>
        )}
      </div>
    </main>
  );
}