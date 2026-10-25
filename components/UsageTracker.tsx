"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { trackUsageEvent } from "../lib/usageAnalytics";

const VISITOR_KEY = "aqsa-visitor-counted-v1";

async function recordFirstBrowserVisit() {
  let claim = "";
  try {
    const saved = localStorage.getItem(VISITOR_KEY);
    if (saved === "done" || (Number(saved) > 0 && Date.now() - Number(saved) < 60_000)) return;
    claim = String(Date.now());
    localStorage.setItem(VISITOR_KEY, claim);
    const response = await fetch("/api/visitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    if (!response.ok) throw new Error("Lawatan belum direkodkan");
    localStorage.setItem(VISITOR_KEY, "done");
  } catch {
    try {
      if (claim && localStorage.getItem(VISITOR_KEY) === claim) localStorage.removeItem(VISITOR_KEY);
    } catch { /* Storage mungkin tidak tersedia pada pelayar ini. */ }
  }
}

export default function UsageTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    void recordFirstBrowserVisit();
    void trackUsageEvent("aqsa_page_view", { page: pathname });
  }, [pathname]);

  return null;
}
