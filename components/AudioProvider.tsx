"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

type AudioContextType = {
  isPlaying: boolean;
  currentSrc: string;
  currentTime: number;
  duration: number;
  playAudio: (src: string) => void;
  pauseAudio: () => void;
  toggleAudio: (src: string) => void;
  seekAudio: (time: number) => void;
};

const AudioContext = createContext<AudioContextType>({
  isPlaying: false,
  currentSrc: "",
  currentTime: 0,
  duration: 0,
  playAudio: () => {},
  pauseAudio: () => {},
  toggleAudio: () => {},
  seekAudio: () => {},
});

export function AudioProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSrc, setCurrentSrc] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const ensureAudio = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = "metadata";
    }
    return audioRef.current;
  };

  useEffect(() => {
    const audio = ensureAudio();

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration || 0);
    const handleEnded = () => setIsPlaying(false);

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
  }, []);

  const playAudio = async (src: string) => {
    const audio = ensureAudio();

    const normalizedCurrent = audio.src;
    const normalizedNext =
      src.startsWith("http") ? src : window.location.origin + src;

    if (normalizedCurrent !== normalizedNext) {
      audio.src = src;
      setCurrentSrc(src);
      setCurrentTime(0);
      setDuration(0);
    } else {
      setCurrentSrc(src);
    }

    await audio.play();
  };

  const pauseAudio = () => {
    const audio = ensureAudio();
    audio.pause();
  };

  const toggleAudio = async (src: string) => {
    const audio = ensureAudio();

    const normalizedCurrent = audio.src;
    const normalizedNext =
      src.startsWith("http") ? src : window.location.origin + src;

    const sameTrack = normalizedCurrent === normalizedNext;

    if (sameTrack && !audio.paused) {
      audio.pause();
      return;
    }

    if (!sameTrack) {
      audio.src = src;
      setCurrentSrc(src);
      setCurrentTime(0);
      setDuration(0);
    } else {
      setCurrentSrc(src);
    }

    await audio.play();
  };

  const seekAudio = (time: number) => {
    const audio = ensureAudio();
    audio.currentTime = time;
    setCurrentTime(time);
  };

  return (
    <AudioContext.Provider
      value={{
        isPlaying,
        currentSrc,
        currentTime,
        duration,
        playAudio,
        pauseAudio,
        toggleAudio,
        seekAudio,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  return useContext(AudioContext);
}