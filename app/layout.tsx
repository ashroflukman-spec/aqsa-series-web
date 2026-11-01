import "./globals.css";
import type { Metadata, Viewport } from "next";
import { LanguageProvider } from "../components/LanguageProvider";
import AppRouteShell from "../components/AppRouteShell";
import type { AppLanguage } from "../components/LanguageProvider";
import { cookies } from "next/headers";

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
    apple: "/apple-icon.png",
    shortcut: "/icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f1115",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const savedLanguage = (await cookies()).get("aqsa-language")?.value;
  const language: AppLanguage | null = savedLanguage === "ms" || savedLanguage === "en" || savedLanguage === "ar" ? savedLanguage : null;
  return (
    <html lang={language || "ms"} dir={language === "ar" ? "rtl" : "ltr"}>
      <body className="bg-gradient-to-b from-[#0f1115] to-[#1a1d24]">
        <LanguageProvider initialLanguage={language}>
          <AppRouteShell>{children}</AppRouteShell>
        </LanguageProvider>
      </body>
    </html>
  );
}
