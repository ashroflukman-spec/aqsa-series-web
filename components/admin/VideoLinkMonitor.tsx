"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, RefreshCw, Video } from "lucide-react";
import { collection, getDocs } from "firebase/firestore";
import { useAuth } from "../AuthProvider";
import { db } from "../../lib/firebase";
import { checkVideoLinks, effectiveLinkStatus, needsLinkCheck, type MonitoredVideo } from "../../lib/videoLinkHealth";

export default function VideoLinkMonitor() {
  const { user } = useAuth();
  const [videos, setVideos] = useState<MonitoredVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const autoStarted = useRef(false);
  const checkingRef = useRef(false);

  const loadVideos = useCallback(async () => {
    const snapshot = await getDocs(collection(db, "videos"));
    const active = snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as MonitoredVideo))
      .filter((item) => !item.isDeleted);
    setVideos(active);
    return active;
  }, []);

  const runCheck = useCallback(async (items: MonitoredVideo[]) => {
    if (!user || checkingRef.current || items.length === 0) return;
    checkingRef.current = true;
    setChecking(true);
    setError("");
    try {
      await checkVideoLinks(user, items);
      await loadVideos();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Semakan pautan gagal.");
    } finally {
      checkingRef.current = false;
      setChecking(false);
    }
  }, [loadVideos, user]);

  useEffect(() => {
    if (!user || autoStarted.current) return;
    autoStarted.current = true;
    async function start() {
      try {
        const active = await loadVideos();
        if (active.some((item) => needsLinkCheck(item))) await runCheck(active);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Senarai video gagal dimuatkan.");
      } finally {
        setLoading(false);
      }
    }
    start();
  }, [loadVideos, runCheck, user]);

  const issues = videos.filter((item) => {
    const status = effectiveLinkStatus(item);
    return status !== "ok" && status !== "unchecked";
  });
  const unchecked = videos.filter((item) => effectiveLinkStatus(item) === "unchecked").length;
  const stale = videos.filter((item) => needsLinkCheck(item)).length;
  const latestCheck = videos.reduce((latest, item) => Math.max(latest, item.linkCheckedAt?.toMillis?.() ?? 0), 0);

  return (
    <section className="mb-8 rounded-3xl border border-white/10 bg-[#1c2027] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.35)]" aria-labelledby="video-link-title">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
          {issues.length ? <AlertTriangle size={19} className="text-amber-300" /> : <Video size={19} className="text-[#E8D28A]" />}
        </div>
        <div className="min-w-0 flex-1">
          <h2 id="video-link-title" className="text-base font-semibold">Status pautan video</h2>
          <p className="mt-1 text-xs leading-5 text-gray-400">Semakan YouTube automatik apabila dashboard dibuka jika status melebihi 24 jam.</p>
        </div>
      </div>

      {loading ? <p className="mt-5 text-sm text-gray-400">Memuatkan status video...</p> : (
        <div className="mt-5">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {videos.length === 0 ? (
              <span className="text-gray-400">Tiada video untuk disemak</span>
            ) : issues.length > 0 ? (
              <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1.5 font-semibold text-amber-200">{issues.length} perlu tindakan</span>
            ) : unchecked > 0 ? (
              <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-gray-300">{unchecked} belum disemak</span>
            ) : stale > 0 ? (
              <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-gray-300">Semakan terakhir melebihi 24 jam</span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-emerald-200"><CheckCircle2 size={15} /> Tiada isu dikesan</span>
            )}
            <span className="text-xs text-gray-500">{videos.length} video · {latestCheck ? `terakhir ${new Date(latestCheck).toLocaleString("ms-MY")}` : "belum pernah disemak"}</span>
          </div>

          {issues.length > 0 && <div className="mt-4 space-y-2">
            {issues.slice(0, 4).map((item) => <Link key={item.id} href="/admin/videos?health=issue" className="block rounded-xl border border-amber-400/10 bg-amber-400/[0.05] px-3 py-2.5">
              <p className="truncate text-sm font-medium text-white">{item.title || item.youtubeId}</p>
              <p className="mt-0.5 text-xs leading-5 text-amber-200/80">{item.linkReason}</p>
            </Link>)}
            {issues.length > 4 && <p className="text-xs text-gray-400">Dan {issues.length - 4} video lagi.</p>}
          </div>}

          {error && <p role="alert" className="mt-4 rounded-xl border border-red-500/20 bg-red-950/30 px-3 py-2 text-xs text-red-200">{error}</p>}

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => runCheck(videos)} disabled={checking || videos.length === 0} className="inline-flex items-center gap-2 rounded-xl bg-[#7A1F2B] px-3.5 py-2.5 text-xs font-semibold text-white disabled:opacity-50">
              <RefreshCw size={14} className={checking ? "animate-spin" : ""} /> {checking ? "Menyemak..." : "Semak sekarang"}
            </button>
            <Link href={issues.length ? "/admin/videos?health=issue" : "/admin/videos"} className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs font-semibold text-white/85">Lihat video</Link>
          </div>
        </div>
      )}
    </section>
  );
}
