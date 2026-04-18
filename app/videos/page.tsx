"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../../lib/firebase";

type VideoItem = {
  id: string;
  title: string;
  speaker: string;
  category: string;
  youtubeUrl: string;
  youtubeId: string;
  description?: string;
  thumbnailUrl?: string;
  sortOrder: number;
  isPublished: boolean;
  isDeleted?: boolean;
};

function extractYouTubeId(url: string) {
  if (!url) return "";

  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&]+)/,
    /(?:youtu\.be\/)([^?&]+)/,
    /(?:youtube\.com\/embed\/)([^?&]+)/,
    /(?:youtube\.com\/shorts\/)([^?&]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }

  return "";
}

function getYouTubeThumbnail(youtubeId: string) {
  if (!youtubeId) return "";
  return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
}

export default function VideosPage() {
  const router = useRouter();

  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null);

  useEffect(() => {
    async function loadVideos() {
      try {
        setLoading(true);
        setError("");

        const q = query(collection(db, "videos"), orderBy("sortOrder", "asc"));
        const snapshot = await getDocs(q);

        const data: VideoItem[] = snapshot.docs
          .map((docItem) => {
            const rawYoutubeUrl = docItem.data().youtubeUrl ?? "";
            const rawYoutubeId =
              docItem.data().youtubeId ?? extractYouTubeId(rawYoutubeUrl);

            return {
              id: docItem.id,
              title: docItem.data().title ?? "",
              speaker: docItem.data().speaker ?? "",
              category: docItem.data().category ?? "Umum",
              youtubeUrl: rawYoutubeUrl,
              youtubeId: rawYoutubeId,
              description: docItem.data().description ?? "",
              thumbnailUrl:
                docItem.data().thumbnailUrl ?? getYouTubeThumbnail(rawYoutubeId),
              sortOrder: docItem.data().sortOrder ?? 0,
              isPublished: docItem.data().isPublished ?? false,
              isDeleted: docItem.data().isDeleted ?? false,
            };
          })
          .filter((item) => item.isPublished === true && item.isDeleted !== true);

        setVideos(data);

        if (data.length > 0) {
          setActiveVideo(data[0]);
        }
      } catch (err: any) {
        setError(err?.message || "Gagal memuatkan video.");
      } finally {
        setLoading(false);
      }
    }

    loadVideos();
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    videos.forEach((video) => {
      if (video.category?.trim()) {
        set.add(video.category.trim());
      }
    });

    return ["All", ...Array.from(set)];
  }, [videos]);

  const filteredVideos = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return videos.filter((video) => {
      const matchesCategory =
        activeCategory === "All" || video.category === activeCategory;

      const matchesSearch =
        normalized === "" ||
        video.title.toLowerCase().includes(normalized) ||
        video.speaker.toLowerCase().includes(normalized) ||
        video.category.toLowerCase().includes(normalized);

      return matchesCategory && matchesSearch;
    });
  }, [videos, search, activeCategory]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0f1115] text-white flex justify-center">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-80px] left-1/2 -translate-x-1/2 h-[420px] w-[420px] rounded-full bg-[#7A1F2B] opacity-15 blur-[120px]" />
        <div className="absolute top-[260px] left-1/2 -translate-x-1/2 h-[320px] w-[320px] rounded-full bg-white/5 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md px-6 py-10 pb-40">
        <button
          onClick={() => router.push("/")}
          className="mb-6 text-sm text-gray-400"
        >
          ← Kembali
        </button>

        <div className="mb-8 rounded-[28px] border border-white/10 bg-white/[0.04] px-5 py-6 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl">
          <h1 className="text-2xl font-bold">Video Library</h1>
          <p className="mt-2 text-sm text-gray-400">
            Tonton video YouTube pilihan terus dalam app
          </p>

          <div className="mt-5">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari video, penyampai atau kategori..."
              className="w-full rounded-full border border-white/10 bg-[#16191f] px-5 py-3.5 text-sm text-white shadow-inner outline-none placeholder:text-gray-500 focus:border-[#7A1F2B] focus:ring-2 focus:ring-[#7A1F2B]/20"
            />
          </div>
        </div>

        <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
          {categories.map((category) => {
            const active = activeCategory === category;

            return (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-medium transition ${
                  active
                    ? "bg-[#7A1F2B] text-white"
                    : "border border-white/10 bg-white/[0.04] text-gray-300"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>

        {loading && (
          <div className="rounded-2xl bg-[#1f232b] p-5 text-sm text-gray-300">
            Sedang memuatkan video...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-950/40 p-5 text-sm text-red-200">
            {error}
          </div>
        )}

        {!loading && !error && activeVideo && (
          <div className="mb-8 overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <div className="aspect-video w-full overflow-hidden bg-black">
              <iframe
                className="h-full w-full"
                src={`https://www.youtube.com/embed/${activeVideo.youtubeId}`}
                title={activeVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>

            <div className="p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#E8D28A]">
                  {activeVideo.category}
                </span>
              </div>

              <h2 className="text-lg font-semibold leading-snug">
                {activeVideo.title}
              </h2>

              <p className="mt-2 text-sm text-white/55">
                Penyampai · {activeVideo.speaker || "Tidak dinyatakan"}
              </p>

              {activeVideo.description && (
                <p className="mt-3 text-sm leading-6 text-gray-400">
                  {activeVideo.description}
                </p>
              )}
            </div>
          </div>
        )}

        {!loading && !error && filteredVideos.length === 0 && (
          <div className="rounded-2xl bg-[#1f232b] p-5 text-sm text-gray-400">
            Tiada video dijumpai.
          </div>
        )}

        {!loading && !error && filteredVideos.length > 0 && (
          <div className="space-y-4">
            {filteredVideos.map((video) => {
              const active = activeVideo?.id === video.id;

              return (
                <button
                  key={video.id}
                  onClick={() => setActiveVideo(video)}
                  className={`w-full overflow-hidden rounded-[24px] border text-left transition duration-200 ${
                    active
                      ? "border-[#7A1F2B]/50 bg-white/[0.06] shadow-[0_18px_40px_rgba(122,31,43,0.18)]"
                      : "border-white/10 bg-white/[0.04] shadow-[0_14px_30px_rgba(0,0,0,0.18)]"
                  }`}
                >
                  <div className="flex gap-4 p-4">
                    <div className="relative h-24 w-36 shrink-0 overflow-hidden rounded-2xl bg-[#16191f]">
                      {video.thumbnailUrl ? (
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-gray-500">
                          Tiada Thumbnail
                        </div>
                      )}

                      <div className="absolute inset-0 bg-black/20" />

                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/55 backdrop-blur">
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="white"
                          >
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-white/60">
                          {video.category}
                        </span>
                      </div>

                      <p className="mt-3 line-clamp-2 text-[15px] font-semibold leading-[1.35] text-white">
                        {video.title}
                      </p>

                      <p className="mt-2 text-sm text-white/45">
                        {video.speaker || "Tidak dinyatakan"}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}