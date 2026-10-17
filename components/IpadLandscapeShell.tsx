"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useLanguage } from "./LanguageProvider";

const ZOOM_MIN = 1;
const ZOOM_MAX = 1.4;
const PHONE_VIEWPORT_WIDTH = 390;
const PHONE_VIEWPORT_HEIGHT = 760;

type FrameMessage =
  | { type: "aqsa:frame-route"; path: string }
  | { type: "aqsa:frame-pinch"; phase: "start" | "move" | "end"; distance: number };

function currentPath() {
  return window.location.pathname + window.location.search + window.location.hash;
}

function isPublicApp(path: string) {
  return !/^\/(admin|share|a)(\/|$)/.test(path);
}

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
  const { language, setLanguage } = useLanguage();
  const [active, setActive] = useState(false);
  const [frameSrc, setFrameSrc] = useState("");
  const [zoom, setZoom] = useState(1);
  const [viewportScale, setViewportScale] = useState(0.85);
  const activeRef = useRef(false);
  const framePathRef = useRef("");
  const zoomRef = useRef(1);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const pinchRef = useRef<{ distance: number; zoom: number } | null>(null);

  useEffect(() => {
    if (window.self !== window.top) return;
    const syncLanguage = (event: StorageEvent) => {
      if (event.key === "aqsa-language" && (event.newValue === "ms" || event.newValue === "en" || event.newValue === "ar")) {
        setLanguage(event.newValue);
      }
    };
    window.addEventListener("storage", syncLanguage);
    return () => window.removeEventListener("storage", syncLanguage);
  }, [setLanguage]);

  // A separate document gives the app a real phone width for media queries,
  // fixed dialogs, navigation, and all other viewport dependent UI.
  useEffect(() => {
    if (window.self === window.top) return;
    document.documentElement.dataset.aqsaEmbedded = "true";
    const notifyRoute = () => {
      window.parent.postMessage({ type: "aqsa:frame-route", path: currentPath() } satisfies FrameMessage, window.location.origin);
    };
    const originalPush = history.pushState;
    const originalReplace = history.replaceState;
    history.pushState = function (...args) {
      originalPush.apply(this, args);
      notifyRoute();
    };
    history.replaceState = function (...args) {
      originalReplace.apply(this, args);
      notifyRoute();
    };
    window.addEventListener("popstate", notifyRoute);
    window.addEventListener("hashchange", notifyRoute);
    notifyRoute();

    const sendPinch = (phase: "start" | "move" | "end", distance = 0) => {
      window.parent.postMessage({ type: "aqsa:frame-pinch", phase, distance } satisfies FrameMessage, window.location.origin);
    };
    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 2) sendPinch("start", touchDistance(event.touches));
    };
    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 2) return;
      event.preventDefault();
      sendPinch("move", touchDistance(event.touches));
    };
    const onTouchEnd = (event: TouchEvent) => {
      if (event.touches.length < 2) sendPinch("end");
    };
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);
    document.addEventListener("touchcancel", onTouchEnd);
    return () => {
      delete document.documentElement.dataset.aqsaEmbedded;
      history.pushState = originalPush;
      history.replaceState = originalReplace;
      window.removeEventListener("popstate", notifyRoute);
      window.removeEventListener("hashchange", notifyRoute);
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  useEffect(() => {
    if (window.self !== window.top) return;
    const orientation = window.matchMedia("(orientation: landscape)");
    const update = () => {
      const preview = process.env.NODE_ENV === "development" && (
        new URLSearchParams(window.location.search).has("preview-ipad") ||
        window.sessionStorage.getItem("aqsa-preview-ipad") === "1"
      );
      if (preview) window.sessionStorage.setItem("aqsa-preview-ipad", "1");
      const shouldFrame = isPublicApp(pathname) && orientation.matches && (isIpad() || preview);
      if (activeRef.current && !shouldFrame && !orientation.matches) {
        window.location.replace(framePathRef.current || currentPath());
        return;
      }
      if (shouldFrame && !activeRef.current) {
        framePathRef.current = currentPath();
        setFrameSrc(framePathRef.current);
      }
      activeRef.current = shouldFrame;
      setActive(shouldFrame);
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
    const onMessage = (event: MessageEvent<FrameMessage>) => {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow) return;
      const message = event.data;
      if (message?.type === "aqsa:frame-route") {
        const path = message.path;
        if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//")) return;
        if (!isPublicApp(path)) {
          window.location.assign(path);
          return;
        }
        framePathRef.current = path;
        if (currentPath() !== path) history.replaceState(history.state, "", path);
      } else if (message?.type === "aqsa:frame-pinch") {
        if (message.phase === "start" && message.distance > 0) {
          pinchRef.current = { distance: message.distance, zoom: zoomRef.current };
        } else if (message.phase === "move" && pinchRef.current && message.distance > 0) {
          const next = clampZoom(pinchRef.current.zoom * message.distance / pinchRef.current.distance);
          zoomRef.current = next;
          setZoom(next);
        } else if (message.phase === "end") {
          pinchRef.current = null;
        }
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [active]);

  useLayoutEffect(() => {
    if (!active || !viewportRef.current) return;
    const viewport = viewportRef.current;
    const updateScale = () => {
      // clientWidth/Height ignore the outer phone zoom, so the two gestures
      // never multiply the app's own sizing unexpectedly.
      const scale = Math.min(viewport.clientWidth / PHONE_VIEWPORT_WIDTH, viewport.clientHeight / PHONE_VIEWPORT_HEIGHT);
      if (scale > 0) setViewportScale(Math.round(scale * 10000) / 10000);
    };
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [active]);

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

  if (!active) return <>{children}</>;

  const copy = ZOOM_COPY[language];
  const style = { "--aqsa-phone-zoom": zoom, "--aqsa-viewport-scale": viewportScale } as CSSProperties;

  return (
    <div className="aqsa-ipad-stage is-active" style={style}>
      <div className="aqsa-ipad-atmosphere" aria-hidden="true" />
      <div className="aqsa-ipad-space">
        <div className="aqsa-iphone" ref={phoneRef}>
          <span className="aqsa-iphone-side aqsa-iphone-side-volume" aria-hidden="true" />
          <span className="aqsa-iphone-side aqsa-iphone-side-power" aria-hidden="true" />
          <div className="aqsa-iphone-screen">
            <div className="aqsa-iphone-viewport" ref={viewportRef}>
              <iframe ref={frameRef} title="Aqsa Series" src={frameSrc} allow="autoplay; clipboard-read; clipboard-write; web-share; fullscreen" allowFullScreen />
            </div>
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
