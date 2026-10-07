"use client";

import { useEffect } from "react";

export default function PWARegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncCompactMode = () => {
      document.documentElement.dataset.compactMode =
        localStorage.getItem("setting-compactMode") === "true" ? "true" : "false";
    };

    syncCompactMode();
    window.addEventListener("aqsa:settings-changed", syncCompactMode);
    window.addEventListener("storage", syncCompactMode);

    const registerSW = async () => {
      if (!("serviceWorker" in navigator)) return;
      try {
        await navigator.serviceWorker.register("/sw.js");
      } catch (error) {
        console.error("SW register gagal:", error);
      }
    };

    registerSW();
    return () => {
      window.removeEventListener("aqsa:settings-changed", syncCompactMode);
      window.removeEventListener("storage", syncCompactMode);
    };
  }, []);

  return null;
}
