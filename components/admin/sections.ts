import { store } from "@/lib/config";
import { lexicon } from "@/lib/data/content";
import { features } from "@/lib/features";

/**
 * Secciones del panel, en el orden de la navegación: las 9 del prototipo
 * del admin más Pedidos y Stock (e-commerce del core). Sucursales y
 * Clientes son módulos del core que una tienda prende en
 * `features.admin` (lib/config.ts).
 */

export type NavBadge = "leads" | "orders" | "products" | "articles" | "agenda";

export interface AdminSection {
  href: string;
  label: string;
  /** Kicker verde arriba del título. */
  kicker: string;
  badge?: NavBadge;
}

const ALL: (AdminSection & { enabled?: boolean })[] = [
  { href: "/admin", label: "Resumen", kicker: "VISTA GENERAL" },
  { href: "/admin/consultas", label: "Consultas", kicker: "LEADS DESDE LA WEB", badge: "leads" },
  { href: "/admin/pedidos", label: "Pedidos", kicker: "VENTAS ONLINE", badge: "orders" },
  { href: "/admin/productos", label: "Productos", kicker: "CATÁLOGO", badge: "products" },
  { href: "/admin/stock", label: "Stock", kicker: "INVENTARIO" },
  {
    href: "/admin/novedades",
    label: "Novedades",
    kicker: "CONTENIDO EDITORIAL",
    badge: "articles",
    enabled: features.blog,
  },
  {
    href: "/admin/comunidad",
    label: "Comunidad",
    kicker: lexicon.admin.communityKicker,
    badge: "agenda",
    enabled: features.community || features.agenda,
  },
  { href: "/admin/test", label: "Test", kicker: lexicon.nav.test.toUpperCase(), enabled: features.advisor },
  { href: "/admin/nosotros", label: "Nosotros", kicker: "PÁGINA INSTITUCIONAL" },
  { href: "/admin/contenido", label: "Contenido", kicker: "TEXTOS DE LA WEB" },
  { href: "/admin/ajustes", label: "Ajustes", kicker: "CONFIGURACIÓN" },
  {
    href: "/admin/sucursales",
    label: "Sucursales",
    kicker: "LOCALES",
    enabled: !!store.features.admin?.locations,
  },
  {
    href: "/admin/clientes",
    label: "Clientes",
    kicker: "VENTAS ONLINE",
    enabled: !!store.features.admin?.customers,
  },
];

export const ADMIN_SECTIONS: AdminSection[] = ALL.filter((s) => s.enabled !== false);

/** Sección de un pathname (las subrutas caen en su sección). */
export function sectionFor(pathname: string): AdminSection {
  return (
    [...ADMIN_SECTIONS]
      .sort((a, b) => b.href.length - a.href.length)
      .find((s) => pathname === s.href || pathname.startsWith(`${s.href}/`)) ??
    ADMIN_SECTIONS[0]
  );
}
