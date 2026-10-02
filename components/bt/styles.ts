/**
 * Clases compartidas del sistema BiciTienda (B2a).
 *
 * Colores, radios y font-stretch salen de los tokens de app/theme.css
 * (bg-ink, text-paper, border-line, rounded-btn, stretch-66…). Ver
 * README.md para la tabla token → hex del handoff.
 * Fuentes: `font-sans` = Archivo (eje wdth), `font-mono` = JetBrains Mono
 * (no se usa `mono-data` porque suma letter-spacing que el handoff no tiene).
 *
 * Todas las clases son literales completos para que Tailwind las detecte.
 */

/** Archivo (display + texto corrido). */
export const FONT = "font-sans";

/** JetBrains Mono (SKU, números de pedido, fechas, headers de tabla). */
export const MONO = "font-mono";

/** font-stretch del eje wdth de Archivo (66–85 %). */
export const STRETCH = {
  66: "stretch-66",
  68: "stretch-68",
  70: "stretch-70",
  72: "stretch-72",
  75: "stretch-75",
  80: "stretch-80",
  85: "stretch-85",
} as const;

/** Transición estándar del handoff: 150 ms de color. */
export const TRANSITION = "transition-colors duration-150";

/** Foco visible en todo control interactivo. */
export const FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow";

/** Eyebrow / label: Archivo 700 uppercase .08em, #8d867a. */
export const EYEBROW = `${FONT} font-bold uppercase tracking-[.08em]`;

/** Fila seleccionada: amarillo 6 % + barra izquierda inset 3 px. */
export const SELECTED_ROW = "selected-row";

/** Divisores punteados: sobre oscuro y sobre paper. */
export const DASHED_DARK = "border-t border-dashed border-line-strong";
export const DASHED_PAPER = "border-t border-dashed border-card-dash";
