import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aqsa Series",
  description: "Platform Audio Dakwah & Pembangunan Diri",
  themeColor: "#7A1F2B",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="antialiased bg-[#0f1115] text-white">
        {children}
      </body>
    </html>
  );
}