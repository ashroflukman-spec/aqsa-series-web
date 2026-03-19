import "./globals.css";
import type { Metadata, Viewport } from "next";
import { AudioProvider } from "../components/AudioProvider";
import { AuthProvider } from "../components/AuthProvider";
import MiniPlayer from "../components/MiniPlayer";
import BottomNav from "../components/BottomNav";
import PWARegister from "../components/PWARegister";

export const metadata: Metadata = {
  title: "Aqsa Series",
  description: "Platform audio Aqsa Series",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Aqsa Series",
  },
  icons: {
    icon: [
      { url: "/icon?size=192", sizes: "192x192", type: "image/png" },
      { url: "/icon?size=512", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
    shortcut: ["/icon?size=192"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0f1115",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#0f1115] text-white">
        <AuthProvider>
          <AudioProvider>
            <PWARegister />
            {children}
            <MiniPlayer />
            <BottomNav />
          </AudioProvider>
        </AuthProvider>
      </body>
    </html>
  );
}