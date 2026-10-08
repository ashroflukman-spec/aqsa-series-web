"use client";

import Image from "next/image";
import { Play } from "lucide-react";
import { useRef, useState } from "react";
import { useLanguage } from "./LanguageProvider";
import { localizeContent, type TranslatableContent } from "../lib/localizedContent";

const COPY = {
  ms: { series: "Siri audio", episode: "Episod", swipe: "Leret untuk lihat", viewSeries: "Lihat siri", listen: "Dengar episod", seriesCard: "Kad siri", of: "daripada", previous: "Kad sebelumnya bagi", next: "Kad seterusnya bagi", openSeries: "Buka siri", openEpisode: "Buka episod", carousel: "Kad siri dan episod" },
  en: { series: "Audio series", episode: "Episode", swipe: "Swipe to explore", viewSeries: "View series", listen: "Listen to episode", seriesCard: "Series card", of: "of", previous: "Previous card for", next: "Next card for", openSeries: "Open series", openEpisode: "Open episode", carousel: "Series and episode cards" },
  ar: { series: "سلسلة صوتية", episode: "الحلقة", swipe: "اسحب لاستكشاف الحلقات", viewSeries: "عرض السلسلة", listen: "استمع إلى الحلقة", seriesCard: "بطاقة السلسلة", of: "من", previous: "البطاقة السابقة في", next: "البطاقة التالية في", openSeries: "افتح السلسلة", openEpisode: "افتح الحلقة", carousel: "بطاقات السلسلة والحلقات" },
} as const;

export type CarouselEpisode = {
  id: string;
  title: string;
  seriesId: string;
  coverUrl?: string;
  imageUrl?: string;
  durationSeconds?: number;
  translations?: TranslatableContent["translations"];
};

type Props = {
  series: {
    id: string;
    title: string;
    coverUrl: string;
    translations?: TranslatableContent["translations"];
  };
  speakerName: string;
  episodes: CarouselEpisode[];
  onOpenSeries: () => void;
  onOpenEpisode: (episode: CarouselEpisode) => void;
};

function formatDuration(seconds = 0) {
  if (seconds <= 0) return "";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

export default function SeriesEpisodeCarousel({
  series,
  speakerName,
  episodes,
  onOpenSeries,
  onOpenEpisode,
}: Props) {
  const { language } = useLanguage();
  const copy = COPY[language];
  const localizedSeries = localizeContent("series", series, language);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pointerStartXRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const slideCount = episodes.length + 1;
  const episodeCount = language === "ar" ? `${copy.episode} ${episodes.length}` : `${episodes.length} ${copy.episode.toLowerCase()}`;

  function scrollToSlide(index: number) {
    const scroller = scrollerRef.current;
    const firstSlide = scroller?.children[0] as HTMLElement | undefined;
    const target = scroller?.children[index] as HTMLElement | undefined;
    if (!scroller || !firstSlide || !target) return;

    scroller.scrollTo({
      left: target.offsetLeft - firstSlide.offsetLeft,
      behavior: "smooth",
    });
    setActiveSlide(index);
  }

  function handleScroll() {
    const scroller = scrollerRef.current;
    const firstSlide = scroller?.children[0] as HTMLElement | undefined;
    if (!scroller || !firstSlide) return;

    const start = firstSlide.offsetLeft;
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    Array.from(scroller.children).forEach((child, index) => {
      const distance = Math.abs((child as HTMLElement).offsetLeft - start - scroller.scrollLeft);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    setActiveSlide(nearestIndex);
  }

  return (
    <section aria-label={`${copy.series} ${localizedSeries.title}`}>
      <div
        ref={scrollerRef}
        dir="ltr"
        onScroll={handleScroll}
        onPointerDown={(event) => {
          pointerStartXRef.current = event.clientX;
          suppressClickRef.current = false;
        }}
        onPointerMove={(event) => {
          if (
            pointerStartXRef.current !== null &&
            Math.abs(event.clientX - pointerStartXRef.current) > 8
          ) {
            suppressClickRef.current = true;
          }
        }}
        onPointerUp={() => {
          pointerStartXRef.current = null;
          window.setTimeout(() => {
            suppressClickRef.current = false;
          }, 0);
        }}
        onPointerCancel={() => {
          pointerStartXRef.current = null;
          suppressClickRef.current = false;
        }}
        onClickCapture={(event) => {
          if (suppressClickRef.current) {
            event.preventDefault();
            event.stopPropagation();
            suppressClickRef.current = false;
          }
        }}
        onDragStart={(event) => event.preventDefault()}
        role="region"
        aria-roledescription="carousel"
        aria-label={`${copy.carousel} ${localizedSeries.title}`}
        tabIndex={0}
        className="-mx-6 flex snap-x snap-mandatory scroll-px-6 gap-4 overflow-x-auto px-6 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <button
          type="button"
          onClick={onOpenSeries}
          aria-label={`${copy.openSeries} ${localizedSeries.title}`}
          dir={language === "ar" ? "rtl" : "ltr"}
          className="group w-[92%] shrink-0 snap-start overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.04] text-start shadow-[0_14px_40px_rgba(0,0,0,0.22)] transition duration-300 hover:border-white/15 hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]"
        >
          <div className="relative h-48 overflow-hidden bg-gradient-to-br from-[#20252f] to-[#12151b]">
            {series.coverUrl && (
              <Image
                src={series.coverUrl}
                alt=""
                fill
                unoptimized
                sizes="(max-width: 448px) 92vw, 350px"
                draggable={false}
                className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
            <span className="absolute start-4 top-4 rounded-full border border-white/20 bg-black/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white backdrop-blur">
              {copy.series}
            </span>
          </div>
          <div className="flex min-h-[144px] flex-col p-4">
            <span className="line-clamp-2 text-[19px] font-semibold leading-[1.28] text-white">
              {localizedSeries.title}
            </span>
            <span className="mt-1.5 line-clamp-1 text-sm text-white/75">
              {language === "ms" ? "Penyampai" : language === "en" ? "Speaker" : "المتحدث"} · {speakerName}
            </span>
            <span className="mt-auto flex items-center justify-between pt-4 text-xs font-medium text-[#E8D28A]">
              <span>{episodes.length > 0 ? `${episodeCount} · ${copy.swipe}` : copy.viewSeries}</span>
              <span aria-hidden="true">{language === "ar" ? "←" : "→"}</span>
            </span>
          </div>
        </button>

        {episodes.map((episode, index) => {
          const localizedEpisode = localizeContent("episode", episode, language);
          const coverUrl = episode.imageUrl || episode.coverUrl || series.coverUrl;
          const duration = formatDuration(episode.durationSeconds);

          return (
            <button
              key={episode.id}
              type="button"
              onClick={() => onOpenEpisode(episode)}
              aria-label={`${copy.openEpisode} ${index + 1}: ${localizedEpisode.title}`}
              dir={language === "ar" ? "rtl" : "ltr"}
              className="group w-[92%] shrink-0 snap-start overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.04] text-start shadow-[0_14px_40px_rgba(0,0,0,0.22)] transition duration-300 hover:border-white/15 hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]"
            >
              <div className="relative h-48 overflow-hidden bg-gradient-to-br from-[#20252f] to-[#12151b]">
                {coverUrl && (
                  <Image
                    src={coverUrl}
                    alt=""
                    fill
                    unoptimized
                    sizes="(max-width: 448px) 92vw, 350px"
                    draggable={false}
                    className="absolute inset-0 h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-[1.03]"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-black/20" />
                <span className="absolute start-4 top-4 rounded-full border border-[#D4AF37]/35 bg-black/50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#E8D28A] backdrop-blur">
                  {copy.episode} {index + 1}
                </span>
                <span
                  aria-hidden="true"
                  className="absolute bottom-4 end-4 flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-red-500 text-white shadow-[0_10px_26px_rgba(239,68,68,0.35)] transition duration-300 group-hover:scale-105 group-active:scale-95"
                >
                  <span className="absolute inset-[1px] rounded-full bg-gradient-to-br from-white/20 via-transparent to-black/10" />
                  <Play size={21} fill="currentColor" strokeWidth={2} className="relative ml-0.5" />
                </span>
              </div>
              <div className="flex min-h-[144px] flex-col p-4">
                <span className="line-clamp-2 text-[19px] font-semibold leading-[1.28] text-white">
                  {localizedEpisode.title}
                </span>
                <span className="mt-1.5 line-clamp-1 text-sm text-white/75">
                  {localizedSeries.title}
                </span>
                <span className="mt-auto flex items-center justify-between pt-4 text-xs font-medium text-[#E8D28A]">
                  <span>{copy.listen}</span>
                  {duration && <span className="text-white/75">{duration}</span>}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {slideCount > 1 && (
        <div className="mt-3 flex items-center justify-between px-1">
          <span className="text-xs text-white/75" aria-live="polite">
            {activeSlide === 0 ? copy.seriesCard : `${copy.episode} ${activeSlide} ${copy.of} ${episodes.length}`}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => scrollToSlide(activeSlide - 1)}
              disabled={activeSlide === 0}
              aria-label={`${copy.previous} ${localizedSeries.title}`}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-lg text-white disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => scrollToSlide(activeSlide + 1)}
              disabled={activeSlide === slideCount - 1}
              aria-label={`${copy.next} ${localizedSeries.title}`}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-lg text-white disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]"
            >
              →
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
