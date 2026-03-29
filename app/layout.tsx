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
    icon: "/icon.png",
    apple: "/icon.png",
    shortcut: "/icon.png",
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
      <body className="bg-gradient-to-b from-[#0f1115] to-[#1a1d24]">
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