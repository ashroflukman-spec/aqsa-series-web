"use client";

import { useEffect, useState } from "react";
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
  slug: string;
  bio: string;
  photoUrl: string;
  isActive: boolean;
  sortOrder: number;
  isDeleted?: boolean;
};

export default function AdminSpeakersPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [bio, setBio] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState("1");

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [existingPhotoUrl, setExistingPhotoUrl] = useState("");

  const [editingSpeakerId, setEditingSpeakerId] = useState("");
  const [movingToTrashId, setMovingToTrashId] = useState("");

  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [speakers, setSpeakers] = useState<SpeakerItem[]>([]);

  function slugify(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/['"]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function resetForm() {
    setEditingSpeakerId("");
    setName("");
    setSlug("");
    setBio("");
    setIsActive(true);
    setSortOrder("1");
    setPhotoFile(null);
    setPhotoPreview("");
    setExistingPhotoUrl("");
    setMessage("");
    setError("");
  }

  useEffect(() => {
    if (!name) return;
    if (!editingSpeakerId) {
      setSlug(slugify(name));
    }
  }, [name, editingSpeakerId]);

  useEffect(() => {
    return () => {
      if (photoPreview && photoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  async function loadSpeakers() {
    try {
      setLoading(true);

      const q = query(collection(db, "speakers"), orderBy("sortOrder", "asc"));
      const snapshot = await getDocs(q);

      const data: SpeakerItem[] = snapshot.docs
        .map((docItem) => ({
          id: docItem.id,
          name: docItem.data().name ?? "",
          slug: docItem.data().slug ?? "",
          bio: docItem.data().bio ?? "",
          photoUrl: docItem.data().photoUrl ?? "",
          isActive: docItem.data().isActive ?? false,
          sortOrder: docItem.data().sortOrder ?? 0,
          isDeleted: docItem.data().isDeleted ?? false,
        }))
        .filter((item) => item.isDeleted !== true);

      setSpeakers(data);
    } catch (err: any) {
      setError(err?.message || "Gagal memuatkan speaker.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSpeakers();
  }, []);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setError("Sila upload gambar dalam format JPG, PNG atau WEBP.");
      return;
    }

    setError("");
    setPhotoFile(file);

    if (photoPreview && photoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
    }

    const previewUrl = URL.createObjectURL(file);
    setPhotoPreview(previewUrl);
  }

  async function uploadSpeakerPhoto(finalSlug: string) {
    if (!photoFile) return existingPhotoUrl || "";

    setUploadingPhoto(true);
    try {
      const fileExtension = photoFile.name.split(".").pop() || "jpg";
      const storageRef = ref(storage, `speakers/${finalSlug}.${fileExtension}`);

      await uploadBytes(storageRef, photoFile);
      return await getDownloadURL(storageRef);
    } finally {
      setUploadingPhoto(false);
    }
  }

  function handleEdit(item: SpeakerItem) {
    setEditingSpeakerId(item.id);
    setName(item.name);
    setSlug(item.slug);
    setBio(item.bio);
    setIsActive(item.isActive);
    setSortOrder(String(item.sortOrder || 1));
    setExistingPhotoUrl(item.photoUrl || "");
    setPhotoPreview(item.photoUrl || "");
    setPhotoFile(null);
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleMoveToTrash(item: SpeakerItem) {
    const confirmed = window.confirm("Pindahkan speaker ini ke Trash?");
    if (!confirmed) return;

    try {
      setMovingToTrashId(item.id);
      setMessage("");
      setError("");

      await setDoc(
        doc(db, "speakers", item.id),
        {
          ...item,
          isDeleted: true,
          deletedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      if (editingSpeakerId === item.id) {
        resetForm();
      }

      await loadSpeakers();
      setMessage("Speaker dipindahkan ke Trash.");
    } catch (err: any) {
      setError(err?.message || "Gagal memindahkan speaker ke Trash.");
    } finally {
      setMovingToTrashId("");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setMessage("");
    setError("");

    const finalSlug = slugify(slug || name);

    if (!name.trim()) {
      setError("Nama penceramah wajib diisi.");
      return;
    }

    if (!finalSlug) {
      setError("Slug tidak sah.");
      return;
    }

    try {
      setSaving(true);

      const photoUrl = await uploadSpeakerPhoto(finalSlug);

      await setDoc(
        doc(db, "speakers", finalSlug),
        {
          name: name.trim(),
          slug: finalSlug,
          bio: bio.trim(),
          photoUrl: photoUrl || "",
          isActive,
          sortOrder: Number(sortOrder) || 1,
          isDeleted: false,
          deletedAt: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setMessage(
        editingSpeakerId
          ? "Speaker berjaya dikemaskini."
          : "Speaker berjaya disimpan."
      );

      resetForm();
      await loadSpeakers();
    } catch (err: any) {
      setError(err?.message || "Gagal menyimpan speaker.");
    } finally {
      setSaving(false);
    }
  }

  return (
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
          ← Kembali
        </button>

        <h1 className="text-2xl font-bold mb-2">
          {editingSpeakerId ? "Edit Speaker" : "Manage Speakers"}
        </h1>

        <p className="text-sm text-gray-400 mb-8">
          Tambah dan urus penceramah Aqsa Series.
        </p>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.35)] p-5"
        >
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-300 block mb-2">
                Nama Penceramah
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Ustaz Ashrof"
                className="w-full rounded-2xl bg-[#14161b] border border-white/10 px-4 py-3 text-sm text-white"
              />
            </div>

            <div>
              <label className="text-sm text-gray-300 block mb-2">
                Slug
              </label>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="contoh: ustaz-ashrof"
                className="w-full rounded-2xl bg-[#14161b] border border-white/10 px-4 py-3 text-sm text-white"
              />
            </div>

            <div>
              <label className="text-sm text-gray-300 block mb-2">
                Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Penerangan ringkas penceramah"
                rows={4}
                className="w-full rounded-2xl bg-[#14161b] border border-white/10 px-4 py-3 text-sm text-white"
              />
            </div>

            <div>
              <label className="text-sm text-gray-300 block mb-2">
                Upload Photo
              </label>

              <label
                htmlFor="speaker-photo-upload"
                className="block w-full rounded-2xl bg-[#14161b] border border-dashed border-white/20 px-4 py-4 text-sm text-gray-300 cursor-pointer hover:border-[#7A1F2B] transition"
              >
                Pilih gambar dari device
              </label>

              <input
                id="speaker-photo-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoChange}
                className="hidden"
              />

              {(photoPreview || existingPhotoUrl) && (
                <div className="mt-4 rounded-2xl border border-white/10 bg-[#14161b] p-3">
                  <img
                    src={photoPreview || existingPhotoUrl}
                    alt="Preview speaker"
                    className="w-full h-48 object-cover rounded-xl"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="text-sm text-gray-300 block mb-2">
                Susunan Paparan
              </label>
              <input
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                placeholder="1"
                className="w-full rounded-2xl bg-[#14161b] border border-white/10 px-4 py-3 text-sm text-white"
              />
            </div>

            <div className="rounded-2xl bg-[#14161b] border border-white/10 px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Status Aktif</p>
                <p className="text-xs text-gray-500 mt-1">
                  Paparkan speaker ini dalam app
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`w-14 h-8 rounded-full relative transition ${
                  isActive ? "bg-[#7A1F2B]" : "bg-gray-600"
                }`}
              >
                <span
                  className={`absolute top-1 h-6 w-6 rounded-full bg-white transition ${
                    isActive ? "left-7" : "left-1"
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
                type="submit"
                disabled={saving || uploadingPhoto}
                className="rounded-2xl bg-[#7A1F2B] px-4 py-3 text-sm font-semibold"
              >
                {saving || uploadingPhoto
                  ? "Menyimpan..."
                  : editingSpeakerId
                  ? "Update Speaker"
                  : "Simpan Speaker"}
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="rounded-2xl bg-[#1f232b] border border-white/10 px-4 py-3 text-sm font-semibold"
              >
                Reset Form
              </button>
            </div>
          </div>
        </form>

        <div className="mt-8">
          <h2 className="text-sm uppercase tracking-wider text-gray-400 mb-4">
            Speaker Sedia Ada
          </h2>

          {loading && (
            <div className="rounded-2xl bg-[#1f232b] p-4 text-sm text-gray-300">
              Sedang memuatkan speaker...
            </div>
          )}

          {!loading && speakers.length === 0 && (
            <div className="rounded-2xl bg-[#1f232b] p-4 text-sm text-gray-400">
              Belum ada speaker.
            </div>
          )}

          {!loading && speakers.length > 0 && (
            <div className="space-y-3">
              {speakers.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl bg-[#1f232b] border border-white/5 p-4"
                >
                  <div className="flex items-start gap-4">
                    {item.photoUrl ? (
                      <img
                        src={item.photoUrl}
                        alt={item.name}
                        className="h-16 w-16 rounded-2xl object-cover border border-white/10"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-2xl bg-[#14161b] border border-white/10 flex items-center justify-center text-xs text-gray-500">
                        No Photo
                      </div>
                    )}

                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold">{item.name}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            slug: {item.slug}
                          </p>
                        </div>

                        <span
                          className={`text-[11px] px-2 py-1 rounded-full ${
                            item.isActive
                              ? "bg-emerald-500/15 text-emerald-300"
                              : "bg-gray-500/15 text-gray-300"
                          }`}
                        >
                          {item.isActive ? "Aktif" : "Tidak aktif"}
                        </span>
                      </div>

                      <p className="text-xs text-gray-400 mt-2 leading-5">
                        {item.bio || "Tiada bio"}
                      </p>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => handleEdit(item)}
                          className="rounded-2xl bg-[#14161b] border border-white/10 px-4 py-3 text-sm font-semibold"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handleMoveToTrash(item)}
                          disabled={movingToTrashId === item.id}
                          className="rounded-2xl bg-red-950/40 border border-red-500/20 px-4 py-3 text-sm font-semibold text-red-200 disabled:opacity-60"
                        >
                          {movingToTrashId === item.id ? "Moving..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}