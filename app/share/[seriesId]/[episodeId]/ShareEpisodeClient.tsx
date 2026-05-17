"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";
import { db } from "../../../../lib/firebase";
import { useAudio } from "../../../../components/AudioProvider";
import ShareEpisodeButton from "../../../../components/ShareEpisodeButton";

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
};

type SeriesData = {
  id?: string;
  title?: string;
  coverUrl?: string;
  description?: string;
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

function formatTime(seconds = 0) {
  if (!Number.isFinite(seconds)) return "0:00";
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export default function ShareEpisodePage() {
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

  const episodeId = String(params.episodeId || "");
  const seriesId = String(params.seriesId || "");

  useEffect(() => {
    async function fetchData() {
      try {
        const episodeRef = doc(db, "episodes", episodeId);
        const episodeSnap = await getDoc(episodeRef);

        if (!episodeSnap.exists()) {
          setError("Episod tidak dijumpai");
          return;
        }

        const episodeData = episodeSnap.data();

        if (episodeData.seriesId !== seriesId || episodeData.isDeleted === true) {
          setError("Episod tidak dijumpai");
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
            description: seriesData.description ?? "",
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

    shareTitle: docItem.data().shareTitle ?? "",
    shareDescription: docItem.data().shareDescription ?? "",
    shareNote: docItem.data().shareNote ?? "",
    shareCtaText: docItem.data().shareCtaText ?? "",
    shareImageUrl: docItem.data().shareImageUrl ?? "",
    shareStatus: docItem.data().shareStatus ?? "draft",
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
  if (!episode || !series) return;
  if (!episode.audioUrl) return;

  if (!activeEpisode) {
    syncEpisodeToProvider(episode);
    return;
  }

  const isSameEpisode =
    activeEpisode.seriesId === (episode.seriesId || seriesId) &&
    activeEpisode.episodeId === episode.id;

  if (!isSameEpisode) return;
}, [episode, series, activeEpisode, seriesId]);

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
    await playPrev();
  };

  const handleNextEpisode = async () => {
    if (!nextEpisode) return;
    await playNext();
  };

  const togglePlayPause = async () => {
    try {
      await toggleCurrent();
    } catch (err) {
      console.error("Gagal play/pause:", err);
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const coverImage =
    episode?.shareImageUrl ||
    series?.coverUrl ||
    episode?.coverUrl ||
    episode?.imageUrl ||
    "https://images.unsplash.com/photo-1521295121783-8a321d551ad2?q=80&w=1200&auto=format&fit=crop";

  const shareTitle = episode?.shareTitle || episode?.title || "Aqsa Series";
  const shareDescription =
    episode?.shareDescription ||
    episode?.description ||
    "Dengar episod ini di Aqsa Series.";

  const shareNote = episode?.shareNote || "";
  const shareCtaText = episode?.shareCtaText || "Dengar sekarang di Aqsa Series";

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/share/${seriesId}/${episodeId}`
      : `/share/${seriesId}/${episodeId}`;

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

      <div className="relative w-full max-w-md px-5 py-8 pb-28">
        <button
          onClick={() => router.push(`/player/${seriesId}/${episodeId}`)}
          className="mb-6 text-sm text-gray-400 transition hover:text-white/80"
        >
          ← Buka dalam Player
        </button>

        <div className="overflow-hidden rounded-[32px] border border-white/10 bg-[#171a20] shadow-[0_28px_90px_rgba(0,0,0,0.48)]">
          <div className="relative h-80 overflow-hidden">
            <img
              src={coverImage}
              alt={shareTitle}
              className="h-full w-full object-cover"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/12" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.10),transparent_35%)]" />

            <div className="absolute right-4 top-4 rounded-full border border-white/15 bg-black/25 px-3 py-1 text-[11px] text-white/90 backdrop-blur-md">
              Dikongsi dari Aqsa Series
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-5">
              <div className="rounded-[26px] border border-white/10 bg-black/20 p-4 backdrop-blur-md">
                {series?.title && (
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/55">
                    {series.title}
                  </p>
                )}

                <h1 className="mt-2 text-[30px] font-extrabold leading-[1.1] tracking-tight">
                  {shareTitle}
                </h1>
              </div>
            </div>
          </div>

          <div className="border-t border-white/6 bg-[#2f3238]/95 p-4 backdrop-blur-xl">
            <div className="mb-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
                Penyampai
              </p>
              <p className="mt-1 text-sm font-medium text-white/90">
                {getSpeakerName(episode.speakerId, episode.speakerName)}
              </p>
            </div>

            <div className="mb-2">
              <div className="relative h-6">
                <div className="absolute top-1/2 h-2 w-full -translate-y-1/2 rounded-full bg-white/15" />

                <div
                  className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-gradient-to-r from-[#E24B5B] to-[#B91C32]"
                  style={{ width: `${progressPercent}%` }}
                />

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
                {isPlaying ? (
                  <span className="flex items-center justify-center gap-2">
                    <Pause size={18} />
                    Pause
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Play size={18} />
                    Play
                  </span>
                )}
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

            <div className="mt-4">
              <ShareEpisodeButton
                title={shareTitle}
                description={shareDescription}
                shareUrl={shareUrl}
              />
            </div>

            {!episode.audioUrl && (
              <p className="mt-4 text-sm text-gray-400">Audio belum dimuat naik.</p>
            )}
          </div>
        </div>

        {(shareDescription || shareNote || shareCtaText) && (
          <div className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_14px_40px_rgba(0,0,0,0.2)] backdrop-blur-xl">
            <div className="mb-3">
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.22em] text-white/50">
                Perkongsian Episod
              </h2>
              <div className="mt-2 h-[2px] w-14 rounded-full bg-[#7A1F2B]" />
            </div>

            {shareDescription ? (
              <p className="text-[15px] leading-7 text-white/88">
                {shareDescription}
              </p>
            ) : null}

            {shareNote && (
              <div className="mt-4 rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/10 px-4 py-3 text-sm text-[#E8D28A]">
                {shareNote}
              </div>
            )}

            {shareCtaText && (
              <p className="mt-4 text-sm font-medium text-white/75">
                {shareCtaText}
              </p>
            )}
          </div>
        )}

        <div className="mt-6">
          <button
            type="button"
            onClick={async () => {
              await syncEpisodeToProvider(episode);
              router.push(`/player/${seriesId}/${episodeId}`);
            }}
            className="w-full rounded-[24px] bg-[#7A1F2B] px-5 py-4 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(122,31,43,0.28)] transition hover:bg-[#8b2533]"
          >
            {shareCtaText}
          </button>
        </div>
      </div>
    </main>
  );
}