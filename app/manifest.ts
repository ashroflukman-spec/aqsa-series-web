import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Aqsa Series",
    short_name: "Aqsa Series",
    description: "Platform audio Aqsa Series",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0f1115",
    theme_color: "#0f1115",
    orientation: "portrait",
    icons: [
      {
        src: "/icon.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/apple-icon.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
