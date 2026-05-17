import type { Metadata } from "next";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";

type Props = {
  params: Promise<{
    episodeId: string;
  }>;
};

type EpisodeData = {
  id?: string;
  title?: string;
  description?: string;
  shareTitle?: string;
  shareDescription?: string;
  shareNote?: string;
  seriesId?: string;
  speakerName?: string;
};

type SeriesData = {
  id?: string;
  title?: string;
  description?: string;
};

function truncate(text: string, max: number) {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max).trim()}...` : text;
}

async function getEpisode(episodeId: string): Promise<EpisodeData | null> {
  try {
    const ref = doc(db, "episodes", episodeId);
    const snap = await getDoc(ref);

    if (!snap.exists()) return null;

    return {
      id: snap.id,
      ...(snap.data() as EpisodeData),
    };
  } catch {
    return null;
  }
}

async function getSeries(seriesId?: string): Promise<SeriesData | null> {
  if (!seriesId) return null;

  try {
    const ref = doc(db, "series", seriesId);
    const snap = await getDoc(ref);

    if (!snap.exists()) return null;

    return {
      id: snap.id,
      ...(snap.data() as SeriesData),
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { episodeId } = await params;

  const episode = await getEpisode(episodeId);
  const series = await getSeries(episode?.seriesId);

  const title = episode?.shareTitle || episode?.title || "Episod Aqsa Series";

  const description = truncate(
    episode?.shareNote ||
      episode?.shareDescription ||
      episode?.description ||
      series?.description ||
      "Dengar episod ini di Aqsa Series. Siri Pengetahuan Baitulmaqdis kita bermula di sini.",
    160
  );

  const url = `https://www.aqsaseries.com/a/${episodeId}`;
  const image = `https://www.aqsaseries.com/a/${episodeId}/opengraph-image`;

  return {
    title: `${title} | Aqsa Series`,
    description,
    openGraph: {
      title: `${title} | Aqsa Series`,
      description,
      url,
      siteName: "Aqsa Series",
      images: [
  {
    url: image,
    width: 1200,
    height: 630,
    alt: title,
    type: "image/png",
  },
],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Aqsa Series`,
      description,
      images: [image],
    },
  };
}

export default async function AudioShortSharePage({ params }: Props) {
  const { episodeId } = await params;

  const episode = await getEpisode(episodeId);

  const targetUrl = episode?.seriesId
    ? `/share/${episode.seriesId}/${episodeId}`
    : "/";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#070A0F] px-6 text-white">
      <div className="max-w-md text-center">
        <img
          src="/logo-icon.png"
          alt="Aqsa Series"
          className="mx-auto mb-6 h-auto w-56"
        />

        <p className="text-sm text-white/60">Membuka episod audio...</p>

        <a
          href={targetUrl}
          className="mt-6 inline-flex rounded-2xl bg-[#D4AF37] px-5 py-3 text-sm font-semibold text-black"
        >
          Dengar di Aqsa Series
        </a>
      </div>
    </main>
  );
}