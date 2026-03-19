"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";

type TrashType = "all" | "speaker" | "series" | "episode";

type TrashItem = {
  id: string;
  title?: string;
  name?: string;
  description?: string;
  isDeleted?: boolean;
  deletedAt?: any;
  type: "speaker" | "series" | "episode";
  raw: any;
};

export default function AdminTrashPage() {
  const router = useRouter();

  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState<TrashType>("all");
  const [restoringAll, setRestoringAll] = useState(false);

  async function loadTrash() {
    try {
      setLoading(true);
      setError("");

      const [speakersSnap, seriesSnap, episodesSnap] = await Promise.all([
        getDocs(collection(db, "speakers")),
        getDocs(collection(db, "series")),
        getDocs(collection(db, "episodes")),
      ]);

      const speakers = speakersSnap.docs
        .map((d) => ({
          id: d.id,
          name: d.data().name ?? "",
          type: "speaker" as const,
          isDeleted: d.data().isDeleted ?? false,
          deletedAt: d.data().deletedAt ?? null,
          raw: d.data(),
        }))
        .filter((i) => i.isDeleted === true);

      const series = seriesSnap.docs
        .map((d) => ({
          id: d.id,
          title: d.data().title ?? "",
          description: d.data().description ?? "",
          type: "series" as const,
          isDeleted: d.data().isDeleted ?? false,
          deletedAt: d.data().deletedAt ?? null,
          raw: d.data(),
        }))
        .filter((i) => i.isDeleted === true);

      const episodes = episodesSnap.docs
        .map((d) => ({
          id: d.id,
          title: d.data().title ?? "",
          description: d.data().description ?? "",
          type: "episode" as const,
          isDeleted: d.data().isDeleted ?? false,
          deletedAt: d.data().deletedAt ?? null,
          raw: d.data(),
        }))
        .filter((i) => i.isDeleted === true);

      setItems([...speakers, ...series, ...episodes]);
    } catch (err: any) {
      setError(err?.message || "Gagal memuatkan Trash.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTrash();
  }, []);

  const counts = useMemo(() => {
    return {
      all: items.length,
      speaker: items.filter((i) => i.type === "speaker").length,
      series: items.filter((i) => i.type === "series").length,
      episode: items.filter((i) => i.type === "episode").length,
    };
  }, [items]);

  const filteredItems = useMemo(() => {
    if (activeFilter === "all") return items;
    return items.filter((item) => item.type === activeFilter);
  }, [items, activeFilter]);

  async function handleRestore(item: TrashItem) {
    try {
      setBusyId(item.type + item.id);
      setMessage("");
      setError("");

      const collectionName =
        item.type === "speaker"
          ? "speakers"
          : item.type === "series"
          ? "series"
          : "episodes";

      await setDoc(
        doc(db, collectionName, item.id),
        {
          ...item.raw,
          isDeleted: false,
          deletedAt: null,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      await loadTrash();
      setMessage("Item berjaya dipulihkan.");
    } catch (err: any) {
      setError(err?.message || "Gagal restore item.");
    } finally {
      setBusyId("");
    }
  }

  async function deleteEpisodesBySeriesId(seriesId: string) {
    const episodesQuery = query(
      collection(db, "episodes"),
      where("seriesId", "==", seriesId)
    );
    const episodesSnap = await getDocs(episodesQuery);

    for (const episodeDoc of episodesSnap.docs) {
      await deleteDoc(doc(db, "episodes", episodeDoc.id));
    }

    return episodesSnap.docs.length;
  }

  async function deleteSeriesAndEpisodesBySpeakerId(speakerId: string) {
    const seriesQuery = query(
      collection(db, "series"),
      where("speakerId", "==", speakerId)
    );
    const seriesSnap = await getDocs(seriesQuery);

    let deletedSeriesCount = 0;
    let deletedEpisodeCount = 0;

    for (const seriesDoc of seriesSnap.docs) {
      deletedEpisodeCount += await deleteEpisodesBySeriesId(seriesDoc.id);
      await deleteDoc(doc(db, "series", seriesDoc.id));
      deletedSeriesCount += 1;
    }

    return {
      deletedSeriesCount,
      deletedEpisodeCount,
    };
  }

  async function handlePermanentDelete(item: TrashItem) {
    let confirmMessage =
      "Padam item ini secara kekal? Tindakan ini tidak boleh diundur.";

    if (item.type === "series") {
      confirmMessage =
        "Padam series ini secara kekal? Semua episode di bawah series ini juga akan dipadam.";
    }

    if (item.type === "speaker") {
      confirmMessage =
        "Padam speaker ini secara kekal? Semua series dan episode berkaitan juga akan dipadam.";
    }

    const confirmed = window.confirm(confirmMessage);
    if (!confirmed) return;

    try {
      setBusyId(item.type + item.id);
      setMessage("");
      setError("");

      if (item.type === "episode") {
        await deleteDoc(doc(db, "episodes", item.id));
        await loadTrash();
        setMessage("Episode dipadam secara kekal.");
        return;
      }

      if (item.type === "series") {
        const deletedEpisodeCount = await deleteEpisodesBySeriesId(item.id);
        await deleteDoc(doc(db, "series", item.id));
        await loadTrash();
        setMessage(
          `Series dipadam secara kekal. ${deletedEpisodeCount} episode berkaitan turut dipadam.`
        );
        return;
      }

      if (item.type === "speaker") {
        const { deletedSeriesCount, deletedEpisodeCount } =
          await deleteSeriesAndEpisodesBySpeakerId(item.id);

        await deleteDoc(doc(db, "speakers", item.id));
        await loadTrash();
        setMessage(
          `Speaker dipadam secara kekal. ${deletedSeriesCount} series dan ${deletedEpisodeCount} episode berkaitan turut dipadam.`
        );
      }
    } catch (err: any) {
      setError(err?.message || "Gagal memadam item secara kekal.");
    } finally {
      setBusyId("");
    }
  }

  async function handleRestoreAll() {
    if (filteredItems.length === 0) return;

    const confirmed = window.confirm(
      `Restore semua item dalam tab ${activeFilter.toUpperCase()}?`
    );
    if (!confirmed) return;

    try {
      setRestoringAll(true);
      setMessage("");
      setError("");

      for (const item of filteredItems) {
        const collectionName =
          item.type === "speaker"
            ? "speakers"
            : item.type === "series"
            ? "series"
            : "episodes";

        await setDoc(
          doc(db, collectionName, item.id),
          {
            ...item.raw,
            isDeleted: false,
            deletedAt: null,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }

      await loadTrash();
      setMessage("Semua item berjaya dipulihkan.");
    } catch (err: any) {
      setError(err?.message || "Gagal restore semua item.");
    } finally {
      setRestoringAll(false);
    }
  }

  const filterButtons: { key: TrashType; label: string; count: number }[] = [
    { key: "all", label: "All", count: counts.all },
    { key: "speaker", label: "Speakers", count: counts.speaker },
    { key: "series", label: "Series", count: counts.series },
    { key: "episode", label: "Episodes", count: counts.episode },
  ];

  return (
    <main className="min-h-screen bg-[#0f1115] text-white flex justify-center">
      <div className="w-full max-w-md px-6 py-10 pb-32">
        <button
          onClick={() => router.push("/admin")}
          className="mb-6 text-sm text-gray-400"
        >
          ← Kembali
        </button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold">Trash</h1>
          <p className="text-sm text-gray-400 mt-2">
            Pulihkan semula data yang dipadam atau padam secara kekal.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#1f232b]/80 p-5 mb-6">
          <p className="text-sm font-semibold">Jumlah dalam Trash</p>
          <p className="text-3xl font-bold mt-2">{counts.all}</p>
          <p className="text-xs text-gray-400 mt-2">
            Speakers: {counts.speaker} • Series: {counts.series} • Episodes:{" "}
            {counts.episode}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {filterButtons.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key)}
              className={`rounded-2xl px-4 py-3 text-sm font-semibold border transition ${
                activeFilter === filter.key
                  ? "bg-[#7A1F2B] border-[#7A1F2B] text-white"
                  : "bg-[#1f232b] border-white/10 text-gray-300"
              }`}
            >
              {filter.label} ({filter.count})
            </button>
          ))}
        </div>

        <div className="mb-6">
          <button
            onClick={handleRestoreAll}
            disabled={restoringAll || filteredItems.length === 0}
            className="w-full rounded-2xl bg-[#14161b] border border-white/10 px-4 py-3 text-sm font-semibold disabled:opacity-50"
          >
            {restoringAll ? "Restoring..." : "Restore All dalam tab ini"}
          </button>
        </div>

        {message && (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200 mb-4">
            {message}
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-500/20 bg-red-950/30 px-4 py-3 text-sm text-red-200 mb-4">
            {error}
          </div>
        )}

        {loading && (
          <div className="rounded-2xl bg-[#1f232b] p-4 text-sm text-gray-300">
            Sedang memuatkan Trash...
          </div>
        )}

        {!loading && filteredItems.length === 0 && (
          <div className="rounded-2xl bg-[#1f232b] p-4 text-sm text-gray-400">
            Tiada item dalam tab ini.
          </div>
        )}

        {!loading && filteredItems.length > 0 && (
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <div
                key={item.type + item.id}
                className="bg-[#1f232b] rounded-2xl p-4"
              >
                <div>
                  <p className="font-semibold">
                    {item.name || item.title || item.id}
                  </p>

                  <p className="text-xs text-gray-500 mt-1 uppercase">
                    {item.type}
                  </p>

                  {item.description && (
                    <p className="text-xs text-gray-400 mt-2">
                      {item.description}
                    </p>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleRestore(item)}
                    disabled={busyId === item.type + item.id}
                    className="rounded-2xl bg-[#14161b] border border-white/10 px-4 py-3 text-sm font-semibold"
                  >
                    Restore
                  </button>

                  <button
                    onClick={() => handlePermanentDelete(item)}
                    disabled={busyId === item.type + item.id}
                    className="rounded-2xl bg-red-950/40 border border-red-500/20 px-4 py-3 text-sm font-semibold text-red-200"
                  >
                    Delete Forever
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}