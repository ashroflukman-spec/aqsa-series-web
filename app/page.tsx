"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../components/AuthProvider";

type SeriesItem = {
  id: string;
  title: string;
  speakerId: string;
  coverUrl: string;
  isPublished: boolean;
  sortOrder: number;
  isDeleted?: boolean;
};

type SpeakerItem = {
  id: string;
  name: string;
  fullName?: string;
  displayName?: string;
  slug?: string;
  isDeleted?: boolean;
};

type RecentItem = {
  seriesId: string;
  episodeId: string;
  seriesTitle: string;
  episodeTitle: string;
};

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

export default function Page() {
  const router = useRouter();
  const { user } = useAuth();

  const [search, setSearch] = useState("");
  const [series, setSeries] = useState<SeriesItem[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [speakerMap, setSpeakerMap] = useState<Record<string, string>>({});
  const [recentlyPlayed, setRecentlyPlayed] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [isSplashExiting, setIsSplashExiting] = useState(false);
  const [isSplashEntered, setIsSplashEntered] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const enterTimer = setTimeout(() => {
      setIsSplashEntered(true);
    }, 80);

    const exitTimer = setTimeout(() => {
      setIsSplashExiting(true);
    }, 2100);

    const removeTimer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        const [seriesSnapshot, speakersSnapshot, videosSnapshot] = await Promise.all([
          getDocs(query(collection(db, "series"), orderBy("sortOrder", "asc"))),
          getDocs(collection(db, "speakers")),
          getDocs(query(collection(db, "videos"), orderBy("sortOrder", "asc"))),
        ]);

        const seriesData: SeriesItem[] = seriesSnapshot.docs
          .map((docItem) => ({
            id: docItem.id,
            title: docItem.data().title ?? "",
            speakerId: docItem.data().speakerId ?? "",
            coverUrl: docItem.data().coverUrl ?? "",
            isPublished: docItem.data().isPublished ?? false,
            sortOrder: docItem.data().sortOrder ?? 0,
            isDeleted: docItem.data().isDeleted ?? false,
          }))
          .filter((item) => item.isPublished === true && item.isDeleted !== true);

        setSeries(seriesData);

        const speakersData: SpeakerItem[] = speakersSnapshot.docs
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

        const videosData: VideoItem[] = videosSnapshot.docs
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

        setVideos(videosData);
      } catch (err: any) {
        setError(err?.message || "Gagal memuatkan kandungan dari Firebase");
      } finally {
        setLoading(false);
      }
    }

    fetchData();

    const saved = localStorage.getItem("recentlyPlayed");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRecentlyPlayed([parsed[0]]);
        } else {
          setRecentlyPlayed([]);
        }
      } catch {
        setRecentlyPlayed([]);
      }
    }
  }, []);

  const normalized = search.trim().toLowerCase();

  const filteredSeries = useMemo(() => {
    return series.filter((item) => {
      const speakerName = speakerMap[item.speakerId] || "";
      return (
        item.title.toLowerCase().includes(normalized) ||
        speakerName.toLowerCase().includes(normalized)
      );
    });
  }, [series, speakerMap, normalized]);

  const highlightVideos = useMemo(() => videos.slice(0, 5), [videos]);

  function getSpeakerName(speakerId: string) {
    return speakerMap[speakerId] || speakerId || "Speaker tidak diketahui";
  }

  return (
    <main className="relative flex min-h-screen justify-center overflow-hidden bg-gradient-to-b from-[#0f1115] to-[#1a1d24] text-white">
      {showSplash && (
        <div
          className={`pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-[#0f1115] transition-opacity duration-900 ${
            isSplashExiting ? "opacity-0" : "opacity-100"
          }`}
        >
          <div className="absolute inset-0 overflow-hidden">
            <div
              className={`absolute inset-0 pointer-events-none ${
                isSplashEntered ? "opacity-100" : "opacity-0"
              } transition-opacity duration-[2000ms]`}
              style={{
                background:
                  "radial-gradient(circle at 50% 20%, rgba(255,255,255,0.05), transparent 40%)",
              }}
            />

            <div
              className={`absolute left-1/2 top-1/2 h-[240px] w-[240px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#7A1F2B] blur-[85px] transition-all duration-[1800ms] ease-out ${
                isSplashEntered ? "opacity-25 scale-100" : "opacity-0 scale-75"
              } ${isSplashExiting ? "opacity-0 scale-[1.3]" : ""}`}
            />

            <div
              className={`absolute left-1/2 top-1/2 h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500/10 blur-[130px] transition-all duration-[2200ms] ease-out ${
                isSplashEntered ? "opacity-100 scale-100" : "opacity-0 scale-90"
              } ${isSplashExiting ? "opacity-0 scale-[1.18]" : ""}`}
            />

            <div
              className={`absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.035] blur-[180px] transition-all duration-[2400ms] ease-out ${
                isSplashEntered ? "opacity-100 scale-100" : "opacity-0 scale-95"
              } ${isSplashExiting ? "opacity-0 scale-[1.08]" : ""}`}
            />
          </div>

          <div className="absolute inset-0">
            <div
              className={`absolute left-1/2 top-24 -z-10 h-[160px] w-[360px] rounded-full bg-red-500/12 blur-3xl transition-all duration-[1800ms] ease-out ${
                isSplashEntered ? "opacity-80" : "opacity-0"
              } ${isSplashExiting ? "opacity-0" : ""}`}
              style={{
                transform: "translate(-50%, 0)",
                animation: isSplashEntered
                  ? "aqsa-breath 2.4s ease-in-out infinite"
                  : "none",
              }}
            />

            <div
              className={`absolute left-1/2 top-24 -z-10 h-[110px] w-[260px] rounded-full bg-[#7A1F2B]/30 blur-[55px] transition-all duration-[1800ms] ease-out ${
                isSplashEntered ? "opacity-100" : "opacity-0"
              } ${isSplashExiting ? "opacity-0" : ""}`}
              style={{
                transform: "translate(-50%, 0)",
                animation: isSplashEntered
                  ? "aqsa-drift 3.2s ease-in-out infinite"
                  : "none",
              }}
            />

            <div
              className={`absolute left-1/2 top-24 -z-10 h-[110px] w-[260px] -translate-x-1/2 rounded-full bg-[#7A1F2B]/35 blur-[55px] transition-all duration-[1800ms] ease-out ${
                isSplashEntered ? "opacity-100 scale-100" : "opacity-0 scale-75"
              } ${isSplashExiting ? "opacity-0 scale-[1.18]" : ""}`}
            />

            <Image
              src="/logo-icon.png"
              alt="Aqsa Series"
              width={360}
              height={90}
              priority
              className={`absolute left-1/2 top-24 -translate-x-1/2 h-16 w-auto object-contain transition-all duration-[1600ms] ease-out ${
                isSplashEntered
                  ? "opacity-100 scale-100 brightness-100 blur-0 drop-shadow-[0_0_42px_rgba(255,0,0,0.28)]"
                  : "opacity-0 scale-[0.92] brightness-[0.45] blur-[1.5px]"
              } ${isSplashExiting ? "opacity-0 scale-[1.06] blur-[1px]" : ""}`}
            />

            <div
              className={`absolute left-1/2 top-[calc(6rem+68px)] h-[2px] w-24 -translate-x-1/2 rounded-full bg-gradient-to-r from-transparent via-red-300/70 to-transparent transition-all duration-[1800ms] ease-out ${
                isSplashEntered ? "opacity-80 scale-x-100" : "opacity-0 scale-x-75"
              } ${isSplashExiting ? "opacity-0 scale-x-110" : ""}`}
            />
          </div>
        </div>
      )}

      <div
        className={`w-full max-w-md px-6 py-10 pb-52 transition-all duration-1000 delay-300 ${
          showSplash ? "opacity-0 translate-y-3" : "opacity-100 translate-y-0"
        }`}
      >
        <div className="mb-10">
          <div className="rounded-[30px] border border-white/10 bg-white/[0.04] px-5 py-6 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <div className="flex flex-col items-center text-center">
              <Image
                src="/logo-icon.png"
                alt="Aqsa Series"
                width={360}
                height={90}
                priority
                className="h-20 w-auto object-contain drop-shadow-[0_0_28px_rgba(255,0,0,0.32)]"
              />

              <p className="mt-3 text-sm text-gray-400">
                Siri Pengetahuan Baitulmaqdis Kita Bermula Di Sini
              </p>

              {user && (
                <button
                  onClick={() => router.push("/admin")}
                  className="mt-4 rounded-full border border-white/10 bg-[#1f232b] px-4 py-2 text-[11px] font-medium text-white/85 transition hover:bg-[#2a2f39]"
                >
                  Admin Dashboard
                </button>
              )}
            </div>

            <div className="mt-5">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari series..."
                className="w-full rounded-full border border-white/10 bg-[#16191f] px-5 py-3.5 text-sm text-white shadow-inner outline-none placeholder:text-gray-500 focus:border-[#7A1F2B] focus:ring-2 focus:ring-[#7A1F2B]/20"
              />
            </div>
          </div>
        </div>

        {recentlyPlayed.length > 0 && normalized === "" && (
          <div className="mb-10">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-[13px] font-semibold uppercase tracking-[0.22em] text-white/55">
                  Sedang Dimainkan
                </h2>
                <div className="mt-2 h-[2px] w-14 rounded-full bg-[#D4AF37]" />
              </div>

              <span className="text-xs text-white/35">
                {recentlyPlayed.length} item
              </span>
            </div>

            <div className="space-y-4">
              {recentlyPlayed.map((item, index) => (
                <div
                  key={item.seriesId + item.episodeId + index}
                  onClick={() =>
                    router.push("/player/" + item.seriesId + "/" + item.episodeId)
                  }
                  className="group cursor-pointer overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.04] shadow-[0_14px_40px_rgba(0,0,0,0.22)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-white/15 hover:bg-white/[0.06] hover:shadow-[0_20px_54px_rgba(0,0,0,0.3)]"
                >
                  <div className="flex items-center gap-4 p-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7A1F2B] via-[#3a1620] to-[#151820] shadow-inner">
                      <div className="flex items-end gap-[3px]">
                        <span className="h-3 w-1 rounded-full bg-white/80" />
                        <span className="h-6 w-1 rounded-full bg-white/90" />
                        <span className="h-4 w-1 rounded-full bg-white/80" />
                        <span className="h-7 w-1 rounded-full bg-white/90" />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#E8D28A]">
                          Sambung...
                        </span>
                      </div>

                      <div className="mt-3 line-clamp-2 text-[16px] font-semibold leading-[1.35] text-white">
                        {item.episodeTitle}
                      </div>

                      <div className="mt-1 text-sm text-white/45">
                        {item.seriesTitle}
                      </div>

                      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                        <div className="h-full w-1/3 rounded-full bg-[#D4AF37]" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {normalized === "" && highlightVideos.length > 0 && (
          <div className="mb-10">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-[13px] font-semibold uppercase tracking-[0.22em] text-white/55">
                  Video Highlight
                </h2>
                <div className="mt-2 h-[2px] w-14 rounded-full bg-[#7A1F2B]" />
              </div>

              <button
                onClick={() => router.push("/videos")}
                className="text-xs text-white/45 transition hover:text-white"
              >
                Lihat Semua →
              </button>
            </div>

            <div className="-mx-6 overflow-x-auto px-6 pb-2">
              <div className="flex gap-4">
                {highlightVideos.map((video) => (
                  <div
                    key={video.id}
                    onClick={() => router.push("/videos")}
                    className="group w-[86%] shrink-0 cursor-pointer overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.04] shadow-[0_14px_40px_rgba(0,0,0,0.22)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-white/15 hover:bg-white/[0.06] hover:shadow-[0_20px_54px_rgba(0,0,0,0.3)]"
                  >
                    <div className="relative h-48">
                      {video.thumbnailUrl ? (
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-[#20252f] to-[#12151b]" />
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />

                      <div className="absolute left-4 top-4">
                        <span className="rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#E8D28A]">
                          {video.category}
                        </span>
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="line-clamp-2 text-[18px] font-semibold leading-[1.35] text-white">
                        {video.title}
                      </div>

                      <div className="mt-1.5 text-sm text-white/45">
                        {video.speaker || "Tidak dinyatakan"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.22em] text-white/55">
              {normalized ? "Hasil Carian" : "Siri Audio Popular"}
            </h2>
            <div className="mt-2 h-[2px] w-14 rounded-full bg-[#7A1F2B]" />
          </div>

          {!normalized && filteredSeries.length > 0 && (
            <span className="text-xs text-white/35">
              {filteredSeries.length} siri
            </span>
          )}
        </div>

        {loading && (
          <div className="rounded-2xl bg-[#1f232b] p-5 text-sm text-gray-300">
            Sedang memuatkan kandungan...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-950/40 p-5 text-sm text-red-200">
            {error}
          </div>
        )}

        {!loading && !error && filteredSeries.length === 0 && (
          <div className="rounded-2xl bg-[#1f232b] p-5 text-sm text-gray-400">
            Tiada series dijumpai.
          </div>
        )}

        {!loading && !error && filteredSeries.length > 0 && (
          <div className="space-y-7">
            {filteredSeries.map((item) => (
              <div
                key={item.id}
                onClick={() => router.push("/series/" + item.id)}
                className="group cursor-pointer active:scale-[0.985] transition duration-200"
              >
                <div className="overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.04] shadow-[0_14px_40px_rgba(0,0,0,0.22)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-white/15 hover:bg-white/[0.06] hover:shadow-[0_20px_54px_rgba(0,0,0,0.3)] active:scale-[0.985] active:border-white/15 active:bg-white/[0.06] active:shadow-[0_18px_44px_rgba(0,0,0,0.26),0_0_24px_rgba(212,175,55,0.08)]">
                  <div className="relative h-48">
                    {item.coverUrl && item.coverUrl.trim() !== "" ? (
                      <img
                        src={item.coverUrl}
                        alt={item.title}
                        className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-[#20252f] to-[#12151b]" />
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                  </div>
                </div>

                <div className="px-1 pt-3.5">
                  <div className="line-clamp-2 text-[20px] font-semibold leading-[1.25] text-white">
                    {item.title}
                  </div>

                  <div className="mt-1.5 text-sm text-white/45">
                    Penyampai · {getSpeakerName(item.speakerId)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}