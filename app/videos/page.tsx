"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { collection, getDocs, query } from "firebase/firestore";
import { Share2 } from "lucide-react";
import { db } from "../../lib/firebase";
import PremiumShareModal from "../../components/PremiumShareModal";
import { useLanguage } from "../../components/LanguageProvider";
import { videoCategoryLabel } from "../../lib/videoCategory";

const COPY = {
  ms: { back: "Kembali", title: "Pustaka Video", subtitle: "Tonton video YouTube pilihan terus dalam aplikasi", search: "Cari video, penyampai atau kategori...", categories: "Kategori video", all: "Semua", loading: "Sedang memuatkan video...", failed: "Gagal memuatkan video.", share: "Kongsi video", speaker: "Penyampai", unknown: "Tidak dinyatakan", show: "Lihat Penerangan", hide: "Sorok Penerangan", empty: "Tiada video dijumpai.", thumbnail: "Tiada imej kecil" },
  en: { back: "Back", title: "Video Library", subtitle: "Watch selected YouTube videos here", search: "Search videos, speakers or categories...", categories: "Video categories", all: "All", loading: "Loading videos...", failed: "Unable to load videos.", share: "Share video", speaker: "Speaker", unknown: "Not specified", show: "Show description", hide: "Hide description", empty: "No videos found.", thumbnail: "No thumbnail" },
  ar: { back: "رجوع", title: "مكتبة الفيديو", subtitle: "شاهد مقاطع مختارة من يوتيوب هنا", search: "ابحث عن فيديو أو متحدث أو فئة...", categories: "فئات الفيديو", all: "الكل", loading: "جارٍ تحميل الفيديوهات...", failed: "تعذّر تحميل الفيديوهات.", share: "مشاركة الفيديو", speaker: "المتحدث", unknown: "غير مذكور", show: "عرض الوصف", hide: "إخفاء الوصف", empty: "لم يُعثر على فيديوهات.", thumbnail: "لا توجد صورة مصغرة" },
} as const;

type VideoItem = {
  id: string;
  title: string;
  speaker: string;
  category: string;
  youtubeUrl: string;
  youtubeId: string;
  description?: string;
  thumbnailUrl?: string;
  sortOrder?: number;
  isPinned?: boolean;
  createdAt?: { seconds?: number } | null;
  isPublished: boolean;
  isDeleted?: boolean;
};

const VIDEO_CATEGORIES = [
  "Tadabbur",
  "Wacana",
  "Dokumentari",
  "Aqsa for Kids",
  "Aqsa Ads",
  "Umum",
  "Muzik",
  "Filem",
];

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

function VideosPageContent() {
  const { language } = useLanguage();
  const copy = COPY[language];
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedVideoId = searchParams.get("video");

  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [showDescription, setShowDescription] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const getShareUrl = (videoId: string) => {
  return `https://aqsaseries.com/share/video/${videoId}`;
};

  useEffect(() => {
    async function loadVideos() {
      try {
        setLoading(true);
        setError("");

        const q = query(collection(db, "videos"));
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
  isPinned: docItem.data().isPinned ?? false,
  createdAt: docItem.data().createdAt ?? null,
  isPublished: docItem.data().isPublished ?? false,
  isDeleted: docItem.data().isDeleted ?? false,
};
          })
          .filter((item) => item.isPublished === true && item.isDeleted !== true);

        setVideos(data);

      } catch {
        setError("failed");
      } finally {
        setLoading(false);
      }
    }

    loadVideos();
  }, []);

  const activeVideo = useMemo(
    () => videos.find((video) => video.id === selectedVideoId) || videos[0] || null,
    [videos, selectedVideoId]
  );

  const categories = useMemo(() => {
  return ["All", ...VIDEO_CATEGORIES];
}, []);

  const categoriesWithVideos = useMemo(() => {
  const set = new Set<string>();

  videos.forEach((video) => {
    if (video.category?.trim()) {
      set.add(video.category.trim());
    }
  });

  return set;
}, [videos]);

  const filteredVideos = useMemo(() => {
  const normalized = search.trim().toLowerCase();

  return videos
    .filter((video) => {
      const matchesCategory =
        activeCategory === "All" || video.category === activeCategory;

      const matchesSearch =
        normalized === "" ||
        video.title.toLowerCase().includes(normalized) ||
        video.speaker.toLowerCase().includes(normalized) ||
        video.category.toLowerCase().includes(normalized) ||
        videoCategoryLabel(video.category, language).toLowerCase().includes(normalized);

      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      if (!!a.isPinned !== !!b.isPinned) {
        return a.isPinned ? -1 : 1;
      }

      const aTime = a.createdAt?.seconds ?? 0;
      const bTime = b.createdAt?.seconds ?? 0;

      return bTime - aTime;
    });
}, [videos, search, activeCategory, language]);

  function selectCategory(category: string) {
    setActiveCategory(category);
    if (category === "All" || activeVideo?.category === category) return;

    const firstVideo = videos
      .filter((video) => video.category === category)
      .sort((a, b) => {
        if (!!a.isPinned !== !!b.isPinned) return a.isPinned ? -1 : 1;
        return (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0);
      })[0];

    if (firstVideo) {
      setShowDescription(false);
      router.replace(`/videos?video=${firstVideo.id}`);
    }
  }

  const groupedVideos = useMemo(() => {
  const groups: Record<string, VideoItem[]> = {};

  filteredVideos.forEach((video) => {
    const category = video.category?.trim() || "Umum";

    if (!groups[category]) {
      groups[category] = [];
    }

    groups[category].push(video);
  });

 Object.keys(groups).forEach((category) => {
  groups[category].sort((a, b) => {
    if (!!a.isPinned !== !!b.isPinned) {
      return a.isPinned ? -1 : 1;
    }

    const aTime = a.createdAt?.seconds ?? 0;
    const bTime = b.createdAt?.seconds ?? 0;

    return bTime - aTime;
  });
});

  return groups;
}, [filteredVideos]);

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
          {language === "ar" ? "→" : "←"} {copy.back}
        </button>

        <div className="mb-8 rounded-[28px] border border-white/10 bg-white/[0.04] px-5 py-6 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl">
          <h1 className="text-2xl font-bold">{copy.title}</h1>
          <p className="mt-2 text-sm text-gray-400">
            {copy.subtitle}
          </p>

          <div className="mt-5">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={copy.search}
              className="w-full rounded-full border border-white/10 bg-[#16191f] px-5 py-3.5 text-sm text-white shadow-inner outline-none placeholder:text-gray-500 focus:border-[#7A1F2B] focus:ring-2 focus:ring-[#7A1F2B]/20"
            />
          </div>
        </div>

        <div className="-mx-6 mb-6 overflow-x-auto px-6 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label={copy.categories}>
          <div className="flex w-max min-w-full gap-2">
            {categories.map((category) => {
              const active = activeCategory === category;
              const hasVideos = category === "All" || categoriesWithVideos.has(category);

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => selectCategory(category)}
                  disabled={category !== "All" && !hasVideos}
                  aria-pressed={active}
                  className={`min-h-11 shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-center text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8D28A] ${
                    active
                      ? "border border-[#D4AF37]/40 bg-[#D4AF37]/10 text-[#E8D28A]"
                      : hasVideos
                        ? "border border-white/10 bg-white/[0.04] text-[#E8D28A]"
                        : "cursor-not-allowed border border-white/10 bg-white/[0.04] text-gray-500"
                  }`}
                >
                  {videoCategoryLabel(category, language)}
                </button>
              );
            })}
          </div>
        </div>

        {loading && (
          <div className="rounded-2xl bg-[#1f232b] p-5 text-sm text-gray-300">
            {copy.loading}
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-950/40 p-5 text-sm text-red-200">
            {copy.failed}
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
  <div className="mb-3 flex items-start justify-between gap-3">
    <div className="min-w-0">
      <span className="inline-flex rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#E8D28A]">
        {videoCategoryLabel(activeVideo.category, language)}
      </span>

      <h2 className="mt-3 text-lg font-semibold leading-snug">
        {activeVideo.title}
      </h2>
    </div>

    <button
      type="button"
      onClick={() => setShareOpen(true)}
      className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#7A1F2B]/60 bg-[#7A1F2B]/20 text-white shadow-[0_0_24px_rgba(122,31,43,0.35)] transition hover:scale-105 hover:bg-[#7A1F2B]/35"
      aria-label={copy.share}
    >
      <Share2 size={19} />
    </button>
  </div>

              <p className="mt-2 text-sm text-white/55">
                {copy.speaker} · {activeVideo.speaker || copy.unknown}
              </p>

              {activeVideo.description && (
  <div className="mt-3">
    <button
      type="button"
      onClick={() => setShowDescription((prev) => !prev)}
      className="text-sm font-medium text-white/65 transition hover:text-white"
    >
      {showDescription ? copy.hide : copy.show}
    </button>

    {showDescription && (
      <p className="mt-3 text-sm leading-6 text-gray-400">
        {activeVideo.description}
      </p>
    )}
  </div>
)}
            </div>
          </div>
        )}

        {!loading && !error && filteredVideos.length === 0 && (
          <div className="rounded-2xl bg-[#1f232b] p-5 text-sm text-gray-400">
            {copy.empty}
          </div>
        )}

        {!loading && !error && filteredVideos.length > 0 && (
  activeCategory === "All" ? (
    <div className="space-y-8">
      {Object.entries(groupedVideos).map(([category, videosInCategory]) => (
        <div key={category}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-[13px] font-semibold uppercase tracking-[0.22em] text-white/55">
                {videoCategoryLabel(category, language)}
              </h3>
              <div className="mt-2 h-[2px] w-12 rounded-full bg-[#7A1F2B]" />
            </div>

            <span className="text-xs text-white/35">
              {videosInCategory.length} video
            </span>
          </div>

          <div className="space-y-4">
            {videosInCategory.map((video) => {
              const active = activeVideo?.id === video.id;

              return (
                <button
                  key={video.id}
                  onClick={() => {
                    setShowDescription(false);
                    router.push(`/videos?video=${video.id}`);
                  }}
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
                          {copy.thumbnail}
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
                        <span className="rounded-full border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[#E8D28A]">
  {videoCategoryLabel(video.category, language)}
</span>
                      </div>

                      <p className="mt-3 line-clamp-2 text-[15px] font-semibold leading-[1.35] text-white">
                        {video.title}
                      </p>

                      <p className="mt-2 text-sm text-white/45">
                        {video.speaker || copy.unknown}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  ) : (
    <div className="space-y-4">
      {filteredVideos.map((video) => {
        const active = activeVideo?.id === video.id;

        return (
          <button
            key={video.id}
            onClick={() => {
              setShowDescription(false);
              router.push(`/videos?video=${video.id}`);
            }}
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
                    {copy.thumbnail}
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
                  <span className="rounded-full border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[#E8D28A]">
  {videoCategoryLabel(video.category, language)}
</span>
                </div>

                <p className="mt-3 line-clamp-2 text-[15px] font-semibold leading-[1.35] text-white">
                  {video.title}
                </p>

                <p className="mt-2 text-sm text-white/45">
                  {video.speaker || copy.unknown}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  )
)}      

        {activeVideo && (
          <PremiumShareModal
            open={shareOpen}
            onClose={() => setShareOpen(false)}
            title={activeVideo.title}
            speaker={activeVideo.speaker}
            category={activeVideo.category}
            thumbnail={activeVideo.thumbnailUrl}
            shareUrl={getShareUrl(activeVideo.id)}
          />
        )}
      </div>
    </main>
  );
}

export default function VideosPage() {
  return (
    <Suspense
      fallback={
        <main className="relative min-h-screen overflow-hidden bg-[#0f1115] text-white flex justify-center">
          <div className="relative w-full max-w-md px-6 py-10 pb-40">
            <div className="rounded-2xl bg-[#1f232b] p-5 text-sm text-gray-300">
              Sedang memuatkan video...
            </div>
          </div>
        </main>
      }
    >
      <VideosPageContent />
    </Suspense>
  );
}
