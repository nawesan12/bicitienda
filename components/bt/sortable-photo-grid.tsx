"use client";

import { useState, type ReactNode } from "react";
import { cx } from "./cx";
import { FOCUS, FONT, TRANSITION } from "./styles";

/**
 * Grilla de fotos ordenable (3d "Fotos"): 5 columnas (3 en mobile), gap
 * 10, celdas cuadradas radio 8 con borde 2 px; la primera es la portada
 * (borde amarillo + tag "Portada" 800 10 px arriba a la izquierda).
 *
 * Orden: arrastrar y soltar (desktop) o los botones ← → de cada foto
 * (teclado y celular, donde el drag nativo no existe). ✕ quita la foto.
 * Los controles aparecen al pasar el mouse o con foco; en pantallas
 * táctiles quedan siempre visibles.
 *
 * Controlado: el padre guarda el orden (`photos`) y recibe `onChange`.
 * `trailing` es la última celda (ej. `UploadDropzone variant="tile"`).
 */
export interface SortablePhoto {
  /** Clave estable (la URL sirve). */
  key: string;
  src: string;
  alt?: string;
}

export function SortablePhotoGrid({
  photos,
  onChange,
  coverLabel = "Portada",
  trailing,
  disabled,
  className,
}: {
  photos: SortablePhoto[];
  onChange: (next: SortablePhoto[]) => void;
  coverLabel?: string;
  trailing?: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= photos.length || from === to) return;
    const next = [...photos];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  const ctl = cx(
    "flex size-7 items-center justify-center rounded-tag bg-ink/80 text-[13px] font-extrabold text-paper hover:bg-ink hover:text-yellow disabled:opacity-30",
    TRANSITION,
    FOCUS,
  );

  return (
    <ul className={cx("m-0 grid list-none grid-cols-3 gap-[10px] p-0 md:grid-cols-5", FONT, className)}>
      {photos.map((p, i) => (
        <li
          key={p.key}
          draggable={!disabled}
          onDragStart={(e) => {
            setDragging(i);
            e.dataTransfer.effectAllowed = "move";
          }}
          onDragOver={(e) => {
            if (dragging === null) return;
            e.preventDefault();
            setOver(i);
          }}
          onDragLeave={() => setOver((o) => (o === i ? null : o))}
          onDrop={(e) => {
            e.preventDefault();
            if (dragging !== null) move(dragging, i);
            setDragging(null);
            setOver(null);
          }}
          onDragEnd={() => {
            setDragging(null);
            setOver(null);
          }}
          className={cx(
            "group/photo relative aspect-square cursor-grab overflow-hidden rounded-box border-2 bg-surface-2 active:cursor-grabbing",
            i === 0 ? "border-yellow" : "border-transparent",
            over === i && dragging !== i && "outline-2 outline-offset-2 outline-dashed outline-text-3",
            dragging === i && "opacity-40",
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- URLs de Cloudinary/uploads ya transformadas */}
          <img src={p.src} alt={p.alt ?? ""} draggable={false} className="block h-full w-full object-cover" />
          {i === 0 && (
            <span className="absolute top-[6px] left-[6px] rounded-[3px] bg-yellow px-[6px] py-[3px] text-[10px] font-extrabold uppercase leading-none tracking-[.06em] text-ink">
              {coverLabel}
            </span>
          )}
          {!disabled && (
            <span
              className={cx(
                "absolute inset-x-[6px] bottom-[6px] flex justify-between opacity-0 group-hover/photo:opacity-100 group-focus-within/photo:opacity-100 [@media(hover:none)]:opacity-100",
                TRANSITION,
              )}
            >
              <span className="flex gap-1">
                <button type="button" className={ctl} aria-label={`Mover foto ${i + 1} antes`} disabled={i === 0} onClick={() => move(i, i - 1)}>
                  ←
                </button>
                <button
                  type="button"
                  className={ctl}
                  aria-label={`Mover foto ${i + 1} después`}
                  disabled={i === photos.length - 1}
                  onClick={() => move(i, i + 1)}
                >
                  →
                </button>
              </span>
              <button
                type="button"
                className={cx(ctl, "hover:text-red-light")}
                aria-label={`Quitar foto ${i + 1}`}
                onClick={() => onChange(photos.filter((_, j) => j !== i))}
              >
                ✕
              </button>
            </span>
          )}
        </li>
      ))}
      {trailing && <li className="aspect-square">{trailing}</li>}
    </ul>
  );
}
