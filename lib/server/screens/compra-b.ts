import { img } from "@/lib/images";
import { isPendingValue } from "@/lib/server/mail";
import { isBuyable, ratesOf } from "@/lib/pricing";
import type { OrderItemRow } from "@/lib/server/order-queries";
import { getBrands, getCategories, getSettings, getStore, getVisibleProducts } from "@/lib/server/queries";
import type { Category } from "@/lib/types";
import { isSingleVariant, variantLabel } from "@/lib/variants";

/**
 * Lecturas de solo lectura de las pantallas de compra (agente B, ola 1):
 * carrito 2d/4d, confirmación 2e y seguimiento. No escriben nada; todo lo
 * transaccional sigue en placeOrder / uploadTransferReceipt.
 */

/** Grupo del nav al que pertenece una categoría (sube por parentSlug). */
function rootOf(slug: string, bySlug: Map<string, Category>): Category | undefined {
  let c = bySlug.get(slug);
  let guard = 0;
  while (c?.parentSlug && guard++ < 10) c = bySlug.get(c.parentSlug) ?? c;
  return c;
}

const BIKE_GROUP = "bicicletas";

/** Variante comprable, como la necesita la fila del carrito. */
export interface CartVariantView {
  id: string;
  /** "Talle M · Negro" ("" en la variante única). */
  label: string;
  stock: number;
}

/** Producto comprable con lo que muestra la fila del carrito (2d/4d). */
export interface CartCatalogItem {
  slug: string;
  name: string;
  price: number;
  /** Foto ya transformada (Cloudinary) para 160×120 / 88×88. */
  image: string | null;
  /** Nombre de la categoría ("MTB", "Cascos"). */
  category: string;
  /** Marca ("" si no tiene). */
  brand: string;
  /** Pertenece al grupo Bicicletas. */
  isBike: boolean;
  /** Stock total (tope si la línea no tiene variante). */
  stock: number;
  variants: CartVariantView[];
}

/**
 * Catálogo comprable para el carrito: productos visibles con precio y
 * stock, con categoría, marca y variantes. Los precios son informativos:
 * placeOrder recalcula todo server-side.
 */
export async function getCartCatalog(): Promise<CartCatalogItem[]> {
  const [products, runtime, categories, brands] = await Promise.all([
    getVisibleProducts(),
    getStore(),
    getCategories(),
    getBrands(),
  ]);
  const rates = ratesOf(runtime);
  const bySlug = new Map<string, Category>(categories.map((c) => [c.slug, c]));
  const brandById = new Map(brands.map((b) => [b.id, b.name]));
  return products
    .filter((p) => isBuyable(rates, p) && p.price != null)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      price: p.price as number,
      image: p.images[0] ? img(p.images[0], { w: 360 }) : null,
      category: bySlug.get(p.category)?.label ?? "",
      brand: brandById.get(p.brandId) ?? "",
      isBike: rootOf(p.category, bySlug)?.slug === BIKE_GROUP,
      stock: p.stock,
      variants: p.variants.map((v) => ({
        id: v.id,
        label: isSingleVariant(v) ? "" : variantLabel(v),
        stock: v.stock,
      })),
    }));
}

/** Datos de las líneas de un pedido que no quedan congelados en order_items. */
export interface OrderItemsInfo {
  /** El pedido tiene al menos una bici ("Tu bici ya es tuya."). */
  hasBike: boolean;
  /** Foto transformada por id de línea. */
  imageById: Record<number, string | null>;
}

export async function getOrderItemsInfo(items: OrderItemRow[]): Promise<OrderItemsInfo> {
  const [products, categories] = await Promise.all([getVisibleProducts(), getCategories()]);
  const bySlug = new Map<string, Category>(categories.map((c) => [c.slug, c]));
  const productBySlug = new Map(products.map((p) => [p.slug, p]));
  const hasBike = items.some((it) => {
    const p = it.productSlug ? productBySlug.get(it.productSlug) : undefined;
    return !!p && rootOf(p.category, bySlug)?.slug === BIKE_GROUP;
  });
  const imageById: Record<number, string | null> = {};
  for (const it of items) imageById[it.id] = it.image ? img(it.image, { w: 200 }) : null;
  return { hasBike, imageById };
}

/** Placeholder de los datos bancarios mientras Ajustes no los tenga. */
export const TRANSFER_PENDING = "[a confirmar]";

/** true si el dato es un placeholder "[… a confirmar]" (o falta). */
export function isTransferPending(v: string): boolean {
  return isPendingValue(v);
}

export interface TransferDetails {
  alias: string;
  cbu: string;
  holder: string;
  bank: string;
}

/**
 * Datos para transferir, desde Ajustes. Los vacíos salen como
 * "[a confirmar]"; los placeholders de Ajustes ("[CBU a confirmar]") se
 * muestran tal cual (isTransferPending los detecta para no ofrecer Copiar).
 */
export async function getTransferDetails(): Promise<TransferDetails> {
  const s = await getSettings();
  const read = (v: string | null | undefined) => (v && v.trim() ? v.trim() : TRANSFER_PENDING);
  return {
    alias: read(s.transferAlias),
    cbu: read(s.transferCbu),
    holder: read(s.transferHolder),
    bank: read(s.transferBank),
  };
}
