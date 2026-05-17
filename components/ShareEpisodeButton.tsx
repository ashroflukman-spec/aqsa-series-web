"use client";

import { useState } from "react";
import { Copy, Facebook, Send, Share2, X } from "lucide-react";

type Props = {
  title: string;
  description?: string;
  shareUrl: string;
};

export default function ShareEpisodeButton({
  title,
  description,
  shareUrl,
}: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const tagline = "Siri Pengetahuan Baitulmaqdis kita bermula di sini.";

  const shareText = `${title}${
    description ? `\n\n${description}` : ""
  }\n\n${tagline}\n\nDengar di Aqsa Series:\n${shareUrl}`;

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(
    shareUrl
  )}&text=${encodeURIComponent(`${title}\n\n${tagline}`)}`;

  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
    shareUrl
  )}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function handleNativeShare() {
    try {
      if (navigator.share) {
        await navigator.share({
          title,
          text: description || title,
          url: shareUrl,
        });
        return;
      }

      await handleCopy();
    } catch {}
  }

  return (
    <>
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Kongsi episod"
          className="flex h-14 w-14 items-center justify-center rounded-full border border-[#7A1F2B]/70 bg-[#7A1F2B]/20 text-white shadow-[0_0_24px_rgba(122,31,43,0.35)] transition duration-300 hover:scale-105 hover:bg-[#7A1F2B]/35 active:scale-95"
        >
          <Share2 size={21} />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/70 px-4 pb-5 backdrop-blur-sm sm:items-center sm:pb-0">
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#11141b] p-5 text-white shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[#D4AF37]">
                  Aqsa Series
                </p>
                <h2 className="mt-1 text-lg font-bold">Kongsi Episod</h2>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/80"
              >
                <X size={18} />
              </button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <h3 className="line-clamp-2 text-sm font-semibold leading-snug">
                {title}
              </h3>

              {description && (
                <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-white/55">
                  {description}
                </p>
              )}

              <p className="mt-3 text-xs text-[#D4AF37]">{tagline}</p>
            </div>

            <div className="mt-5 grid grid-cols-5 gap-3 text-center text-xs">
              <button type="button" onClick={handleCopy} className="space-y-2">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                  <Copy size={20} />
                </div>
                <span>{copied ? "Copied" : "Salin"}</span>
              </button>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="space-y-2"
              >
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-green-500">
                  <Send size={20} />
                </div>
                <span>WhatsApp</span>
              </a>

              <a
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="space-y-2"
              >
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500">
                  <Send size={20} />
                </div>
                <span>Telegram</span>
              </a>

              <a
                href={facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="space-y-2"
              >
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600">
                  <Facebook size={20} />
                </div>
                <span>Facebook</span>
              </a>

              <button
                type="button"
                onClick={handleNativeShare}
                className="space-y-2"
              >
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                  <Share2 size={20} />
                </div>
                <span>Lainnya</span>
              </button>
            </div>

            <p className="mt-5 rounded-2xl bg-white/[0.04] p-3 text-xs leading-relaxed text-white/40">
              Pautan ini akan membawa pengguna terus ke halaman episod audio di
              Aqsa Series.
            </p>
          </div>
        </div>
      )}
    </>
  );
}