"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../../lib/firebase";

type SeriesItem = {
  id: string;
  title: string;
  speakerId: string;
  description?: string;
  coverUrl: string;
  isPublished: boolean;
  sortOrder: number;
  isDeleted?: boolean;
};

type EpisodeItem = {
  id: string;
  title: string;
  description?: string;
  seriesId: string;
  speakerId: string;
  audioUrl: string;
  durationSeconds: number;
  displayOrder: number;
  originalChapterLabel?: string;
  isPublished: boolean;
  isDeleted?: boolean;
};

export default function LibraryPage() {
  const router = useRouter();

  const [seriesList, setSeriesList] = useState<SeriesItem[]>([]);
  const [episodes, setEpisodes] = useState<EpisodeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadLibrary() {
      try {
        setLoading(true);
        setError("");

        const [seriesSnap, episodesSnap] = await Promise.all([
          getDocs(query(collection(db, "series"), orderBy("sortOrder", "asc"))),
          getDocs(collection(db, "episodes")),
        ]);

        const seriesData: SeriesItem[] = seriesSnap.docs
          .map((docItem) => ({
            id: docItem.id,
            title: docItem.data().title ?? "",
            speakerId: docItem.data().speakerId ?? "",
            description: docItem.data().description ?? "",
            coverUrl: docItem.data().coverUrl ?? "",
            isPublished: docItem.data().isPublished ?? false,
            sortOrder: docItem.data().sortOrder ?? 0,
            isDeleted: docItem.data().isDeleted ?? false,
          }))
          .filter((item) => item.isPublished === true && item.isDeleted !== true);

        const episodeData: EpisodeItem[] = episodesSnap.docs
          .map((docItem) => ({
            id: docItem.id,
            title: docItem.data().title ?? "",
            description: docItem.data().description ?? "",
            seriesId: docItem.data().seriesId ?? "",
            speakerId: docItem.data().speakerId ?? "",
            audioUrl: docItem.data().audioUrl ?? "",
            durationSeconds: docItem.data().durationSeconds ?? 0,
            displayOrder: docItem.data().displayOrder ?? 0,
            originalChapterLabel: docItem.data().originalChapterLabel ?? "",
            isPublished: docItem.data().isPublished ?? false,
            isDeleted: docItem.data().isDeleted ?? false,
          }))
          .filter((item) => item.isPublished === true && item.isDeleted !== true);

        setSeriesList(seriesData);
        setEpisodes(episodeData);
      } catch (err: any) {
        setError(err?.message || "Gagal memuatkan Library.");
      } finally {
        setLoading(false);
      }
    }

    loadLibrary();
  }, []);

  const groupedSeries = seriesList.map((series) => {
    const seriesEpisodes = episodes
      .filter((ep) => ep.seriesId === series.id)
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

    return {
      ...series,
      episodes: seriesEpisodes,
    };
  });

  return (
    <main className="min-h-screen bg-[#0f1115] text-white flex justify-center">
      <div className="w-full max-w-md px-6 py-10 pb-32">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Library</h1>
          <p className="text-sm text-gray-400 mt-2">
            Semua series dan semua episod Aqsa Series
          </p>
        </div>

        {loading && (
          <div className="rounded-2xl bg-[#1f232b] p-5 text-sm text-gray-300">
            Sedang memuatkan library...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-950/40 p-5 text-sm text-red-200">
            {error}
          </div>
        )}

        {!loading && !error && groupedSeries.length === 0 && (
          <div className="rounded-2xl bg-[#1f232b] p-5 text-sm text-gray-400">
            Belum ada series diterbitkan.
          </div>
        )}

        {!loading && !error && groupedSeries.length > 0 && (
          <div className="space-y-6">
            {groupedSeries.map((series) => (
              <div
                key={series.id}
                className="overflow-hidden rounded-3xl border border-white/10 bg-[#1f232b]"
              >
                <div
                  className="relative h-52 cursor-pointer"
                  onClick={() => router.push("/series/" + series.id)}
                >
                  {series.coverUrl ? (
                    <img
                      src={series.coverUrl}
                      alt={series.title}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-[#20252f] to-[#12151b]" />
                  )}

                  <div className="absolute inset-0 bg-black/45" />

                  <div className="absolute bottom-4 left-4 right-4">
                    <p className="text-2xl font-bold leading-tight">
                      {series.title}
                    </p>
                    <p className="mt-1 text-sm text-gray-200">
                      {series.episodes.length} Bab
                    </p>
                  </div>
                </div>

                <div className="space-y-3 p-4">
                  {series.episodes.length === 0 ? (
                    <div className="rounded-2xl bg-[#14161b] px-4 py-4 text-sm text-gray-400">
                      Tiada episod diterbitkan.
                    </div>
                  ) : (
                    series.episodes.map((ep) => (
                      <div
                        key={ep.id}
                        onClick={() => router.push("/player/" + series.id + "/" + ep.id)}
                        className="flex cursor-pointer items-center justify-between rounded-2xl bg-[#14161b] px-4 py-4 hover:bg-[#1a1d24] transition"
                      >
                        <div>
                          <p className="text-sm font-semibold">{ep.title}</p>
                          <p className="mt-1 text-xs text-gray-400">
                            {ep.originalChapterLabel || "Episod"}
                          </p>
                        </div>

                        <div className="text-lg text-gray-300">▶</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}