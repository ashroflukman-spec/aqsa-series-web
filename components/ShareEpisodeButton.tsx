"use client";

import { useState } from "react";
import { Copy, Facebook, Send, Share2, X } from "lucide-react";
import { useLanguage } from "./LanguageProvider";

const COPY = {
  ms: { tagline: "Siri Pengetahuan Baitulmaqdis kita bermula di sini.", listen: "Dengar di Aqsa Series:", share: "Kongsi Episod", copy: "Salin", copied: "Disalin", more: "Lainnya", hint: "Pautan ini akan membawa pengguna terus ke halaman episod audio di Aqsa Series.", linkLabel: "Pautan episod", copyFailed: "Salinan automatik gagal. Sila salin pautan di bawah.", shareFailed: "Menu kongsi tidak dapat dibuka. Gunakan Salin atau pilihan aplikasi di atas.", copiedForMore: "Mesej disalin. Tampal dalam aplikasi pilihan anda." },
  en: { tagline: "Explore Baitulmaqdis with Aqsa Series.", listen: "Listen on Aqsa Series:", share: "Share Episode", copy: "Copy", copied: "Copied", more: "More", hint: "This link opens the audio episode on Aqsa Series.", linkLabel: "Episode link", copyFailed: "Automatic copy failed. Please copy the link below.", shareFailed: "The share menu could not open. Use Copy or one of the apps above.", copiedForMore: "Message copied. Paste it into your chosen app." },
  ar: { tagline: "اكتشف بيت المقدس مع Aqsa Series.", listen: "استمع عبر Aqsa Series:", share: "مشاركة الحلقة", copy: "نسخ", copied: "تم النسخ", more: "المزيد", hint: "يفتح هذا الرابط الحلقة الصوتية على Aqsa Series.", linkLabel: "رابط الحلقة", copyFailed: "تعذر النسخ التلقائي. يرجى نسخ الرابط أدناه.", shareFailed: "تعذر فتح قائمة المشاركة. استخدم النسخ أو أحد التطبيقات أعلاه.", copiedForMore: "تم نسخ الرسالة. الصقها في التطبيق الذي تريده." },
} as const;

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
  const [feedback, setFeedback] = useState("");
  const { language } = useLanguage();
  const copy = COPY[language];

  const tagline = copy.tagline;

  // Keep the prepared message short; long episode descriptions can exceed share URL limits.
  const trimmedDescription = description?.trim() || "";
  const shortDescription = trimmedDescription.length <= 260 ? trimmedDescription : "";
  const shareText = `${title}${
    shortDescription ? `\n\n${shortDescription}` : ""
  }\n\n${tagline}\n\n${copy.listen}\n${shareUrl}`;

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(
    shareUrl
  )}&text=${encodeURIComponent(`${title}\n\n${tagline}`)}`;

  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
    shareUrl
  )}`;

  async function handleCopy() {
    setFeedback("");
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      return true;
    } catch {
      setFeedback(copy.copyFailed);
      return false;
    }
  }

  async function handleNativeShare() {
    try {
      if (navigator.share) {
        await navigator.share({
          title,
          text: shortDescription || title,
          url: shareUrl,
        });
        setOpen(false);
        return;
      }

      if (await handleCopy()) setFeedback(copy.copiedForMore);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setFeedback(copy.shareFailed);
    }
  }

  return (
    <>
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => { setFeedback(""); setOpen(true); }}
          aria-label={copy.share}
          className="flex h-14 w-14 items-center justify-center rounded-full border border-[#7A1F2B]/70 bg-[#7A1F2B]/20 text-white shadow-[0_0_24px_rgba(122,31,43,0.35)] transition duration-300 hover:scale-105 hover:bg-[#7A1F2B]/35 active:scale-95"
        >
          <Share2 size={21} />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/70 px-4 pb-5 backdrop-blur-sm sm:items-center sm:pb-0" role="presentation" onClick={() => setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="episode-share-heading" className="max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto rounded-3xl border border-white/10 bg-[#11141b] p-5 text-white shadow-2xl" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[#D4AF37]">
                  Aqsa Series
                </p>
                <h2 id="episode-share-heading" className="mt-1 text-lg font-bold">{copy.share}</h2>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={language === "ms" ? "Tutup" : language === "ar" ? "إغلاق" : "Close"}
                autoFocus
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
                <span>{copied ? copy.copied : copy.copy}</span>
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
                <span>{copy.more}</span>
              </button>
            </div>

            <p className="mt-5 rounded-2xl bg-white/[0.04] p-3 text-xs leading-relaxed text-white/40">
              {copy.hint}
            </p>
            {feedback && <p role="status" className="mt-3 rounded-xl border border-[#D4AF37]/25 bg-[#D4AF37]/10 p-3 text-xs leading-relaxed text-[#E8D28A]">{feedback}</p>}
            {feedback === copy.copyFailed && <input aria-label={copy.linkLabel} readOnly value={shareUrl} onFocus={(event) => event.currentTarget.select()} className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-white" />}
          </div>
        </div>
      )}
    </>
  );
}
