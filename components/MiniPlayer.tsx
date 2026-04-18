"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type MiniPlayerState = {
  seriesId: string;
  episodeId: string;
  seriesTitle: string;
  episodeTitle: string;
  coverUrl?: string;
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

    function syncMiniPlayer() {
      const latest = localStorage.getItem("continueListening");
      if (!latest) return;

      try {
        const parsed = JSON.parse(latest);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCurrentItem(parsed[0]);
        }
      } catch {}
    }

    window.addEventListener("storage", syncMiniPlayer);
    window.addEventListener("focus", syncMiniPlayer);

    return () => {
      window.removeEventListener("storage", syncMiniPlayer);
      window.removeEventListener("focus", syncMiniPlayer);
    };
  }, []);

  if (!mounted || !showMiniPlayer || !currentItem) {
    return null;
  }

  return (
    <div className="fixed bottom-[4.95rem] left-1/2 z-40 w-[calc(100%-1.2rem)] max-w-md -translate-x-1/2">
      <div className="relative overflow-hidden rounded-t-[22px] border-x border-t border-white/10 bg-[#0f141d]/72 backdrop-blur-[24px] shadow-[0_14px_38px_rgba(0,0,0,0.42)]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.08] via-white/[0.025] to-black/[0.10]" />
          <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-white/[0.10] to-transparent" />
          <div className="absolute -top-6 left-6 h-16 w-20 rounded-full bg-white/[0.06] blur-2xl" />
          <div className="absolute top-0 right-0 h-16 w-24 bg-gradient-to-bl from-white/[0.08] to-transparent blur-xl" />
          <div className="absolute inset-x-5 bottom-0 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />
          <div className="absolute left-1/2 bottom-0 h-[10px] w-24 -translate-x-1/2 rounded-t-full bg-white/[0.035] blur-md" />
        </div>

        <button
          onClick={() =>
            router.push(
              `/player/${currentItem.seriesId}/${currentItem.episodeId}`
            )
          }
          className="group relative flex w-full items-center gap-3 px-3 py-2.5 text-left transition active:scale-[0.995]"
        >
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-[13px] border border-white/15 bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]">
            {currentItem.coverUrl ? (
              <img
                src={currentItem.coverUrl}
                alt={currentItem.seriesTitle}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#20252f] to-[#12151b] text-[10px] text-gray-400">
                Cover
              </div>
            )}

            <div className="absolute inset-0 bg-black/24" />
            <div className="absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-white/[0.08] to-transparent" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[9px] font-semibold uppercase tracking-[0.22em] text-[#E7D7A2]">
              Now Playing
            </p>
            <p className="mt-1 truncate text-[13px] font-semibold text-white">
              {currentItem.episodeTitle}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-white/72">
              {currentItem.seriesTitle}
            </p>
          </div>

          <div className="shrink-0 text-white/75 transition group-hover:text-white">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <path
                d="M9 6L15 12L9 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </button>
      </div>
    </div>
  );
}