"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useLanguage } from "./LanguageProvider";

const ZOOM_MIN = 1;
const ZOOM_MAX = 1.8;

const ZOOM_COPY = {
  ms: { controls: "Saiz paparan telefon", smaller: "Kecilkan paparan", reset: "Pulihkan saiz asal", larger: "Besarkan paparan" },
  en: { controls: "Phone display size", smaller: "Zoom out", reset: "Reset zoom", larger: "Zoom in" },
  ar: { controls: "حجم عرض الهاتف", smaller: "تصغير العرض", reset: "إعادة الحجم الأصلي", larger: "تكبير العرض" },
} as const;

function isIpad() {
  return /\biPad\b/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function clampZoom(value: number) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(value * 100) / 100));
}

function touchDistance(touches: TouchList) {
  const first = touches.item(0);
  const second = touches.item(1);
  return first && second ? Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY) : 0;
}

export default function IpadLandscapeShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { language } = useLanguage();
  const [active, setActive] = useState(false);
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  const phoneRef = useRef<HTMLDivElement>(null);
  const pinchRef = useRef<{ distance: number; zoom: number } | null>(null);

  useEffect(() => {
    const orientation = window.matchMedia("(orientation: landscape)");
    const update = () => {
      const publicApp = !/^\/(admin|share|a)(\/|$)/.test(pathname);
      const preview = process.env.NODE_ENV === "development" && (
        new URLSearchParams(window.location.search).has("preview-ipad") ||
        window.sessionStorage.getItem("aqsa-preview-ipad") === "1"
      );
      if (preview) window.sessionStorage.setItem("aqsa-preview-ipad", "1");
      setActive(publicApp && orientation.matches && (isIpad() || preview));
    };

    update();
    orientation.addEventListener("change", update);
    window.addEventListener("resize", update);
    return () => {
      orientation.removeEventListener("change", update);
      window.removeEventListener("resize", update);
    };
  }, [pathname]);

  useEffect(() => {
    if (!active) {
      pinchRef.current = null;
      return;
    }

    const phone = phoneRef.current;
    if (!phone) return;

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 2) {
        pinchRef.current = { distance: touchDistance(event.touches), zoom: zoomRef.current };
      }
    };
    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 2 || !pinchRef.current) return;
      event.preventDefault();
      const distance = touchDistance(event.touches);
      if (!pinchRef.current.distance || !distance) return;
      const next = clampZoom(pinchRef.current.zoom * distance / pinchRef.current.distance);
      zoomRef.current = next;
      setZoom(next);
    };
    const onTouchEnd = (event: TouchEvent) => {
      if (event.touches.length < 2) pinchRef.current = null;
    };

    phone.addEventListener("touchstart", onTouchStart, { passive: true });
    phone.addEventListener("touchmove", onTouchMove, { passive: false });
    phone.addEventListener("touchend", onTouchEnd);
    phone.addEventListener("touchcancel", onTouchEnd);
    return () => {
      phone.removeEventListener("touchstart", onTouchStart);
      phone.removeEventListener("touchmove", onTouchMove);
      phone.removeEventListener("touchend", onTouchEnd);
      phone.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [active]);

  function changeZoom(value: number) {
    const next = clampZoom(value);
    zoomRef.current = next;
    setZoom(next);
  }

  const copy = ZOOM_COPY[language];
  const style = { "--aqsa-phone-zoom": zoom } as CSSProperties;

  return (
    <div className={`aqsa-ipad-stage${active ? " is-active" : ""}`} style={style}>
      <div className="aqsa-ipad-atmosphere" aria-hidden="true" />
      <div className="aqsa-ipad-space">
        <div className="aqsa-iphone" ref={phoneRef}>
          <span className="aqsa-iphone-side aqsa-iphone-side-volume" aria-hidden="true" />
          <span className="aqsa-iphone-side aqsa-iphone-side-power" aria-hidden="true" />
          <div className="aqsa-iphone-screen">
            {children}
          </div>
          <span className="aqsa-iphone-island" aria-hidden="true" />
          <span className="aqsa-iphone-home-indicator" aria-hidden="true" />
        </div>
      </div>
      <div className="aqsa-ipad-zoom" role="group" aria-label={copy.controls}>
        <button type="button" aria-label={copy.smaller} disabled={zoom <= ZOOM_MIN} onClick={() => changeZoom(zoom - 0.15)}>−</button>
        <button type="button" aria-label={copy.reset} onClick={() => changeZoom(1)}>{Math.round(zoom * 100)}%</button>
        <button type="button" aria-label={copy.larger} disabled={zoom >= ZOOM_MAX} onClick={() => changeZoom(zoom + 0.15)}>+</button>
      </div>
    </div>
  );
}
