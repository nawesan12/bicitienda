import type { Product } from "@/lib/types";
import { variantPrice } from "@/lib/variants";

/**
 * La vista mínima de un producto comprable que necesita el carrito.
 * Módulo puro (sin "use client") para que el server la construya y se la
 * pase a los client components como props.
 */
export interface CartProduct {
  slug: string;
  name: string;
  /** Precio base del producto (el de los talles sin precio propio). */
  price: number;
  /** Precio efectivo por variante (talle con precio propio o el base). */
  variantPrices: Record<string, number>;
  image: string | null;
  /** Stock total agregado (tope del carrito). */
  stock: number;
  /**
   * qty por sucursal — solo la carga el checkout (para el selector de
   * retiro); en el drawer va vacío.
   */
  stockByLocation?: Record<string, number>;
}

export function toCartProduct(
  p: Product,
  stockByLocation?: Record<string, number>,
): CartProduct | null {
  if (p.price == null) return null;
  return {
    slug: p.slug,
    name: p.name,
    price: p.price,
    variantPrices: Object.fromEntries(
      p.variants.map((v) => [v.id, variantPrice(p.price, v) ?? (p.price as number)]),
    ),
    image: p.images[0] ?? null,
    stock: p.stock,
    ...(stockByLocation ? { stockByLocation } : {}),
  };
}
