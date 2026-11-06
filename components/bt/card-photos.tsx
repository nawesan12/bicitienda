"use client";

import Link from "next/link";
import { useRef, useState, type MouseEvent } from "react";
import { cx } from "./cx";
import { FOCUS, TRANSITION } from "./styles";

/**
 * Carrusel de fotos de la ProductCard (todas las fotos, no solo la
 * portada). Scroll-snap horizontal: swipe en mobile, flechas que aparecen
 * con hover en desktop (solo con puntero que hace hover) y puntitos abajo.
 *
 * Ocupa la caja de la foto (`absolute inset-0`) y va en z-10 para quedar
 * por encima del stretched link de la card (`after:absolute after:inset-0`):
 * si no, el ::after se come el swipe. Por eso cada foto es su propio link a
 * la ficha (fuera del orden de tab: el link accesible es el nombre).
 *
 * Fotos `object-contain` con padding sobre bg-card-photo, como la card:
 * la bici se ve entera aunque la foto no sea 4/3.
 */
export function CardPhotos({
  href,
  images,
  imgClassName,
  className,
}: {
  href: string;
  images: { src: string; alt?: string }[];
  /** Padding de la foto según el layout de la card. */
  imgClassName?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const last = images.length - 1;

  const onScroll = () => {
    const el = ref.current;
    if (!el || el.clientWidth === 0) return;
    setIndex(Math.min(last, Math.max(0, Math.round(el.scrollLeft / el.clientWidth))));
  };

  // Las flechas están sobre el link estirado: sin esto el click navega.
  const go = (e: MouseEvent<HTMLButtonElement>, dir: -1 | 1) => {
    e.preventDefault();
    e.stopPropagation();
    const el = ref.current;
    if (!el) return;
    const to = Math.min(last, Math.max(0, index + dir));
    el.scrollTo({ left: to * el.clientWidth, behavior: "smooth" });
  };

  const arrow = cx(
    "relative z-10 hidden size-9 items-center justify-center rounded-pill bg-paper/90 text-[18px] font-extrabold leading-none text-ink shadow-sm",
    "[@media(hover:hover)]:flex opacity-0 group-hover/photos:opacity-100 focus-visible:opacity-100 hover:bg-paper disabled:invisible",
    TRANSITION,
    FOCUS,
  );

  return (
    <div className={cx("group/photos absolute inset-0 z-10", className)}>
      <div
        ref={ref}
        onScroll={onScroll}
        className="flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((im, i) => (
          <Link
            key={im.src + i}
            href={href}
            tabIndex={-1}
            aria-hidden
            draggable={false}
            className="relative block h-full w-full flex-none snap-start snap-always"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- URLs de Cloudinary ya transformadas */}
            <img
              src={im.src}
              alt={im.alt ?? ""}
              loading="lazy"
              decoding="async"
              draggable={false}
              className={cx("absolute inset-0 block h-full w-full object-contain", imgClassName)}
            />
          </Link>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-x-2 top-1/2 flex -translate-y-1/2 justify-between">
        <button
          type="button"
          aria-label="Foto anterior"
          onClick={(e) => go(e, -1)}
          disabled={index === 0}
          className={cx(arrow, "pointer-events-auto")}
        >
          ‹
        </button>
        <button
          type="button"
          aria-label="Foto siguiente"
          onClick={(e) => go(e, 1)}
          disabled={index === last}
          className={cx(arrow, "pointer-events-auto")}
        >
          ›
        </button>
      </div>

      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center gap-[5px]">
        {images.map((im, i) => (
          <span
            key={im.src + i}
            className={cx("size-[6px] rounded-pill", TRANSITION, i === index ? "bg-ink" : "bg-ink/25")}
          />
        ))}
      </div>
    </div>
  );
}
