"use client";

import { useRef, useState } from "react";
import { cx } from "@/components/bt/cx";
import { FOCUS, TRANSITION } from "@/components/bt/styles";
import { Tag } from "@/components/bt/tag";

/**
 * Fotos de la ficha (2c / 4c).
 *
 * - Desktop (≥ lg, `ProductGallery`): columna de miniaturas de 96 px
 *   (radio 8, borde 2 amarillo la elegida) + foto principal de 640 px
 *   (radio 10, fondo #1f1d1a) con el tag pegado arriba a la izquierda.
 * - Mobile (< lg, `ProductCarousel`): foto a sangre de 340 px con scroll
 *   horizontal (scroll-snap) y dots (activo 20×6 amarillo, resto 6×6
 *   paper 60 %).
 *
 * `ProductPhotos` monta las dos y cada una se oculta en su breakpoint.
 */

export interface GalleryPhoto {
  src: string;
  thumb: string;
  alt: string;
}

export function ProductPhotos({ photos, tag }: { photos: GalleryPhoto[]; tag?: string | null }) {
  return (
    <>
      <ProductGallery photos={photos} tag={tag} className="max-lg:hidden" />
      <ProductCarousel photos={photos} tag={tag} className="lg:hidden" />
    </>
  );
}

export function ProductGallery({
  photos,
  tag,
  className,
}: {
  photos: GalleryPhoto[];
  tag?: string | null;
  className?: string;
}) {
  const [sel, setSel] = useState(0);
  const main = photos[sel] ?? photos[0];
  const many = photos.length > 1;
  return (
    <div className={cx("grid gap-[14px]", many ? "grid-cols-[96px_minmax(0,1fr)]" : "grid-cols-1", className)}>
      {many && (
        <div className="flex flex-col gap-3" role="group" aria-label="Fotos">
          {photos.map((p, i) => (
            <button
              key={p.src}
              type="button"
              onClick={() => setSel(i)}
              aria-label={`Ver foto ${i + 1}`}
              aria-pressed={i === sel}
              className={cx(
                "box-border size-24 overflow-hidden rounded-box border-2 p-0",
                i === sel ? "border-yellow" : "border-transparent hover:border-line-strong",
                TRANSITION,
                FOCUS,
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary ya transformada */}
              <img src={p.thumb} alt="" className="block h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
      <div className="relative h-[640px] overflow-hidden rounded-card bg-surface">
        {main && (
          // eslint-disable-next-line @next/next/no-img-element -- Cloudinary ya transformada
          <img
            src={main.src}
            alt={main.alt}
            fetchPriority="high"
            className="absolute inset-0 block h-full w-full object-cover"
          />
        )}
        {tag && (
          <span className="absolute top-0 left-0">
            <Tag flush size="lg">
              {tag}
            </Tag>
          </span>
        )}
      </div>
    </div>
  );
}

export function ProductCarousel({
  photos,
  tag,
  className,
}: {
  photos: GalleryPhoto[];
  tag?: string | null;
  className?: string;
}) {
  const [idx, setIdx] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  const go = (i: number) => {
    const el = track.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };
  return (
    <div className={cx("relative h-[340px] bg-surface", className)}>
      <div
        ref={track}
        onScroll={(e) => {
          const el = e.currentTarget;
          setIdx(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
        }}
        className="flex h-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {photos.map((p, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- Cloudinary ya transformada
          <img
            key={p.src}
            src={p.src}
            alt={p.alt}
            fetchPriority={i === 0 ? "high" : undefined}
            loading={i === 0 ? undefined : "lazy"}
            className="block h-full w-full flex-none snap-start object-cover"
          />
        ))}
      </div>
      {tag && (
        <span className="absolute top-0 left-0">
          <Tag flush size="sm">
            {tag}
          </Tag>
        </span>
      )}
      {photos.length > 1 && (
        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-[6px]">
          {photos.map((p, i) => (
            <button
              key={p.src}
              type="button"
              onClick={() => go(i)}
              aria-label={`Ver foto ${i + 1}`}
              aria-current={i === idx ? "true" : undefined}
              className={cx(
                "h-[6px] rounded-[3px] p-0 transition-all duration-150",
                i === idx ? "w-5 bg-yellow" : "w-[6px] bg-paper/60",
                FOCUS,
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
