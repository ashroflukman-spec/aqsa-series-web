"use client";

import { useEffect, useRef, useState } from "react";
import { Headphones, Pause, Play, RotateCcw, RotateCw, X } from "lucide-react";
import { recordEpisodePlay } from "../../lib/episodePlayCount";

export type TvProgress = { episodeId: string; seconds: number };
export const TV_PROGRESS_KEY = "aqsa-tv-progress-v1";

function clock(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

export default function TvAudioPlayer({
  episodeId,
  audioUrl,
  title,
  seriesTitle,
  coverUrl,
  onClose,
  onNext,
  onProgress,
  copy,
}: {
  episodeId: string;
  audioUrl: string;
  title: string;
  seriesTitle: string;
  coverUrl: string;
  onClose: () => void;
  onNext?: () => void;
  onProgress: (progress: TvProgress) => void;
  copy: { close: string; play: string; pause: string; next: string; audioError: string };
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const lastSavedSecondRef = useRef(-1);
  const endedRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    let resume = 0;
    try {
      const saved = JSON.parse(localStorage.getItem(TV_PROGRESS_KEY) || "null") as TvProgress | null;
      if (saved?.episodeId === episodeId && Number.isFinite(saved.seconds)) resume = Math.max(0, saved.seconds);
    } catch { /* Continue from the beginning when storage is unavailable. */ }
    const restore = () => {
      setDuration(audio.duration || 0);
      if (resume > 0 && resume < audio.duration - 5) audio.currentTime = resume;
      void audio.play().catch(() => setPlaying(false));
    };
    audio.addEventListener("loadedmetadata", restore);
    audio.load();
    return () => {
      audio.removeEventListener("loadedmetadata", restore);
      audio.pause();
    };
  }, [audioUrl, episodeId]);

  function save(seconds: number) {
    const safeSeconds = Math.max(0, Math.floor(seconds));
    if (safeSeconds === lastSavedSecondRef.current) return;
    lastSavedSecondRef.current = safeSeconds;
    const progress = { episodeId, seconds: safeSeconds };
    onProgress(progress);
    try { localStorage.setItem(TV_PROGRESS_KEY, JSON.stringify(progress)); } catch { /* Playback remains available. */ }
  }

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play().catch(() => setError(true));
    else audio.pause();
  }

  function seek(delta: number) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(audio.duration || 0, audio.currentTime + delta));
    setPosition(audio.currentTime);
    save(audio.currentTime);
  }

  return (
    <div className="tv-player tv-audio-player" role="dialog" aria-modal="true" aria-label={title}>
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        onPlay={() => { setPlaying(true); void recordEpisodePlay(episodeId); }}
        onPause={() => { setPlaying(false); if (!endedRef.current) save(audioRef.current?.currentTime || 0); }}
        onTimeUpdate={() => {
          const seconds = audioRef.current?.currentTime || 0;
          setPosition(seconds);
          if (Math.floor(seconds) % 5 === 0) save(seconds);
        }}
        onDurationChange={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={() => { endedRef.current = true; save(0); if (onNext) onNext(); }}
        onError={() => setError(true)}
      />
      <div className="tv-audio-art" style={coverUrl ? { backgroundImage: `linear-gradient(90deg, rgba(10,10,14,.25), rgba(10,10,14,.82)), url(${JSON.stringify(coverUrl)})` } : undefined}>
        {!coverUrl && <Headphones size={100} strokeWidth={1} />}
      </div>
      <div className="tv-audio-content">
        <div className="tv-player-title-row"><span className="tv-eyebrow">AQSA SERIES · AUDIO</span><button type="button" className="tv-icon-button" data-tv-close onClick={onClose} aria-label={copy.close}><X /></button></div>
        <p className="tv-audio-series">{seriesTitle}</p>
        <h2>{title}</h2>
        {error && <p className="tv-error">{copy.audioError}</p>}
        <div className="tv-progress"><span style={{ width: `${duration ? Math.min(100, position / duration * 100) : 0}%` }} /></div>
        <div className="tv-player-controls">
          <span className="tv-time">{clock(position)} / {clock(duration)}</span>
          <button type="button" onClick={() => seek(-15)} aria-label="−15 saat"><RotateCcw /> <span>15</span></button>
          <button type="button" className="tv-primary-control" onClick={toggle} data-tv-initial>{playing ? <Pause /> : <Play />} {playing ? copy.pause : copy.play}</button>
          <button type="button" onClick={() => seek(15)} aria-label="+15 saat"><RotateCw /> <span>15</span></button>
          {onNext && <button type="button" onClick={onNext}>{copy.next} →</button>}
        </div>
      </div>
    </div>
  );
}
