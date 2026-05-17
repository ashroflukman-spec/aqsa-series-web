import type { Metadata } from "next";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../../lib/firebase";
import ShareEpisodeClient from "./ShareEpisodeClient";

type Props = {
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

  const rawTitle =
    episode?.shareTitle ||
    episode?.title ||
    "Episod Aqsa Series";

  const title = `${rawTitle} | Aqsa Series`;

  const description = truncate(
    episode?.shareNote ||
      episode?.shareDescription ||
      episode?.description ||
      series?.description ||
      "Dengar episod ini di Aqsa Series. Siri Pengetahuan Baitulmaqdis kita bermula di sini.",
    160
  );

  const url = `https://www.aqsaseries.com/share/${seriesId}/${episodeId}`;
  const image = `${url}/opengraph-image`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: "Aqsa Series",
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: rawTitle,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default function ShareEpisodePage() {
  return <ShareEpisodeClient />;
}