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
  shareCaption?: string;
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

const description =
  "Tonton wacana pilihan Aqsa Series. Satu perkongsian untuk memahami Baitulmaqdis dengan lebih mendalam. Siri Pengetahuan Baitulmaqdis kita bermula di sini.";

  const url = `https://aqsaseries.com/share/video/${id}`;
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
        <div className="mb-6 flex items-center gap-4">
  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#D4AF37]/25 bg-white/[0.04] p-2 shadow-lg shadow-black/30">
    <img
      src="Icon-2-Aqsa-Series.png"
      alt="Aqsa Series"
      className="h-full w-full object-contain"
    />
  </div>

  <div>
    <p className="text-xs uppercase tracking-[0.28em] text-[#D4AF37]">
      Aqsa Series
    </p>
    <h1 className="mt-1 text-xl font-bold leading-tight">
      Siri Pengetahuan Baitulmaqdis Kita Bermula Di Sini
    </h1>
  </div>
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

{video?.shareCaption && (
  <div className="mt-5 rounded-3xl border border-[#D4AF37]/25 bg-[#17140C] p-5 shadow-[0_18px_45px_rgba(0,0,0,0.28)]">
    <div className="flex gap-3">
      <div className="text-5xl font-serif leading-none text-[#D4AF37]/70">
        “
      </div>

      <div className="flex-1">
        <p className="text-[15px] font-semibold italic leading-relaxed tracking-wide text-[#F8EBC2]">
          {video.shareCaption}
        </p>

        <div className="mt-4 flex items-center justify-end gap-3">
          <span className="h-px w-8 bg-[#D4AF37]/40" />
          <p className="text-sm font-bold tracking-[0.08em] text-[#D4AF37]">
            Al-Maqdisiy
          </p>
        </div>
      </div>
    </div>
  </div>
)}

<p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-xs leading-relaxed text-white/45">
  Kandungan video ini dipautkan daripada sumber asal YouTube. Aqsa Series
  berperanan sebagai kurator kandungan ilmu Baitulmaqdis dan tidak menuntut
  pemilikan terhadap kandungan asal.
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