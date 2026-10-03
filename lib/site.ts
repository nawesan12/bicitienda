import { store } from "@/lib/config";

/**
 * URL pública del sitio (canonicals, sitemap, robots y JSON-LD). La de
 * producción sale de `store.siteUrl`; NEXT_PUBLIC_SITE_URL la pisa (vacía
 * cuenta como no definida).
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || store.siteUrl;

/** Origin del dev server compartido (`next dev -p 3100`). */
const DEV_ORIGIN_DEFAULT = "http://localhost:3100";

/**
 * Base de los links absolutos que salen del server (retornos y webhooks de
 * la pasarela, links de los emails y de los WhatsApp):
 *
 *   1. NEXT_PUBLIC_SITE_URL si está (vacía cuenta como no definida).
 *   2. En producción (`NODE_ENV=production`: Vercel, `next build`/`start`):
 *      `store.siteUrl`. NUNCA localhost en producción.
 *   3. Si no (dev, tests): `DEV_SITE_URL` o `http://localhost:3100`, para
 *      que el sandbox y los links de los mails vuelvan a la máquina local.
 */
export function runtimeSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/+$/, "");
  if (process.env.NODE_ENV === "production") return store.siteUrl;
  return (process.env.DEV_SITE_URL || DEV_ORIGIN_DEFAULT).replace(/\/+$/, "");
}
