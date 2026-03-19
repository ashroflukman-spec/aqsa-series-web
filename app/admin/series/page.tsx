"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "../../../lib/firebase";

type SpeakerItem = {
  id: string;
  name: string;
};

type SeriesItem = {
  id: string;
  title: string;
  speakerId: string;
  description: string;
  coverUrl: string;
  sortOrder: number;
  isPublished: boolean;
  originalWorkTitle?: string;
  originalWorkAuthor?: string;
  originalWorkPublisher?: string;
  originalLanguage?: string;
  isDeleted?: boolean;
};

type EpisodeCountMap = Record<string, number>;

export default function AdminSeriesPage() {
  const router = useRouter();

  const [speakers, setSpeakers] = useState<SpeakerItem[]>([]);
  const [seriesList, setSeriesList] = useState<SeriesItem[]>([]);
  const [episodeCountMap, setEpisodeCountMap] = useState<EpisodeCountMap>({});

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [speakerId, setSpeakerId] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState("1");
  const [isPublished, setIsPublished] = useState(true);

  const [originalTitle, setOriginalTitle] = useState("");
  const [originalAuthor, setOriginalAuthor] = useState("");
  const [originalPublisher, setOriginalPublisher] = useState("");
  const [originalLanguage, setOriginalLanguage] = useState("");

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [coverFileName, setCoverFileName] = useState("");
  const [existingCoverUrl, setExistingCoverUrl] = useState("");

  const [editingSeriesId, setEditingSeriesId] = useState("");
  const [movingToTrashId, setMovingToTrashId] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function slugify(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/['"]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function resetForm() {
    setEditingSeriesId("");
    setTitle("");
    setSlug("");
    setDescription("");
    setSortOrder("1");
    setIsPublished(true);
    setOriginalTitle("");
    setOriginalAuthor("");
    setOriginalPublisher("");
    setOriginalLanguage("");
    setCoverFile(null);
    setCoverPreview("");
    setCoverFileName("");
    setExistingCoverUrl("");
    setMessage("");
    setError("");
  }

  useEffect(() => {
    if (!title) return;
    setSlug(slugify(title));
  }, [title]);

  useEffect(() => {
    return () => {
      if (coverPreview && coverPreview.startsWith("blob:")) {
        URL.revokeObjectURL(coverPreview);
      }
    };
  }, [coverPreview]);

  async function loadData() {
    try {
      setLoading(true);

      const [speakersSnapshot, seriesSnapshot, episodesSnapshot] =
        await Promise.all([
          getDocs(collection(db, "speakers")),
          getDocs(query(collection(db, "series"), orderBy("sortOrder", "asc"))),
          getDocs(collection(db, "episodes")),
        ]);

      const speakerData: SpeakerItem[] = speakersSnapshot.docs
        .map((docItem) => ({
          id: docItem.id,
          name: docItem.data().name ?? "",
        }))
        .filter((item) => item.name);

      setSpeakers(speakerData);

      if (speakerData.length > 0 && !speakerId) {
        setSpeakerId(speakerData[0].id);
      }

      const seriesData: SeriesItem[] = seriesSnapshot.docs
        .map((docItem) => ({
          id: docItem.id,
          title: docItem.data().title ?? "",
          speakerId: docItem.data().speakerId ?? "",
          description: docItem.data().description ?? "",
          coverUrl: docItem.data().coverUrl ?? "",
          sortOrder: docItem.data().sortOrder ?? 0,
          isPublished: docItem.data().isPublished ?? false,
          originalWorkTitle: docItem.data().originalWorkTitle ?? "",
          originalWorkAuthor: docItem.data().originalWorkAuthor ?? "",
          originalWorkPublisher: docItem.data().originalWorkPublisher ?? "",
          originalLanguage: docItem.data().originalLanguage ?? "",
          isDeleted: docItem.data().isDeleted ?? false,
        }))
        .filter((item) => item.isDeleted !== true);

      setSeriesList(seriesData);

      const counts: EpisodeCountMap = {};

      episodesSnapshot.docs.forEach((docItem) => {
        const data = docItem.data();
        const seriesId = data.seriesId ?? "";
        const isDeleted = data.isDeleted ?? false;

        if (!seriesId || isDeleted === true) return;

        counts[seriesId] = (counts[seriesId] || 0) + 1;
      });

      setEpisodeCountMap(counts);
    } catch (err: any) {
      setError(err?.message || "Gagal memuatkan data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setError("Sila upload gambar dalam format JPG, PNG atau WEBP.");
      return;
    }

    setCoverFile(file);
    setCoverFileName(file.name);

    if (coverPreview && coverPreview.startsWith("blob:")) {
      URL.revokeObjectURL(coverPreview);
    }

    const previewUrl = URL.createObjectURL(file);
    setCoverPreview(previewUrl);
  }

  async function uploadCover(seriesId: string) {
    if (!coverFile) return existingCoverUrl || "";

    setUploading(true);
    try {
      const ext = coverFile.name.split(".").pop() || "jpg";
      const storageRef = ref(storage, `series/${seriesId}.${ext}`);

      await uploadBytes(storageRef, coverFile);
      return await getDownloadURL(storageRef);
    } finally {
      setUploading(false);
    }
  }

  function handleEdit(item: SeriesItem) {
    setEditingSeriesId(item.id);
    setTitle(item.title);
    setSlug(item.id);
    setSpeakerId(item.speakerId);
    setDescription(item.description);
    setSortOrder(String(item.sortOrder || 1));
    setIsPublished(item.isPublished);
    setOriginalTitle(item.originalWorkTitle || "");
    setOriginalAuthor(item.originalWorkAuthor || "");
    setOriginalPublisher(item.originalWorkPublisher || "");
    setOriginalLanguage(item.originalLanguage || "");
    setExistingCoverUrl(item.coverUrl || "");
    setCoverPreview(item.coverUrl || "");
    setCoverFile(null);
    setCoverFileName("");
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleMoveToTrash(item: SeriesItem) {
    const confirmed = window.confirm("Pindahkan series ini ke Trash?");
    if (!confirmed) return;

    try {
      setMovingToTrashId(item.id);
      setMessage("");
      setError("");

      await setDoc(
        doc(db, "series", item.id),
        {
          ...item,
          isDeleted: true,
          deletedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      if (editingSeriesId === item.id) {
        resetForm();
      }

      await loadData();
      setMessage("Series dipindahkan ke Trash.");
    } catch (err: any) {
      setError(err?.message || "Gagal memindahkan series ke Trash.");
    } finally {
      setMovingToTrashId("");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setMessage("");
    setError("");

    const finalSlug = slugify(slug || title);

    if (!title.trim()) {
      setError("Tajuk series wajib diisi.");
      return;
    }

    if (!speakerId) {
      setError("Sila pilih speaker.");
      return;
    }

    try {
      setSaving(true);

      const coverUrl = await uploadCover(finalSlug);

      await setDoc(
        doc(db, "series", finalSlug),
        {
          title: title.trim(),
          slug: finalSlug,
          speakerId,
          description: description.trim(),
          coverUrl: coverUrl || "",
          sortOrder: Number(sortOrder) || 1,
          isPublished,
          originalWorkTitle: originalTitle.trim(),
          originalWorkAuthor: originalAuthor.trim(),
          originalWorkPublisher: originalPublisher.trim(),
          originalLanguage: originalLanguage.trim(),
          isDeleted: false,
          deletedAt: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setMessage(
        editingSeriesId
          ? "Series berjaya dikemaskini."
          : "Series berjaya disimpan."
      );

      resetForm();
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Gagal menyimpan series.");
    } finally {
      setSaving(false);
    }
  }

  const speakerNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    speakers.forEach((speaker) => {
      map[speaker.id] = speaker.name;
    });
    return map;
  }, [speakers]);

  return (
    <main className="min-h-screen bg-[#0f1115] text-white flex justify-center">
      <div className="w-full max-w-md px-6 py-10 pb-32">
        <button
          onClick={() => router.push("/admin")}
          className="mb-6 text-sm text-gray-400"
        >
          ← Kembali
        </button>

        <h1 className="text-2xl font-bold mb-8">
          {editingSeriesId ? "Edit Series" : "Manage Series"}
        </h1>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 space-y-4"
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tajuk Series"
            className="w-full rounded-xl bg-[#14161b] px-4 py-3"
          />

          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="Slug"
            className="w-full rounded-xl bg-[#14161b] px-4 py-3"
          />

          <select
            value={speakerId}
            onChange={(e) => setSpeakerId(e.target.value)}
            className="w-full rounded-xl bg-[#14161b] px-4 py-3"
          >
            {speakers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            className="w-full rounded-xl bg-[#14161b] px-4 py-3"
          />

          <input
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            placeholder="Sort Order"
            className="w-full rounded-xl bg-[#14161b] px-4 py-3"
          />

          <div className="rounded-xl bg-[#14161b] px-4 py-3">
            <label className="block text-sm text-gray-300 mb-2">
              Upload Cover
            </label>

            <label
              htmlFor="series-cover-upload"
              className="block w-full rounded-xl border border-dashed border-white/20 px-4 py-3 text-sm text-gray-300 cursor-pointer hover:border-[#7A1F2B] transition"
            >
              {coverFileName
                ? `Fail dipilih: ${coverFileName}`
                : existingCoverUrl && !coverFile
                ? "Cover sedia ada disimpan. Tekan untuk ganti cover."
                : "Tekan untuk pilih gambar cover"}
            </label>

            <input
              id="series-cover-upload"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleCoverChange}
              className="hidden"
            />

            {(coverPreview || existingCoverUrl) && (
              <img
                src={coverPreview || existingCoverUrl}
                alt="Preview Cover"
                className="w-full h-40 object-cover rounded-xl mt-3"
              />
            )}
          </div>

          <input
            value={originalTitle}
            onChange={(e) => setOriginalTitle(e.target.value)}
            placeholder="Judul Karya Asal"
            className="w-full rounded-xl bg-[#14161b] px-4 py-3"
          />

          <input
            value={originalAuthor}
            onChange={(e) => setOriginalAuthor(e.target.value)}
            placeholder="Penulis Asal"
            className="w-full rounded-xl bg-[#14161b] px-4 py-3"
          />

          <input
            value={originalPublisher}
            onChange={(e) => setOriginalPublisher(e.target.value)}
            placeholder="Penerbit"
            className="w-full rounded-xl bg-[#14161b] px-4 py-3"
          />

          <input
            value={originalLanguage}
            onChange={(e) => setOriginalLanguage(e.target.value)}
            placeholder="Bahasa Asal"
            className="w-full rounded-xl bg-[#14161b] px-4 py-3"
          />

          <div className="rounded-2xl bg-[#14161b] border border-white/10 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Status Publish</p>
            </div>

            <button
              type="button"
              onClick={() => setIsPublished(!isPublished)}
              className={`w-14 h-8 rounded-full relative transition ${
                isPublished ? "bg-[#7A1F2B]" : "bg-gray-600"
              }`}
            >
              <span
                className={`absolute top-1 h-6 w-6 rounded-full bg-white transition ${
                  isPublished ? "left-7" : "left-1"
                }`}
              />
            </button>
          </div>

          {message && <p className="text-green-400 text-sm">{message}</p>}
          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="grid grid-cols-2 gap-3">
            <button className="w-full bg-[#7A1F2B] rounded-xl py-3">
              {saving || uploading
                ? "Saving..."
                : editingSeriesId
                ? "Update"
                : "Simpan"}
            </button>

            <button
              type="button"
              onClick={resetForm}
              className="w-full bg-[#1f232b] border border-white/10 rounded-xl py-3"
            >
              Reset
            </button>
          </div>
        </form>

        <div className="mt-10 space-y-3">
          {seriesList.map((item) => (
            <div
              key={item.id}
              className="bg-[#1f232b] rounded-2xl p-4 border border-white/5"
            >
              <div className="flex gap-4">
                {item.coverUrl ? (
                  <img
                    src={item.coverUrl}
                    alt={item.title}
                    className="w-20 h-20 rounded-xl object-cover shrink-0 border border-white/10"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-xl shrink-0 bg-[#14161b] border border-white/10 flex items-center justify-center text-[10px] text-gray-500 text-center px-2">
                    No Cover
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold leading-5">{item.title}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {speakerNameMap[item.speakerId] || item.speakerId}
                      </p>
                    </div>

                    <div
                      className={`text-[11px] px-2 py-1 rounded-full whitespace-nowrap ${
                        item.isPublished
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-gray-500/15 text-gray-300"
                      }`}
                    >
                      {item.isPublished ? "Publish" : "Draft"}
                    </div>
                  </div>

                  <p className="text-xs text-gray-400 mt-2 line-clamp-2">
                    {item.description || "Tiada description"}
                  </p>

                  <div className="mt-3 flex items-center gap-3 text-[11px] text-gray-500">
                    <span>{episodeCountMap[item.id] || 0} episode</span>
                    <span>•</span>
                    <span>Sort: {item.sortOrder || 1}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleEdit(item)}
                  className="rounded-2xl bg-[#14161b] border border-white/10 px-4 py-3 text-sm font-semibold"
                >
                  Edit
                </button>

                <button
                  onClick={() => handleMoveToTrash(item)}
                  disabled={movingToTrashId === item.id}
                  className="rounded-2xl bg-red-950/40 border border-red-500/20 px-4 py-3 text-sm font-semibold text-red-200"
                >
                  {movingToTrashId === item.id ? "Moving..." : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}