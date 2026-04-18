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
  originalWorkTranslator?: string;
  originalWorkPublisher?: string;
  originalLanguage?: string;
  originalWorkCoverUrl?: string;
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
  const [originalTranslator, setOriginalTranslator] = useState("");
  const [originalPublisher, setOriginalPublisher] = useState("");
  const [originalLanguage, setOriginalLanguage] = useState("");

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [coverFileName, setCoverFileName] = useState("");
  const [existingCoverUrl, setExistingCoverUrl] = useState("");

  const [originalWorkCoverFile, setOriginalWorkCoverFile] = useState<File | null>(null);
  const [originalWorkCoverPreview, setOriginalWorkCoverPreview] = useState("");
  const [originalWorkCoverFileName, setOriginalWorkCoverFileName] = useState("");
  const [existingOriginalWorkCoverUrl, setExistingOriginalWorkCoverUrl] = useState("");

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
    setOriginalTranslator("");
    setOriginalPublisher("");
    setOriginalLanguage("");

    setCoverFile(null);
    setCoverPreview("");
    setCoverFileName("");
    setExistingCoverUrl("");

    setOriginalWorkCoverFile(null);
    setOriginalWorkCoverPreview("");
    setOriginalWorkCoverFileName("");
    setExistingOriginalWorkCoverUrl("");

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

      if (
        originalWorkCoverPreview &&
        originalWorkCoverPreview.startsWith("blob:")
      ) {
        URL.revokeObjectURL(originalWorkCoverPreview);
      }
    };
  }, [coverPreview, originalWorkCoverPreview]);

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
          originalWorkTranslator: docItem.data().originalWorkTranslator ?? "",
          originalWorkPublisher: docItem.data().originalWorkPublisher ?? "",
          originalLanguage: docItem.data().originalLanguage ?? "",
          originalWorkCoverUrl: docItem.data().originalWorkCoverUrl ?? "",
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

  function handleOriginalWorkCoverChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setError("Sila upload gambar dalam format JPG, PNG atau WEBP.");
      return;
    }

    setOriginalWorkCoverFile(file);
    setOriginalWorkCoverFileName(file.name);

    if (
      originalWorkCoverPreview &&
      originalWorkCoverPreview.startsWith("blob:")
    ) {
      URL.revokeObjectURL(originalWorkCoverPreview);
    }

    const previewUrl = URL.createObjectURL(file);
    setOriginalWorkCoverPreview(previewUrl);
  }

  async function uploadCover(seriesId: string) {
    if (!coverFile) return existingCoverUrl || "";

    const ext = coverFile.name.split(".").pop() || "jpg";
    const storageRef = ref(storage, `series/${seriesId}.${ext}`);

    await uploadBytes(storageRef, coverFile);
    return await getDownloadURL(storageRef);
  }

  async function uploadOriginalWorkCover(seriesId: string) {
    if (!originalWorkCoverFile) return existingOriginalWorkCoverUrl || "";

    const ext = originalWorkCoverFile.name.split(".").pop() || "jpg";
    const storageRef = ref(storage, `series-original-work/${seriesId}.${ext}`);

    await uploadBytes(storageRef, originalWorkCoverFile);
    return await getDownloadURL(storageRef);
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
    setOriginalTranslator(item.originalWorkTranslator || "");
    setOriginalPublisher(item.originalWorkPublisher || "");
    setOriginalLanguage(item.originalLanguage || "");

    setExistingCoverUrl(item.coverUrl || "");
    setCoverPreview(item.coverUrl || "");
    setCoverFile(null);
    setCoverFileName("");

    setExistingOriginalWorkCoverUrl(item.originalWorkCoverUrl || "");
    setOriginalWorkCoverPreview(item.originalWorkCoverUrl || "");
    setOriginalWorkCoverFile(null);
    setOriginalWorkCoverFileName("");

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
      setUploading(true);

      const [coverUrl, originalWorkCoverUrl] = await Promise.all([
        uploadCover(finalSlug),
        uploadOriginalWorkCover(finalSlug),
      ]);

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
          originalWorkTranslator: originalTranslator.trim(),
          originalWorkPublisher: originalPublisher.trim(),
          originalLanguage: originalLanguage.trim(),
          originalWorkCoverUrl: originalWorkCoverUrl || "",
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
      setUploading(false);
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

        <h1 className="mb-8 text-2xl font-bold">
          {editingSeriesId ? "Edit Series" : "Manage Series"}
        </h1>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl"
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
            <label className="mb-2 block text-sm text-gray-300">
              Upload Cover Series
            </label>

            <label
              htmlFor="series-cover-upload"
              className="block w-full cursor-pointer rounded-xl border border-dashed border-white/20 px-4 py-3 text-sm text-gray-300 transition hover:border-[#7A1F2B]"
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
                className="mt-3 h-40 w-full rounded-xl object-cover"
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
            value={originalTranslator}
            onChange={(e) => setOriginalTranslator(e.target.value)}
            placeholder="Penterjemah"
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

          <div className="rounded-xl bg-[#14161b] px-4 py-3">
            <label className="mb-2 block text-sm text-gray-300">
              Upload Cover Karya Asal
            </label>

            <label
              htmlFor="original-work-cover-upload"
              className="block w-full cursor-pointer rounded-xl border border-dashed border-white/20 px-4 py-3 text-sm text-gray-300 transition hover:border-[#7A1F2B]"
            >
              {originalWorkCoverFileName
                ? `Fail dipilih: ${originalWorkCoverFileName}`
                : existingOriginalWorkCoverUrl && !originalWorkCoverFile
                ? "Cover karya asal sedia ada disimpan. Tekan untuk ganti."
                : "Tekan untuk pilih gambar karya asal"}
            </label>

            <input
              id="original-work-cover-upload"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleOriginalWorkCoverChange}
              className="hidden"
            />

            {(originalWorkCoverPreview || existingOriginalWorkCoverUrl) && (
              <img
                src={originalWorkCoverPreview || existingOriginalWorkCoverUrl}
                alt="Preview Cover Karya Asal"
                className="mt-3 h-40 w-full rounded-xl object-cover"
              />
            )}
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#14161b] px-4 py-3">
            <div>
              <p className="text-sm font-medium">Status Publish</p>
            </div>

            <button
              type="button"
              onClick={() => setIsPublished(!isPublished)}
              className={`relative h-8 w-14 rounded-full transition ${
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

          {message && <p className="text-sm text-green-400">{message}</p>}
          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="grid grid-cols-2 gap-3">
            <button className="w-full rounded-xl bg-[#7A1F2B] py-3">
              {saving || uploading
                ? "Saving..."
                : editingSeriesId
                ? "Update"
                : "Simpan"}
            </button>

            <button
              type="button"
              onClick={resetForm}
              className="w-full rounded-xl border border-white/10 bg-[#1f232b] py-3"
            >
              Reset
            </button>
          </div>
        </form>

        <div className="mt-10 space-y-3">
          {loading && (
            <div className="rounded-2xl border border-white/5 bg-[#1f232b] p-4 text-sm text-gray-400">
              Memuatkan series...
            </div>
          )}

          {!loading &&
            seriesList.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-white/5 bg-[#1f232b] p-4"
              >
                <div className="flex gap-4">
                  {item.coverUrl ? (
                    <img
                      src={item.coverUrl}
                      alt={item.title}
                      className="h-20 w-20 shrink-0 rounded-xl border border-white/10 object-cover"
                    />
                  ) : (
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#14161b] px-2 text-center text-[10px] text-gray-500">
                      No Cover
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold leading-5">{item.title}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {speakerNameMap[item.speakerId] || item.speakerId}
                        </p>
                      </div>

                      <div
                        className={`whitespace-nowrap rounded-full px-2 py-1 text-[11px] ${
                          item.isPublished
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-gray-500/15 text-gray-300"
                        }`}
                      >
                        {item.isPublished ? "Publish" : "Draft"}
                      </div>
                    </div>

                    <p className="mt-2 line-clamp-2 text-xs text-gray-400">
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
                    className="rounded-2xl border border-white/10 bg-[#14161b] px-4 py-3 text-sm font-semibold"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => handleMoveToTrash(item)}
                    disabled={movingToTrashId === item.id}
                    className="rounded-2xl border border-red-500/20 bg-red-950/40 px-4 py-3 text-sm font-semibold text-red-200"
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