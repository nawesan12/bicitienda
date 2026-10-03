import { PLACEHOLDER_BRAND_ID } from "@/lib/data/catalog";
import { HOME_CATEGORY_STRIP } from "@/lib/data/demo/categories";
import { COLORS } from "@/lib/data/demo/products";
import { img, resolveImage } from "@/lib/images";
import { isOutOfStock } from "@/lib/pricing";
import {
  getBrands,
  getCategories,
  getSettings,
  getStore,
  getVisibleProducts,
} from "@/lib/server/queries";
import { SINGLE_SIZE, type Brand, type CategoryWithCount, type Product } from "@/lib/types";

/**
 * Lecturas de solo lectura de las pantallas de la tienda (agente A: home,
 * catálogo y ficha). Arman view models serializables a partir de las
 * queries cacheadas de lib/server/queries.ts (mismo tag "catalog"), así
 * las páginas siguen estáticas/ISR y los filtros del catálogo corren en el
 * navegador sobre estos datos.
 */

/* ── Tipos ─────────────────────────────────────────────────── */

export interface CardSize {
  size: string;
  /** Unidades del talle (todas sus variantes de color). */
  stock: number;
}

/** Producto listo para `ProductCard` y para los filtros del catálogo. */
export interface CatalogItem {
  slug: string;
  href: string;
  name: string;
  /** Rótulo de la card (singular de la categoría: "MTB", "URBANA"). */
  category: string;
  /** Categoría (tipo) del producto. */
  categorySlug: string;
  /** null para la marca placeholder "sin-marca": la card no la muestra. */
  brand: string | null;
  image: { src: string; alt: string };
  price: number;
  tag: string | null;
  rodado: string | null;
  testRide: boolean;
  /** Talles reales (sin "Único") con su stock. */
  sizes: CardSize[];
  /** Variante a agregar desde el "+" de la card; null si hay que elegir. */
  quickVariant: { id: string; stock: number } | null;
  outOfStock: boolean;
  createdAt: string;
  /** Posición en el orden del seed (≈ "más vendidas"). */
  rank: number;
}

export interface Pricing {
  installments: number;
  transferDiscountPct: number;
}

/* ── Helpers ───────────────────────────────────────────────── */

const CARD_IMG_W = 800;

export function brandName(brands: Brand[], id: string): string | null {
  if (id === PLACEHOLDER_BRAND_ID) return null;
  return brands.find((b) => b.id === id)?.name ?? null;
}

/** Cadena de categorías del producto: [grupo, …, tipo]. */
export function categoryChain(
  categories: CategoryWithCount[],
  slug: string,
): CategoryWithCount[] {
  const bySlug = new Map(categories.map((c) => [c.slug, c]));
  const out: CategoryWithCount[] = [];
  let cur = bySlug.get(slug);
  while (cur) {
    out.unshift(cur);
    cur = cur.parentSlug ? bySlug.get(cur.parentSlug) : undefined;
  }
  return out;
}

/** Slugs de la categoría y todos sus descendientes. */
export function descendantSlugs(categories: CategoryWithCount[], slug: string): Set<string> {
  const out = new Set([slug]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of categories)
      if (c.parentSlug && out.has(c.parentSlug) && !out.has(c.slug)) {
        out.add(c.slug);
        grew = true;
      }
  }
  return out;
}

function sizesOfProduct(p: Product): CardSize[] {
  const map = new Map<string, number>();
  for (const v of [...p.variants].sort((a, b) => a.order - b.order)) {
    if (v.size === SINGLE_SIZE) continue;
    map.set(v.size, (map.get(v.size) ?? 0) + v.stock);
  }
  return [...map].map(([size, stock]) => ({ size, stock }));
}

export function toCatalogItem(
  p: Product,
  rank: number,
  categories: CategoryWithCount[],
  brands: Brand[],
  hrefFor: (slug: string) => string,
): CatalogItem {
  const cat = categories.find((c) => c.slug === p.category);
  const single = p.variants.length === 1 ? p.variants[0] : null;
  const out = isOutOfStock(p);
  return {
    slug: p.slug,
    href: hrefFor(p.slug),
    name: p.name,
    category: cat?.single ?? cat?.label ?? "",
    categorySlug: p.category,
    brand: brandName(brands, p.brandId),
    image: {
      src: p.images[0] ? img(resolveImage(p.images[0]), { w: CARD_IMG_W }) : "/brand/logo-bicitiendamdq-320.webp",
      alt: p.name,
    },
    price: p.price ?? 0,
    tag: p.tag,
    rodado: p.rodado,
    testRide: p.testRide,
    sizes: sizesOfProduct(p),
    quickVariant: single && !out && single.stock > 0 ? { id: single.id, stock: single.stock } : null,
    outOfStock: out,
    createdAt: p.createdAt,
    rank,
  };
}

/** Cuotas y % de transferencia vigentes (Ajustes). */
export async function getPricing(): Promise<Pricing> {
  const s = await getSettings();
  return { installments: s.maxInstallments, transferDiscountPct: s.transferDiscount };
}

/**
 * Catálogo visible como CatalogItem, en el orden del seed. Los productos
 * sin precio ("a consultar") no entran: la card del handoff no tiene
 * estado sin precio.
 */
export async function getCatalogItems(hrefFor: (slug: string) => string) {
  const [products, categories, brands] = await Promise.all([
    getVisibleProducts(),
    getCategories(),
    getBrands(),
  ]);
  const items = products
    .filter((p) => p.price != null)
    .map((p, i) => toCatalogItem(p, i, categories, brands, hrefFor));
  return { items, products, categories, brands };
}

/* ── Home ──────────────────────────────────────────────────── */

export interface StripCell {
  index: string;
  name: string;
  pathSlug: string;
}

/**
 * Tira de categorías del home (2a) y chips (4a): las categorías con
 * `home`, en orden de árbol (grupo y después sus tipos). El nombre corto
 * sale de la tira del prototipo ("Importados") si existe.
 */
export function homeStrip(categories: CategoryWithCount[]): StripCell[] {
  const roots = categories.filter((c) => !c.parentSlug).sort((a, b) => a.order - b.order);
  const ordered: CategoryWithCount[] = [];
  const walk = (c: CategoryWithCount) => {
    ordered.push(c);
    categories
      .filter((k) => k.parentSlug === c.slug)
      .sort((a, b) => a.order - b.order)
      .forEach(walk);
  };
  roots.forEach(walk);
  const short = new Map(HOME_CATEGORY_STRIP.map((c) => [c.categorySlug, c.name]));
  return ordered
    .filter((c) => c.home)
    .map((c, i) => ({
      index: String(i + 1).padStart(2, "0"),
      name: short.get(c.slug) ?? c.label,
      pathSlug: c.pathSlug,
    }));
}

/* ── Ficha ─────────────────────────────────────────────────── */

const SWATCHES = new Map<string, readonly string[]>(
  Object.values(COLORS).map((c) => [c.name.toLowerCase(), c.swatch]),
);

/** Muestra CSS de un color por nombre (bicolor → mitad y mitad). */
export function colorSwatch(name: string): string | undefined {
  const hex = SWATCHES.get(name.toLowerCase());
  if (!hex) return undefined;
  return hex.length > 1 ? `linear-gradient(135deg, ${hex[0]} 50%, ${hex[1]} 50%)` : hex[0];
}

export async function getRuntime() {
  return getStore();
}

/* ── Catálogo ──────────────────────────────────────────────── */

const STANDARD_RODADOS = ["12", "16", "20", "24", "26", "27.5", "28", "29"];
const STANDARD_SIZES = ["S", "M", "L", "XL"];

const byNumber = (a: string, b: string) =>
  (parseFloat(a) || Number.MAX_SAFE_INTEGER) - (parseFloat(b) || Number.MAX_SAFE_INTEGER) ||
  a.localeCompare(b);

export interface CatalogScreen {
  title: string;
  breadcrumb: { label: string; href?: string }[];
  items: CatalogItem[];
  types: { slug: string; label: string; count: number; match: string[] }[];
  bikeFilters: boolean;
  rodados: { value: string; enabled: boolean }[];
  sizes: { value: string; enabled: boolean }[];
  priceBounds: { min: number; max: number };
}

/**
 * Datos del catálogo (2b) para una categoría (grupo o tipo) o, con
 * `null`, para todo el catálogo. Los rodados y talles estándar del
 * prototipo se muestran siempre que el grupo tenga bicis; los que no
 * tienen productos quedan deshabilitados.
 */
export function buildCatalogScreen(
  all: CatalogItem[],
  categories: CategoryWithCount[],
  slug: string | null,
  opts: { allTitle: string; homeLabel: string; hrefFor: (pathSlug?: string) => string },
): CatalogScreen {
  const chain = slug ? categoryChain(categories, slug) : [];
  const current = chain[chain.length - 1];
  const scope = current ? descendantSlugs(categories, current.slug) : null;
  const items = scope ? all.filter((it) => scope.has(it.categorySlug)) : all;

  const children = categories
    .filter((c) => (current ? c.parentSlug === current.slug : !c.parentSlug))
    .sort((a, b) => a.order - b.order)
    .map((c) => {
      const match = [...descendantSlugs(categories, c.slug)];
      return {
        slug: c.slug,
        label: c.label,
        count: items.filter((it) => match.includes(it.categorySlug)).length,
        match,
      };
    })
    .filter((t) => t.count > 0);

  const hasBikes = items.some((it) => it.rodado || it.sizes.length);
  const itemRodados = new Set(items.map((it) => it.rodado).filter((r): r is string => !!r));
  const rodados = hasBikes
    ? [...new Set([...STANDARD_RODADOS, ...itemRodados])]
        .sort(byNumber)
        .map((value) => ({ value, enabled: itemRodados.has(value) }))
    : [];
  const stocked = new Set(items.flatMap((it) => it.sizes.filter((s) => s.stock > 0).map((s) => s.size)));
  const anySizes = items.some((it) => it.sizes.length);
  const sizes = anySizes
    ? [...new Set([...STANDARD_SIZES, ...items.flatMap((it) => it.sizes.map((s) => s.size))])].map(
        (value) => ({ value, enabled: stocked.has(value) }),
      )
    : [];

  const prices = items.map((it) => it.price);
  const priceBounds = prices.length
    ? {
        min: Math.floor(Math.min(...prices) / 10000) * 10000,
        max: Math.ceil(Math.max(...prices) / 10000) * 10000,
      }
    : { min: 0, max: 0 };

  return {
    title: current?.label ?? opts.allTitle,
    breadcrumb: [
      { label: opts.homeLabel, href: "/" },
      ...(current
        ? chain.map((c, i) =>
            i < chain.length - 1 ? { label: c.label, href: opts.hrefFor(c.pathSlug) } : { label: c.label },
          )
        : [{ label: opts.allTitle }]),
    ],
    items,
    types: children,
    bikeFilters: hasBikes,
    rodados,
    sizes,
    priceBounds,
  };
}

/* ── SEO ───────────────────────────────────────────────────── */

/**
 * Las rutas viven en el route group `(tienda)`, así que Next sirve sus
 * `opengraph-image.tsx` con un sufijo de hash (`/catalogo/opengraph-image-
 * abc123`, ver getMetadataRouteSuffix de Next) y el `ogImagePath()` de
 * lib/seo.ts (sin sufijo) da 404. Sacando las imágenes explícitas de
 * `pageMetadata`, Next completa og:image y twitter:image con la URL real
 * del archivo de convención de la ruta.
 */
export function withRouteOgImage<
  T extends { openGraph?: object | null; twitter?: object | null },
>(meta: T): T {
  const strip = (o: object | null | undefined) => {
    if (!o) return o;
    const { images: _drop, ...rest } = o as { images?: unknown };
    void _drop;
    return rest;
  };
  return { ...meta, openGraph: strip(meta.openGraph), twitter: strip(meta.twitter) };
}
