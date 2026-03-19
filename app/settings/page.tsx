"use client";

import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [autoPlayNext, setAutoPlayNext] = useState(true);
  const [showMiniPlayer, setShowMiniPlayer] = useState(true);
  const [compactMode, setCompactMode] = useState(false);

  useEffect(() => {
    const savedAutoPlay = localStorage.getItem("setting-autoPlayNext");
    const savedMiniPlayer = localStorage.getItem("setting-showMiniPlayer");
    const savedCompactMode = localStorage.getItem("setting-compactMode");

    if (savedAutoPlay !== null) {
      setAutoPlayNext(savedAutoPlay === "true");
    }

    if (savedMiniPlayer !== null) {
      setShowMiniPlayer(savedMiniPlayer === "true");
    }

    if (savedCompactMode !== null) {
      setCompactMode(savedCompactMode === "true");
    }
  }, []);

  function toggleAutoPlayNext() {
    const updated = !autoPlayNext;
    setAutoPlayNext(updated);
    localStorage.setItem("setting-autoPlayNext", String(updated));
  }

  function toggleShowMiniPlayer() {
    const updated = !showMiniPlayer;
    setShowMiniPlayer(updated);
    localStorage.setItem("setting-showMiniPlayer", String(updated));
  }

  function toggleCompactMode() {
    const updated = !compactMode;
    setCompactMode(updated);
    localStorage.setItem("setting-compactMode", String(updated));
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0f1115] to-[#1a1d24] text-white flex justify-center">
      <div className="w-full max-w-md px-6 py-10 pb-32">
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-center">
            Settings
          </h1>

          <p className="text-center text-sm text-gray-400 mt-2">
            Tetapan asas Aqsa Series
          </p>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl bg-[#1f232b] p-5 border border-white/5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">
                  Auto Play Next Episode
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Mainkan episod seterusnya secara automatik
                </p>
              </div>

              <button
                onClick={toggleAutoPlayNext}
                className={`w-14 h-8 rounded-full relative transition ${
                  autoPlayNext ? "bg-[#7A1F2B]" : "bg-gray-600"
                }`}
              >
                <span
                  className={`absolute top-1 h-6 w-6 rounded-full bg-white transition ${
                    autoPlayNext ? "left-7" : "left-1"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-[#1f232b] p-5 border border-white/5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">
                  Show Mini Player
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Paparkan mini player di bahagian bawah skrin
                </p>
              </div>

              <button
                onClick={toggleShowMiniPlayer}
                className={`w-14 h-8 rounded-full relative transition ${
                  showMiniPlayer ? "bg-[#7A1F2B]" : "bg-gray-600"
                }`}
              >
                <span
                  className={`absolute top-1 h-6 w-6 rounded-full bg-white transition ${
                    showMiniPlayer ? "left-7" : "left-1"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-[#1f232b] p-5 border border-white/5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">
                  Compact Mode
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Gunakan paparan yang lebih ringkas
                </p>
              </div>

              <button
                onClick={toggleCompactMode}
                className={`w-14 h-8 rounded-full relative transition ${
                  compactMode ? "bg-[#7A1F2B]" : "bg-gray-600"
                }`}
              >
                <span
                  className={`absolute top-1 h-6 w-6 rounded-full bg-white transition ${
                    compactMode ? "left-7" : "left-1"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-[#14161b] p-5 border border-white/5">
            <p className="text-sm font-semibold mb-2">
              Tentang Aqsa Series
            </p>

            <p className="text-xs text-gray-400 leading-6">
              Aqsa Series ialah platform audio untuk siri ilmu, tadabbur,
              sejarah, dan pembangunan ummah. Tetapan di halaman ini disimpan
              terus dalam browser peranti pengguna.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}