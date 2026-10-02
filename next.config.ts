import type { NextConfig } from "next";
// Imports relativos: acá el alias "@/" no resuelve.
import { routes } from "./lib/config";
import { INTERNAL_CATALOG, INTERNAL_COMMUNITY } from "./lib/internal-routes";

/**
 * Traducción de rutas de rubro: las carpetas del core son neutras
 * (/catalogo, /comunidad) y la tienda define sus URLs públicas en
 * `routes` de lib/config.ts. Si difieren, la pública se sirve por rewrite
 * y la interna redirige 308 a la pública para no duplicar contenido.
 */
const routePairs = [
  { public: routes.catalog, internal: INTERNAL_CATALOG },
  { public: routes.community, internal: INTERNAL_COMMUNITY },
].filter((r) => r.public !== r.internal);

const nextConfig: NextConfig = {
  /**
   * PGlite trae su Postgres en wasm y resuelve assets con import.meta.url:
   * bundleado se rompe, así que se carga siempre desde node_modules.
   */
  serverExternalPackages: ["@electric-sql/pglite"],

  /**
   * Sin DATABASE_URL la base es PGlite embebido (una sola conexión al
   * directorio .data/pglite): los workers paralelos del prerender de SSG
   * abrirían N veces el mismo directorio y rompen. Un solo cpu en local;
   * con Neon (DATABASE_URL) el paralelismo queda como viene.
   */
  ...(process.env.DATABASE_URL ? {} : { experimental: { cpus: 1 } }),

  async rewrites() {
    return routePairs.map((r) => ({
      source: `${r.public}/:path*`,
      destination: `${r.internal}/:path*`,
    }));
  },

  async redirects() {
    return routePairs.map((r) => ({
      source: `${r.internal}/:path*`,
      destination: `${r.public}/:path*`,
      permanent: true,
    }));
  },

  images: {
    /**
     * Sin optimización de imágenes de Vercel: las fotos viven en
     * Cloudinary y se piden con `img(url, { w })` (lib/images.ts), que
     * agrega f_auto,q_auto,c_limit,w_ — Cloudinary transforma y cachea en
     * su CDN. Pasarlas además por el optimizador de Vercel sería una
     * transformación facturable más sin mejorar nada. En local (sin
     * CLOUDINARY_URL) son WebP/JPEG ya optimizados de public/ o
     * `.data/uploads`.
     */
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },

  /** Cabecera de caché larga para los assets inmutables del catálogo. */
  async headers() {
    return [
      {
        source: "/products/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/brand/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
