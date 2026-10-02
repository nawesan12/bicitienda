import type { Metadata, Viewport } from "next";
import { store } from "@/lib/config";
import { SITE_URL } from "@/lib/site";
import { fontVariables } from "./fonts";
import "./globals.css";

/**
 * CAPA POR TIENDA: metadata y SEO del sitio. Al crear una tienda real,
 * ajustá NEXT_PUBLIC_SITE_URL (env), la descripción y las keywords.
 */

const TITLE = `${store.brandName} — Tienda en ${store.city.split(",")[0]}`;

const DESCRIPTION =
  "Tienda de ejemplo del starter: reemplazá esta descripción por la propuesta real de la marca.";

/**
 * El favicon, el apple-icon y la imagen de Open Graph los toma Next por
 * convención de archivo desde `app/`: icon.png, apple-icon.png,
 * opengraph-image.png y twitter-image.png (regenerálos con la marca real).
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: `%s · ${store.brandName}`,
  },
  description: DESCRIPTION,
  applicationName: store.brandName,
  keywords: [store.brandName, store.city.split(",")[0], "tienda online"],
  authors: [{ name: store.legalName }],
  creator: store.legalName,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: store.brandName,
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    locale: "es_AR",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
};

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
