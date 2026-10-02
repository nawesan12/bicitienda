import { Anton, Barlow } from "next/font/google";

/**
 * IDENTIDAD "CARBONO" — Anton (display condensado de cartel) + Barlow
 * (UI técnica y compacta).
 */
const display = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-store-display",
  display: "swap",
});

const sans = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-store-sans",
  display: "swap",
});

/** Clases a colgar del <html> para exponer las variables de fuente. */
export const fontVariables = `${display.variable} ${sans.variable}`;
