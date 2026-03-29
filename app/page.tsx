"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../components/AuthProvider";
import { Shield } from "lucide-react";

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

export default function Page() {
  const router = useRouter();
  const { user } = useAuth();

  const [search, setSearch] = useState("");
  const [series, setSeries] = useState<SeriesItem[]>([]);
  const [speakerMap, setSpeakerMap] = useState<Record<string, string>>({});
  const [recentlyPlayed, setRecentlyPlayed] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 900);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        const seriesQuery = query(
          collection(db, "series"),
          orderBy("sortOrder", "asc")
        );
        const seriesSnapshot = await getDocs(seriesQuery);

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

        const speakersSnapshot = await getDocs(collection(db, "speakers"));

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
      } catch (err: any) {
        setError(err?.message || "Gagal memuatkan series dari Firebase");
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

  const filteredSeries = series.filter((item) =>
    item.title.toLowerCase().includes(normalized)
  );

  function getSpeakerName(speakerId: string) {
    return speakerMap[speakerId] || speakerId || "Speaker tidak diketahui";
  }

  if (showSplash || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f1115]">
        <Image
          src="/logo-icon.png"
          alt="Aqsa Series"
          width={88}
          height={88}
          priority
          className="animate-pulse object-contain drop-shadow-[0_0_30px_rgba(255,180,0,0.4)]"
        />
      </div>
    );
  }

  return (
    <main className="flex min-h-screen justify-center bg-gradient-to-b from-[#0f1115] to-[#1a1d24] text-white">
      <div className="w-full max-w-md px-6 py-10 pb-32">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <Image
              src="/logo-horizontal.png"
              alt="Aqsa Series"
              width={220}
              height={60}
              priority
              className="h-10 w-auto object-contain drop-shadow-[0_0_20px_rgba(255,180,0,0.25)]"
            />
          </div>

          {user && (
            <button
              onClick={() => router.push("/admin")}
              className="shrink-0 flex items-center gap-2 rounded-xl border border-white/10 bg-[#1f232b] px-3 py-2 text-xs transition hover:bg-[#2a2f39]"
            >
              <Shield size={14} />
              Admin Dashboard
            </button>
          )}
        </div>

        <div className="mb-8">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari series..."
            className="w-full rounded-2xl border border-white/10 bg-[#1f232b] px-4 py-3 text-sm text-white outline-none placeholder:text-gray-400 focus:border-[#7A1F2B]"
          />
        </div>

        {recentlyPlayed.length > 0 && normalized === "" && (
          <div className="mb-10">
            <h2 className="mb-4 text-sm uppercase tracking-wider text-gray-400">
              Recently Played
            </h2>

            <div className="space-y-3">
              {recentlyPlayed.map((item, index) => (
                <div
                  key={item.seriesId + item.episodeId + index}
                  onClick={() =>
                    router.push("/player/" + item.seriesId + "/" + item.episodeId)
                  }
                  className="cursor-pointer rounded-2xl bg-[#1f232b] p-4 transition hover:bg-[#262b35]"
                >
                  <div className="text-sm font-semibold">{item.episodeTitle}</div>
                  <div className="mt-1 text-xs text-gray-400">{item.seriesTitle}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-4">
          <h2 className="text-sm uppercase tracking-wider text-gray-400">
            {normalized ? "Search Results" : "Popular Series"}
          </h2>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-950/40 p-5 text-sm text-red-200">
            {error}
          </div>
        )}

        {!error && filteredSeries.length === 0 && (
          <div className="rounded-2xl bg-[#1f232b] p-5 text-sm text-gray-400">
            Tiada series dijumpai.
          </div>
        )}

        {!error && filteredSeries.length > 0 && (
          <div className="space-y-6">
            {filteredSeries.map((item) => (
              <div
                key={item.id}
                onClick={() => router.push("/series/" + item.id)}
                className="cursor-pointer overflow-hidden rounded-2xl bg-[#1f232b]"
              >
                <div className="relative h-44">
                  {item.coverUrl && item.coverUrl.trim() !== "" ? (
                    <img
                      src={item.coverUrl}
                      alt={item.title}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-[#20252f] to-[#12151b]" />
                  )}

                  <div className="absolute inset-0 bg-black/45" />

                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="text-lg font-semibold leading-snug">
                      {item.title}
                    </div>

                    <div className="mt-1 text-sm text-gray-300">
                      Speaker: {getSpeakerName(item.speakerId)}
                    </div>
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