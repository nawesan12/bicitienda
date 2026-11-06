"use client";

import { useRef, useState } from "react";
import { cx } from "@/components/bt/cx";
import { Lightbox, type LightboxLabels } from "@/components/bt/lightbox";
import { FOCUS, TRANSITION } from "@/components/bt/styles";
import { Tag } from "@/components/bt/tag";

/**
 * Fotos de la ficha (2c / 4c).
 *
 * La foto principal es 4/3 con `object-contain` sobre el fondo de la card
 * (bg-card-photo): la bici se ve entera, sin recortes. Tocarla abre el
 * `Lightbox` a pantalla completa en alta resolución.
 *
 * - Desktop (≥ lg, `ProductGallery`): columna de miniaturas de 96 px
 *   (radio 8, borde 2 amarillo la elegida; scrollea si son muchas) + foto
 *   principal (radio 10) con el tag pegado arriba a la izquierda.
 * - Mobile (< lg, `ProductCarousel`): foto a sangre con scroll horizontal
 *   (scroll-snap) y dots (activo 20×6 amarillo, resto 6×6 tinta 30 %).
 *
 * `ProductPhotos` monta las dos (cada una se oculta en su breakpoint) y
 * el lightbox compartido.
 */

export interface GalleryPhoto {
  src: string;
  thumb: string;
  /** Alta resolución para el lightbox. */
  full: string;
  alt: string;
}

export function ProductPhotos({
  photos,
  tag,
  labels,
}: {
  photos: GalleryPhoto[];
  tag?: string | null;
  labels: LightboxLabels & { open: string };
}) {
  const [box, setBox] = useState<number | null>(null);
  const open = (i: number) => setBox(i);
  return (
    <>
      <ProductGallery photos={photos} tag={tag} onOpen={open} openLabel={labels.open} className="max-lg:hidden" />
      <ProductCarousel photos={photos} tag={tag} onOpen={open} openLabel={labels.open} className="lg:hidden" />
      <Lightbox
        photos={photos.map((p) => ({ src: p.full, thumb: p.thumb, alt: p.alt }))}
        index={box ?? 0}
        open={box !== null}
        onClose={() => setBox(null)}
        onIndexChange={setBox}
        labels={labels}
      />
    </>
  );
}

/** Lupa en la esquina: indica que la foto se agranda. */
function ZoomHint() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute right-3 bottom-3 flex size-9 items-center justify-center rounded-full bg-ink/75 text-paper"
    >
      <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="M15.5 15.5 21 21M10.5 7.5v6M7.5 10.5h6" />
      </svg>
    </span>
  );
}

export function ProductGallery({
  photos,
  tag,
  onOpen,
  openLabel,
  className,
}: {
  photos: GalleryPhoto[];
  tag?: string | null;
  onOpen: (i: number) => void;
  openLabel: string;
  className?: string;
}) {
  const [sel, setSel] = useState(0);
  const main = photos[sel] ?? photos[0];
  const many = photos.length > 1;
  return (
    <div className={cx("grid gap-[14px]", many ? "grid-cols-[96px_minmax(0,1fr)]" : "grid-cols-1", className)}>
      {many && (
        // La altura la marca la foto principal; las miniaturas scrollean si no entran.
        <div className="relative">
          <div
            className="absolute inset-0 flex flex-col gap-3 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="group"
            aria-label="Fotos"
          >
            {photos.map((p, i) => (
              <button
                key={p.src}
                type="button"
                onClick={() => setSel(i)}
                aria-label={`Ver foto ${i + 1}`}
                aria-pressed={i === sel}
                className={cx(
                  "box-border size-24 flex-none overflow-hidden rounded-box border-2 bg-card-photo p-0",
                  i === sel ? "border-yellow" : "border-transparent hover:border-line-strong",
                  TRANSITION,
                  FOCUS,
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary ya transformada */}
                <img src={p.thumb} alt="" className="block h-full w-full object-contain" />
              </button>
            ))}
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => onOpen(sel)}
        aria-label={`${openLabel}: ${main?.alt ?? ""}`}
        className={cx(
          "group relative block aspect-[4/3] w-full cursor-zoom-in overflow-hidden rounded-card bg-card-photo p-0",
          FOCUS,
        )}
      >
        {main && (
          // eslint-disable-next-line @next/next/no-img-element -- Cloudinary ya transformada
          <img
            src={main.src}
            alt={main.alt}
            fetchPriority="high"
            className="absolute inset-0 block h-full w-full object-contain"
          />
        )}
        {tag && (
          <span className="absolute top-0 left-0">
            <Tag flush size="lg">
              {tag}
            </Tag>
          </span>
        )}
        <ZoomHint />
      </button>
    </div>
  );
}

export function ProductCarousel({
  photos,
  tag,
  onOpen,
  openLabel,
  className,
}: {
  photos: GalleryPhoto[];
  tag?: string | null;
  onOpen: (i: number) => void;
  openLabel: string;
  className?: string;
}) {
  const [idx, setIdx] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  const go = (i: number) => {
    const el = track.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };
  return (
    <div className={cx("relative aspect-[4/3] w-full bg-card-photo", className)}>
      <div
        ref={track}
        onScroll={(e) => {
          const el = e.currentTarget;
          setIdx(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
        }}
        className="flex h-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {photos.map((p, i) => (
          <button
            key={p.src}
            type="button"
            onClick={() => onOpen(i)}
            aria-label={`${openLabel} ${i + 1}`}
            className={cx("block h-full w-full flex-none snap-start p-0 focus-visible:outline-offset-[-2px]", FOCUS)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary ya transformada */}
            <img
              src={p.src}
              alt={p.alt}
              fetchPriority={i === 0 ? "high" : undefined}
              loading={i === 0 ? undefined : "lazy"}
              className="block h-full w-full object-contain"
            />
          </button>
        ))}
      </div>
      {tag && (
        <span className="absolute top-0 left-0">
          <Tag flush size="sm">
            {tag}
          </Tag>
        </span>
      )}
      <ZoomHint />
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
                i === idx ? "w-5 bg-yellow" : "w-[6px] bg-ink/30",
                FOCUS,
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
