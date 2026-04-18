"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type ActiveEpisode = {
  seriesId: string;
  episodeId: string;
  seriesTitle: string;
  episodeTitle: string;
  audioUrl: string;
  coverUrl?: string;
  speakerName?: string;
};

type AudioContextType = {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  activeEpisode: ActiveEpisode | null;
  queue: ActiveEpisode[];
  playEpisode: (
    episode: ActiveEpisode,
    queue?: ActiveEpisode[]
  ) => Promise<void>;
  pauseAudio: () => void;
  toggleCurrent: () => Promise<void>;
  seekAudio: (time: number) => void;
  playNext: () => Promise<void>;
  playPrev: () => Promise<void>;
};

const AudioContext = createContext<AudioContextType>({
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  activeEpisode: null,
  queue: [],
  playEpisode: async () => {},
  pauseAudio: () => {},
  toggleCurrent: async () => {},
  seekAudio: () => {},
  playNext: async () => {},
  playPrev: async () => {},
});

function updateContinueListeningStorage(item: ActiveEpisode) {
  try {
    const payload = {
      seriesId: item.seriesId,
      episodeId: item.episodeId,
      seriesTitle: item.seriesTitle || "Aqsa Series",
      episodeTitle: item.episodeTitle || "Tanpa Tajuk",
      coverUrl: item.coverUrl || "",
    };

    localStorage.setItem("continueListening", JSON.stringify([payload]));

    const existingRecent = localStorage.getItem("recentlyPlayed");
    let recentList = existingRecent ? JSON.parse(existingRecent) : [];

    if (!Array.isArray(recentList)) {
      recentList = [];
    }

    recentList = recentList.filter(
      (x: any) =>
        !(
          x.seriesId === payload.seriesId && x.episodeId === payload.episodeId
        )
    );

    recentList.unshift(payload);
    localStorage.setItem(
      "recentlyPlayed",
      JSON.stringify(recentList.slice(0, 10))
    );
  } catch {}
}

export function AudioProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeEpisode, setActiveEpisode] = useState<ActiveEpisode | null>(null);
  const [queue, setQueue] = useState<ActiveEpisode[]>([]);

  const currentQueueIndex = useMemo(() => {
    if (!activeEpisode) return -1;
    return queue.findIndex(
      (item) =>
        item.seriesId === activeEpisode.seriesId &&
        item.episodeId === activeEpisode.episodeId
    );
  }, [queue, activeEpisode]);

  const ensureAudio = useCallback(() => {
  if (!audioRef.current) {
    const audio = new Audio();
    audio.preload = "metadata";
    audioRef.current = audio;
  }
  return audioRef.current;
}, []);

  const playEpisode = async (
    episode: ActiveEpisode,
    nextQueue?: ActiveEpisode[]
  ) => {
    const audio = ensureAudio();

    if (nextQueue && nextQueue.length > 0) {
      setQueue(nextQueue);
    }

    const sameTrack =
      activeEpisode?.seriesId === episode.seriesId &&
      activeEpisode?.episodeId === episode.episodeId;

    if (!sameTrack || audio.src !== episode.audioUrl) {
      audio.src = episode.audioUrl;
      setCurrentTime(0);
      setDuration(0);
    }

    setActiveEpisode(episode);
    updateContinueListeningStorage(episode);

    try {
      await audio.play();
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        console.error("Gagal main audio global:", err);
      }
    }
  };

  const pauseAudio = () => {
    const audio = ensureAudio();
    audio.pause();
  };

  const toggleCurrent = async () => {
    const audio = ensureAudio();
    if (!activeEpisode) return;

    try {
      if (audio.paused) {
        await audio.play();
      } else {
        audio.pause();
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        console.error("Gagal toggle audio global:", err);
      }
    }
  };

  const seekAudio = (time: number) => {
    const audio = ensureAudio();
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const playNext = async () => {
    if (currentQueueIndex < 0) return;
    const nextItem = queue[currentQueueIndex + 1];
    if (!nextItem) return;
    await playEpisode(nextItem, queue);
  };

  const playPrev = async () => {
    if (currentQueueIndex <= 0) return;
    const prevItem = queue[currentQueueIndex - 1];
    if (!prevItem) return;
    await playEpisode(prevItem, queue);
  };

useEffect(() => {
  if (typeof navigator === "undefined") return;
  if (!("mediaSession" in navigator)) return;

  if (!activeEpisode) return;

  const artworkSrc = activeEpisode.coverUrl?.trim()
    ? activeEpisode.coverUrl
    : `${window.location.origin}/icon.png`;

  navigator.mediaSession.metadata = new MediaMetadata({
    title: activeEpisode.episodeTitle || "Aqsa Series",
    artist: activeEpisode.speakerName || activeEpisode.seriesTitle || "Aqsa Series",
    album: activeEpisode.seriesTitle || "Aqsa Series",
    artwork: [
      {
        src: artworkSrc,
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: artworkSrc,
        sizes: "1024x1024",
        type: "image/png",
      },
    ],
  });
}, [activeEpisode]);

useEffect(() => {
  if (typeof navigator === "undefined") return;
  if (!("mediaSession" in navigator)) return;

  navigator.mediaSession.setActionHandler("play", async () => {
    const audio = ensureAudio();
    try {
      await audio.play();
    } catch {}
  });

  navigator.mediaSession.setActionHandler("pause", () => {
    const audio = ensureAudio();
    audio.pause();
  });

  navigator.mediaSession.setActionHandler("previoustrack", async () => {
    try {
      await playPrev();
    } catch {}
  });

  navigator.mediaSession.setActionHandler("nexttrack", async () => {
    try {
      await playNext();
    } catch {}
  });

  return () => {
    try {
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
      navigator.mediaSession.setActionHandler("previoustrack", null);
      navigator.mediaSession.setActionHandler("nexttrack", null);
    } catch {}
  };
}, [ensureAudio, playPrev, playNext]);

  useEffect(() => {
    const audio = ensureAudio();

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime || 0);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    const handleEnded = async () => {
      setIsPlaying(false);
      setCurrentTime(0);

      const nextIndex = currentQueueIndex + 1;
      const nextItem = queue[nextIndex];

      if (!nextItem) return;

      await playEpisode(nextItem, queue);
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [currentQueueIndex, queue, activeEpisode]);

  return (
    <AudioContext.Provider
      value={{
        isPlaying,
        currentTime,
        duration,
        activeEpisode,
        queue,
        playEpisode,
        pauseAudio,
        toggleCurrent,
        seekAudio,
        playNext,
        playPrev,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  return useContext(AudioContext);
}