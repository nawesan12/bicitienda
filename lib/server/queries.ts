import { asc, eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { store } from "@/lib/config";
import { products as seedProducts } from "@/lib/data/catalog";
import { content as seedContent } from "@/lib/data/content";
import { TEXTS } from "@/lib/data/texts";
import { resolveImage } from "@/lib/images";
import { getDb, schema } from "@/lib/server/db";
import { getStockMatrix, getStockTotals } from "@/lib/server/stock";
import type {
  AgendaEvent,
  Article,
  Brand,
  Category,
  CategoryWithCount,
  Product,
  SiteContent,
  SiteTexts,
  StoreConfig,
  StoreLocation,
} from "@/lib/types";

/**
 * Lecturas de la web pública, cacheadas con `unstable_cache` (el modelo de
 * caché sin Cache Components de Next 16 — la app usa ISR clásico con
 * `generateStaticParams` + `revalidate`, así que este es el patrón que
 * corresponde; migrar a `use cache` implicaría prender cacheComponents y
 * rehacer el modelo de rendering entero).
 *
 * Tags de invalidación (las server actions del admin llaman revalidateTag):
 *   - "catalog":   productos, marcas, categorías, stock
 *   - "content":   contenido (hero, Nosotros, comunidad, test), textos,
 *                  notas, agenda
 *   - "settings":  configuración editable
 *   - "locations": sucursales
 */

/**
 * Revalidación de respaldo: 1 día. Toda escritura del admin (y los
 * pedidos, que descuentan stock) invalida por tag on-demand, así que esto
 * solo cubre lo que no puede invalidar (p. ej. el barrido de reservas
 * vencidas que corre durante un render). OJO: el `revalidate` de
 * unstable_cache se propaga a la ruta ISR que lo lee (gana el menor), así
 * que un valor corto acá regeneraría todas las páginas públicas.
 */
export const BACKUP_REVALIDATE = 86400;

/**
 * Orden estable del catálogo: el del seed (el catálogo 2026 impreso).
 * Sin esto, Postgres devuelve las filas actualizadas al final y el orden
 * de la web cambiaría con cada edición del admin.
 */
export function bySeedOrder<T extends { id: string }>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) => seedIndex(a.id) - seedIndex(b.id) || a.id.localeCompare(b.id),
  );
}

function seedIndex(id: string): number {
  const i = seedProducts.findIndex((p) => p.id === id);
  return i === -1 ? Number.MAX_SAFE_INTEGER : i;
}

/**
 * Catálogo visible completo, en el orden del seed. El `stock` de cada
 * producto es el agregado SUM sobre las sucursales — la fuente de verdad
 * por sucursal vive en `product_stock`.
 */
export const getVisibleProducts = unstable_cache(
  async (): Promise<Product[]> => {
    const db = await getDb();
    const [rows, totals] = await Promise.all([
      db.select().from(schema.products).where(eq(schema.products.hidden, false)),
      getStockTotals(db),
    ]);
    return bySeedOrder(
      rows.map((r) => ({ ...r, hidden: false, stock: totals.get(r.slug) ?? 0 })),
    );
  },
  ["visible-products"],
  { tags: ["catalog"], revalidate: BACKUP_REVALIDATE },
);

/** Nivel público de disponibilidad: nunca se exponen cantidades exactas. */
export type AvailabilityLevel = "en-stock" | "pocas" | "sin-stock";

export interface LocationAvailability {
  location: StoreLocation;
  level: AvailabilityLevel;
}

/**
 * Disponibilidad por sucursal para la ficha (solo si hay más de una
 * activa). Niveles según los umbrales de la capa por-tienda.
 */
export const getProductAvailability = unstable_cache(
  async (slug: string): Promise<LocationAvailability[]> => {
    const locations = await getActiveLocations();
    if (locations.length < 2) return [];
    const db = await getDb();
    const matrix = await getStockMatrix(db, [slug]);
    const bySucursal = matrix.get(slug) ?? new Map<string, number>();
    return locations.map((location) => {
      const qty = bySucursal.get(location.id) ?? 0;
      const level: AvailabilityLevel =
        qty <= 0 ? "sin-stock" : qty <= store.lowStock ? "pocas" : "en-stock";
      return { location, level };
    });
  },
  ["product-availability"],
  { tags: ["catalog", "locations"], revalidate: BACKUP_REVALIDATE },
);

export async function getProduct(slug: string): Promise<Product | undefined> {
  return (await getVisibleProducts()).find((p) => p.slug === slug);
}

export const getBrands = unstable_cache(
  async (): Promise<Brand[]> => {
    const db = await getDb();
    return db.select().from(schema.brands).orderBy(asc(schema.brands.id));
  },
  ["brands"],
  { tags: ["catalog"], revalidate: BACKUP_REVALIDATE },
);

/**
 * Categorías en su orden, con el contador de productos visibles (el que
 * muestran las tarjetas del home y los filtros).
 */
export const getCategories = unstable_cache(
  async (): Promise<CategoryWithCount[]> => {
    const db = await getDb();
    const [rows, visible] = await Promise.all([
      db
        .select()
        .from(schema.categories)
        .orderBy(asc(schema.categories.order), asc(schema.categories.slug)),
      getVisibleProducts(),
    ]);
    return rows.map((c) => ({
      ...c,
      count: visible.filter((p) => p.category === c.slug).length,
    }));
  },
  ["categories"],
  { tags: ["catalog"], revalidate: BACKUP_REVALIDATE },
);

/** Categoría por slug corto o por slug de URL. */
export async function getCategory(slug: string): Promise<Category | undefined> {
  return (await getCategories()).find(
    (c) => c.slug === slug || c.pathSlug === slug,
  );
}

/**
 * Completa el contenido de la DB con el seed: una base migrada desde el
 * modelo viejo (solo hero) o una clave nueva del contenido nunca quedan
 * sin valor. Las secciones anidadas se completan campo a campo.
 */
export function withContentDefaults(
  stored: Partial<SiteContent> | null | undefined,
): SiteContent {
  const c = stored ?? {};
  return {
    ...seedContent,
    ...c,
    nosotros: { ...seedContent.nosotros, ...c.nosotros },
    rep: { ...seedContent.rep, ...c.rep },
    test: { ...seedContent.test, ...c.test },
  };
}

/** Contenido editable: hero, Nosotros, reparaciones, comunidad y test. */
export const getContent = unstable_cache(
  async (): Promise<SiteContent> => {
    const db = await getDb();
    const [row] = await db
      .select({ content: schema.settings.content })
      .from(schema.settings)
      .where(eq(schema.settings.id, "main"));
    if (!row) throw new Error("Settings sin seed: corré `pnpm db:seed`.");
    return withContentDefaults(row.content);
  },
  ["site-content"],
  { tags: ["content"], revalidate: BACKUP_REVALIDATE },
);

/** Textos de la web: el seed `TEXTS` con los overrides del admin encima. */
export const getTexts = unstable_cache(
  async (): Promise<SiteTexts> => {
    const db = await getDb();
    const rows = await db.select().from(schema.texts);
    return {
      ...TEXTS,
      ...Object.fromEntries(rows.map((r) => [r.key, r.value])),
    };
  },
  ["site-texts"],
  { tags: ["content"], revalidate: BACKUP_REVALIDATE },
);

export const getArticles = unstable_cache(
  async (): Promise<Article[]> => {
    const db = await getDb();
    return db
      .select()
      .from(schema.articles)
      .where(eq(schema.articles.published, true))
      .orderBy(asc(schema.articles.order), asc(schema.articles.id));
  },
  ["articles"],
  { tags: ["content"], revalidate: BACKUP_REVALIDATE },
);

export async function getArticle(slug: string): Promise<Article | undefined> {
  return (await getArticles()).find((a) => a.slug === slug);
}

export const getAgenda = unstable_cache(
  async (): Promise<AgendaEvent[]> => {
    const db = await getDb();
    return db
      .select()
      .from(schema.agendaEvents)
      .where(eq(schema.agendaEvents.published, true))
      .orderBy(asc(schema.agendaEvents.date));
  },
  ["agenda"],
  { tags: ["content"], revalidate: BACKUP_REVALIDATE },
);

/**
 * Matriz slug → sucursal → qty de los productos visibles, para que el
 * checkout arme el selector de retiro con disponibilidad real. Solo la
 * consume el checkout (las fichas públicas muestran niveles, no números).
 */
export const getCheckoutStockMatrix = unstable_cache(
  async (): Promise<Record<string, Record<string, number>>> => {
    const db = await getDb();
    const matrix = await getStockMatrix(db);
    const out: Record<string, Record<string, number>> = {};
    for (const [slug, perLoc] of matrix) out[slug] = Object.fromEntries(perLoc);
    return out;
  },
  ["checkout-stock-matrix"],
  { tags: ["catalog", "locations"], revalidate: BACKUP_REVALIDATE },
);

/**
 * Sucursales activas, ordenadas: la primera es la principal. Editables
 * desde /admin/sucursales; el seed sale de `store.locations`.
 */
export const getActiveLocations = unstable_cache(
  async (): Promise<StoreLocation[]> => {
    const db = await getDb();
    const rows = await db
      .select()
      .from(schema.locations)
      .where(eq(schema.locations.active, true))
      .orderBy(asc(schema.locations.order), asc(schema.locations.id));
    if (!rows.length)
      throw new Error("Sin sucursales activas: corré `pnpm db:seed`.");
    return rows;
  },
  ["active-locations"],
  { tags: ["locations"], revalidate: BACKUP_REVALIDATE },
);

/** Configuración editable (para el admin y, más adelante, el checkout). */
export const getSettings = unstable_cache(
  async () => {
    const db = await getDb();
    const [row] = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.id, "main"));
    if (!row) throw new Error("Settings sin seed: corré `pnpm db:seed`.");
    return row;
  },
  ["settings"],
  { tags: ["settings"], revalidate: BACKUP_REVALIDATE },
);

/**
 * Config en runtime: la capa por-tienda estática (marca, léxico, rutas)
 * con los valores editables pisados por la fila settings de la DB. Es lo
 * que consumen las páginas públicas en lugar de `store`.
 */
export interface RuntimeStore extends StoreConfig {
  /** Contenido editable completo (hero, Nosotros, comunidad, test). */
  content: SiteContent;
}

export async function getStore(): Promise<RuntimeStore> {
  const [s, locations, content] = await Promise.all([
    getSettings(),
    getActiveLocations(),
    // Por getContent (tag "content") y no por la fila de settings: así lo
    // invalida el guardado del contenido.
    getContent(),
  ]);
  return {
    ...store,
    catalogPdfUrl: store.catalogPdfUrl && resolveImage(store.catalogPdfUrl),
    whatsapp: s.whatsapp,
    whatsappGroupUrl: s.whatsappGroupUrl,
    instagram: s.instagram,
    tiktok: s.tiktok,
    address: s.address || store.address,
    hours: s.hours || store.hours,
    mapsUrl: s.mapsUrl || store.mapsUrl,
    transferAlias: s.transferAlias,
    transferDiscount: s.transferDiscount,
    r3: s.r3,
    r6: s.r6,
    depositRate: s.depositRate,
    depositMinTotal: s.depositMinTotal,
    reservationHours: s.reservationHours,
    localShippingCost: s.localShippingCost,
    showPrices: s.showPrices,
    ventaOnline: s.ventaOnline,
    // Las sucursales activas de la DB, ordenadas: [0] es la principal.
    locations,
    content,
  };
}
