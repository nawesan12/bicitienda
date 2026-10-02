/**
 * Clases de formulario del lenguaje del handoff, sacadas del formulario
 * de Reparaciones (components/store/repair-form.tsx) y de la newsletter:
 * labels en mayúsculas con tracking .18em, campos de 12px de radio con
 * borde fino y relleno translúcido sobre la tarjeta oscura con grilla.
 * Las comparten el checkout, el seguimiento y "Mis pedidos".
 */

/** Tarjeta oscura con grilla de 36px (la del formulario de Reparaciones). */
export const darkPanel =
  "bg-grid-dark rounded-[24px] bg-night p-[clamp(20px,3vw,34px)] text-cream [--grid-size:36px]";

/** Kicker verde de la tarjeta oscura ("PEDÍ TU DIAGNÓSTICO"). */
export const darkKicker =
  "font-sans text-[11px] font-bold tracking-[.26em] text-brand";

/** Label de campo sobre oscuro. */
export const darkLabel =
  "block font-sans text-[10.5px] font-bold tracking-[.18em] text-cream/50";

/** Input/textarea sobre oscuro. */
export const darkField =
  "box-border mt-2 block w-full rounded-xl border border-white/[.16] bg-white/[.07] px-4 py-[13px] font-sans text-[14px] text-cream outline-none placeholder:text-[#757575] focus:border-brand";

/** Punto de radio de las opciones oscuras. */
export function radioDot(selected: boolean): string {
  return `mt-[2px] flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full border-[1.5px] ${
    selected ? "border-brand" : "border-white/30"
  }`;
}
