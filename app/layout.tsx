import type { Metadata, Viewport } from "next";
import { rootMetadata } from "@/lib/seo";
import { fontVariables } from "./fonts";
import "./globals.css";

/**
 * Metadata base del sitio (metadataBase, template del título, OG por
 * defecto): sale de lib/seo.ts. Cada página indexable pisa lo suyo con
 * pageMetadata(). El favicon y el apple-icon los toma Next por convención
 * de archivo (icon.png, apple-icon.png); la imagen Open Graph del sitio la
 * genera app/opengraph-image.tsx.
 */
export const metadata: Metadata = rootMetadata();

export const viewport: Viewport = {
  themeColor: "#0e1116",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR" className={fontVariables}>
      <body>{children}</body>
    </html>
  );
}
