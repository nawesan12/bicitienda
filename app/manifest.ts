import type { MetadataRoute } from "next";
import { store } from "@/lib/config";
import { paths } from "@/lib/paths";
import { SEO } from "@/lib/seo";

/**
 * Web app manifest (estático): negro del handoff (#121110) de fondo y de
 * barra, íconos de app/ (icon.png 512, apple-icon.png 180).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: SEO.defaultTitle,
    short_name: store.brandName,
    description: SEO.defaultDescription,
    lang: SEO.language,
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#121110",
    theme_color: "#121110",
    categories: ["shopping", "sports"],
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcuts: [
      { name: "Bicicletas", url: paths.catalog("bicicletas") },
      { name: "Sacar turno", url: "/turnos" },
      { name: "Pedir presupuesto", url: "/presupuesto" },
    ],
  };
}
