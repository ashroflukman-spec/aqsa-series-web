import type { Metadata } from "next";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../../lib/firebase";

type Props = {
  children: React.ReactNode;
  params: Promise<{
    seriesId: string;
    episodeId: string;
  }>;
};

type EpisodeData = {
  title?: string;
  description?: string;
  shareTitle?: string;
  shareDescription?: string;
  shareNote?: string;
};

type SeriesData = {
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

    return snap.data() as EpisodeData;
  } catch {
    return null;
  }
}

async function getSeries(seriesId: string): Promise<SeriesData | null> {
  try {
    const ref = doc(db, "series", seriesId);
    const snap = await getDoc(ref);

    if (!snap.exists()) return null;

    return snap.data() as SeriesData;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { seriesId, episodeId } = await params;

  const episode = await getEpisode(episodeId);
  const series = await getSeries(seriesId);

  const title = episode?.shareTitle || episode?.title || "Episod Aqsa Series";

  const description = truncate(
    episode?.shareNote ||
      episode?.shareDescription ||
      episode?.description ||
      series?.description ||
      "Dengar episod ini di Aqsa Series. Siri Pengetahuan Baitulmaqdis kita bermula di sini.",
    160
  );

  const url = `https://aqsaseries.com/share/${seriesId}/${episodeId}`;
  const image = `${url}/opengraph-image`;

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

export default function ShareEpisodeLayout({ children }: Props) {
  return children;
}