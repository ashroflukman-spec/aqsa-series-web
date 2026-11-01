"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { getDocs } from "firebase/firestore";
import { ArrowLeft, Clapperboard, Headphones, Home, Languages, Play, RefreshCw } from "lucide-react";
import { useLanguage } from "../../components/LanguageProvider";
import { localizeContent, type TranslatableContent } from "../../lib/localizedContent";
import { publishedContentQuery, publicSpeakersQuery } from "../../lib/publicFirestore";
import { videoCategoryLabel } from "../../lib/videoCategory";
import TvAudioPlayer, { TV_PROGRESS_KEY, type TvProgress } from "./TvAudioPlayer";
import TvVideoPlayer from "./TvVideoPlayer";
import "./tv.css";

type TvSeries = TranslatableContent & { coverUrl: string; speakerId: string; sortOrder: number };
type TvEpisode = TranslatableContent & { seriesId: string; audioUrl: string; displayOrder: number; durationSeconds: number };
type TvVideo = { id: string; title: string; speaker: string; category: string; youtubeId: string; youtubeUrl: string; thumbnailUrl: string; sortOrder: number; isPinned: boolean; createdAtSeconds: number };
type TvSection = "home" | "audio" | "videos";
type ActivePlayer = { kind: "audio"; id: string } | { kind: "video"; id: string } | null;

const COPY = {
  ms: { home: "Utama", audio: "Siri Audio", videos: "Video", tagline: "Siri pendidikan Baitulmaqdis kita bermula di sini", featured: "VIDEO PILIHAN", watch: "Tonton Sekarang", listen: "Dengar Sekarang", browseAudio: "Teroka Siri Audio", browseVideos: "Teroka Video", continue: "Sambung Dengar", allSeries: "Semua Siri Audio", episodes: "Episod", allVideos: "Semua Video", category: "Kategori", all: "Semua", language: "Bahasa", loading: "Sedang memuatkan Aqsa Series...", failed: "Kandungan belum dapat dimuatkan.", retry: "Cuba Lagi", empty: "Belum ada kandungan dalam bahagian ini.", remote: "Guna ← ↑ ↓ → untuk bergerak · OK untuk pilih · Back untuk kembali", back: "Kembali", close: "Tutup", play: "Main", pause: "Jeda", next: "Seterusnya", youtube: "Buka di YouTube", unavailable: "Video ini tidak dapat dimainkan di sini. Cuba buka di YouTube.", audioError: "Audio ini tidak dapat dimainkan. Semak sambungan internet.", unknownSpeaker: "Penyampai", minutes: "min" },
  en: { home: "Home", audio: "Audio Series", videos: "Videos", tagline: "Your journey through Baitulmaqdis begins here", featured: "FEATURED VIDEO", watch: "Watch Now", listen: "Listen Now", browseAudio: "Explore Audio Series", browseVideos: "Explore Videos", continue: "Continue Listening", allSeries: "All Audio Series", episodes: "Episodes", allVideos: "All Videos", category: "Category", all: "All", language: "Language", loading: "Loading Aqsa Series...", failed: "Content could not be loaded.", retry: "Try Again", empty: "No content in this section yet.", remote: "Use ← ↑ ↓ → to move · OK to select · Back to return", back: "Back", close: "Close", play: "Play", pause: "Pause", next: "Next", youtube: "Open in YouTube", unavailable: "This video cannot play here. Try opening it in YouTube.", audioError: "This audio cannot play. Check your internet connection.", unknownSpeaker: "Speaker", minutes: "min" },
  ar: { home: "الرئيسية", audio: "السلاسل الصوتية", videos: "الفيديوهات", tagline: "رحلتك في معرفة بيت المقدس تبدأ هنا", featured: "فيديو مختار", watch: "شاهد الآن", listen: "استمع الآن", browseAudio: "تصفح السلاسل", browseVideos: "تصفح الفيديوهات", continue: "تابع الاستماع", allSeries: "جميع السلاسل الصوتية", episodes: "الحلقات", allVideos: "جميع الفيديوهات", category: "الفئة", all: "الكل", language: "اللغة", loading: "جارٍ تحميل سلسلة الأقصى...", failed: "تعذر تحميل المحتوى.", retry: "حاول مجددًا", empty: "لا يوجد محتوى في هذا القسم بعد.", remote: "استخدم ← ↑ ↓ → للتنقل · OK للاختيار · Back للرجوع", back: "رجوع", close: "إغلاق", play: "تشغيل", pause: "إيقاف مؤقت", next: "التالي", youtube: "افتح في يوتيوب", unavailable: "لا يمكن تشغيل هذا الفيديو هنا. جرّب فتحه في يوتيوب.", audioError: "لا يمكن تشغيل هذا الصوت. تحقق من اتصالك بالإنترنت.", unknownSpeaker: "المتحدث", minutes: "د" },
} as const;

function youtubeIdFromUrl(url: string) {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return match?.[1] || "";
}

function artStyle(url: string): CSSProperties | undefined {
  return url ? { backgroundImage: `url(${JSON.stringify(url)})` } : undefined;
}

function TvRail({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="tv-rail"><h2>{title}</h2><div className="tv-rail-track">{children}</div></section>;
}

export default function TvPage() {
  const { language, setLanguage } = useLanguage();
  const copy = COPY[language];
  const rootRef = useRef<HTMLElement>(null);
  const lastFocusRef = useRef<HTMLElement | null>(null);
  const [section, setSection] = useState<TvSection>("home");
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);
  const [videoCategory, setVideoCategory] = useState("All");
  const [player, setPlayer] = useState<ActivePlayer>(null);
  const [series, setSeries] = useState<TvSeries[]>([]);
  const [episodes, setEpisodes] = useState<TvEpisode[]>([]);
  const [videos, setVideos] = useState<TvVideo[]>([]);
  const [speakers, setSpeakers] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState<TvProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(TV_PROGRESS_KEY) || "null") as TvProgress | null;
        if (saved && typeof saved.episodeId === "string" && Number.isFinite(saved.seconds)) setProgress(saved);
      } catch { /* The library works without local progress. */ }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(false);
      try {
        const [seriesSnap, episodeSnap, videoSnap, speakerSnap] = await Promise.all([
          getDocs(publishedContentQuery("series")),
          getDocs(publishedContentQuery("episodes")),
          getDocs(publishedContentQuery("videos")),
          getDocs(publicSpeakersQuery()),
        ]);
        if (!active) return;
        setSeries(seriesSnap.docs.map((item) => {
          const data = item.data();
          return { id: item.id, title: String(data.title || ""), description: String(data.description || ""), translations: data.translations, coverUrl: String(data.coverUrl || ""), speakerId: String(data.speakerId || ""), sortOrder: Number(data.sortOrder) || 0 };
        }).sort((a, b) => a.sortOrder - b.sortOrder));
        setEpisodes(episodeSnap.docs.map((item) => {
          const data = item.data();
          return { id: item.id, title: String(data.title || ""), description: String(data.description || ""), translations: data.translations, seriesId: String(data.seriesId || ""), audioUrl: String(data.audioUrl || ""), displayOrder: Number(data.displayOrder) || 0, durationSeconds: Number(data.durationSeconds) || 0 };
        }).filter((item) => item.audioUrl).sort((a, b) => a.displayOrder - b.displayOrder));
        setVideos(videoSnap.docs.map((item) => {
          const data = item.data();
          const youtubeUrl = String(data.youtubeUrl || "");
          const youtubeId = String(data.youtubeId || youtubeIdFromUrl(youtubeUrl));
          return { id: item.id, title: String(data.title || ""), speaker: String(data.speaker || ""), category: String(data.category || "Umum"), youtubeId, youtubeUrl, thumbnailUrl: String(data.thumbnailUrl || (youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : "")), sortOrder: Number(data.sortOrder) || 0, isPinned: data.isPinned === true, createdAtSeconds: Number(data.createdAt?.seconds) || 0 };
        }).filter((item) => item.youtubeId).sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || b.createdAtSeconds - a.createdAtSeconds || a.sortOrder - b.sortOrder));
        const map: Record<string, string> = {};
        speakerSnap.docs.forEach((item) => {
          const data = item.data();
          map[item.id] = String(data.displayName || data.fullName || data.name || data.slug || item.id);
          if (data.slug) map[String(data.slug)] = map[item.id];
        });
        setSpeakers(map);
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [retryKey]);

  const selectedSeries = series.find((item) => item.id === selectedSeriesId) || null;
  const selectedEpisodes = episodes.filter((item) => item.seriesId === selectedSeriesId);
  const filteredVideos = videoCategory === "All" ? videos : videos.filter((item) => item.category === videoCategory);
  const categories = useMemo(() => ["All", ...new Set(videos.map((item) => item.category))], [videos]);
  const recentEpisode = progress && progress.seconds > 0 ? episodes.find((item) => item.id === progress.episodeId) : null;
  const recentSeries = recentEpisode ? series.find((item) => item.id === recentEpisode.seriesId) : null;
  const activeEpisode = player?.kind === "audio" ? episodes.find((item) => item.id === player.id) : null;
  const activeVideo = player?.kind === "video" ? videos.find((item) => item.id === player.id) : null;
  const playerSeries = activeEpisode ? series.find((item) => item.id === activeEpisode.seriesId) : null;
  const playingSeriesEpisodes = activeEpisode ? episodes.filter((item) => item.seriesId === activeEpisode.seriesId) : [];
  const followingEpisode = activeEpisode ? playingSeriesEpisodes[playingSeriesEpisodes.findIndex((item) => item.id === activeEpisode.id) + 1] : null;
  const featuredVideo = videos[0];

  const closePlayer = useCallback(() => {
    setPlayer(null);
    requestAnimationFrame(() => lastFocusRef.current?.focus());
  }, []);

  useEffect(() => {
    if (player) requestAnimationFrame(() => rootRef.current?.querySelector<HTMLElement>(".tv-player [data-tv-initial]:not(:disabled), .tv-player [data-tv-close]")?.focus());
  }, [player]);

  useEffect(() => {
    if (!loading && !player && !rootRef.current?.contains(document.activeElement)) {
      rootRef.current?.querySelector<HTMLElement>("[data-tv-home]")?.focus();
    }
  }, [loading, player]);

  function openPlayer(next: ActivePlayer, source?: HTMLElement) {
    lastFocusRef.current = source || document.activeElement as HTMLElement;
    setPlayer(next);
  }

  function openSeries(item: TvSeries) {
    setSection("audio");
    setSelectedSeriesId(item.id);
    requestAnimationFrame(() => rootRef.current?.querySelector<HTMLElement>("[data-tv-episode]")?.focus());
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (["Escape", "Backspace", "BrowserBack"].includes(event.key)) {
      event.preventDefault();
      if (player) closePlayer();
      else if (selectedSeriesId && section === "audio") {
        setSelectedSeriesId(null);
        requestAnimationFrame(() => rootRef.current?.querySelector<HTMLElement>(".tv-poster-card")?.focus());
      } else {
        setSection("home");
        requestAnimationFrame(() => rootRef.current?.querySelector<HTMLElement>("[data-tv-home]")?.focus());
      }
      return;
    }
    if (!event.key.startsWith("Arrow")) return;
    const active = document.activeElement as HTMLElement | null;
    const scope = player ? rootRef.current?.querySelector<HTMLElement>(".tv-player") : rootRef.current;
    if (!scope || !active || !scope.contains(active)) return;
    const current = active.getBoundingClientRect();
    const cx = current.left + current.width / 2;
    const cy = current.top + current.height / 2;
    const candidates = [...scope.querySelectorAll<HTMLElement>("button:not(:disabled), a[href]")].filter((item) => item !== active && item.getClientRects().length > 0);
    const direction = event.key;
    let best: HTMLElement | null = null;
    let bestScore = Infinity;
    for (const item of candidates) {
      const rect = item.getBoundingClientRect();
      const dx = rect.left + rect.width / 2 - cx;
      const dy = rect.top + rect.height / 2 - cy;
      const primary = direction === "ArrowRight" ? dx : direction === "ArrowLeft" ? -dx : direction === "ArrowDown" ? dy : -dy;
      const secondary = direction === "ArrowRight" || direction === "ArrowLeft" ? Math.abs(dy) : Math.abs(dx);
      if (primary <= 8) continue;
      const score = primary + secondary * 2.5;
      if (score < bestScore) { best = item; bestScore = score; }
    }
    if (best) {
      event.preventDefault();
      best.focus();
      best.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
    }
  }

  const seriesCard = (item: TvSeries) => {
    const title = localizeContent("series", item, language).title;
    const count = episodes.filter((episode) => episode.seriesId === item.id).length;
    return <button key={item.id} type="button" className="tv-poster-card" onClick={() => openSeries(item)} aria-label={`${title}, ${count} ${copy.episodes}`}>
      <span className="tv-poster-image" style={artStyle(item.coverUrl)}>{!item.coverUrl && <Headphones size={44} />}</span>
      <span className="tv-card-title">{title}</span><span className="tv-card-meta">{count} {copy.episodes}</span>
    </button>;
  };

  const videoCard = (item: TvVideo) => <button key={item.id} type="button" className="tv-poster-card tv-video-card" onClick={(event) => openPlayer({ kind: "video", id: item.id }, event.currentTarget)} aria-label={`${item.title}, ${videoCategoryLabel(item.category, language)}`}>
    <span className="tv-poster-image" style={artStyle(item.thumbnailUrl)}><span className="tv-play-badge"><Play fill="currentColor" /></span></span>
    <span className="tv-card-title">{item.title}</span><span className="tv-card-meta">{videoCategoryLabel(item.category, language)} · {item.speaker}</span>
  </button>;

  const changeLanguage = () => setLanguage(language === "ms" ? "en" : language === "en" ? "ar" : "ms");

  return <main ref={rootRef} className="aqsa-tv" onKeyDown={handleKeyDown}>
    <div className="tv-shell" inert={Boolean(player)}>
      <aside className="tv-sidebar" aria-label="Aqsa Series TV">
        <Image src="/logo-icon.png" alt="Aqsa Series" width={220} height={74} className="tv-logo" priority />
        <div className="tv-nav">
          <button type="button" data-tv-home className={section === "home" ? "active" : ""} onClick={() => { setSection("home"); setSelectedSeriesId(null); }}><Home />{copy.home}</button>
          <button type="button" className={section === "audio" ? "active" : ""} onClick={() => { setSection("audio"); setSelectedSeriesId(null); }}><Headphones />{copy.audio}</button>
          <button type="button" className={section === "videos" ? "active" : ""} onClick={() => setSection("videos")}><Clapperboard />{copy.videos}</button>
        </div>
        <div className="tv-sidebar-bottom"><button type="button" onClick={changeLanguage} aria-label={copy.language}><Languages /> {language === "ms" ? "Melayu" : language === "en" ? "English" : "العربية"}</button><p>{copy.remote}</p></div>
      </aside>
      <div className="tv-content">
        <header className="tv-topbar"><span>AQSA SERIES <strong>TV</strong></span><span className="tv-topbar-note">{copy.tagline}</span></header>
        {loading && <div className="tv-feedback">{copy.loading}</div>}
        {!loading && error && <div className="tv-feedback"><p>{copy.failed}</p><button type="button" onClick={() => setRetryKey((key) => key + 1)}><RefreshCw /> {copy.retry}</button></div>}
        {!loading && !error && section === "home" && <>
          <section className="tv-hero" style={artStyle(featuredVideo?.thumbnailUrl || series[0]?.coverUrl || "")}>
            <div className="tv-hero-copy"><span className="tv-eyebrow">{featuredVideo ? copy.featured : "AQSA SERIES"}</span><h1>{featuredVideo?.title || (series[0] ? localizeContent("series", series[0], language).title : copy.tagline)}</h1><p>{featuredVideo?.speaker || copy.tagline}</p><div className="tv-hero-actions">
              {featuredVideo && <button type="button" className="tv-gold-button" onClick={(event) => openPlayer({ kind: "video", id: featuredVideo.id }, event.currentTarget)}><Play fill="currentColor" /> {copy.watch}</button>}
              <button type="button" className="tv-ghost-button" onClick={() => setSection("audio")}><Headphones /> {copy.browseAudio}</button>
            </div></div>
          </section>
          {recentEpisode && recentSeries && <TvRail title={copy.continue}><button type="button" className="tv-continue-card" onClick={(event) => openPlayer({ kind: "audio", id: recentEpisode.id }, event.currentTarget)}><span className="tv-continue-art" style={artStyle(recentSeries.coverUrl)} /><span><strong>{localizeContent("episode", recentEpisode, language).title}</strong><small>{localizeContent("series", recentSeries, language).title}</small></span><Play fill="currentColor" /></button></TvRail>}
          {series.length > 0 && <TvRail title={copy.audio}>{series.map(seriesCard)}</TvRail>}
          {videos.length > 0 && <TvRail title={copy.videos}>{videos.slice(0, 12).map(videoCard)}</TvRail>}
          {series.length === 0 && videos.length === 0 && <div className="tv-feedback">{copy.empty}</div>}
        </>}
        {!loading && !error && section === "audio" && <>
          {selectedSeries ? <>
            <div className="tv-detail-hero" style={artStyle(selectedSeries.coverUrl)}><button type="button" className="tv-back-button" onClick={() => setSelectedSeriesId(null)}><ArrowLeft /> {copy.back}</button><div><span className="tv-eyebrow">{copy.audio}</span><h1>{localizeContent("series", selectedSeries, language).title}</h1><p>{speakers[selectedSeries.speakerId] || copy.unknownSpeaker} · {selectedEpisodes.length} {copy.episodes}</p></div></div>
            <TvRail title={copy.episodes}>{selectedEpisodes.map((episode, index) => <button key={episode.id} type="button" className="tv-episode-card" data-tv-episode onClick={(event) => openPlayer({ kind: "audio", id: episode.id }, event.currentTarget)}><span className="tv-episode-number">{String(index + 1).padStart(2, "0")}</span><span><strong>{localizeContent("episode", episode, language).title}</strong><small>{episode.durationSeconds ? `${Math.round(episode.durationSeconds / 60)} ${copy.minutes}` : copy.audio}</small></span><Play fill="currentColor" /></button>)}</TvRail>
          </> : <><div className="tv-page-heading"><span className="tv-eyebrow">AQSA SERIES</span><h1>{copy.allSeries}</h1></div><TvRail title={copy.allSeries}>{series.map(seriesCard)}</TvRail>{series.length === 0 && <div className="tv-feedback">{copy.empty}</div>}</>}
        </>}
        {!loading && !error && section === "videos" && <>
          <div className="tv-page-heading"><span className="tv-eyebrow">AQSA SERIES</span><h1>{copy.allVideos}</h1></div>
          <section className="tv-categories" aria-label={copy.category}>{categories.map((category) => <button key={category} type="button" className={videoCategory === category ? "active" : ""} onClick={() => setVideoCategory(category)}>{category === "All" ? copy.all : videoCategoryLabel(category, language)}</button>)}</section>
          <TvRail title={videoCategory === "All" ? copy.allVideos : videoCategoryLabel(videoCategory, language)}>{filteredVideos.map(videoCard)}</TvRail>
          {filteredVideos.length === 0 && <div className="tv-feedback">{copy.empty}</div>}
        </>}
      </div>
    </div>
    {activeEpisode && playerSeries && <TvAudioPlayer key={activeEpisode.id} episodeId={activeEpisode.id} audioUrl={activeEpisode.audioUrl} title={localizeContent("episode", activeEpisode, language).title} seriesTitle={localizeContent("series", playerSeries, language).title} coverUrl={playerSeries.coverUrl} onClose={closePlayer} onNext={followingEpisode ? () => setPlayer({ kind: "audio", id: followingEpisode.id }) : undefined} onProgress={setProgress} copy={copy} />}
    {activeVideo && <TvVideoPlayer key={activeVideo.id} youtubeId={activeVideo.youtubeId} title={activeVideo.title} onClose={closePlayer} onNext={videos[videos.findIndex((item) => item.id === activeVideo.id) + 1] ? () => setPlayer({ kind: "video", id: videos[videos.findIndex((item) => item.id === activeVideo.id) + 1].id }) : undefined} copy={copy} />}
  </main>;
}
