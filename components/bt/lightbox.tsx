"use client";

import { useEffect, useRef, type PointerEvent } from "react";
import { cx } from "./cx";
import { FOCUS, FONT, MONO, TRANSITION } from "./styles";

/* ── Lightbox (galería a pantalla completa) ───────────────────
   Misma técnica que Modal: <dialog> nativo con showModal() (foco
   atrapado, Esc cierra y el foco vuelve al botón que la abrió). Fondo
   ink al 95 %, foto en alta resolución con object-contain, flechas,
   teclado ←/→, swipe táctil, contador "2 / 5" y miniaturas.
   ──────────────────────────────────────────────────────────── */

export interface LightboxPhoto {
  /** Foto en alta resolución (p. ej. img(url, { w: 2000 })). */
  src: string;
  /** Miniatura para la tira de abajo. */
  thumb: string;
  alt: string;
}

export interface LightboxLabels {
  close: string;
  prev: string;
  next: string;
}

const DEFAULT_LABELS: LightboxLabels = {
  close: "Cerrar galería",
  prev: "Foto anterior",
  next: "Foto siguiente",
};

/** Distancia mínima (px) para que un arrastre horizontal cuente como swipe. */
const SWIPE_MIN = 50;

export function Lightbox({
  photos,
  index,
  open,
  onClose,
  onIndexChange,
  labels = DEFAULT_LABELS,
}: {
  photos: LightboxPhoto[];
  index: number;
  open: boolean;
  onClose: () => void;
  onIndexChange: (i: number) => void;
  labels?: LightboxLabels;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const thumbs = useRef<HTMLDivElement>(null);
  const n = photos.length;
  const cur = photos[index] ?? photos[0];
  const many = n > 1;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  // Sin scroll del fondo mientras está abierta.
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = prev;
    };
  }, [open]);

  // La miniatura activa siempre a la vista.
  useEffect(() => {
    if (!open) return;
    const el = thumbs.current?.querySelector<HTMLElement>(`[data-i="${index}"]`);
    el?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [index, open]);

  const go = (delta: number) => {
    if (!many) return;
    onIndexChange((index + delta + n) % n);
  };

  const onPointerDown = (e: PointerEvent) => {
    start.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: PointerEvent) => {
    const s = start.current;
    start.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) >= SWIPE_MIN && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
  };

  const arrow = cx(
    "absolute top-1/2 z-10 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-ink/70 text-[22px] font-bold text-paper hover:bg-surface-3 max-md:size-11",
    TRANSITION,
    FOCUS,
  );

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-label={cur ? cur.alt : undefined}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          go(-1);
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          go(1);
        }
      }}
      className={cx(
        "m-0 h-dvh max-h-none w-screen max-w-none bg-ink/95 p-0 text-paper backdrop:bg-ink/90",
        FONT,
      )}
    >
      {open && cur && (
        <div className="flex h-full flex-col">
          {/* Barra superior: contador y cerrar. */}
          <div className="flex flex-none items-center justify-between gap-4 px-4 py-3 md:px-6">
            <span className={cx("text-[13px] font-semibold text-text-2", MONO)} aria-live="polite">
              {many ? `${index + 1} / ${n}` : ""}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label={labels.close}
              autoFocus
              className={cx(
                "flex size-11 items-center justify-center rounded-btn text-[22px] font-bold text-text-2 hover:text-paper",
                TRANSITION,
                FOCUS,
              )}
            >
              ✕
            </button>
          </div>

          {/* Foto: tocar fuera de la imagen no cierra (evita cierres al hacer swipe). */}
          <div
            className="relative min-h-0 flex-1 touch-pan-y select-none"
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerCancel={() => (start.current = null)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary ya transformada */}
            <img
              key={cur.src}
              src={cur.src}
              alt={cur.alt}
              draggable={false}
              className="absolute inset-0 m-auto block h-full w-full object-contain px-2 md:px-20"
            />
            {many && (
              <>
                <button type="button" onClick={() => go(-1)} aria-label={labels.prev} className={cx(arrow, "left-3 md:left-6")}>
                  ←
                </button>
                <button type="button" onClick={() => go(1)} aria-label={labels.next} className={cx(arrow, "right-3 md:right-6")}>
                  →
                </button>
              </>
            )}
          </div>

          {/* Miniaturas. */}
          {many && (
            <div
              ref={thumbs}
              role="group"
              aria-label="Miniaturas"
              className="flex flex-none justify-center-safe gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] md:py-4 [&::-webkit-scrollbar]:hidden"
            >
              {photos.map((p, i) => (
                <button
                  key={p.src}
                  type="button"
                  data-i={i}
                  onClick={() => onIndexChange(i)}
                  aria-label={`Ver foto ${i + 1}`}
                  aria-current={i === index ? "true" : undefined}
                  className={cx(
                    "box-border size-16 flex-none overflow-hidden rounded-box border-2 bg-card-photo p-0 md:size-[72px]",
                    i === index ? "border-yellow" : "border-transparent opacity-60 hover:opacity-100",
                    TRANSITION,
                    FOCUS,
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary ya transformada */}
                  <img src={p.thumb} alt="" loading="lazy" className="block h-full w-full object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}
