"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type MiniPlayerState = {
  seriesId: string;
  episodeId: string;
  seriesTitle: string;
  episodeTitle: string;
};

function PlayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

export default function MiniPlayer() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [showMiniPlayer, setShowMiniPlayer] = useState(true);
  const [currentItem, setCurrentItem] = useState<MiniPlayerState | null>(null);

  useEffect(() => {
    setMounted(true);

    const savedMiniPlayer = localStorage.getItem("setting-showMiniPlayer");
    if (savedMiniPlayer !== null) {
      setShowMiniPlayer(savedMiniPlayer === "true");
    }

    const savedContinueListening = localStorage.getItem("continueListening");
    if (savedContinueListening) {
      try {
        const parsed = JSON.parse(savedContinueListening);

        if (Array.isArray(parsed) && parsed.length > 0) {
          setCurrentItem(parsed[0]);
        }
      } catch {
        setCurrentItem(null);
      }
    }
  }, []);

  if (!mounted || !showMiniPlayer || !currentItem) {
    return null;
  }

  return (
    <div className="fixed bottom-28 left-1/2 z-40 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 px-1">
      <button
        onClick={() =>
          router.push(
            `/player/${currentItem.seriesId}/${currentItem.episodeId}`
          )
        }
        className="relative w-full overflow-hidden rounded-[28px] border border-white/10 bg-[#131722]/80 backdrop-blur-2xl px-4 py-3 text-left shadow-[0_18px_50px_rgba(0,0,0,0.45)] transition active:scale-[0.99]"
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-6 left-6 h-16 w-16 rounded-full bg-white/8 blur-2xl" />
          <div className="absolute top-0 right-0 h-16 w-24 bg-gradient-to-bl from-white/10 to-transparent blur-xl" />
        </div>

        <div className="relative flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-b from-[#a01f34] to-[#7A1F2B] shadow-[0_10px_24px_rgba(122,31,43,0.45)] ring-1 ring-white/10">
            <PlayIcon />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">
              {currentItem.episodeTitle}
            </p>
            <p className="truncate text-xs text-gray-300 mt-1">
              {currentItem.seriesTitle}
            </p>
          </div>

          <div className="shrink-0 text-white/80">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M9 6L15 12L9 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </button>
    </div>
  );
}