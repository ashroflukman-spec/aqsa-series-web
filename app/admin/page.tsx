"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Mic2,
  Library,
  ListMusic,
  Trash2,
  ArrowRight,
  LogOut,
  House,
  BarChart3,
  AudioLines,
  CheckCircle2,
} from "lucide-react";
import { signOut } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import AdminGuard from "../../components/AdminGuard";

type Stats = {
  speakers: number;
  series: number;
  episodes: number;
  trash: number;
  publishedSeries: number;
  publishedEpisodes: number;
  totalDurationSeconds: number;
  averageDurationSeconds: number;
};

function formatDuration(seconds: number) {
  if (!seconds || seconds <= 0) return "0 min";

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);

  if (hrs > 0) {
    return `${hrs}j ${mins}m`;
  }

  return `${mins} min`;
}

export default function AdminPage() {
  const router = useRouter();

  const [stats, setStats] = useState<Stats>({
    speakers: 0,
    series: 0,
    episodes: 0,
    trash: 0,
    publishedSeries: 0,
    publishedEpisodes: 0,
    totalDurationSeconds: 0,
    averageDurationSeconds: 0,
  });

  const [loadingStats, setLoadingStats] = useState(true);

  const cards = [
    {
      title: "Manage Speakers",
      desc: "Tambah, edit dan urus penceramah Aqsa Series.",
      icon: Mic2,
      href: "/admin/speakers",
    },
    {
      title: "Manage Series",
      desc: "Tambah siri baru, edit maklumat siri dan karya asal.",
      icon: Library,
      href: "/admin/series",
    },
    {
      title: "Manage Episodes",
      desc: "Tambah episod, susun paparan dan kemas kini audio.",
      icon: ListMusic,
      href: "/admin/episodes",
    },
    {
      title: "Manage Videos",
      desc: "Tambah, edit dan urus video YouTube untuk Video Library.",
      icon: ListMusic,
      href: "/admin/videos",
    },
    {
      title: "Trash",
      desc: "Pulihkan semula data yang telah dipadam ke Recycle Bin.",
      icon: Trash2,
      href: "/admin/trash",
    },
  ];

  useEffect(() => {
    async function loadStats() {
      try {
        setLoadingStats(true);

        const [speakersSnap, seriesSnap, episodesSnap] = await Promise.all([
          getDocs(collection(db, "speakers")),
          getDocs(collection(db, "series")),
          getDocs(collection(db, "episodes")),
        ]);

        const activeSpeakers = speakersSnap.docs.filter(
          (docItem) => docItem.data().isDeleted !== true
        );

        const activeSeries = seriesSnap.docs.filter(
          (docItem) => docItem.data().isDeleted !== true
        );

        const activeEpisodes = episodesSnap.docs.filter(
          (docItem) => docItem.data().isDeleted !== true
        );

        const publishedSeries = activeSeries.filter(
          (docItem) => docItem.data().isPublished === true
        );

        const publishedEpisodes = activeEpisodes.filter(
          (docItem) => docItem.data().isPublished === true
        );

        const totalDurationSeconds = activeEpisodes.reduce((total, docItem) => {
          return total + (docItem.data().durationSeconds ?? 0);
        }, 0);

        const trashCount =
          speakersSnap.docs.filter((docItem) => docItem.data().isDeleted === true).length +
          seriesSnap.docs.filter((docItem) => docItem.data().isDeleted === true).length +
          episodesSnap.docs.filter((docItem) => docItem.data().isDeleted === true).length;

        setStats({
          speakers: activeSpeakers.length,
          series: activeSeries.length,
          episodes: activeEpisodes.length,
          trash: trashCount,
          publishedSeries: publishedSeries.length,
          publishedEpisodes: publishedEpisodes.length,
          totalDurationSeconds,
          averageDurationSeconds:
            activeEpisodes.length > 0
              ? Math.round(totalDurationSeconds / activeEpisodes.length)
              : 0,
        });
      } catch (error) {
        console.error("Gagal load analytics:", error);
      } finally {
        setLoadingStats(false);
      }
    }

    loadStats();
  }, []);

  async function handleLogout() {
    await signOut(auth);
    router.push("/admin/login");
  }

  const analyticsCards = useMemo(
    () => [
      {
        label: "Total Speakers",
        value: stats.speakers,
        icon: Mic2,
      },
      {
        label: "Total Series",
        value: stats.series,
        icon: Library,
      },
      {
        label: "Total Episodes",
        value: stats.episodes,
        icon: ListMusic,
      },
      {
        label: "Items in Trash",
        value: stats.trash,
        icon: Trash2,
      },
      {
        label: "Published Series",
        value: stats.publishedSeries,
        icon: CheckCircle2,
      },
      {
        label: "Published Episodes",
        value: stats.publishedEpisodes,
        icon: CheckCircle2,
      },
      {
        label: "Total Audio Duration",
        value: formatDuration(stats.totalDurationSeconds),
        icon: AudioLines,
      },
      {
        label: "Average / Episode",
        value: formatDuration(stats.averageDurationSeconds),
        icon: BarChart3,
      },
    ],
    [stats]
  );

  return (
    <AdminGuard>
      <main className="relative min-h-screen overflow-hidden bg-[#0f1115] text-white flex justify-center">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-80px] left-1/2 -translate-x-1/2 w-[420px] h-[420px] rounded-full bg-[#7A1F2B] opacity-15 blur-[120px]" />
          <div className="absolute top-[220px] left-1/2 -translate-x-1/2 w-[320px] h-[320px] rounded-full bg-white/5 blur-[100px]" />
          <div className="absolute bottom-[120px] left-1/2 -translate-x-1/2 w-[280px] h-[280px] rounded-full bg-white/5 blur-[100px]" />
        </div>

        <div className="relative w-full max-w-md px-6 py-10 pb-32">
          <div className="mb-10">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                <p className="text-sm text-gray-400 mt-2">
                  Pusat kawalan Aqsa Series
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push("/")}
                  className="h-11 w-11 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl flex items-center justify-center"
                  title="View Home"
                >
                  <House size={18} />
                </button>

                <button
                  onClick={handleLogout}
                  className="h-11 w-11 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl flex items-center justify-center"
                  title="Logout"
                >
                  <LogOut size={18} />
                </button>
              </div>
            </div>
          </div>

          <div className="mb-8 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl p-5 shadow-[0_12px_40px_rgba(0,0,0,0.35)] overflow-hidden relative">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -top-8 left-10 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute top-0 right-0 h-20 w-28 bg-gradient-to-bl from-white/10 to-transparent blur-xl" />
            </div>

            <div className="relative flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-2xl border border-white/10 bg-white/10 flex items-center justify-center">
                <BarChart3 size={18} />
              </div>
              <div>
                <p className="text-base font-semibold">Dashboard Analytics Pro</p>
                <p className="text-xs text-gray-400">
                  Ringkasan kandungan dan audio semasa
                </p>
              </div>
            </div>

            {loadingStats ? (
              <div className="relative text-sm text-gray-400">
                Sedang memuatkan statistik...
              </div>
            ) : (
              <div className="relative grid grid-cols-2 gap-3">
                {analyticsCards.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-white/10 bg-[#14161b]/80 backdrop-blur-xl p-4 shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs text-gray-400 leading-5">
                          {item.label}
                        </p>
                        <div className="h-8 w-8 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center">
                          <Icon size={14} />
                        </div>
                      </div>

                      <p className="text-2xl font-bold mt-3 break-words">
                        {item.value}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-4">
            {cards.map((card) => {
              const Icon = card.icon;

              return (
                <button
                  key={card.title}
                  onClick={() => router.push(card.href)}
                  className="w-full rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.35)] p-5 text-left transition hover:bg-white/[0.07]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-4">
                      <div className="h-12 w-12 rounded-2xl border border-white/10 bg-white/10 flex items-center justify-center">
                        <Icon size={22} />
                      </div>

                      <div>
                        <h2 className="text-base font-semibold">
                          {card.title}
                        </h2>

                        <p className="text-sm text-gray-400 mt-1 leading-6">
                          {card.desc}
                        </p>
                      </div>
                    </div>

                    <ArrowRight size={18} className="text-gray-400 mt-1" />
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-8 rounded-3xl border border-white/10 bg-[#1f232b]/80 backdrop-blur-xl p-5">
            <p className="text-sm font-semibold mb-2">
              Versi Admin Pro
            </p>

            <p className="text-xs text-gray-400 leading-6">
              Dashboard kini memaparkan statistik kandungan, status published,
              jumlah item dalam Trash, dan anggaran durasi keseluruhan audio.
            </p>
          </div>
        </div>
      </main>
    </AdminGuard>
  );
}