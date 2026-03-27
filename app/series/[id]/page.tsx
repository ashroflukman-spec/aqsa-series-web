"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "../../../lib/firebase";

type SeriesItem = {
  id: string;
  title: string;
  speakerId: string;
  description: string;
  coverUrl: string;
  isPublished: boolean;
  sortOrder: number;
  originalWorkTitle?: string;
  originalWorkAuthor?: string;
  originalWorkPublisher?: string;
  originalLanguage?: string;
  isDeleted?: boolean;
};

type EpisodeItem = {
  id: string;
  title: string;
  slug?: string;
  description: string;
  seriesId: string;
  speakerId: string;
  audioUrl: string;
  durationSeconds: number;
  displayOrder?: number;
  originalChapterLabel?: string;
  isPublished: boolean;
  isDeleted?: boolean;
};

function formatDuration(seconds: number) {
  if (!seconds || seconds <= 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

function formatTime(seconds: number) {
  if (!seconds || Number.isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export default function SeriesPage() {
  const params = useParams();
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [series, setSeries] = useState<SeriesItem | null>(null);
  const [episodes, setEpisodes] = useState<EpisodeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showOriginalWork, setShowOriginalWork] = useState(false);

  const [currentEpisode, setCurrentEpisode] = useState<EpisodeItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playerDuration, setPlayerDuration] = useState(0);

  useEffect(() => {
    async function fetchData() {
      try {
        const seriesId = String(params.id);

        const seriesRef = doc(db, "series", seriesId);
        const seriesSnap = await getDoc(seriesRef);

        if (!seriesSnap.exists()) {
          setError("Series tidak dijumpai");
          setLoading(false);
          return;
        }

        const seriesData: SeriesItem = {
          id: seriesSnap.id,
          title: seriesSnap.data().title ?? "",
          speakerId: seriesSnap.data().speakerId ?? "",
          description: seriesSnap.data().description ?? "",
          coverUrl: seriesSnap.data().coverUrl ?? "",
          isPublished: seriesSnap.data().isPublished ?? false,
          sortOrder: seriesSnap.data().sortOrder ?? 0,
          originalWorkTitle: seriesSnap.data().originalWorkTitle ?? "",
          originalWorkAuthor: seriesSnap.data().originalWorkAuthor ?? "",
          originalWorkPublisher: seriesSnap.data().originalWorkPublisher ?? "",
          originalLanguage: seriesSnap.data().originalLanguage ?? "",
          isDeleted: seriesSnap.data().isDeleted ?? false,
        };

        if (seriesData.isDeleted === true || seriesData.isPublished !== true) {
          setError("Series tidak dijumpai");
          setLoading(false);
          return;
        }

        setSeries(seriesData);

        const episodesSnap = await getDocs(collection(db, "episodes"));

        const filteredEpisodes: EpisodeItem[] = episodesSnap.docs
          .map((docItem) => ({
            id: docItem.id,
            title: docItem.data().title ?? "",
            slug: docItem.data().slug ?? "",
            description: docItem.data().description ?? "",
            seriesId: docItem.data().seriesId ?? "",
            speakerId: docItem.data().speakerId ?? "",
            audioUrl: docItem.data().audioUrl ?? "",
            durationSeconds: docItem.data().durationSeconds ?? 0,
            displayOrder: docItem.data().displayOrder ?? 0,
            originalChapterLabel: docItem.data().originalChapterLabel ?? "",
            isPublished: docItem.data().isPublished ?? false,
            isDeleted: docItem.data().isDeleted ?? false,
          }))
          .filter(
            (ep) =>
              ep.seriesId === seriesId &&
              ep.isPublished === true &&
              ep.isDeleted !== true
          )
          .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

        setEpisodes(filteredEpisodes);

        if (filteredEpisodes.length > 0) {
          setCurrentEpisode(filteredEpisodes[0]);
          setPlayerDuration(filteredEpisodes[0].durationSeconds || 0);
        }
      } catch (err: any) {
        setError(err?.message || "Gagal memuatkan series");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [params.id]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => {
      const realDuration = Math.round(audio.duration || 0);
      setPlayerDuration(realDuration || currentEpisode?.durationSeconds || 0);
      setPlayerReady(true);
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime || 0);
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);

      if (!currentEpisode) return;

      const currentIndex = episodes.findIndex((ep) => ep.id === currentEpisode.id);
      if (currentIndex >= 0 && currentIndex < episodes.length - 1) {
        const nextEpisode = episodes[currentIndex + 1];
        setCurrentEpisode(nextEpisode);
        setPlayerDuration(nextEpisode.durationSeconds || 0);
        setPlayerReady(false);
      }
    };

    const onPause = () => setIsPlaying(false);
    const onPlay = () => setIsPlaying(true);

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
  }, [currentEpisode, episodes]);

  useEffect(() => {
    if (!currentEpisode || !series) return;

    const item = {
      seriesId: series.id,
      episodeId: currentEpisode.id,
      seriesTitle: series.title,
      episodeTitle: currentEpisode.title,
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
          !(
            x.seriesId === item.seriesId &&
            x.episodeId === item.episodeId
          )
      );

      recentList.unshift(item);
      localStorage.setItem("recentlyPlayed", JSON.stringify(recentList.slice(0, 10)));
    } catch {}
  }, [currentEpisode, series]);

  const hasOriginalWorkInfo =
    !!series?.originalWorkTitle ||
    !!series?.originalWorkAuthor ||
    !!series?.originalWorkPublisher ||
    !!series?.originalLanguage;

  const progressPercent = useMemo(() => {
    if (!playerDuration || playerDuration <= 0) return 0;
    return Math.min((currentTime / playerDuration) * 100, 100);
  }, [currentTime, playerDuration]);

  async function togglePlayPause() {
    if (!audioRef.current || !currentEpisode?.audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      return;
    }

    try {
      await audioRef.current.play();
    } catch {}
  }

  function handleSelectEpisode(ep: EpisodeItem) {
    const audio = audioRef.current;

    setCurrentEpisode(ep);
    setCurrentTime(0);
    setPlayerDuration(ep.durationSeconds || 0);
    setPlayerReady(false);

    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }

    setTimeout(async () => {
      if (audioRef.current && ep.audioUrl) {
        try {
          await audioRef.current.play();
        } catch {}
      }
    }, 100);
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const value = Number(e.target.value);
    setCurrentTime(value);

    if (audioRef.current) {
      audioRef.current.currentTime = value;
    }
  }

  function playPrevious() {
    if (!currentEpisode) return;
    const currentIndex = episodes.findIndex((ep) => ep.id === currentEpisode.id);
    if (currentIndex > 0) {
      handleSelectEpisode(episodes[currentIndex - 1]);
    }
  }

  function playNext() {
    if (!currentEpisode) return;
    const currentIndex = episodes.findIndex((ep) => ep.id === currentEpisode.id);
    if (currentIndex >= 0 && currentIndex < episodes.length - 1) {
      handleSelectEpisode(episodes[currentIndex + 1]);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0f1115] text-white flex justify-center">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-80px] left-1/2 -translate-x-1/2 w-[420px] h-[420px] rounded-full bg-[#7A1F2B] opacity-15 blur-[120px]" />
        <div className="absolute top-[280px] left-1/2 -translate-x-1/2 w-[340px] h-[340px] rounded-full bg-white/5 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md px-6 py-10 pb-32">
        <button
          onClick={() => router.push("/")}
          className="mb-6 text-sm text-gray-400"
        >
          ← Kembali
        </button>

        {loading && (
          <div className="rounded-2xl bg-[#1f232b] p-5 text-sm text-gray-300">
            Sedang memuatkan series...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-950/40 p-5 text-sm text-red-200">
            {error}
          </div>
        )}

        {!loading && !error && series && (
          <>
            <div className="relative overflow-hidden rounded-[28px] border border-white/10 shadow-2xl">
              <div
                className="h-64 bg-cover bg-center"
                style={{
                  backgroundImage: series.coverUrl
                    ? `url(${series.coverUrl})`
                    : "linear-gradient(135deg, #20252f, #12151b)",
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/15" />

              <div className="absolute inset-x-0 bottom-0 p-5">
                <p className="text-2xl font-bold leading-tight">{series.title}</p>
                <p className="mt-2 text-sm text-gray-200">
                  {currentEpisode?.title || "Tiada episod dipilih"}
                </p>
              </div>

              <div className="absolute top-4 right-4 rounded-full border border-white/15 bg-black/25 px-3 py-1 text-[11px] text-white/90 backdrop-blur">
                {episodes.length} episod
              </div>

              {isPlaying && (
                <div className="absolute left-5 top-5 flex items-end gap-[3px] rounded-2xl border border-white/10 bg-black/25 px-3 py-2 backdrop-blur">
                  <span className="h-3 w-1 rounded-full bg-white/90 animate-[equalize_1s_ease-in-out_infinite]" />
                  <span className="h-5 w-1 rounded-full bg-white/90 animate-[equalize_0.8s_ease-in-out_infinite]" />
                  <span className="h-7 w-1 rounded-full bg-white/90 animate-[equalize_1.2s_ease-in-out_infinite]" />
                  <span className="h-4 w-1 rounded-full bg-white/90 animate-[equalize_0.9s_ease-in-out_infinite]" />
                  <span className="h-6 w-1 rounded-full bg-white/90 animate-[equalize_1.1s_ease-in-out_infinite]" />
                </div>
              )}
            </div>

            <div className="mt-4 rounded-[28px] border border-white/10 bg-white/5 p-4 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
              <audio
                ref={audioRef}
                src={currentEpisode?.audioUrl || ""}
                preload="metadata"
              />

              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {currentEpisode?.title || "Tiada audio dipilih"}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {currentEpisode?.originalChapterLabel || "Episod"} •{" "}
                    {formatDuration(playerDuration || currentEpisode?.durationSeconds || 0)}
                  </p>
                </div>

                <button
                  onClick={togglePlayPause}
                  disabled={!currentEpisode?.audioUrl}
                  className="h-14 w-14 shrink-0 rounded-full border border-white/10 bg-[#7A1F2B] text-lg font-semibold shadow-lg disabled:opacity-50"
                >
                  {isPlaying ? "❚❚" : "▶"}
                </button>
              </div>

              <div className="mt-4">
                <input
                  type="range"
                  min={0}
                  max={playerDuration || 0}
                  value={Math.min(currentTime, playerDuration || 0)}
                  onChange={handleSeek}
                  className="w-full accent-[#7A1F2B]"
                />
                <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(playerDuration)}</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                <button
                  onClick={playPrevious}
                  className="rounded-2xl border border-white/10 bg-[#14161b] px-4 py-3 text-sm"
                >
                  Prev
                </button>
                <button
                  onClick={togglePlayPause}
                  className="rounded-2xl border border-white/10 bg-[#14161b] px-4 py-3 text-sm"
                >
                  {isPlaying ? "Pause" : "Play"}
                </button>
                <button
                  onClick={playNext}
                  className="rounded-2xl border border-white/10 bg-[#14161b] px-4 py-3 text-sm"
                >
                  Next
                </button>
              </div>
            </div>

            <div className="mt-6 mb-8">
              <p className="text-sm text-gray-400">
                {series.description || "Tiada deskripsi siri."}
              </p>

              <p className="mt-3 text-xs text-gray-500">
                Speaker: {series.speakerId}
              </p>

              {hasOriginalWorkInfo && (
                <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.35)] overflow-hidden">
                  <button
                    onClick={() => setShowOriginalWork(!showOriginalWork)}
                    className="w-full px-5 py-4 flex items-center justify-between text-left transition hover:bg-white/[0.03]"
                  >
                    <div>
                      <p className="text-sm font-semibold">Karya Asal</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Tekan untuk {showOriginalWork ? "sembunyikan" : "lihat"} maklumat karya
                      </p>
                    </div>

                    <div
                      className={`h-8 w-8 rounded-full border border-white/10 bg-white/10 backdrop-blur flex items-center justify-center text-xs text-gray-300 transition ${
                        showOriginalWork ? "rotate-180" : ""
                      }`}
                    >
                      ▼
                    </div>
                  </button>

                  {showOriginalWork && (
                    <div className="px-5 pb-5 border-t border-white/5">
                      {series.originalWorkTitle && (
                        <div className="mt-4 rounded-2xl bg-black/20 border border-white/5 px-4 py-3">
                          <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-1">
                            Judul
                          </p>
                          <p className="text-sm text-gray-200 leading-6">
                            {series.originalWorkTitle}
                          </p>
                        </div>
                      )}

                      {series.originalWorkAuthor && (
                        <div className="mt-3 rounded-2xl bg-black/20 border border-white/5 px-4 py-3">
                          <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-1">
                            Penulis Asal
                          </p>
                          <p className="text-sm text-gray-200 leading-6">
                            {series.originalWorkAuthor}
                          </p>
                        </div>
                      )}

                      {series.originalWorkPublisher && (
                        <div className="mt-3 rounded-2xl bg-black/20 border border-white/5 px-4 py-3">
                          <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-1">
                            Penerbit
                          </p>
                          <p className="text-sm text-gray-200 leading-6">
                            {series.originalWorkPublisher}
                          </p>
                        </div>
                      )}

                      {series.originalLanguage && (
                        <div className="mt-3 rounded-2xl bg-black/20 border border-white/5 px-4 py-3">
                          <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-1">
                            Bahasa Asal
                          </p>
                          <p className="text-sm text-gray-200 leading-6">
                            {series.originalLanguage}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-3">
              {episodes.length === 0 && (
                <div className="rounded-2xl bg-[#1f232b] p-5 text-sm text-gray-400">
                  Belum ada episod diterbitkan untuk series ini.
                </div>
              )}

              {episodes.map((ep) => {
                const active = currentEpisode?.id === ep.id;

                return (
                  <div
                    key={ep.id}
                    onClick={() => handleSelectEpisode(ep)}
                    className={`cursor-pointer rounded-2xl px-4 py-4 transition ${
                      active
                        ? "bg-[#7A1F2B]/25 border border-[#7A1F2B]/40"
                        : "bg-[#1f232b] hover:bg-[#262b35]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold">{ep.title}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {ep.originalChapterLabel || "Episod"} • {formatDuration(ep.durationSeconds)}
                        </p>
                      </div>

                      <div className="text-sm text-gray-400">
                        {active && isPlaying ? "❚❚" : "▶"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <style jsx global>{`
              @keyframes equalize {
                0%,
                100% {
                  transform: scaleY(0.45);
                  opacity: 0.6;
                }
                50% {
                  transform: scaleY(1);
                  opacity: 1;
                }
              }
            `}</style>
          </>
        )}
      </div>
    </main>
  );
}