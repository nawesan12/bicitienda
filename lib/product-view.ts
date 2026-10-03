import { isOutOfStock } from "@/lib/pricing";
import type { Brand, Category, Product } from "@/lib/types";

/**
 * Vista mínima de un producto para búsqueda, filtros y asesor (módulo puro,
 * sirve en server y en cliente). Los precios de las cards los arma bt
 * (components/bt/product-card.tsx), sin cuotas.
 */

/** Lo mínimo de un producto que necesita una tarjeta (viaja al cliente). */
export interface CardProduct {
  slug: string;
  name: string;
  brandId: string;
  /** Nombre visible de la marca (también entra en la búsqueda). */
  brand: string;
  category: string;
  /** Singular de la categoría en mayúsculas: "BICICLETA". */
  catLabel: string;
  price: number | null;
  /** Precio de lista tachado (solo si es mayor que el precio). */
  listPrice: number | null;
  tag: string | null;
  chips: string[];
  image: string | null;
  outOfStock: boolean;
}

export function toCardProduct(
  p: Product,
  brands: Brand[],
  categories: Category[],
): CardProduct {
  const cat = categories.find((c) => c.slug === p.category);
  return {
    slug: p.slug,
    name: p.name,
    brandId: p.brandId,
    brand: brands.find((b) => b.id === p.brandId)?.name ?? "",
    category: p.category,
    catLabel: cat ? cat.single || cat.label.toUpperCase() : "",
    price: p.price,
    listPrice: p.oldPrice,
    tag: p.tag,
    chips: p.chips.map((c) => c.trim()).filter(Boolean),
    image: p.images[0] ?? null,
    outOfStock: isOutOfStock(p),
  };
}

/** Búsqueda del prototipo: nombre + marca + pills, sin distinguir mayúsculas. */
export function matchesSearch(p: CardProduct, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return `${p.name} ${p.brand} ${p.chips.join(" ")}`
    .toLowerCase()
    .includes(needle);
}
