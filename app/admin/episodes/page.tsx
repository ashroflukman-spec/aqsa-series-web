"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "../../../lib/firebase";

type SeriesItem = {
  id: string;
  title?: string;
  speakerId?: string;
  coverUrl?: string;
  isDeleted?: boolean;
};

type EpisodeItem = {
  id: string;
  title?: string;
  slug?: string;
  description?: string;
  seriesId?: string;
  speakerId?: string;
  audioUrl?: string;
  durationSeconds?: number;
  displayOrder?: number;
  originalChapterLabel?: string;
  isPublished?: boolean;
  isDeleted?: boolean;

  shareTitle?: string;
  shareDescription?: string;
  shareNote?: string;
  shareCtaText?: string;
  shareImageUrl?: string;
  shareStatus?: "draft" | "ready";
};

type PreviewItem = {
  title: string;
  fileName: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatDuration(seconds?: number) {
  if (!seconds || seconds <= 0) return "Belum dibaca";

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function readAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const audio = document.createElement("audio");

    audio.preload = "metadata";

    audio.onloadedmetadata = () => {
      const duration = Math.round(audio.duration || 0);
      URL.revokeObjectURL(objectUrl);
      resolve(duration);
    };

    audio.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Gagal membaca durasi audio."));
    };

    audio.src = objectUrl;
  });
}

export default function AdminEpisodesPage() {
  const router = useRouter();

  const [seriesList, setSeriesList] = useState<SeriesItem[]>([]);
  const [episodes, setEpisodes] = useState<EpisodeItem[]>([]);

  const [selectedSeries, setSelectedSeries] = useState("");
  const [bulkTitles, setBulkTitles] = useState("");
  const [audioFiles, setAudioFiles] = useState<FileList | null>(null);
  const [preview, setPreview] = useState<PreviewItem[]>([]);

  const [editingEpisodeId, setEditingEpisodeId] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSeriesId, setEditSeriesId] = useState("");
  const [editDisplayOrder, setEditDisplayOrder] = useState("1");
  const [editOriginalChapterLabel, setEditOriginalChapterLabel] = useState("");
  const [editIsPublished, setEditIsPublished] = useState(true);
  const [editAudioFile, setEditAudioFile] = useState<File | null>(null);
  const [editAudioFileName, setEditAudioFileName] = useState("");
  const [editExistingAudioUrl, setEditExistingAudioUrl] = useState("");
  const [editDurationSeconds, setEditDurationSeconds] = useState(0);
  const [editShareTitle, setEditShareTitle] = useState("");
const [editShareDescription, setEditShareDescription] = useState("");
const [editShareNote, setEditShareNote] = useState("");
const [editShareCtaText, setEditShareCtaText] = useState("Dengar sekarang di Aqsa Series");
const [editShareImageUrl, setEditShareImageUrl] = useState("");
const [editShareStatus, setEditShareStatus] = useState<"draft" | "ready">("draft");
const [generatingShareCopy, setGeneratingShareCopy] = useState(false);

  const [expandedSeries, setExpandedSeries] = useState<Record<string, boolean>>(
    {}
  );
  const [searchTerm, setSearchTerm] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [movingToTrashId, setMovingToTrashId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      setLoading(true);
      setError("");

      const [seriesSnap, episodeSnap] = await Promise.all([
        getDocs(query(collection(db, "series"), orderBy("sortOrder", "asc"))),
        getDocs(query(collection(db, "episodes"), orderBy("displayOrder", "asc"))),
      ]);

      const seriesData = seriesSnap.docs
        .map((d) => ({
          id: d.id,
          ...d.data(),
        }))
        .filter((item: any) => item.isDeleted !== true);

      const episodeData = episodeSnap.docs
        .map((d) => ({
          id: d.id,
          ...d.data(),
        }))
        .filter((item: any) => item.isDeleted !== true);

      setSeriesList(seriesData as SeriesItem[]);
      setEpisodes(episodeData as EpisodeItem[]);

      const initialExpanded: Record<string, boolean> = {};
      (seriesData as SeriesItem[]).forEach((s) => {
        initialExpanded[s.id] = true;
      });
      setExpandedSeries(initialExpanded);
    } catch (err: any) {
      setError(err?.message || "Gagal memuatkan data episod.");
    } finally {
      setLoading(false);
    }
  }

  function resetBulkForm() {
    setSelectedSeries("");
    setBulkTitles("");
    setAudioFiles(null);
    setPreview([]);
  }

  function resetEditForm() {
  setEditingEpisodeId("");
  setEditTitle("");
  setEditDescription("");
  setEditSeriesId("");
  setEditDisplayOrder("1");
  setEditOriginalChapterLabel("");
  setEditIsPublished(true);
  setEditAudioFile(null);
  setEditAudioFileName("");
  setEditExistingAudioUrl("");
  setEditDurationSeconds(0);

  setEditShareTitle("");
  setEditShareDescription("");
  setEditShareNote("");
  setEditShareCtaText("Dengar sekarang di Aqsa Series");
  setEditShareImageUrl("");
  setEditShareStatus("draft");
}

  function parseTitles() {
    return bulkTitles
      .split("\n")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  }

  function generatePreview() {
    setMessage("");
    setError("");

    const titles = parseTitles();
    const files = audioFiles ? Array.from(audioFiles) : [];
    const max = Math.max(titles.length, files.length);

    const temp: PreviewItem[] = [];

    for (let i = 0; i < max; i++) {
      temp.push({
        title: titles[i] || "(Tiada tajuk)",
        fileName: files[i]?.name || "(Tiada audio)",
      });
    }

    setPreview(temp);
  }

  async function handleBulkUpload() {
    setMessage("");
    setError("");

    if (!selectedSeries) {
      setError("Sila pilih series dahulu.");
      return;
    }

    const titles = parseTitles();
    const files = audioFiles ? Array.from(audioFiles) : [];

    if (titles.length === 0) {
      setError("Sila isi sekurang-kurangnya satu tajuk episod.");
      return;
    }

    if (files.length > 0 && files.length !== titles.length) {
      setError("Jumlah audio mesti sama dengan jumlah tajuk.");
      return;
    }

    try {
      setSaving(true);

      const seriesRef = doc(db, "series", selectedSeries);
      const seriesSnap = await getDoc(seriesRef);

      if (!seriesSnap.exists()) {
        setError("Series tidak dijumpai.");
        setSaving(false);
        return;
      }

      const seriesData = seriesSnap.data();
      const speakerId = seriesData.speakerId ?? "";

      for (let i = 0; i < titles.length; i++) {
        const title = titles[i];
        let audioUrl = "";
        let durationSeconds = 0;

        if (files[i]) {
          const file = files[i];
          const ext = file.name.split(".").pop() || "mp3";
          const safeSlug = slugify(title);

          const storageRef = ref(
            storage,
            `audio/${selectedSeries}/${String(i + 1).padStart(2, "0")}-${safeSlug}.${ext}`
          );

          await uploadBytes(storageRef, file);
          audioUrl = await getDownloadURL(storageRef);
          durationSeconds = await readAudioDuration(file);
        }

        await addDoc(collection(db, "episodes"), {
  title,
  slug: slugify(title),
  description: "",
  seriesId: selectedSeries,
  speakerId,
  audioUrl,
  durationSeconds,
  displayOrder: i + 1,
  originalChapterLabel: `Bab ${i + 1}`,
  isPublished: true,
  isDeleted: false,

  shareTitle: "",
  shareDescription: "",
  shareNote: "",
  shareCtaText: "Dengar sekarang di Aqsa Series",
  shareImageUrl: "",
  shareStatus: "draft",

  deletedAt: null,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});
      }

      setMessage("Bulk upload berjaya. Episod dan audio telah disimpan.");
      resetBulkForm();
      await loadAll();
    } catch (err: any) {
      setError(err?.message || "Bulk upload gagal.");
    } finally {
      setSaving(false);
    }
  }

  async function handleMoveToTrash(item: EpisodeItem) {
    const confirmed = window.confirm("Pindahkan episode ini ke Trash?");
    if (!confirmed) return;

    try {
      setMovingToTrashId(item.id);
      setMessage("");
      setError("");

      await updateDoc(doc(db, "episodes", item.id), {
        isDeleted: true,
        deletedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setMessage("Episode dipindahkan ke Trash.");
      if (editingEpisodeId === item.id) {
        resetEditForm();
      }
      await loadAll();
    } catch (err: any) {
      setError(err?.message || "Gagal memindahkan episode ke Trash.");
    } finally {
      setMovingToTrashId("");
    }
  }

  function handleEdit(item: EpisodeItem) {
  setEditingEpisodeId(item.id);
  setEditTitle(item.title || "");
  setEditDescription(item.description || "");
  setEditSeriesId(item.seriesId || "");
  setEditDisplayOrder(String(item.displayOrder || 1));
  setEditOriginalChapterLabel(item.originalChapterLabel || "");
  setEditIsPublished(item.isPublished === true);
  setEditAudioFile(null);
  setEditAudioFileName("");
  setEditExistingAudioUrl(item.audioUrl || "");
  setEditDurationSeconds(item.durationSeconds || 0);

  setEditShareTitle(item.shareTitle || "");
  setEditShareDescription(item.shareDescription || "");
  setEditShareNote(item.shareNote || "");
  setEditShareCtaText(item.shareCtaText || "Dengar sekarang di Aqsa Series");
  setEditShareImageUrl(item.shareImageUrl || "");
  setEditShareStatus(item.shareStatus === "ready" ? "ready" : "draft");

  setMessage("");
  setError("");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

  async function handleEditAudioChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const isAudio =
      file.type.startsWith("audio/") ||
      file.name.toLowerCase().endsWith(".mp3") ||
      file.name.toLowerCase().endsWith(".m4a") ||
      file.name.toLowerCase().endsWith(".wav") ||
      file.name.toLowerCase().endsWith(".aac") ||
      file.name.toLowerCase().endsWith(".ogg");

    if (!isAudio) {
      setError("Fail yang dipilih mestilah fail audio.");
      return;
    }

    setError("");
    setEditAudioFile(file);
    setEditAudioFileName(file.name);

    try {
      const duration = await readAudioDuration(file);
      setEditDurationSeconds(duration);
    } catch (err: any) {
      setError(err?.message || "Gagal membaca durasi audio.");
    }
  }

  async function handleUpdateEpisode() {
    setMessage("");
    setError("");

    if (!editingEpisodeId) {
      setError("Tiada episode dipilih untuk diedit.");
      return;
    }

    if (!editTitle.trim()) {
      setError("Tajuk episod wajib diisi.");
      return;
    }

    if (!editSeriesId) {
      setError("Sila pilih series.");
      return;
    }

    try {
      setSavingEdit(true);

      const seriesRef = doc(db, "series", editSeriesId);
      const seriesSnap = await getDoc(seriesRef);

      if (!seriesSnap.exists()) {
        setError("Series tidak dijumpai.");
        setSavingEdit(false);
        return;
      }

      const seriesData = seriesSnap.data();
      const speakerId = seriesData.speakerId ?? "";

      let finalAudioUrl = editExistingAudioUrl || "";

      if (editAudioFile) {
        const ext = editAudioFile.name.split(".").pop() || "mp3";
        const safeSlug = slugify(editTitle);

        const storageRef = ref(
          storage,
          `audio/${editSeriesId}/${String(Number(editDisplayOrder) || 1).padStart(2, "0")}-${safeSlug}.${ext}`
        );

        await uploadBytes(storageRef, editAudioFile);
        finalAudioUrl = await getDownloadURL(storageRef);
      }

      await updateDoc(doc(db, "episodes", editingEpisodeId), {
  title: editTitle.trim(),
  slug: slugify(editTitle),
  description: editDescription.trim(),
  seriesId: editSeriesId,
  speakerId,
  audioUrl: finalAudioUrl,
  durationSeconds: editDurationSeconds || 0,
  displayOrder: Number(editDisplayOrder) || 1,
  originalChapterLabel: editOriginalChapterLabel.trim(),
  isPublished: editIsPublished,

  shareTitle: editShareTitle.trim(),
  shareDescription: editShareDescription.trim(),
  shareNote: editShareNote.trim(),
  shareCtaText: editShareCtaText.trim(),
  shareImageUrl: editShareImageUrl.trim(),
  shareStatus: editShareStatus,

  updatedAt: serverTimestamp(),
});

      setMessage("Episode berjaya dikemaskini.");
      resetEditForm();
      await loadAll();
    } catch (err: any) {
      setError(err?.message || "Gagal mengemaskini episode.");
    } finally {
      setSavingEdit(false);
    }
  }

async function handleGenerateShareCopy() {
  try {
    setGeneratingShareCopy(true);
    setMessage("");
    setError("");

    const baseTitle = editTitle.trim();
    const baseDescription = editDescription.trim();
    const seriesName =
      seriesList.find((s) => s.id === editSeriesId)?.title || "Aqsa Series";

    if (!baseTitle) {
      setError("Isi tajuk episod dahulu sebelum jana cadangan AI.");
      return;
    }

    const generatedTitle = `${baseTitle} | ${seriesName}`;

    const generatedDescription =
      baseDescription ||
      `Ikuti kupasan episod ini dalam Siri Pengetahuan Baitulmaqdis bersama Aqsa Series.`;

    const generatedNote =
      `Dengarkan episod ini dan kongsikan kepada keluarga serta sahabat agar manfaatnya terus tersebar.`;

    const generatedCta = "Dengar sekarang di Aqsa Series";

    setEditShareTitle((prev) => prev || generatedTitle);
    setEditShareDescription((prev) => prev || generatedDescription);
    setEditShareNote((prev) => prev || generatedNote);
    setEditShareCtaText((prev) => prev || generatedCta);

    setMessage("Cadangan share berjaya dijana.");
  } catch (err: any) {
    setError(err?.message || "Gagal menjana cadangan share.");
  } finally {
    setGeneratingShareCopy(false);
  }
}

  function toggleSeries(seriesId: string) {
    setExpandedSeries((prev) => ({
      ...prev,
      [seriesId]: !prev[seriesId],
    }));
  }

  const seriesTitleMap: Record<string, string> = {};
  seriesList.forEach((item) => {
    seriesTitleMap[item.id] = item.title || item.id;
  });

  const groupedEpisodes = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const groups: Record<string, EpisodeItem[]> = {};

    episodes.forEach((ep) => {
      const seriesName = seriesTitleMap[ep.seriesId || ""] || ep.seriesId || "";
      const matchesSearch =
        normalizedSearch === "" ||
        (ep.title || "").toLowerCase().includes(normalizedSearch) ||
        (ep.originalChapterLabel || "").toLowerCase().includes(normalizedSearch) ||
        seriesName.toLowerCase().includes(normalizedSearch);

      if (!matchesSearch) return;

      const key = ep.seriesId || "unknown-series";
      if (!groups[key]) groups[key] = [];
      groups[key].push(ep);
    });

    Object.keys(groups).forEach((key) => {
      groups[key] = groups[key].sort(
        (a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)
      );
    });

    return groups;
  }, [episodes, searchTerm]);

  const visibleSeries = useMemo(() => {
    return seriesList.filter((series) => groupedEpisodes[series.id]?.length > 0);
  }, [seriesList, groupedEpisodes]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0f1115] text-white flex justify-center">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-80px] left-1/2 -translate-x-1/2 w-[420px] h-[420px] rounded-full bg-[#7A1F2B] opacity-15 blur-[120px]" />
        <div className="absolute top-[260px] left-1/2 -translate-x-1/2 w-[360px] h-[360px] rounded-full bg-white/5 blur-[110px]" />
      </div>

      <div className="relative w-full max-w-md px-6 py-10 pb-32">
        <div className="mb-8">
          <button
            onClick={() => router.push("/admin")}
            className="text-sm text-gray-400 mb-4 hover:text-white"
          >
            ← Kembali ke Dashboard
          </button>

          <h1 className="text-3xl font-bold">Manage Episodes</h1>
        </div>

        <div className="mb-10 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
          <p className="font-semibold mb-4">Bulk Upload Episodes (PRO)</p>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400">Pilih Series</label>
              <select
                value={selectedSeries}
                onChange={(e) => setSelectedSeries(e.target.value)}
                className="w-full mt-2 bg-[#1f232b] border border-white/10 rounded-xl p-3"
              >
                <option value="">-- pilih series --</option>
                {seriesList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title || s.id}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-400">
                Senarai Tajuk (1 baris = 1 episod)
              </label>
              <textarea
                value={bulkTitles}
                onChange={(e) => setBulkTitles(e.target.value)}
                placeholder={`Bab 1 - Mukadimah
Bab 2 - Kedudukan Al-Aqsa
Bab 3 - Strategi Pembebasan`}
                className="w-full mt-2 h-40 bg-[#1f232b] border border-white/10 rounded-xl p-3"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400">
                Upload Audio (jumlah mesti sama dengan tajuk)
              </label>
              <input
                type="file"
                multiple
                accept="audio/*"
                onChange={(e) => setAudioFiles(e.target.files)}
                className="w-full mt-2"
              />
            </div>

            <button
              onClick={generatePreview}
              type="button"
              className="w-full bg-gray-700 hover:bg-gray-600 rounded-xl p-3"
            >
              Preview Pairing
            </button>

            {preview.length > 0 && (
              <div className="bg-[#1f232b] rounded-xl p-4 space-y-2">
                <p className="text-sm text-gray-400 mb-2">Preview:</p>

                {preview.map((item, i) => (
                  <div
                    key={i}
                    className="text-sm flex justify-between gap-4 border-b border-white/10 pb-2"
                  >
                    <span className="flex-1">{item.title}</span>
                    <span className="text-gray-400 text-xs text-right">
                      {item.fileName}
                    </span>
                  </div>
                ))}
              </div>
            )}

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

            <button
              onClick={handleBulkUpload}
              disabled={saving}
              className="w-full bg-red-600 hover:bg-red-700 rounded-xl p-4 font-semibold disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Episodes"}
            </button>
          </div>
        </div>

        {editingEpisodeId && (
          <div className="mb-10 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
            <p className="font-semibold mb-4">Edit Episode</p>

            <div className="space-y-4">
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Tajuk Episod"
                className="w-full rounded-xl bg-[#14161b] px-4 py-3"
              />

              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Description"
                className="w-full rounded-xl bg-[#14161b] px-4 py-3"
              />

              <div className="rounded-2xl border border-white/10 bg-[#14161b] p-4 space-y-4">
  <div className="flex items-center justify-between">
    <p className="text-sm font-semibold text-white">Share Settings</p>

    <button
      type="button"
      onClick={handleGenerateShareCopy}
      disabled={generatingShareCopy}
      className="rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/10 px-3 py-2 text-xs font-semibold text-[#E8D28A] disabled:opacity-60"
    >
      {generatingShareCopy ? "Menjana..." : "Jana Cadangan AI"}
    </button>
  </div>

  <input
    value={editShareTitle}
    onChange={(e) => setEditShareTitle(e.target.value)}
    placeholder="Share Title"
    className="w-full rounded-xl bg-[#0f1115] px-4 py-3"
  />

  <textarea
    value={editShareDescription}
    onChange={(e) => setEditShareDescription(e.target.value)}
    placeholder="Share Description"
    className="w-full rounded-xl bg-[#0f1115] px-4 py-3"
  />

  <textarea
    value={editShareNote}
    onChange={(e) => setEditShareNote(e.target.value)}
    placeholder="Share Note"
    className="w-full rounded-xl bg-[#0f1115] px-4 py-3"
  />

  <input
    value={editShareCtaText}
    onChange={(e) => setEditShareCtaText(e.target.value)}
    placeholder="CTA Text"
    className="w-full rounded-xl bg-[#0f1115] px-4 py-3"
  />

  <input
    value={editShareImageUrl}
    onChange={(e) => setEditShareImageUrl(e.target.value)}
    placeholder="Share Image URL (optional)"
    className="w-full rounded-xl bg-[#0f1115] px-4 py-3"
  />

  <div className="rounded-2xl bg-[#0f1115] border border-white/10 px-4 py-3 flex items-center justify-between">
    <div>
      <p className="text-sm font-medium">Share Status</p>
      <p className="text-xs text-gray-400 mt-1">
        Draft atau sedia digunakan untuk share
      </p>
    </div>

    <button
      type="button"
      onClick={() =>
        setEditShareStatus((prev) => (prev === "ready" ? "draft" : "ready"))
      }
      className={`w-14 h-8 rounded-full relative transition ${
        editShareStatus === "ready" ? "bg-[#D4AF37]" : "bg-gray-600"
      }`}
    >
      <span
        className={`absolute top-1 h-6 w-6 rounded-full bg-white transition ${
          editShareStatus === "ready" ? "left-7" : "left-1"
        }`}
      />
    </button>
  </div>
</div>

              <select
                value={editSeriesId}
                onChange={(e) => setEditSeriesId(e.target.value)}
                className="w-full rounded-xl bg-[#14161b] px-4 py-3"
              >
                <option value="">-- pilih series --</option>
                {seriesList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title || s.id}
                  </option>
                ))}
              </select>

              <input
                value={editDisplayOrder}
                onChange={(e) => setEditDisplayOrder(e.target.value)}
                placeholder="Display Order"
                className="w-full rounded-xl bg-[#14161b] px-4 py-3"
              />

              <input
                value={editOriginalChapterLabel}
                onChange={(e) => setEditOriginalChapterLabel(e.target.value)}
                placeholder="Label Bab Asal"
                className="w-full rounded-xl bg-[#14161b] px-4 py-3"
              />

              <div>
                <label className="text-sm text-gray-400">Ganti Audio</label>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleEditAudioChange}
                  className="w-full mt-2"
                />
                {editAudioFileName && (
                  <p className="text-xs text-gray-400 mt-2">
                    Fail dipilih: {editAudioFileName}
                  </p>
                )}
                {!editAudioFileName && editExistingAudioUrl && (
                  <p className="text-xs text-gray-500 mt-2">
                    Audio sedia ada akan dikekalkan jika tiada fail baru dipilih.
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Durasi: {formatDuration(editDurationSeconds)}
                </p>
              </div>

              <div className="rounded-2xl bg-[#14161b] border border-white/10 px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Status Publish</p>
                </div>

                <button
                  type="button"
                  onClick={() => setEditIsPublished(!editIsPublished)}
                  className={`w-14 h-8 rounded-full relative transition ${
                    editIsPublished ? "bg-[#7A1F2B]" : "bg-gray-600"
                  }`}
                >
                  <span
                    className={`absolute top-1 h-6 w-6 rounded-full bg-white transition ${
                      editIsPublished ? "left-7" : "left-1"
                    }`}
                  />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleUpdateEpisode}
                  disabled={savingEdit}
                  className="w-full bg-[#7A1F2B] rounded-xl py-3 font-semibold disabled:opacity-60"
                >
                  {savingEdit ? "Saving..." : "Update Episode"}
                </button>

                <button
                  type="button"
                  onClick={resetEditForm}
                  className="w-full bg-[#1f232b] border border-white/10 rounded-xl py-3"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mb-5">
          <p className="text-lg font-semibold mb-3">Senarai Episodes Mengikut Series</p>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari tajuk episod, label bab, atau nama series..."
            className="w-full rounded-2xl bg-[#1f232b] border border-white/10 px-4 py-3 text-sm text-white placeholder:text-gray-500"
          />
        </div>

        {loading && (
          <div className="rounded-2xl bg-[#1f232b] p-4 text-sm text-gray-300">
            Memuatkan episod...
          </div>
        )}

        {!loading && visibleSeries.length === 0 && (
          <div className="rounded-2xl bg-[#1f232b] p-4 text-sm text-gray-400">
            Tiada episod dijumpai.
          </div>
        )}

        {!loading && visibleSeries.length > 0 && (
          <div className="space-y-6">
            {visibleSeries.map((series) => {
              const seriesEpisodes = groupedEpisodes[series.id] || [];
              const isOpen = expandedSeries[series.id] ?? true;

              return (
                <div
                  key={series.id}
                  className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
                >
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute -top-10 left-8 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
                    <div className="absolute top-0 right-0 h-20 w-28 bg-gradient-to-bl from-white/10 to-transparent blur-xl" />
                    <div className="absolute bottom-0 left-0 right-0 h-px bg-white/20" />
                  </div>

                  <button
                    onClick={() => toggleSeries(series.id)}
                    className="relative w-full p-4 text-left"
                  >
                    <div className="flex items-center gap-4">
                      {series.coverUrl ? (
                        <img
                          src={series.coverUrl}
                          alt={series.title || series.id}
                          className="h-16 w-16 rounded-2xl object-cover border border-white/15 shadow-lg"
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-2xl border border-white/15 bg-white/5 flex items-center justify-center text-[10px] text-gray-400 text-center px-2">
                          No Cover
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="text-base font-semibold truncate">
                          {series.title || series.id}
                        </p>
                        <p className="text-xs text-gray-300 mt-1">
                          {seriesEpisodes.length} episod
                        </p>
                      </div>

                      <div className="text-sm text-gray-300">
                        {isOpen ? "▲" : "▼"}
                      </div>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="relative px-4 pb-4 space-y-3">
                      {seriesEpisodes.map((ep) => (
                        <div
                          key={ep.id}
                          className="bg-[#1b1f27]/85 border border-white/5 p-4 rounded-2xl"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <p className="text-sm font-semibold">{ep.title}</p>
                              <p className="text-xs text-gray-400 mt-1">
                                {ep.originalChapterLabel || "Episod"}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-500">
                                <span>Order: {ep.displayOrder || 1}</span>
                                <span>•</span>
                                <span>{ep.audioUrl ? "Audio uploaded" : "Tiada audio"}</span>
                                <span>•</span>
                                <span>{formatDuration(ep.durationSeconds)}</span>
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-2">
  <div
    className={`text-[11px] px-2 py-1 rounded-full whitespace-nowrap ${
      ep.isPublished
        ? "bg-emerald-500/15 text-emerald-300"
        : "bg-gray-500/15 text-gray-300"
    }`}
  >
    {ep.isPublished ? "Publish" : "Draft"}
  </div>

  <div
    className={`text-[11px] px-2 py-1 rounded-full whitespace-nowrap ${
      ep.shareStatus === "ready"
        ? "bg-[#D4AF37]/15 text-[#E8D28A]"
        : "bg-white/10 text-white/55"
    }`}
  >
    {ep.shareStatus === "ready" ? "Share Ready" : "Share Draft"}
  </div>
</div>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <button
                              onClick={() => handleEdit(ep)}
                              className="rounded-xl bg-[#14161b] border border-white/10 px-4 py-2 text-sm font-semibold"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => handleMoveToTrash(ep)}
                              disabled={movingToTrashId === ep.id}
                              className="rounded-xl bg-red-950/40 border border-red-500/20 px-4 py-2 text-sm font-semibold text-red-200 disabled:opacity-60"
                            >
                              {movingToTrashId === ep.id ? "Moving..." : "Delete"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}