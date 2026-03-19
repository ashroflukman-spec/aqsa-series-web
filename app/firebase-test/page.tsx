"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";

type SeriesItem = {
  id: string;
  title?: string;
  slug?: string;
  description?: string;
  coverUrl?: string;
  speakerId?: string;
  isPublished?: boolean;
  sortOrder?: number;
};

export default function FirebaseTestPage() {
  const [loading, setLoading] = useState(true);
  const [series, setSeries] = useState<SeriesItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchSeries() {
      try {
        const snapshot = await getDocs(collection(db, "series"));

        const data: SeriesItem[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setSeries(data);
      } catch (err: any) {
        setError(err?.message || "Gagal membaca data dari Firestore");
      } finally {
        setLoading(false);
      }
    }

    fetchSeries();
  }, []);

  return (
    <main className="min-h-screen bg-[#0f1115] text-white flex justify-center">
      <div className="w-full max-w-md px-6 py-10 pb-24">
        <h1 className="text-2xl font-bold text-center mb-3">
          Firebase Test
        </h1>

        <p className="text-center text-sm text-gray-400 mb-8">
          Ujian sambungan Aqsa Series dengan Firestore
        </p>

        {loading && (
          <div className="rounded-2xl bg-[#1f232b] p-5 text-sm text-gray-300">
            Sedang memuat data dari Firebase...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl bg-red-950/40 border border-red-500/30 p-5 text-sm text-red-200">
            {error}
          </div>
        )}

        {!loading && !error && series.length === 0 && (
          <div className="rounded-2xl bg-[#1f232b] p-5 text-sm text-gray-300">
            Sambungan berjaya, tetapi collection <strong>series</strong> masih kosong.
          </div>
        )}

        {!loading && !error && series.length > 0 && (
          <div className="space-y-4">
            {series.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl bg-[#1f232b] p-5 border border-white/5"
              >
                <div className="text-lg font-semibold">
                  {item.title || "(tiada title)"}
                </div>

                <div className="text-xs text-gray-400 mt-2">
                  Document ID: {item.id}
                </div>

                <div className="text-xs text-gray-400 mt-1">
                  Slug: {item.slug ?? "(tiada slug)"}
                </div>

                <div className="text-xs text-gray-400 mt-1">
                  Speaker ID: {item.speakerId ?? "(tiada speakerId)"}
                </div>

                <div className="text-xs text-gray-400 mt-1">
                  isPublished: {String(item.isPublished)}
                </div>

                <div className="text-xs text-gray-400 mt-1">
                  sortOrder: {String(item.sortOrder)}
                </div>

                <div className="text-sm text-gray-300 mt-3">
                  {item.description || "Tiada deskripsi"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}