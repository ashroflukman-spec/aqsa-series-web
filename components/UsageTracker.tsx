"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { trackUsageEvent } from "../lib/usageAnalytics";

export default function UsageTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    void trackUsageEvent("aqsa_page_view", { page: pathname });
  }, [pathname]);

  return null;
}
