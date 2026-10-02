import { Archivo, JetBrains_Mono } from "next/font/google";

/**
 * IDENTIDAD "BICITIENDA MDQ" — Archivo variable (display condensado +
 * texto corrido) y JetBrains Mono (datos: SKU, números de pedido, fechas,
 * encabezados de tabla).
 *
 * Archivo se carga como variable con el eje `wdth` (62–125) además de
 * `wght` (100–900): next/font pide `Archivo:wdth,wght@62..125,100..900` y
 * el @font-face declara `font-stretch: 62% 125%`, así `font-stretch: 66%`
 * (o las utilidades `stretch-66`…`stretch-85` de theme.css) usan el ancho
 * real del eje en lugar de un condensado sintético. Con `axes` el peso
 * tiene que ser variable (no se puede acotar a 400–900; el handoff usa
 * 400–900).
 *
 * Variables CSS (las cuelga `fontVariables` del <html>):
 *   --font-store-sans     Archivo (UI y texto corrido)
 *   --font-store-display  alias de la misma Archivo (theme.css, `html`)
 *   --font-store-mono     JetBrains Mono 400/600
 */
const archivo = Archivo({
  subsets: ["latin"],
  weight: "variable",
  axes: ["wdth"],
  variable: "--font-store-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-store-mono",
  display: "swap",
});

/** Clases a colgar del <html> para exponer las variables de fuente. */
export const fontVariables = `${archivo.variable} ${mono.variable}`;
