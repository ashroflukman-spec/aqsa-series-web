import { ImageResponse } from "next/og";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../../lib/firebase";

type Props = {
  params: Promise<{
    episodeId: string;
  }>;
};

type EpisodeData = {
  title?: string;
  description?: string;
  shareTitle?: string;
  shareDescription?: string;
  shareNote?: string;
  seriesId?: string;
  speakerName?: string;
  speakerId?: string;
  imageUrl?: string;
  coverUrl?: string;
};

type SeriesData = {
  title?: string;
  coverUrl?: string;
  description?: string;
};

type SpeakerData = {
  name?: string;
  fullName?: string;
  displayName?: string;
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

async function getSeries(seriesId?: string): Promise<SeriesData | null> {
  if (!seriesId) return null;

  try {
    const ref = doc(db, "series", seriesId);
    const snap = await getDoc(ref);

    if (!snap.exists()) return null;

    return snap.data() as SeriesData;
  } catch {
    return null;
  }
}

async function getSpeakerName(episode: EpisodeData | null) {
  if (!episode) return "Aqsa Series";

  if (episode.speakerName) return episode.speakerName;

  if (!episode.speakerId) return "Aqsa Series";

  try {
    const ref = doc(db, "speakers", episode.speakerId);
    const snap = await getDoc(ref);

    if (!snap.exists()) return "Aqsa Series";

    const data = snap.data() as SpeakerData;

    return data.displayName || data.fullName || data.name || "Aqsa Series";
  } catch {
    return "Aqsa Series";
  }
}

export async function GET(
  request: Request,
  { params }: Props
) {
  const { episodeId } = await params;

  const episode = await getEpisode(episodeId);
  const series = await getSeries(episode?.seriesId);
  const speakerName = await getSpeakerName(episode);

  const title = episode?.shareTitle || episode?.title || "Episod Aqsa Series";
  const seriesTitle = series?.title || "Aqsa Series";

  const quote = truncate(
    episode?.shareNote ||
      episode?.shareDescription ||
      episode?.description ||
      "Dengar episod ini di Aqsa Series.",
    120
  );

  const cover =
    series?.coverUrl ||
    episode?.coverUrl ||
    episode?.imageUrl ||
    "https://www.aqsaseries.com/Icon-2-Aqsa-Series.png";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          background:
            "linear-gradient(135deg, #05070B 0%, #101722 48%, #3A0617 100%)",
          padding: "36px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            width: "1128px",
            height: "558px",
            display: "flex",
            borderRadius: "32px",
            overflow: "hidden",
            border: "2px solid rgba(212,175,55,0.75)",
            background: "#F5EEDF",
          }}
        >
          <div
            style={{
              width: "520px",
              height: "558px",
              position: "relative",
              display: "flex",
              background: "#071016",
            }}
          >
            <img
              src={cover}
              alt=""
              style={{
                width: "520px",
                height: "558px",
                objectFit: "cover",
                opacity: 0.78,
              }}
            />

            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.42))",
              }}
            />

            <div
              style={{
                position: "absolute",
                top: "38px",
                left: "38px",
                width: "210px",
                height: "72px",
                borderRadius: "18px",
                background: "rgba(0,0,0,0.55)",
                border: "1px solid rgba(212,175,55,0.55)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "14px",
              }}
            >
              <img
                src="https://www.aqsaseries.com/logo-icon.png"
                alt="Aqsa Series"
                style={{
                  width: "160px",
                  height: "auto",
                  objectFit: "contain",
                }}
              />
            </div>

            <div
              style={{
                position: "absolute",
                bottom: "38px",
                left: "38px",
                padding: "14px 28px",
                borderRadius: "999px",
                border: "1px solid rgba(212,175,55,0.75)",
                color: "#D4AF37",
                fontSize: "18px",
                letterSpacing: "8px",
                fontWeight: 700,
              }}
            >
              AUDIO
            </div>
          </div>

          <div
            style={{
              width: "608px",
              height: "558px",
              display: "flex",
              flexDirection: "column",
              padding: "48px 54px",
              color: "#262626",
            }}
          >
            <div
              style={{
                fontSize: "24px",
                letterSpacing: "8px",
                color: "#9A1C35",
                textTransform: "uppercase",
                lineHeight: 1.35,
                fontWeight: 600,
              }}
            >
              {truncate(seriesTitle, 46)}
            </div>

            <div
              style={{
                marginTop: "22px",
                fontSize: "46px",
                lineHeight: 1.08,
                fontWeight: 500,
                color: "#1F1F1F",
              }}
            >
              {truncate(title, 72)}
            </div>

            <div
              style={{
                marginTop: "18px",
                fontSize: "24px",
                color: "#9A1C35",
              }}
            >
              {speakerName}
            </div>

            <div
              style={{
                marginTop: "18px",
                border: "1px solid rgba(212,175,55,0.55)",
                borderRadius: "22px",
                padding: "24px 30px",
                fontSize: "30px",
                lineHeight: 1.35,
                color: "#3A3328",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
  style={{
    display: "flex",
    alignItems: "flex-start",
  }}
>
  <span
    style={{
      color: "#C49B2E",
      fontSize: "34px",
      fontWeight: 700,
      marginRight: "14px",
    }}
  >
    “
  </span>
  <span>{quote}</span>
</div>

              <div
                style={{
                  marginTop: "18px",
                  display: "flex",
                  justifyContent: "flex-end",
                  color: "#9A1C35",
                  fontSize: "24px",
                  letterSpacing: "4px",
                }}
              >
                — Al-Maqdisiy
              </div>
            </div>

            <div
              style={{
                marginTop: "auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: "22px",
                color: "#333",
              }}
            >
              <div style={{ maxWidth: "310px", lineHeight: 1.25 }}>
                Siri Pengetahuan Baitulmaqdis kita bermula di sini.
              </div>

              <div
  style={{
    background: "#971A34",
    color: "white",
    borderRadius: "12px",
    padding: "16px 28px",
    fontSize: "22px",
    textAlign: "center",
    lineHeight: 1.15,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  }}
>
  <span>Dengar di</span>
  <span>aqsaseries.com</span>
</div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}