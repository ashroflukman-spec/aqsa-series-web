"use client";

import { usePathname } from "next/navigation";
import { AudioProvider } from "./AudioProvider";
import { AuthProvider } from "./AuthProvider";
import BottomNav from "./BottomNav";
import EpisodeSignInOffer from "./EpisodeSignInOffer";
import IpadLandscapeShell from "./IpadLandscapeShell";
import InstallAppCard from "./InstallAppCard";
import { InstallProvider } from "./InstallProvider";
import MiniPlayer from "./MiniPlayer";
import PWARegister from "./PWARegister";
import UsageTracker from "./UsageTracker";

export default function AppRouteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // The TV route has its own remote navigation and playback surface.
  if (pathname === "/tv" || pathname.startsWith("/tv/")) {
    return <><UsageTracker />{children}</>;
  }

  return (
    <IpadLandscapeShell>
      <InstallProvider>
        <AuthProvider>
          <AudioProvider>
            <UsageTracker />
            <EpisodeSignInOffer />
            <PWARegister />
            <InstallAppCard surface="welcome" />
            {children}
            <MiniPlayer />
            <BottomNav />
          </AudioProvider>
        </AuthProvider>
      </InstallProvider>
    </IpadLandscapeShell>
  );
}
