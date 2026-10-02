import type { ReactNode } from "react";
import { cx } from "./cx";
import { FONT } from "./styles";

/**
 * Etiqueta de producto/promoción. Archivo 800 uppercase.
 * Rojo #d7261e = oferta/urgencia ("Oferta", "Más vendida", "Temporada de
 * rodar"); amarillo = novedad ("Nuevo", "Nueva").
 *
 * - `flush`: pegada a la esquina de la foto (sin radio), como en la card.
 * - sin `flush`: radio 4 (tag del hero).
 */

export type TagTone = "red" | "yellow";

const TONE: Record<TagTone, string> = {
  red: "bg-red text-white",
  yellow: "bg-yellow text-ink",
};

const SIZE = {
  /** Card mobile: 10 px, 4×7, .06em. */
  xs: "px-[7px] py-[4px] text-[10px] tracking-[.06em]",
  /** Card responsive: xs en mobile, md desde md. */
  card: "px-[7px] py-[4px] text-[10px] tracking-[.06em] md:px-[10px] md:py-[6px] md:text-[12px] md:tracking-[.08em]",
  /** Producto mobile: 11 px, 6×10. */
  sm: "px-[10px] py-[6px] text-[11px] tracking-[.08em]",
  /** Card desktop: 12 px, 6×10. */
  md: "px-[10px] py-[6px] text-[12px] tracking-[.08em]",
  /** Galería de producto: 13 px, 8×12. */
  lg: "px-[12px] py-[8px] text-[13px] tracking-[.08em]",
  /** Hero: 12 px mobile / 14 px desktop, 5–6×10–12. */
  hero: "px-[10px] py-[5px] text-[12px] lg:px-[12px] lg:py-[6px] lg:text-[14px] tracking-[.08em]",
} as const;

export type TagSize = keyof typeof SIZE;

/** Tono por defecto según el texto: "Nuevo/Nueva" amarillo, el resto rojo. */
export function tagToneFor(label: string): TagTone {
  return /^nuev[oa]s?$/i.test(label.trim()) ? "yellow" : "red";
}

export function Tag({
  children,
  tone,
  size = "md",
  flush,
  className,
}: {
  children: ReactNode;
  tone?: TagTone;
  size?: TagSize;
  flush?: boolean;
  className?: string;
}) {
  const t = tone ?? (typeof children === "string" ? tagToneFor(children) : "red");
  return (
    <span
      className={cx(
        "inline-block font-extrabold uppercase leading-[1.15]",
        flush ? "rounded-none" : "rounded-tag",
        FONT,
        TONE[t],
        SIZE[size],
        className,
      )}
    >
      {children}
    </span>
  );
}
