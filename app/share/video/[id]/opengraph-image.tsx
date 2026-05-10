import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Aqsa Series";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

type Props = {
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
  shareCaption?: string;
};

function getStringField(fields: any, key: string) {
  return fields?.[key]?.stringValue || "";
}

async function getVideo(id: string): Promise<VideoData | null> {
  try {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

    if (!projectId || !apiKey) return null;

    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/videos/${id}?key=${apiKey}`;

    const res = await fetch(url, {
      next: { revalidate: 60 },
    });

    if (!res.ok) return null;

    const data = await res.json();
    const fields = data.fields;

    return {
      title: getStringField(fields, "title"),
      speaker: getStringField(fields, "speaker"),
      category: getStringField(fields, "category"),
      thumbnailUrl: getStringField(fields, "thumbnailUrl"),
      youtubeId: getStringField(fields, "youtubeId"),
      shareCaption: getStringField(fields, "shareCaption"),
    };
  } catch {
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

function truncate(text: string, max: number) {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max).trim()}...` : text;
}

export default async function Image({ params }: Props) {
  const { id } = await params;
  const video = await getVideo(id);

  const title = truncate(video?.title || "Aqsa Series", 74);
  const speaker = truncate(video?.speaker || "Aqsa Series", 38);
  const category = truncate((video?.category || "Wacana").toUpperCase(), 18);
  const caption = truncate(
    video?.shareCaption ||
      "Siri Pengetahuan Baitulmaqdis kita bermula di sini.",
    120
  );

  const thumbnail = getThumbnail(video);

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
              src={thumbnail}
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
              {category}
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
                  fontSize: 36,
                  lineHeight: 1.08,
                  fontWeight: 950,
                  letterSpacing: -0.8,
                  textTransform: "uppercase",
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
                  Tonton di
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