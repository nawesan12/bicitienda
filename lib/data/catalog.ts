/**
 * ── CAPA POR TIENDA ──────────────────────────────────────────
 * Catálogo seed de BiciTienda MDQ: traduce los datos del prototipo
 * (`lib/data/demo/*`, tipos propios sin dependencias) a los tipos del seed
 * del core (`SeedCategory`, `SeedProduct`). Es el SEED de la base
 * (`pnpm db:seed`): la web lee siempre de la DB, editable desde /admin.
 *
 * Fotos: claves `pexels:<id>`; `resolveImage()` (lib/images.ts) las pasa a
 * Cloudinary vía el manifest (`pnpm demo:images`) o, sin subir, a Pexels.
 */
import {
  CATEGORIES,
  HOME_CATEGORY_STRIP,
  manifestKey,
  PRODUCTS,
  type DemoProduct,
} from "@/lib/data/demo";
import type { Brand, SeedCategory, SeedProduct } from "@/lib/types";

/**
 * El prototipo no tiene marcas ("MARCA" / "[Marca a confirmar]"): todos los
 * productos cuelgan de esta marca placeholder hasta que el cliente las pase.
 * La UI puede tratar `PLACEHOLDER_BRAND_ID` como "sin marca".
 */
export const PLACEHOLDER_BRAND_ID = "sin-marca";

export const brands: Brand[] = [{ id: PLACEHOLDER_BRAND_ID, name: "[Marca a confirmar]" }];

/** Singular en mayúsculas para la etiqueta de las tarjetas. */
const SINGLE: Record<string, string> = {
  bicicletas: "BICICLETA",
  accesorios: "ACCESORIO",
  repuestos: "REPUESTO",
  importados: "IMPORTADO",
  mtb: "MTB",
  "ruta-gravel": "RUTA / GRAVEL",
  urbanas: "URBANA",
  infantiles: "INFANTIL",
  cascos: "CASCO",
  indumentaria: "INDUMENTARIA",
};

const HOME = new Set(HOME_CATEGORY_STRIP.map((c) => c.categorySlug));

/**
 * Dos niveles: grupos del nav (`parentSlug: null`) y tipos dentro de cada
 * grupo. El `order` de los tipos es relativo a su grupo.
 */
export const categories: SeedCategory[] = CATEGORIES.map((c) => ({
  slug: c.slug,
  label: c.name,
  single: SINGLE[c.slug] ?? c.name.toUpperCase(),
  sub: "",
  home: HOME.has(c.slug),
  imgProductId:
    PRODUCTS.find(
      (p) =>
        p.categorySlug === c.slug ||
        CATEGORIES.some((t) => t.slug === p.categorySlug && t.parentSlug === c.slug),
    )?.slug ?? null,
  pathSlug: c.slug,
  order: c.order,
  parentSlug: c.parentSlug,
}));

function toSeedProduct(p: DemoProduct, i: number): SeedProduct {
  return {
    id: p.slug,
    slug: p.slug,
    name: p.name,
    brandId: PLACEHOLDER_BRAND_ID,
    category: p.categorySlug,
    price: p.price,
    priceApprox: false,
    oldPrice: null,
    tag: p.tag,
    chips: [],
    specs: p.specs,
    images: p.photos.map(manifestKey),
    stock: p.variants.reduce((a, v) => a + v.stock, 0),
    stockOverride: null,
    hidden: false,
    featured: p.featured,
    custom: false,
    description: p.description ?? "",
    // Orden estable del catálogo ("más nuevos" respeta el del prototipo).
    createdAt: `2026-09-${String(30 - i).padStart(2, "0")}`,
    sku: p.sku,
    rodado: p.rodado,
    testRide: p.testRide,
    hideWhenOut: p.hideWhenOut,
    status: p.status,
    variants: p.variants.map((v) => ({
      size: v.size,
      ...(v.color ? { color: v.color } : {}),
      heightRange: v.heightRange,
      sku: v.sku,
      stock: v.stock,
    })),
  };
}

export const products: SeedProduct[] = PRODUCTS.map(toSeedProduct);
