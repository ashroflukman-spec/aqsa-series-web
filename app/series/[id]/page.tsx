"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "../../../lib/firebase";

type SeriesItem = {
  id: string;
  title: string;
  speakerId: string;
  description: string;
  coverUrl: string;
  isPublished: boolean;
  sortOrder: number;
  originalWorkTitle?: string;
  originalWorkAuthor?: string;
  originalWorkPublisher?: string;
  originalLanguage?: string;
  isDeleted?: boolean;
};

type EpisodeItem = {
  id: string;
  title: string;
  slug?: string;
  description: string;
  seriesId: string;
  speakerId: string;
  audioUrl: string;
  durationSeconds: number;
  displayOrder?: number;
  originalChapterLabel?: string;
  isPublished: boolean;
  isDeleted?: boolean;
};

type SpeakerItem = {
  id: string;
  name?: string;
  fullName?: string;
  displayName?: string;
  slug?: string;
  isDeleted?: boolean;
};

function formatDuration(seconds: number) {
  if (!seconds || seconds <= 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export default function SeriesPage() {
  const params = useParams();
  const router = useRouter();

  const [series, setSeries] = useState<SeriesItem | null>(null);
  const [episodes, setEpisodes] = useState<EpisodeItem[]>([]);
  const [speakerMap, setSpeakerMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showOriginalWork, setShowOriginalWork] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const seriesId = String(params.id);

        const seriesRef = doc(db, "series", seriesId);
        const seriesSnap = await getDoc(seriesRef);

        if (!seriesSnap.exists()) {
          setError("Series tidak dijumpai");
          setLoading(false);
          return;
        }

        const seriesData: SeriesItem = {
          id: seriesSnap.id,
          title: seriesSnap.data().title ?? "",
          speakerId: seriesSnap.data().speakerId ?? "",
          description: seriesSnap.data().description ?? "",
          coverUrl: seriesSnap.data().coverUrl ?? "",
          isPublished: seriesSnap.data().isPublished ?? false,
          sortOrder: seriesSnap.data().sortOrder ?? 0,
          originalWorkTitle: seriesSnap.data().originalWorkTitle ?? "",
          originalWorkAuthor: seriesSnap.data().originalWorkAuthor ?? "",
          originalWorkPublisher: seriesSnap.data().originalWorkPublisher ?? "",
          originalLanguage: seriesSnap.data().originalLanguage ?? "",
          isDeleted: seriesSnap.data().isDeleted ?? false,
        };

        if (seriesData.isDeleted === true || seriesData.isPublished !== true) {
          setError("Series tidak dijumpai");
          setLoading(false);
          return;
        }

        setSeries(seriesData);

        const episodesSnap = await getDocs(collection(db, "episodes"));

        const filteredEpisodes: EpisodeItem[] = episodesSnap.docs
          .map((docItem) => ({
            id: docItem.id,
            title: docItem.data().title ?? "",
            slug: docItem.data().slug ?? "",
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
          .filter(
            (ep) =>
              ep.seriesId === seriesId &&
              ep.isPublished === true &&
              ep.isDeleted !== true
          )
          .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

        setEpisodes(filteredEpisodes);

        const speakersSnap = await getDocs(collection(db, "speakers"));
        const speakersData: SpeakerItem[] = speakersSnap.docs
          .map((docItem) => ({
            id: docItem.id,
            name: docItem.data().name ?? "",
            fullName: docItem.data().fullName ?? "",
            displayName: docItem.data().displayName ?? "",
            slug: docItem.data().slug ?? "",
            isDeleted: docItem.data().isDeleted ?? false,
          }))
          .filter((item) => item.isDeleted !== true);

        const nextSpeakerMap: Record<string, string> = {};

        for (const speaker of speakersData) {
          const displayName =
            speaker.displayName?.trim() ||
            speaker.fullName?.trim() ||
            speaker.name?.trim() ||
            speaker.slug?.trim() ||
            speaker.id;

          nextSpeakerMap[speaker.id] = displayName;

          if (speaker.slug?.trim()) {
            nextSpeakerMap[speaker.slug.trim()] = displayName;
          }
        }

        setSpeakerMap(nextSpeakerMap);
      } catch (err: any) {
        setError(err?.message || "Gagal memuatkan series");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [params.id]);

  const hasOriginalWorkInfo =
    !!series?.originalWorkTitle ||
    !!series?.originalWorkAuthor ||
    !!series?.originalWorkPublisher ||
    !!series?.originalLanguage;

  function getSpeakerName(speakerId: string) {
    return speakerMap[speakerId] || speakerId || "Speaker tidak diketahui";
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0f1115] text-white flex justify-center">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-80px] left-1/2 -translate-x-1/2 h-[420px] w-[420px] rounded-full bg-[#7A1F2B] opacity-15 blur-[120px]" />
        <div className="absolute top-[280px] left-1/2 -translate-x-1/2 h-[340px] w-[340px] rounded-full bg-white/5 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md px-6 py-10 pb-32">
        <button
          onClick={() => router.push("/")}
          className="mb-6 text-sm text-gray-400"
        >
          ← Kembali
        </button>

        {loading && (
          <div className="rounded-2xl bg-[#1f232b] p-5 text-sm text-gray-300">
            Sedang memuatkan series...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-950/40 p-5 text-sm text-red-200">
            {error}
          </div>
        )}

        {!loading && !error && series && (
          <>
            <div className="relative overflow-hidden rounded-[28px] border border-white/10 shadow-2xl">
              <div
                className="h-64 bg-cover bg-center"
                style={{
                  backgroundImage: series.coverUrl
                    ? `url(${series.coverUrl})`
                    : "linear-gradient(135deg, #20252f, #12151b)",
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/15" />

              <div className="absolute inset-x-0 bottom-0 p-5">
                <p className="text-2xl font-bold leading-tight">{series.title}</p>
                <p className="mt-2 text-sm text-gray-200">
                  {episodes.length} episod
                </p>
              </div>

              <div className="absolute top-4 right-4 rounded-full border border-white/15 bg-black/25 px-3 py-1 text-[11px] text-white/90 backdrop-blur">
                {episodes.length} episod
              </div>
            </div>

            <div className="mt-6 mb-8">
              <p className="text-sm text-gray-400">
                {series.description || "Tiada deskripsi siri."}
              </p>

              <p className="mt-3 text-xs text-gray-500">
                Speaker: {getSpeakerName(series.speakerId)}
              </p>

              {hasOriginalWorkInfo && (
                <div className="mt-5 overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                  <button
                    onClick={() => setShowOriginalWork(!showOriginalWork)}
                    className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-white/[0.03]"
                  >
                    <div>
                      <p className="text-sm font-semibold">Karya Asal</p>
                      <p className="mt-1 text-xs text-gray-400">
                        Tekan untuk {showOriginalWork ? "sembunyikan" : "lihat"} maklumat karya
                      </p>
                    </div>

                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/10 text-xs text-gray-300 transition ${
                        showOriginalWork ? "rotate-180" : ""
                      }`}
                    >
                      ▼
                    </div>
                  </button>

                  {showOriginalWork && (
                    <div className="border-t border-white/5 px-5 pb-5">
                      {series.originalWorkTitle && (
                        <div className="mt-4 rounded-2xl border border-white/5 bg-black/20 px-4 py-3">
                          <p className="mb-1 text-[11px] uppercase tracking-wider text-gray-500">
                            Judul
                          </p>
                          <p className="text-sm leading-6 text-gray-200">
                            {series.originalWorkTitle}
                          </p>
                        </div>
                      )}

                      {series.originalWorkAuthor && (
                        <div className="mt-3 rounded-2xl border border-white/5 bg-black/20 px-4 py-3">
                          <p className="mb-1 text-[11px] uppercase tracking-wider text-gray-500">
                            Penulis Asal
                          </p>
                          <p className="text-sm leading-6 text-gray-200">
                            {series.originalWorkAuthor}
                          </p>
                        </div>
                      )}

                      {series.originalWorkPublisher && (
                        <div className="mt-3 rounded-2xl border border-white/5 bg-black/20 px-4 py-3">
                          <p className="mb-1 text-[11px] uppercase tracking-wider text-gray-500">
                            Penerbit
                          </p>
                          <p className="text-sm leading-6 text-gray-200">
                            {series.originalWorkPublisher}
                          </p>
                        </div>
                      )}

                      {series.originalLanguage && (
                        <div className="mt-3 rounded-2xl border border-white/5 bg-black/20 px-4 py-3">
                          <p className="mb-1 text-[11px] uppercase tracking-wider text-gray-500">
                            Bahasa Asal
                          </p>
                          <p className="text-sm leading-6 text-gray-200">
                            {series.originalLanguage}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-3">
              {episodes.length === 0 && (
                <div className="rounded-2xl bg-[#1f232b] p-5 text-sm text-gray-400">
                  Belum ada episod diterbitkan untuk series ini.
                </div>
              )}

              {episodes.map((ep, index) => (
                <div
                  key={ep.id}
                  onClick={() => router.push("/player/" + ep.seriesId + "/" + ep.id)}
                  className="cursor-pointer rounded-2xl border border-white/10 bg-[#1f232b] p-4 transition hover:bg-[#262b35]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{ep.title}</p>
                      <p className="mt-1 text-xs text-gray-400">
                        {ep.originalChapterLabel || `Episod ${index + 1}`} •{" "}
                        {formatDuration(ep.durationSeconds || 0)}
                      </p>
                    </div>

                    <div className="shrink-0 rounded-full bg-white/5 px-2 py-1 text-[10px] text-white/70">
                      Main
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}