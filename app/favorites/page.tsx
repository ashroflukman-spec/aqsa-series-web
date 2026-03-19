"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type ContinueListeningItem = {
  seriesId: string;
  episodeId: string;
  seriesTitle: string;
  episodeTitle: string;
};

export default function FavoritesPage() {
  const router = useRouter();

  const [continueListening, setContinueListening] = useState<ContinueListeningItem[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("continueListening");

    if (saved) {
      try {
        const parsed = JSON.parse(saved);

        if (Array.isArray(parsed)) {
          setContinueListening(parsed);
        } else {
          setContinueListening([]);
        }
      } catch {
        setContinueListening([]);
      }
    } else {
      setContinueListening([]);
    }
  }, []);

  return (
    <main className="min-h-screen bg-[#0f1115] text-white flex justify-center">
      <div className="w-full max-w-md px-6 py-10 pb-32">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Your Activity</h1>
          <p className="text-sm text-gray-400 mt-2">
            Aktiviti mendengar anda
          </p>
        </div>

        <div className="mb-4">
          <h2 className="text-sm text-gray-400 uppercase tracking-wider">
            Continue Listening
          </h2>
        </div>

        {continueListening.length === 0 ? (
          <div className="rounded-2xl bg-[#1f232b] p-5 text-sm text-gray-400">
            Tiada aktiviti pendengaran lagi.
          </div>
        ) : (
          <div className="space-y-3">
            {continueListening.map((item, index) => (
              <div
                key={item.seriesId + item.episodeId + index}
                onClick={() =>
                  router.push("/player/" + item.seriesId + "/" + item.episodeId)
                }
                className="bg-[#1f232b] rounded-2xl p-4 cursor-pointer hover:bg-[#262b35] transition"
              >
                <div className="text-sm font-semibold">
                  {item.episodeTitle}
                </div>

                <div className="text-xs text-gray-400 mt-1">
                  {item.seriesTitle}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}