import { routes } from "@/lib/config";

/**
 * Único constructor de URLs públicas de las secciones de rubro. El core
 * nunca escribe "/catalogo" ni "/comunidad" (ni la URL pública que la
 * tienda haya elegido) a mano: todo link, canonical, redirect y sitemap
 * pasa por acá, así cambiar la URL pública es tocar `routes` en
 * lib/config.ts y nada más.
 *
 * Paths INTERNOS del core (los nombres reales de las carpetas de app/):
 * viven en lib/internal-routes.ts porque también los usa next.config.
 */
export { INTERNAL_CATALOG, INTERNAL_COMMUNITY } from "@/lib/internal-routes";

export const paths = {
  /** Catálogo: sin argumento la portada, con slug una categoría o ficha. */
  catalog(sub?: string): string {
    return sub ? `${routes.catalog}/${sub}` : routes.catalog;
  },
  /** Catálogo con query string ya armada ("?q=…" o ""). */
  catalogQuery(query: string): string {
    return `${routes.catalog}${query}`;
  },
  community(): string {
    return routes.community;
  },
  cart(): string {
    return routes.cart;
  },
  appointments(): string {
    return routes.appointments;
  },
  quote(): string {
    return routes.quote;
  },
  account(): string {
    return routes.account;
  },
  login(): string {
    return routes.login;
  },
  register(): string {
    return routes.register;
  },
  recover(): string {
    return routes.recover;
  },
  tracking(numero?: string): string {
    return numero ? `${routes.tracking}/${numero}` : routes.tracking;
  },
};
