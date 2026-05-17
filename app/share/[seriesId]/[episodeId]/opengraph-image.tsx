import { ImageResponse } from "next/og";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../../lib/firebase";

export const runtime = "nodejs";

export const alt = "Aqsa Series";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

type Props = {
  params: Promise<{
    seriesId: string;
    episodeId: string;
  }>;
};

type EpisodeData = {
  id?: string;
  title?: string;
  description?: string;
  seriesId?: string;
  speakerId?: string;
  speakerName?: string;
  imageUrl?: string;
  coverUrl?: string;
  shareTitle?: string;
  shareDescription?: string;
  shareNote?: string;
  shareCtaText?: string;
  shareImageUrl?: string;
};

type SeriesData = {
  id?: string;
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

    return {
      id: snap.id,
      ...(snap.data() as EpisodeData),
    };
  } catch (error) {
    console.error("Failed to fetch audio episode OG:", error);
    return null;
  }
}

async function getSeries(seriesId: string): Promise<SeriesData | null> {
  try {
    const ref = doc(db, "series", seriesId);
    const snap = await getDoc(ref);

    if (!snap.exists()) return null;

    return {
      id: snap.id,
      ...(snap.data() as SeriesData),
    };
  } catch (error) {
    console.error("Failed to fetch audio series OG:", error);
    return null;
  }
}

async function getSpeakerName(
  speakerId?: string,
  fallbackName?: string
): Promise<string> {
  if (fallbackName && fallbackName.trim() !== "") return fallbackName;

  if (!speakerId) return "Aqsa Series";

  try {
    const ref = doc(db, "speakers", speakerId);
    const snap = await getDoc(ref);

    if (!snap.exists()) return speakerId;

    const data = snap.data() as SpeakerData;

    return (
      data.displayName ||
      data.fullName ||
      data.name ||
      speakerId ||
      "Aqsa Series"
    );
  } catch {
    return speakerId || "Aqsa Series";
  }
}

function getCoverImage(episode: EpisodeData | null, series: SeriesData | null) {
  return (
    episode?.shareImageUrl ||
    series?.coverUrl ||
    episode?.coverUrl ||
    episode?.imageUrl ||
    "https://aqsaseries.com/logo-icon.png"
  );
}

export default async function Image({ params }: Props) {
  const { seriesId, episodeId } = await params;

  const episode = await getEpisode(episodeId);
  const series = await getSeries(episode?.seriesId || seriesId);
  const speaker = await getSpeakerName(
    episode?.speakerId,
    episode?.speakerName
  );

  const title = truncate(
    episode?.shareTitle || episode?.title || "Episod Aqsa Series",
    74
  );

  const seriesTitle = truncate(series?.title || "Aqsa Series", 42);

  const caption = truncate(
    episode?.shareNote ||
      episode?.shareDescription ||
      episode?.description ||
      "Dengar episod ini di Aqsa Series.",
    120
  );

  const coverImage = getCoverImage(episode, series);

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #070A0F 0%, #111827 45%, #3A0D18 100%)",
          fontFamily: "Arial, sans-serif",
          overflow: "hidden",
          padding: "42px",
        }}
      >
        <div
          style={{
            width: "1116px",
            height: "546px",
            display: "flex",
            background: "#F4EBDD",
            borderRadius: "34px",
            overflow: "hidden",
            border: "2px solid rgba(212,175,55,0.55)",
            boxShadow: "0 30px 90px rgba(0,0,0,0.55)",
          }}
        >
          {/* Left visual */}
          <div
            style={{
              width: "44%",
              height: "100%",
              position: "relative",
              display: "flex",
              background: "#111",
            }}
          >
            <img
              src={coverImage}
              alt={title}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />

            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.58) 100%)",
              }}
            />

            <div
              style={{
                position: "absolute",
                left: 28,
                top: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(7,10,15,0.76)",
                border: "1px solid rgba(212,175,55,0.55)",
                borderRadius: 18,
                padding: "10px 14px",
              }}
            >
              <img
                src="https://aqsaseries.com/logo-icon.png"
                alt="Aqsa Series"
                style={{
                  width: 165,
                  height: 48,
                  objectFit: "contain",
                }}
              />
            </div>

            <div
              style={{
                position: "absolute",
                left: 28,
                bottom: 28,
                display: "flex",
                borderRadius: 999,
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid rgba(212,175,55,0.65)",
                background: "rgba(7,10,15,0.78)",
                color: "#E8D28A",
                fontSize: 15,
                letterSpacing: 4,
                fontWeight: 900,
                padding: "10px 18px",
              }}
            >
              AUDIO
            </div>
          </div>

          {/* Right content */}
          <div
            style={{
              width: "56%",
              height: "100%",
              padding: "32px 44px 42px 44px",
              display: "flex",
              flexDirection: "column",
              color: "#111111",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  fontSize: 20,
                  color: "#8A1F32",
                  fontWeight: 900,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  marginBottom: 12,
                }}
              >
                {seriesTitle}
              </div>

              <div
                style={{
                  fontSize: 40,
                  lineHeight: 1.08,
                  fontWeight: 950,
                  letterSpacing: -0.8,
                  color: "#111111",
                }}
              >
                {title}
              </div>

              <div
                style={{
                  marginTop: 14,
                  color: "#8A1F32",
                  fontSize: 21,
                  fontWeight: 900,
                }}
              >
                {speaker}
              </div>
            </div>

            <div
              style={{
                border: "1px solid rgba(176,138,37,0.5)",
                background: "#FFF8E8",
                borderRadius: 24,
                padding: "24px 28px",
                display: "flex",
              }}
            >
              <div
                style={{
                  color: "#B08A25",
                  fontSize: 48,
                  lineHeight: 1,
                  fontFamily: "serif",
                  marginRight: 18,
                }}
              >
                “
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flex: 1,
                }}
              >
                <div
                  style={{
                    color: "#2D2410",
                    fontSize: 24,
                    lineHeight: 1.32,
                    fontWeight: 900,
                    fontStyle: "italic",
                  }}
                >
                  {caption}
                </div>

                <div
                  style={{
                    marginTop: 18,
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    gap: 14,
                  }}
                >
                  <div
                    style={{
                      width: 72,
                      height: 2,
                      background: "rgba(176,138,37,0.7)",
                    }}
                  />

                  <div
                    style={{
                      color: "#8A1F32",
                      fontSize: 22,
                      fontWeight: 950,
                      letterSpacing: 2,
                    }}
                  >
                    — Al-Maqdisiy
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                color: "#1B1B1B",
                fontSize: 18,
                gap: 24,
              }}
            >
              <div
                style={{
                  flex: 1,
                  lineHeight: 1.25,
                }}
              >
                Siri Pengetahuan Baitulmaqdis kita bermula di sini.
              </div>

              <div
                style={{
                  background: "#8A1F32",
                  color: "#ffffff",
                  padding: "10px 20px",
                  borderRadius: 14,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 190,
                  lineHeight: 1.1,
                  boxShadow: "0 12px 24px rgba(138,31,50,0.28)",
                }}
              >
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                  }}
                >
                  Dengar di
                </div>

                <div
                  style={{
                    marginTop: 4,
                    fontSize: 19,
                    fontWeight: 950,
                  }}
                >
                  aqsaseries.com
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}