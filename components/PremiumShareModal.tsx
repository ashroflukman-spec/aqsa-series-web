"use client";

import { useState } from "react";
import { X, Link, Send, Facebook, Share2, Copy } from "lucide-react";

type PremiumShareModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  speaker?: string;
  category?: string;
  thumbnail?: string;
  shareUrl: string;
};

export default function PremiumShareModal({
  open,
  onClose,
  title,
  speaker,
  category,
  thumbnail,
  shareUrl,
}: PremiumShareModalProps) {
  const [caption, setCaption] = useState(
    "Kita wajib tahu apa yang sedang berlaku di Baitulmaqdis. Ilmu adalah langkah pertama untuk berdiri mempertahankannya."
  );

  if (!open) return null;

  const tagline = "Siri Pengetahuan Baitulmaqdis kita bermula di sini.";

  const fullMessage = `${caption}\n\n${tagline}\n\nTonton di Aqsa Series:\n${shareUrl}`;

  const encodedMessage = encodeURIComponent(fullMessage);
  const encodedUrl = encodeURIComponent(shareUrl);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(fullMessage);
    alert("Caption dan link berjaya disalin.");
  };

  const nativeShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title,
        text: `${caption}\n\n${tagline}`,
        url: shareUrl,
      });
    } else {
      copyToClipboard();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[#10131a] border border-white/10 shadow-2xl text-white">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="text-lg font-semibold">Kongsi Kandungan</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="flex gap-3">
            {thumbnail && (
              <img
                src={thumbnail}
                alt={title}
                className="w-24 h-16 object-cover rounded-xl"
              />
            )}
            <div className="flex-1">
              {category && (
                <div className="inline-flex px-2 py-1 rounded-full border border-yellow-500/40 text-yellow-400 text-[10px] tracking-widest mb-1">
                  {category}
                </div>
              )}
              <h3 className="font-semibold text-sm leading-tight line-clamp-2">
                {title}
              </h3>
              {speaker && (
                <p className="text-xs text-white/50 mt-1">{speaker}</p>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm text-white/80">
              Mesej / Muhasabah Caption
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value.slice(0, 300))}
              maxLength={300}
              className="mt-2 w-full min-h-[120px] rounded-2xl bg-white/5 border border-white/10 p-4 text-sm outline-none focus:border-red-500/70"
              placeholder="Tulis mesej atau muhasabah anda..."
            />
            <div className="text-right text-xs text-white/40 mt-1">
              {caption.length}/300
            </div>
          </div>

          <div>
            <p className="text-sm text-white/80 mb-2">Pratonton Kad Kongsi</p>

            <div className="overflow-hidden rounded-2xl bg-[#f4eadb] text-black border border-white/10">
              {thumbnail && (
                <div className="relative">
                  <img
                    src={thumbnail}
                    alt={title}
                    className="w-full h-44 object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-[#f4eadb]/80" />
                </div>
              )}

              <div className="p-4 space-y-3">
                <h3 className="font-black uppercase leading-tight text-xl">
                  {title}
                </h3>

                {speaker && (
                  <p className="font-semibold text-red-800 text-sm">
                    {speaker}
                  </p>
                )}

                <p className="text-sm leading-relaxed">{caption}</p>

                <p className="text-sm text-center">
                  {tagline}
                </p>

                <div className="flex justify-center">
                  <div className="px-4 py-2 rounded-lg bg-red-800 text-white text-sm font-medium">
                    Tonton di Aqsa Series
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm text-white/80 mb-3">Kongsi ke</p>

            <div className="grid grid-cols-5 gap-3 text-center text-xs">
              <button
                onClick={copyToClipboard}
                className="space-y-2"
              >
                <div className="mx-auto w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center">
                  <Copy size={20} />
                </div>
                <span>Salin</span>
              </button>

              <a
                href={`https://wa.me/?text=${encodedMessage}`}
                target="_blank"
                className="space-y-2"
              >
                <div className="mx-auto w-11 h-11 rounded-2xl bg-green-500 flex items-center justify-center">
                  <Send size={20} />
                </div>
                <span>WhatsApp</span>
              </a>

              <a
                href={`https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(caption + "\n\n" + tagline)}`}
                target="_blank"
                className="space-y-2"
              >
                <div className="mx-auto w-11 h-11 rounded-2xl bg-sky-500 flex items-center justify-center">
                  <Send size={20} />
                </div>
                <span>Telegram</span>
              </a>

              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
                target="_blank"
                className="space-y-2"
              >
                <div className="mx-auto w-11 h-11 rounded-2xl bg-blue-600 flex items-center justify-center">
                  <Facebook size={20} />
                </div>
                <span>Facebook</span>
              </a>

              <button
                onClick={nativeShare}
                className="space-y-2"
              >
                <div className="mx-auto w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center">
                  <Share2 size={20} />
                </div>
                <span>Lainnya</span>
              </button>
            </div>
          </div>

          <div className="text-xs text-white/40 leading-relaxed bg-white/5 rounded-2xl p-3">
            Deep link akan membawa pengguna terus ke halaman kandungan ini di Aqsa Series.
          </div>
        </div>
      </div>
    </div>
  );
}