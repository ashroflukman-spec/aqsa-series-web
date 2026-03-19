"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../../lib/firebase";

export default function PlayerPage() {
  const params = useParams();
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [episode, setEpisode] = useState<any>(null);
  const [series, setSeries] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const episodeId = String(params.episode);
        const seriesId = String(params.series);

        const episodeRef = doc(db, "episodes", episodeId);
        const episodeSnap = await getDoc(episodeRef);

        if (!episodeSnap.exists()) {
          setError("Episode tidak dijumpai");
          return;
        }

        const episodeData = episodeSnap.data();

        if (episodeData.seriesId !== seriesId || episodeData.isDeleted === true) {
          setError("Episode tidak dijumpai");
          return;
        }

        setEpisode({
          id: episodeSnap.id,
          ...episodeData,
        });

        const seriesRef = doc(db, "series", seriesId);
        const seriesSnap = await getDoc(seriesRef);

        if (seriesSnap.exists()) {
          const seriesData = seriesSnap.data();

          if (seriesData.isDeleted === true) {
            setError("Series tidak dijumpai");
            return;
          }

          setSeries(seriesData);
        }
      } catch (err) {
        setError("Gagal memuatkan episod");
      }
    }

    fetchData();
  }, [params]);

  if (error) {
    return (
      <main className="min-h-screen bg-[#0f1115] text-white flex items-center justify-center">
        <h1 className="text-xl">{error}</h1>
      </main>
    );
  }

  if (!episode) {
    return (
      <main className="min-h-screen bg-[#0f1115] text-white flex items-center justify-center">
        <p>Memuatkan episod...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0f1115] text-white flex justify-center">
      <div className="w-full max-w-md px-6 py-10 pb-32">
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-400 mb-6"
        >
          ← Kembali
        </button>

        <h1 className="text-2xl font-bold mb-2">{episode.title}</h1>

        <p className="text-sm text-gray-400 mb-6">{series?.title}</p>

        <audio
          ref={audioRef}
          controls
          className="w-full"
          src={episode.audioUrl || ""}
        />

        {!episode.audioUrl && (
          <p className="text-sm text-gray-500 mt-4">Audio belum dimuat naik.</p>
        )}
      </div>
    </main>
  );
}