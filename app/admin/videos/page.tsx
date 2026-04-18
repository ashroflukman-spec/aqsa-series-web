"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";
import AdminGuard from "../../../components/AdminGuard";

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

export default function AdminVideosPage() {
  const router = useRouter();

  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [editingId, setEditingId] = useState("");

  const [title, setTitle] = useState("");
  const [speaker, setSpeaker] = useState("");
  const [category, setCategory] = useState("Tadabbur");
  const [youtubeUrl, setYouTubeUrl] = useState("");
  const [youtubeId, setYouTubeId] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState("1");
  const [isPublished, setIsPublished] = useState(true);

  useEffect(() => {
    loadVideos();
  }, []);

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
        .filter((item) => item.isDeleted !== true);

      setVideos(data);
    } catch (err: any) {
      setError(err?.message || "Gagal memuatkan senarai video.");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setEditingId("");
    setTitle("");
    setSpeaker("");
    setCategory("Tadabbur");
    setYouTubeUrl("");
    setYouTubeId("");
    setDescription("");
    setSortOrder("1");
    setIsPublished(true);
  }

  async function handleSave() {
    try {
      setSaving(true);
      setMessage("");
      setError("");

      if (!title.trim()) {
        setError("Tajuk video wajib diisi.");
        return;
      }

      if (!speaker.trim()) {
        setError("Nama penyampai wajib diisi.");
        return;
      }

      if (!youtubeUrl.trim()) {
        setError("URL YouTube wajib diisi.");
        return;
      }

      const finalYoutubeId = youtubeId.trim() || extractYouTubeId(youtubeUrl.trim());

      if (!finalYoutubeId) {
        setError("YouTube ID tidak dapat dikesan. Sila semak URL YouTube.");
        return;
      }

      const payload = {
        title: title.trim(),
        speaker: speaker.trim(),
        category: category.trim(),
        youtubeUrl: youtubeUrl.trim(),
        youtubeId: finalYoutubeId,
        description: description.trim(),
        thumbnailUrl: getYouTubeThumbnail(finalYoutubeId),
        sortOrder: Number(sortOrder) || 1,
        isPublished,
        isDeleted: false,
        updatedAt: serverTimestamp(),
      };

      if (editingId) {
        await updateDoc(doc(db, "videos", editingId), payload);
        setMessage("Video berjaya dikemaskini.");
      } else {
        await addDoc(collection(db, "videos"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        setMessage("Video baru berjaya ditambah.");
      }

      resetForm();
      await loadVideos();
    } catch (err: any) {
      setError(err?.message || "Gagal menyimpan video.");
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(video: VideoItem) {
    setEditingId(video.id);
    setTitle(video.title || "");
    setSpeaker(video.speaker || "");
    setCategory(video.category || "Umum");
    setYouTubeUrl(video.youtubeUrl || "");
    setYouTubeId(video.youtubeId || "");
    setDescription(video.description || "");
    setSortOrder(String(video.sortOrder || 1));
    setIsPublished(video.isPublished === true);
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSoftDelete(videoId: string) {
    const confirmed = window.confirm("Pindahkan video ini ke Trash?");
    if (!confirmed) return;

    try {
      setMessage("");
      setError("");

      await updateDoc(doc(db, "videos", videoId), {
        isDeleted: true,
        deletedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setMessage("Video dipindahkan ke Trash.");
      await loadVideos();
    } catch (err: any) {
      setError(err?.message || "Gagal memindahkan video ke Trash.");
    }
  }

  async function handleTogglePublish(video: VideoItem) {
    try {
      setMessage("");
      setError("");

      await updateDoc(doc(db, "videos", video.id), {
        isPublished: !video.isPublished,
        updatedAt: serverTimestamp(),
      });

      setMessage(
        !video.isPublished
          ? "Video berjaya dipublish."
          : "Video berjaya dijadikan draft."
      );

      await loadVideos();
    } catch (err: any) {
      setError(err?.message || "Gagal menukar status publish.");
    }
  }

  const filteredVideos = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return videos.filter((video) => {
      return (
        normalized === "" ||
        video.title.toLowerCase().includes(normalized) ||
        video.speaker.toLowerCase().includes(normalized) ||
        video.category.toLowerCase().includes(normalized)
      );
    });
  }, [videos, search]);

  return (
    <AdminGuard>
      <main className="relative min-h-screen overflow-hidden bg-[#0f1115] text-white flex justify-center">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-80px] left-1/2 -translate-x-1/2 w-[420px] h-[420px] rounded-full bg-[#7A1F2B] opacity-15 blur-[120px]" />
          <div className="absolute top-[240px] left-1/2 -translate-x-1/2 w-[320px] h-[320px] rounded-full bg-white/5 blur-[100px]" />
        </div>

        <div className="relative w-full max-w-md px-6 py-10 pb-32">
          <button
            onClick={() => router.push("/admin")}
            className="mb-6 text-sm text-gray-400"
          >
            ← Kembali ke Dashboard
          </button>

          <div className="mb-8">
            <h1 className="text-3xl font-bold">Manage Videos</h1>
            <p className="mt-2 text-sm text-gray-400">
              Urus video YouTube untuk Video Library Aqsa Series
            </p>
          </div>

          <div className="mb-8 rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <p className="mb-4 text-base font-semibold">
              {editingId ? "Edit Video" : "Tambah Video Baru"}
            </p>

            <div className="space-y-4">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Tajuk video"
                className="w-full rounded-2xl border border-white/10 bg-[#16191f] px-4 py-3 text-sm text-white outline-none"
              />

              <input
                value={speaker}
                onChange={(e) => setSpeaker(e.target.value)}
                placeholder="Nama penyampai"
                className="w-full rounded-2xl border border-white/10 bg-[#16191f] px-4 py-3 text-sm text-white outline-none"
              />

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-[#16191f] px-4 py-3 text-sm text-white outline-none"
              >
                {VIDEO_CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <input
                value={youtubeUrl}
                onChange={(e) => {
                  const value = e.target.value;
                  setYouTubeUrl(value);
                  if (!youtubeId.trim()) {
                    setYouTubeId(extractYouTubeId(value));
                  }
                }}
                placeholder="URL YouTube"
                className="w-full rounded-2xl border border-white/10 bg-[#16191f] px-4 py-3 text-sm text-white outline-none"
              />

              <input
                value={youtubeId}
                onChange={(e) => setYouTubeId(e.target.value)}
                placeholder="YouTube ID"
                className="w-full rounded-2xl border border-white/10 bg-[#16191f] px-4 py-3 text-sm text-white outline-none"
              />

              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description ringkas"
                className="w-full rounded-2xl border border-white/10 bg-[#16191f] px-4 py-3 text-sm text-white outline-none min-h-[110px]"
              />

              <input
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                placeholder="Sort Order"
                className="w-full rounded-2xl border border-white/10 bg-[#16191f] px-4 py-3 text-sm text-white outline-none"
              />

              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#16191f] px-4 py-3">
                <span className="text-sm text-white">Publish</span>
                <button
                  type="button"
                  onClick={() => setIsPublished((prev) => !prev)}
                  className={`relative h-7 w-12 rounded-full transition ${
                    isPublished ? "bg-[#7A1F2B]" : "bg-white/15"
                  }`}
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                      isPublished ? "left-6" : "left-1"
                    }`}
                  />
                </button>
              </div>

              {message && (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">
                  {message}
                </div>
              )}

              {error && (
                <div className="rounded-2xl border border-red-500/20 bg-red-950/30 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-2xl bg-[#7A1F2B] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editingId
                    ? "Update Video"
                    : "Save Video"}
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white/85"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          <div className="mb-5">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari video, penyampai atau kategori..."
              className="w-full rounded-full border border-white/10 bg-[#16191f] px-5 py-3.5 text-sm text-white shadow-inner outline-none placeholder:text-gray-500"
            />
          </div>

          {loading && (
            <div className="rounded-2xl bg-[#1f232b] p-5 text-sm text-gray-300">
              Sedang memuatkan video...
            </div>
          )}

          {!loading && filteredVideos.length === 0 && (
            <div className="rounded-2xl bg-[#1f232b] p-5 text-sm text-gray-400">
              Tiada video dijumpai.
            </div>
          )}

          {!loading && filteredVideos.length > 0 && (
            <div className="space-y-4">
              {filteredVideos.map((video) => (
                <div
                  key={video.id}
                  className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.04] shadow-[0_14px_30px_rgba(0,0,0,0.18)]"
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
                          No Thumbnail
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#E8D28A]">
                          {video.category}
                        </span>

                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                            video.isPublished
                              ? "bg-emerald-500/15 text-emerald-300"
                              : "bg-white/10 text-white/60"
                          }`}
                        >
                          {video.isPublished ? "Published" : "Draft"}
                        </span>
                      </div>

                      <p className="mt-3 line-clamp-2 text-[15px] font-semibold leading-[1.35] text-white">
                        {video.title}
                      </p>

                      <p className="mt-2 text-sm text-white/45">
                        {video.speaker}
                      </p>

                      <p className="mt-2 text-xs text-white/35">
                        Sort Order: {video.sortOrder}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 border-t border-white/10 px-4 py-3">
                    <button
                      onClick={() => handleEdit(video)}
                      className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => handleTogglePublish(video)}
                      className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white"
                    >
                      {video.isPublished ? "Draft" : "Publish"}
                    </button>

                    <button
                      onClick={() => handleSoftDelete(video.id)}
                      className="rounded-xl border border-red-500/20 bg-red-950/30 px-3 py-2 text-xs font-semibold text-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </AdminGuard>
  );
}