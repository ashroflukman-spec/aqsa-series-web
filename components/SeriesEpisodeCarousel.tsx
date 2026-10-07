"use client";

import Image from "next/image";
import { useRef, useState } from "react";

export type CarouselEpisode = {
  id: string;
  title: string;
  seriesId: string;
  coverUrl?: string;
  imageUrl?: string;
  durationSeconds?: number;
};

type Props = {
  series: {
    id: string;
    title: string;
    coverUrl: string;
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
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pointerStartXRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const slideCount = episodes.length + 1;

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
    <section aria-label={`Siri ${series.title}`}>
      <div
        ref={scrollerRef}
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
        aria-label={`Kad siri dan episod ${series.title}`}
        tabIndex={0}
        className="-mx-6 flex snap-x snap-mandatory scroll-px-6 gap-4 overflow-x-auto px-6 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <button
          type="button"
          onClick={onOpenSeries}
          aria-label={`Buka siri ${series.title}`}
          className="group w-[92%] shrink-0 snap-start overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.04] text-left shadow-[0_14px_40px_rgba(0,0,0,0.22)] transition duration-300 hover:border-white/15 hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]"
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
            <span className="absolute left-4 top-4 rounded-full border border-white/20 bg-black/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur">
              Siri audio
            </span>
          </div>
          <div className="flex min-h-[144px] flex-col p-4">
            <span className="line-clamp-2 text-[19px] font-semibold leading-[1.28] text-white">
              {series.title}
            </span>
            <span className="mt-1.5 line-clamp-1 text-sm text-white/50">
              Penyampai · {speakerName}
            </span>
            <span className="mt-auto flex items-center justify-between pt-4 text-xs font-medium text-[#E8D28A]">
              <span>{episodes.length > 0 ? `${episodes.length} episod · Leret untuk lihat` : "Lihat siri"}</span>
              <span aria-hidden="true">→</span>
            </span>
          </div>
        </button>

        {episodes.map((episode, index) => {
          const coverUrl = episode.imageUrl || episode.coverUrl || series.coverUrl;
          const duration = formatDuration(episode.durationSeconds);

          return (
            <button
              key={episode.id}
              type="button"
              onClick={() => onOpenEpisode(episode)}
              aria-label={`Buka episod ${index + 1}: ${episode.title}`}
              className="group w-[92%] shrink-0 snap-start overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.04] text-left shadow-[0_14px_40px_rgba(0,0,0,0.22)] transition duration-300 hover:border-white/15 hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]"
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
                <span className="absolute left-4 top-4 rounded-full border border-[#D4AF37]/35 bg-black/50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#E8D28A] backdrop-blur">
                  Episod {index + 1}
                </span>
                <span aria-hidden="true" className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-[#7A1F2B] text-lg text-white shadow-lg">
                  ▶
                </span>
              </div>
              <div className="flex min-h-[144px] flex-col p-4">
                <span className="line-clamp-2 text-[19px] font-semibold leading-[1.28] text-white">
                  {episode.title}
                </span>
                <span className="mt-1.5 line-clamp-1 text-sm text-white/50">
                  {series.title}
                </span>
                <span className="mt-auto flex items-center justify-between pt-4 text-xs font-medium text-[#E8D28A]">
                  <span>Dengar episod</span>
                  {duration && <span className="text-white/50">{duration}</span>}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {slideCount > 1 && (
        <div className="mt-3 flex items-center justify-between px-1">
          <span className="text-xs text-white/45" aria-live="polite">
            {activeSlide === 0 ? "Kad siri" : `Episod ${activeSlide} daripada ${episodes.length}`}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => scrollToSlide(activeSlide - 1)}
              disabled={activeSlide === 0}
              aria-label={`Kad sebelumnya bagi ${series.title}`}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-lg text-white disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => scrollToSlide(activeSlide + 1)}
              disabled={activeSlide === slideCount - 1}
              aria-label={`Kad seterusnya bagi ${series.title}`}
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
