"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../AuthProvider";

type EpisodeCount = {
  id: string;
  title: string;
  seriesTitle: string;
  plays: number;
  isDeleted: boolean;
  isPublished: boolean;
};

type PlayReport = { total: number; episodes: EpisodeCount[] };
const formatCount = new Intl.NumberFormat("ms-MY");

function EpisodeRow({ episode }: { episode: EpisodeCount }) {
  return (
    <li className="flex items-start justify-between gap-3 border-b border-white/10 py-3 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-white">{episode.title}</p>
        <p className="mt-1 text-xs text-gray-400">
          {episode.seriesTitle}
          {episode.isDeleted ? " · Dalam Trash" : !episode.isPublished ? " · Draf" : ""}
        </p>
      </div>
      <span className="shrink-0 text-sm font-bold tabular-nums text-[#E8D28A]" aria-label={`${episode.plays} mainan`}>
        {formatCount.format(episode.plays)}
      </span>
    </li>
  );
}

export default function EpisodePlayInsights() {
  const { user } = useAuth();
  const [report, setReport] = useState<PlayReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!user) return;
    let active = true;
    void user.getIdToken().then(async (token) => {
      const response = await fetch("/api/episode-plays", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Statistik mainan belum tersedia");
      return response.json() as Promise<PlayReport>;
    }).then((data) => {
      if (active) { setReport(data); setError(false); setLoading(false); }
    }).catch(() => {
      if (active) { setError(true); setLoading(false); }
    });
    return () => { active = false; };
  }, [user, refreshKey]);

  const episodes = report?.episodes || [];

  return (
    <section className="mb-8 rounded-3xl border border-[#D4AF37]/20 bg-white/5 p-5" aria-label="Mainan episod audio">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Mainan episod audio</h2>
          <p className="mt-1 text-xs leading-5 text-gray-400">Jumlah mainan tanpa identiti pendengar, termasuk tetamu.</p>
        </div>
        <button type="button" onClick={() => { setLoading(true); setRefreshKey((key) => key + 1); }} disabled={loading}
          className="min-h-10 shrink-0 rounded-xl border border-white/10 px-3 text-xs font-semibold text-[#E8D28A] disabled:opacity-50">
          Muat semula
        </button>
      </div>

      {error ? <p role="alert" className="mt-4 text-xs text-amber-200">Statistik mainan belum dapat dimuatkan. Cuba lagi.</p> : (
        <>
          <p className="mt-4 text-3xl font-bold tabular-nums text-[#E8D28A]" aria-label="Jumlah mainan">
            {loading && !report ? "—" : formatCount.format(report?.total || 0)}
          </p>
          <p className="mt-1 text-[11px] leading-5 text-gray-400">
            Anggaran satu sesi mainan bagi setiap tab dan episod dalam 30 minit; bukan bilangan pendengar unik. Kiraan bermula selepas ciri ini diterbitkan.
          </p>
          {episodes.length > 0 && (
            <>
              <h3 className="mt-5 text-sm font-semibold">Mengikut episod</h3>
              <ol className="mt-1">{episodes.slice(0, 5).map((episode) => <EpisodeRow key={episode.id} episode={episode} />)}</ol>
              {episodes.length > 5 && (
                <details className="mt-2 rounded-xl border border-white/10 px-3">
                  <summary className="min-h-11 cursor-pointer py-3 text-xs font-semibold text-[#E8D28A]">Lihat {episodes.length - 5} episod lagi</summary>
                  <ol>{episodes.slice(5).map((episode) => <EpisodeRow key={episode.id} episode={episode} />)}</ol>
                </details>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
