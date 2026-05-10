"use client";

import { useState } from "react";

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
  const [copied, setCopied] = useState(false);

  const shareText = `${title}${description ? `\n\n${description}` : ""}\n\nDengar sekarang di Aqsa Series:\n${shareUrl}`;

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

      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(
    shareUrl
  )}&text=${encodeURIComponent(title)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
    shareUrl
  )}`;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleNativeShare}
        className="w-full rounded-[22px] border border-white/12 bg-[#24272d] px-4 py-3 text-sm font-semibold text-white/90 shadow-[0_10px_26px_rgba(0,0,0,0.14)] transition duration-300 hover:bg-[#2c3037] active:scale-[0.985]"
      >
        Share Episod
      </button>

      <div className="grid grid-cols-2 gap-2">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-[18px] border border-white/10 bg-white/[0.04] px-3 py-2 text-center text-xs text-white/80"
        >
          WhatsApp
        </a>

        <a
          href={telegramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-[18px] border border-white/10 bg-white/[0.04] px-3 py-2 text-center text-xs text-white/80"
        >
          Telegram
        </a>

        <a
          href={facebookUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-[18px] border border-white/10 bg-white/[0.04] px-3 py-2 text-center text-xs text-white/80"
        >
          Facebook
        </a>

        <button
          type="button"
          onClick={handleCopy}
          className="rounded-[18px] border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/80"
        >
          {copied ? "Copied" : "Copy Link"}
        </button>
      </div>
    </div>
  );
}