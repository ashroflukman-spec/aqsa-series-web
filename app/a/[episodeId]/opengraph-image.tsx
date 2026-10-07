import { GET as renderEpisodeImage } from "./og.png/route";

export const runtime = "nodejs";
export const alt = "Episod Aqsa Series";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image({ params }: { params: Promise<{ episodeId: string }> }) {
  return renderEpisodeImage(new Request("https://www.aqsaseries.com"), { params });
}
