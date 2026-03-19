"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type MiniPlayerState = {
  seriesId: string;
  episodeId: string;
  seriesTitle: string;
  episodeTitle: string;
};

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
    <div className="fixed bottom-20 left-1/2 z-40 w-[calc(100%-2rem)] max-w-md -translate-x-1/2">
      <button
        onClick={() =>
          router.push(
            `/player/${currentItem.seriesId}/${currentItem.episodeId}`
          )
        }
        className="w-full rounded-2xl border border-white/10 bg-[#1f232b]/95 backdrop-blur-xl px-4 py-3 text-left shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {currentItem.episodeTitle}
            </p>
            <p className="truncate text-xs text-gray-400 mt-1">
              {currentItem.seriesTitle}
            </p>
          </div>

          <div className="shrink-0 text-sm text-gray-300">▶</div>
        </div>
      </button>
    </div>
  );
}