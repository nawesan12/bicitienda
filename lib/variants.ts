import { SINGLE_SIZE, type ProductVariant } from "@/lib/types";

/**
 * Helpers puros de variantes (talle × color), compartidos por el server y
 * el navegador.
 */

/** id de la variante única de un producto sin talles. */
export function defaultVariantId(productSlug: string): string {
  return `${productSlug}--u`;
}

/** SKU por defecto de la variante única: el SKU del producto o el slug. */
export function defaultVariantSku(productSlug: string, productSku?: string | null): string {
  return `${(productSku || productSlug).toUpperCase()}-U`;
}

/** true si la variante es la "Único" sin color (el producto no tiene talles). */
export function isSingleVariant(v: Pick<ProductVariant, "size" | "color">): boolean {
  return v.size === SINGLE_SIZE && !v.color;
}

/**
 * Texto de la variante para carrito, pedido y mails: "Talle M · Negro",
 * "Rojo", "Talle 16". "" para la variante única.
 */
export function variantLabel(v: Pick<ProductVariant, "size" | "color">): string {
  const parts: string[] = [];
  if (v.size && v.size !== SINGLE_SIZE) parts.push(`Talle ${v.size}`);
  if (v.color) parts.push(v.color);
  return parts.join(" · ");
}

/** Talles distintos de un producto, en orden (para el selector de la ficha). */
export function sizesOf(variants: Pick<ProductVariant, "size" | "order">[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of [...variants].sort((a, b) => a.order - b.order)) {
    if (!seen.has(v.size)) {
      seen.add(v.size);
      out.push(v.size);
    }
  }
  return out;
}

/** Colores distintos (el selector de color aparece solo si hay más de uno). */
export function colorsOf(variants: Pick<ProductVariant, "color" | "order">[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of [...variants].sort((a, b) => a.order - b.order)) {
    if (v.color && !seen.has(v.color)) {
      seen.add(v.color);
      out.push(v.color);
    }
  }
  return out;
}

/**
 * La variante que compra el cliente: la pedida (si es del producto y está
 * activa) o, si no pidió ninguna, la única activa. null si hace falta elegir.
 */
export function resolveVariant<V extends Pick<ProductVariant, "id" | "active">>(
  variants: V[],
  variantId?: string | null,
): V | null {
  const active = variants.filter((v) => v.active);
  if (variantId) return active.find((v) => v.id === variantId) ?? null;
  return active.length === 1 ? active[0] : null;
}
