import { store } from "@/lib/config";

/**
 * URL pública del sitio (canonicals, sitemap, robots y JSON-LD). La de
 * producción sale de `store.siteUrl`; NEXT_PUBLIC_SITE_URL la pisa (vacía
 * cuenta como no definida).
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || store.siteUrl;

/**
 * Base de los links absolutos que salen del server (retornos y webhooks de
 * la pasarela, links de los emails): en desarrollo apunta al dev server
 * para que el sandbox vuelva a la máquina local.
 */
export function runtimeSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NODE_ENV === "production" ? store.siteUrl : "http://localhost:3000")
  );
}
