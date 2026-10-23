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
import { useAuth } from "./AuthProvider";
import {
  readListeningProgress,
  parseListeningProgress,
  resumePosition,
  saveListeningProgress,
  switchListeningOwner,
} from "../lib/listeningProgress";
import { connectListeningSync, pushListeningProgress, type ListeningSyncStatus } from "../lib/listeningSync";
import { trackUsageEvent } from "../lib/usageAnalytics";
import { canSyncListening } from "../lib/listenerAccount";

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
  syncStatus: ListeningSyncStatus;
  playEpisode: (
    episode: ActiveEpisode,
    queue?: ActiveEpisode[]
  ) => Promise<void>;
  pauseAudio: () => void;
  resetAudio: () => void;
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
  syncStatus: "idle",
  playEpisode: async () => {},
  pauseAudio: () => {},
  resetAudio: () => {},
  toggleCurrent: async () => {},
  seekAudio: () => {},
  playNext: async () => {},
  playPrev: async () => {},
});

export function AudioProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: authLoading } = useAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pendingResumeRef = useRef(0);
  const lastProgressWriteRef = useRef(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeEpisode, setActiveEpisode] = useState<ActiveEpisode | null>(null);
  const [queue, setQueue] = useState<ActiveEpisode[]>([]);
  const [syncStatus, setSyncStatus] = useState<ListeningSyncStatus>("idle");

  useEffect(() => {
    if (authLoading) return;
    const ownerChanged = switchListeningOwner(canSyncListening(user) ? user.uid : null);
    let resetTimer: number | null = null;
    if (ownerChanged) {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
      }
      resetTimer = window.setTimeout(() => {
        setActiveEpisode(null);
        setQueue([]);
        setCurrentTime(0);
        setDuration(0);
        setIsPlaying(false);
      }, 0);
      pendingResumeRef.current = 0;
    }
    if (!canSyncListening(user)) return () => {
      if (resetTimer !== null) window.clearTimeout(resetTimer);
    };
    let mounted = true;
    let unsubscribe = () => {};
    let attempt = 0;
    const timer = window.setTimeout(() => {
      if (mounted) setSyncStatus("syncing");
    }, 0);
    const reconnect = () => {
      const currentAttempt = ++attempt;
      unsubscribe();
      void connectListeningSync(user.uid, (status) => {
        if (mounted && currentAttempt === attempt) setSyncStatus(status);
      }, () => mounted && currentAttempt === attempt).then((stop) => {
        if (mounted && currentAttempt === attempt) unsubscribe = stop;
        else stop();
      });
    };
    reconnect();
    window.addEventListener("online", reconnect);
    return () => {
      mounted = false;
      if (resetTimer !== null) window.clearTimeout(resetTimer);
      window.clearTimeout(timer);
      window.removeEventListener("online", reconnect);
      unsubscribe();
    };
  }, [user, authLoading]);

  const persistProgress = useCallback((episode: ActiveEpisode, position: number, length: number, completed = false) => {
    const progress = parseListeningProgress({
      seriesId: episode.seriesId,
      episodeId: episode.episodeId,
      seriesTitle: episode.seriesTitle || "Aqsa Series",
      episodeTitle: episode.episodeTitle || "Tanpa Tajuk",
      coverUrl: episode.coverUrl || "",
      positionSeconds: completed ? 0 : Math.max(0, Math.floor(position)),
      durationSeconds: Number.isFinite(length) ? Math.max(0, Math.floor(length)) : 0,
      completed,
      updatedAt: Date.now(),
    });
    if (!progress) return;
    saveListeningProgress(progress);
    if (canSyncListening(user)) {
      void pushListeningProgress(user.uid, progress)
        .then(() => setSyncStatus("ready"))
        .catch(() => setSyncStatus("error"));
    }
    lastProgressWriteRef.current = Date.now();
  }, [user]);

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

  const playEpisode = useCallback(async (
    episode: ActiveEpisode,
    nextQueue?: ActiveEpisode[]
  ) => {
    const audio = ensureAudio();

    if (nextQueue) {
      setQueue(nextQueue);
    }

    const sameTrack =
      activeEpisode?.seriesId === episode.seriesId &&
      activeEpisode?.episodeId === episode.episodeId;

    if (!sameTrack || audio.src !== episode.audioUrl) {
      pendingResumeRef.current = resumePosition(episode.episodeId);
      audio.src = episode.audioUrl;
      setCurrentTime(0);
      setDuration(0);
    }

    setActiveEpisode(episode);
    const currentProgress = readListeningProgress().find((item) => item.episodeId === episode.episodeId);
    persistProgress(episode, sameTrack ? audio.currentTime : pendingResumeRef.current, currentProgress?.durationSeconds || 0);
    void trackUsageEvent("aqsa_episode_play", { episode_id: episode.episodeId, series_id: episode.seriesId });

    try {
      await audio.play();
    } catch (err) {
      if (!(err instanceof Error && err.name === "AbortError")) {
        console.error("Gagal main audio global:", err);
      }
    }
  }, [activeEpisode, ensureAudio, persistProgress]);

  const pauseAudio = () => {
    const audio = ensureAudio();
    audio.pause();
  };

  const resetAudio = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    setActiveEpisode(null);
    setQueue([]);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    pendingResumeRef.current = 0;
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
    } catch (err) {
      if (!(err instanceof Error && err.name === "AbortError")) {
        console.error("Gagal toggle audio global:", err);
      }
    }
  };

  const seekAudio = (time: number) => {
    const audio = ensureAudio();
    audio.currentTime = time;
    setCurrentTime(time);
    if (activeEpisode) persistProgress(activeEpisode, time, audio.duration);
  };

  const playNext = useCallback(async () => {
    if (currentQueueIndex < 0) return;
    const nextItem = queue[currentQueueIndex + 1];
    if (!nextItem) return;
    await playEpisode(nextItem, queue);
  }, [currentQueueIndex, queue, playEpisode]);

  const playPrev = useCallback(async () => {
    if (currentQueueIndex <= 0) return;
    const prevItem = queue[currentQueueIndex - 1];
    if (!prevItem) return;
    await playEpisode(prevItem, queue);
  }, [currentQueueIndex, queue, playEpisode]);

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

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime || 0);
      if (activeEpisode && Date.now() - lastProgressWriteRef.current >= 15000) {
        persistProgress(activeEpisode, audio.currentTime, audio.duration);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      if (pendingResumeRef.current > 0) {
        audio.currentTime = Math.min(pendingResumeRef.current, Math.max(0, audio.duration - 5));
        pendingResumeRef.current = 0;
      }
    };

    const handleProgressPause = () => {
      setIsPlaying(false);
      if (activeEpisode && audio.currentTime > 0) persistProgress(activeEpisode, audio.currentTime, audio.duration);
    };

    const handleEnded = async () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (activeEpisode) {
        persistProgress(activeEpisode, 0, audio.duration, true);
        void trackUsageEvent("aqsa_episode_complete", { episode_id: activeEpisode.episodeId, series_id: activeEpisode.seriesId });
      }

      if (localStorage.getItem("setting-autoPlayNext") === "false") return;

      const nextIndex = currentQueueIndex + 1;
      const nextItem = queue[nextIndex];

      if (!nextItem) return;

      await playEpisode(nextItem, queue);
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handleProgressPause);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handleProgressPause);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [currentQueueIndex, queue, activeEpisode, ensureAudio, playEpisode, persistProgress]);

  return (
    <AudioContext.Provider
      value={{
        isPlaying,
        currentTime,
        duration,
        activeEpisode,
        queue,
        syncStatus: canSyncListening(user) ? syncStatus : "idle",
        playEpisode,
        pauseAudio,
        resetAudio,
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
