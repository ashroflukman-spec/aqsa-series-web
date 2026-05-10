import type { Metadata } from "next";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../../lib/firebase";

type ShareVideoPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type VideoData = {
  title?: string;
  speaker?: string;
  category?: string;
  thumbnailUrl?: string;
  youtubeId?: string;
  description?: string;
};

async function getVideo(id: string): Promise<VideoData | null> {
  try {
    const ref = doc(db, "videos", id);
    const snap = await getDoc(ref);

    if (!snap.exists()) return null;

    return snap.data() as VideoData;
  } catch (error) {
    console.error("Failed to fetch shared video:", error);
    return null;
  }
}

function getThumbnail(video: VideoData | null) {
  if (!video) return "https://aqsaseries.com/icon.png";

  if (video.thumbnailUrl) return video.thumbnailUrl;

  if (video.youtubeId) {
    return `https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`;
  }

  return "https://aqsaseries.com/icon.png";
}

export async function generateMetadata({
  params,
}: ShareVideoPageProps): Promise<Metadata> {
  const { id } = await params;
  const video = await getVideo(id);

  const title = video?.title
    ? `${video.title} | Aqsa Series`
    : "Aqsa Series";

  const description = video?.description
    ? video.description
    : "Platform audio dan video ilmu Baitulmaqdis. Siri Pengetahuan Baitulmaqdis kita bermula di sini.";

  const image = getThumbnail(video);
  const url = `https://aqsaseries.com/share/video/${id}`;

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
          alt: video?.title || "Aqsa Series",
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

export default async function ShareVideoPage({ params }: ShareVideoPageProps) {
  const { id } = await params;
  const video = await getVideo(id);

  const title = video?.title || "Aqsa Series";
  const speaker = video?.speaker || "Aqsa Series";
  const category = video?.category || "Wacana";
  const thumbnail = getThumbnail(video);

  const targetUrl = `/videos?video=${id}`;

  return (
    <main className="min-h-screen bg-[#070A0F] text-white px-5 py-8">
      <div className="mx-auto max-w-md">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.28em] text-[#D4AF37]">
            Aqsa Series
          </p>
          <h1 className="mt-2 text-2xl font-bold leading-tight">
            Siri Pengetahuan Baitulmaqdis Kita Bermula Di Sini
          </h1>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] shadow-2xl">
          <img
            src={thumbnail}
            alt={title}
            className="h-56 w-full object-cover"
          />

          <div className="p-5">
            <span className="inline-flex rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#E8D28A]">
              {category}
            </span>

            <h2 className="mt-4 text-xl font-bold leading-snug">
              {title}
            </h2>

            <p className="mt-3 text-sm text-white/60">
              Penyampai · {speaker}
            </p>

            <p className="mt-5 text-sm leading-relaxed text-white/70">
              Dengar dan tonton kandungan ini di Aqsa Series — platform ilmu
              Baitulmaqdis yang menghimpunkan audio dan video terpilih untuk
              membina kefahaman umat.
            </p>

            <Link
              href={targetUrl}
              className="mt-6 flex w-full items-center justify-center rounded-2xl bg-[#8A1F32] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#8A1F32]/30 transition hover:bg-[#A5283D]"
            >
              Buka di Aqsa Series
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-white/40">
          Jika halaman tidak terbuka secara automatik, tekan butang di atas.
        </p>
      </div>
    </main>
  );
}