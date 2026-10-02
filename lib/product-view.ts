import { lexicon } from "@/lib/data/content";
import { discountPercent, formatARS } from "@/lib/format";
import {
  cuota3,
  cuota6,
  isOutOfStock,
  transferPrice,
  type PricingRates,
} from "@/lib/pricing";
import type { Brand, Category, Product } from "@/lib/types";

/**
 * Vista de un producto para tarjetas, ficha, comparador y modales: la
 * lógica de precio del prototipo (`decorate` del handoff) en un módulo puro
 * que usan tanto los server components como los client components.
 *
 *   hasPrice = mostrar precios && precio cargado && con stock
 *   priceF   = "Sin stock" | "$X" | "Consultar"
 *   sub      = "6 cuotas MiPyME de $X" | "Avisame cuando vuelva" | "Respuesta en el día"
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

export interface PriceView {
  hasPrice: boolean;
  priceF: string;
  sub: string;
  hasList: boolean;
  listF: string;
  /** "−19%" o "". */
  offLabel: string;
  c6F: string | null;
  c3F: string | null;
  cashF: string | null;
}

export function priceView(
  rates: PricingRates,
  p: { price: number | null; listPrice: number | null; outOfStock: boolean },
): PriceView {
  const { price, listPrice, outOfStock } = p;
  const hasPrice = rates.showPrices && price != null && !outOfStock;
  const onSale = price != null && listPrice != null && listPrice > price;
  return {
    hasPrice,
    priceF: outOfStock
      ? lexicon.product.outOfStock
      : hasPrice
        ? formatARS(price!)
        : lexicon.product.consult,
    sub: hasPrice
      ? lexicon.financing.cardSub(formatARS(cuota6(rates, price!)))
      : outOfStock
        ? lexicon.product.outOfStockSub
        : lexicon.product.noPriceSub,
    hasList: hasPrice && onSale,
    listF: listPrice ? formatARS(listPrice) : "",
    offLabel: onSale ? `−${discountPercent(price!, listPrice!)}%` : "",
    c6F: price ? formatARS(cuota6(rates, price)) : null,
    c3F: price ? formatARS(cuota3(rates, price)) : null,
    cashF: price ? formatARS(transferPrice(rates, price)) : null,
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
