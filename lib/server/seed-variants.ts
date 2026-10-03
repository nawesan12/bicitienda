import { SINGLE_SIZE, type SeedProduct, type SeedVariant } from "@/lib/types";
import { defaultVariantId, defaultVariantSku } from "@/lib/variants";
import { slugify } from "@/lib/slug";

/**
 * Ids y SKUs estables de las variantes del seed: los usan el seed del
 * catálogo (lib/server/seed.ts) y el de la operación demo
 * (lib/server/seed-demo.ts), que enlaza pedidos y turnos a la variante.
 */

/** Variantes del seed con id y SKU resueltos. */
export function seedVariantsOf(p: SeedProduct): (SeedVariant & { id: string; sku: string; order: number })[] {
  if (!p.variants?.length)
    return [
      {
        id: defaultVariantId(p.slug),
        size: SINGLE_SIZE,
        color: "",
        heightRange: null,
        sku: defaultVariantSku(p.slug, p.sku),
        stock: p.stock,
        order: 0,
      },
    ];
  return p.variants.map((v, i) => {
    const single = v.size === SINGLE_SIZE && !v.color;
    const key = [v.size, v.color].filter(Boolean).join("-");
    return {
      ...v,
      id: single ? defaultVariantId(p.slug) : `${p.slug}--${slugify(key, 30)}`,
      sku:
        v.sku ??
        (single
          ? defaultVariantSku(p.slug, p.sku)
          : `${(p.sku || p.slug).toUpperCase()}-${slugify(key, 30).toUpperCase()}`),
      order: i,
    };
  });
}


/** Variante del seed por talle + color (color vacío = único color). */
export function findSeedVariant(
  p: SeedProduct,
  size: string | null,
  color: string | null,
): (SeedVariant & { id: string; sku: string; order: number }) | undefined {
  const variants = seedVariantsOf(p);
  return (
    variants.find((v) => v.size === (size ?? SINGLE_SIZE) && (v.color ?? "") === (color ?? "")) ??
    variants.find((v) => v.size === (size ?? SINGLE_SIZE)) ??
    (variants.length === 1 ? variants[0] : undefined)
  );
}
