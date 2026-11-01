import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aqsa Series TV",
  description: "Siri audio dan video Aqsa Series untuk Smart TV dan Android TV.",
};

export default function TvLayout({ children }: { children: React.ReactNode }) {
  return children;
}
