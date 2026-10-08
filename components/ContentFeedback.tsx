"use client";

import { AlertCircle, RefreshCw, SearchX, WifiOff } from "lucide-react";

type ContentFeedbackProps = {
  kind: "loading" | "error" | "empty";
  title: string;
  detail?: string;
  actionLabel?: string;
  onAction?: () => void;
  offline?: boolean;
};

export default function ContentFeedback({
  kind,
  title,
  detail,
  actionLabel,
  onAction,
  offline = false,
}: ContentFeedbackProps) {
  if (kind === "loading") {
    return (
      <div role="status" aria-live="polite" className="rounded-[24px] border border-white/10 bg-[#1f232b] p-5">
        <span className="sr-only">{title}</span>
        <div aria-hidden="true" className="space-y-4 animate-pulse motion-reduce:animate-none">
          <div className="h-36 rounded-2xl bg-white/10" />
          <div className="h-4 w-3/4 rounded-full bg-white/10" />
          <div className="h-3 w-1/2 rounded-full bg-white/[0.07]" />
        </div>
      </div>
    );
  }

  const Icon = kind === "error" ? (offline ? WifiOff : AlertCircle) : SearchX;

  return (
    <div role={kind === "error" ? "alert" : "status"} className="rounded-[24px] border border-white/10 bg-[#1f232b] p-5 text-start shadow-[0_12px_32px_rgba(0,0,0,0.16)]">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#D4AF37]/25 bg-[#D4AF37]/10 text-[#E8D28A]">
          <Icon size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold leading-snug text-white">{title}</p>
          {detail && <p className="mt-1.5 text-sm leading-6 text-gray-300">{detail}</p>}
        </div>
      </div>
      {onAction && actionLabel && (
        <button type="button" onClick={onAction} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-4 py-2.5 text-sm font-semibold text-[#F0DEA5] transition hover:bg-[#D4AF37]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8D28A]">
          {kind === "error" && <RefreshCw size={16} aria-hidden="true" />}
          {actionLabel}
        </button>
      )}
    </div>
  );
}
