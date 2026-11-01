"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Pause, Play, RotateCcw, RotateCw, X } from "lucide-react";

type PlayerState = 0 | 1 | 2 | 3 | 5;
type YouTubePlayer = {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  destroy(): void;
};
type YouTubeApi = {
  Player: new (element: HTMLElement, options: {
    videoId: string;
    playerVars: Record<string, string | number>;
    events: {
      onReady: (event: { target: YouTubePlayer }) => void;
      onStateChange: (event: { data: PlayerState }) => void;
      onError: () => void;
    };
  }) => YouTubePlayer;
};

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApiPromise: Promise<YouTubeApi> | null = null;

function loadYouTubeApi(): Promise<YouTubeApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!youtubeApiPromise) {
    youtubeApiPromise = new Promise((resolve, reject) => {
      const previousCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previousCallback?.();
        if (window.YT?.Player) resolve(window.YT);
        else reject(new Error("YouTube player tidak tersedia"));
      };
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => {
        youtubeApiPromise = null;
        reject(new Error("YouTube player gagal dimuatkan"));
      };
      document.head.appendChild(script);
    });
  }
  return youtubeApiPromise;
}

function clock(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

export default function TvVideoPlayer({
  youtubeId,
  title,
  onClose,
  onNext,
  copy,
}: {
  youtubeId: string;
  title: string;
  onClose: () => void;
  onNext?: () => void;
  copy: { close: string; play: string; pause: string; next: string; youtube: string; unavailable: string };
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    let disposed = false;
    const loadingTimeout = window.setTimeout(() => { if (!disposed) setError(true); }, 12000);
    void loadYouTubeApi().then((api) => {
      if (disposed || !hostRef.current) return;
      playerRef.current = new api.Player(hostRef.current, {
        videoId: youtubeId,
        playerVars: { autoplay: 1, controls: 0, playsinline: 1, rel: 0, origin: window.location.origin },
        events: {
          onReady: ({ target }) => {
            if (disposed) return;
            window.clearTimeout(loadingTimeout);
            setReady(true);
            target.playVideo();
          },
          onStateChange: ({ data }) => {
            if (!disposed) setPlaying(data === 1);
          },
          onError: () => { if (!disposed) setError(true); },
        },
      });
    }).catch(() => { if (!disposed) setError(true); });

    const timer = window.setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      try {
        setPosition(player.getCurrentTime() || 0);
        setDuration(player.getDuration() || 0);
      } catch { /* The embedded player may still be loading. */ }
    }, 1000);

    return () => {
      disposed = true;
      window.clearTimeout(loadingTimeout);
      window.clearInterval(timer);
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [youtubeId]);

  const youtubeUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(youtubeId)}`;

  return (
    <div className="tv-player tv-video-player" role="dialog" aria-modal="true" aria-label={title}>
      <div className="tv-video-stage">
        <div ref={hostRef} className="tv-youtube-host" />
        {error && <div className="tv-video-error">{copy.unavailable}</div>}
      </div>
      <div className="tv-player-panel">
        <div className="tv-player-title-row">
          <h2>{title}</h2>
          <button type="button" className="tv-icon-button" data-tv-close onClick={onClose} aria-label={copy.close}><X /></button>
        </div>
        <div className="tv-progress"><span style={{ width: `${duration ? Math.min(100, position / duration * 100) : 0}%` }} /></div>
        <div className="tv-player-controls">
          <span className="tv-time">{clock(position)} / {clock(duration)}</span>
          <button type="button" onClick={() => playerRef.current?.seekTo(Math.max(0, position - 10), true)} disabled={!ready} aria-label="−10 saat"><RotateCcw /> <span>10</span></button>
          <button type="button" className="tv-primary-control" onClick={() => playing ? playerRef.current?.pauseVideo() : playerRef.current?.playVideo()} disabled={!ready} data-tv-initial>{playing ? <Pause /> : <Play />} {playing ? copy.pause : copy.play}</button>
          <button type="button" onClick={() => playerRef.current?.seekTo(position + 10, true)} disabled={!ready} aria-label="+10 saat"><RotateCw /> <span>10</span></button>
          {onNext && <button type="button" onClick={onNext}>{copy.next} →</button>}
          <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" className="tv-control-link"><ExternalLink /> {copy.youtube}</a>
        </div>
      </div>
    </div>
  );
}
