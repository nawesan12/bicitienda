import { store } from "@/lib/config";
import { deliveryMethods, paymentMethods } from "@/lib/config";
import type {
  CartLine,
  DeliveryMethodId,
  PaymentMethodId,
  PaymentMode,
  Product,
} from "@/lib/types";

/**
 * Precios derivados. Funciones puras: las tasas vienen del caller — en las
 * páginas salen de `getStore()` (settings editables desde /admin/ajustes),
 * nunca de valores hardcodeados en pantallas.
 */

/** Las tasas editables que necesita cualquier cálculo de precio. */
export interface PricingRates {
  /** Descuento por transferencia en % (5 = 5%). */
  transferDiscount: number;
  /** Recargo % del Plan MiPyME en 3 cuotas. */
  r3: number;
  /** Recargo % del Plan MiPyME en 6 cuotas. */
  r6: number;
  depositRate: number;
  showPrices: boolean;
}

/** Recorta un RuntimeStore/StoreConfig a lo que precisa el pricing. */
export function ratesOf(s: PricingRates): PricingRates {
  return {
    transferDiscount: s.transferDiscount,
    r3: s.r3,
    r6: s.r6,
    depositRate: s.depositRate,
    showPrices: s.showPrices,
  };
}

/** Cantidad de cuotas con tarjeta: 1 (un pago), 3 o 6 (Plan MiPyME). */
export type Installments = 1 | 3 | 6;

/** Recargo % para pagar en `n` cuotas (0 en un pago). */
export function surchargePct(rates: PricingRates, n: Installments): number {
  if (n === 3) return rates.r3 || 0;
  if (n === 6) return rates.r6 || 0;
  return 0;
}

/** Precio pagando por transferencia: lista × (1 − dto/100). */
export function transferPrice(rates: PricingRates, price: number): number {
  return Math.round(price * (1 - (rates.transferDiscount || 0) / 100));
}

/** Monto de la seña para reservar: total × depositRate, redondeado al mil. */
export function depositAmount(rates: PricingRates, total: number): number {
  return Math.round((total * rates.depositRate) / 1000) * 1000;
}

/**
 * Un producto se puede comprar online solo si tiene precio publicado, stock,
 * y la tienda no está en modo vidriera. Si no, la ficha deriva a WhatsApp.
 */
export function isBuyable(rates: PricingRates, product: Product): boolean {
  return rates.showPrices && product.price != null && !isOutOfStock(product);
}

/**
 * SIN STOCK: sin unidades en ninguna sucursal o forzado desde el admin
 * con el override manual.
 */
export function isOutOfStock(product: Product): boolean {
  return product.stockOverride === "sin_stock" || product.stock <= 0;
}

/** Precio visible de un producto: null significa "Precio a consultar". */
export function displayPrice(
  rates: PricingRates,
  product: Product,
): number | null {
  if (!rates.showPrices) return null;
  return product.price;
}

/* ── Stock ────────────────────────────────────────────────── */

export type StockLevel = "agotado" | "critico" | "bajo" | "normal";

/** Umbrales de alerta del admin: fijos de la capa por-tienda. */
export function stockLevel(stock: number): StockLevel {
  if (stock <= 0) return "agotado";
  if (stock <= store.criticalStock) return "critico";
  if (stock <= store.lowStock) return "bajo";
  return "normal";
}

/* ── Totales del carrito ──────────────────────────────────── */

export interface CartTotals {
  subtotal: number;
  /** Costo de envío conocido. 0 cuando es retiro o está a cotizar. */
  shippingCost: number;
  /** true cuando el envío se cotiza por WhatsApp y no entra en el total. */
  shippingPending: boolean;
  /** Descuento del medio de pago (transferencia −dto%). */
  paymentDiscount: number;
  /** Recargo del Plan MiPyME al pagar con tarjeta en 3 o 6 cuotas. */
  financingSurcharge: number;
  /** Cuotas efectivamente aplicadas (1 si el medio no admite cuotas). */
  installments: Installments;
  total: number;
  /** Total pagando por transferencia, para el "o $X con transferencia". */
  transferTotal: number;
  /** Monto a pagar ahora: el total, o la seña si se reserva. */
  dueNow: number;
  /** Saldo restante cuando se paga seña. 0 si se paga completo. */
  balanceDue: number;
  itemCount: number;
}

export function cartSubtotal(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.lineTotal, 0);
}

export function computeTotals(
  rates: PricingRates,
  lines: CartLine[],
  deliveryId: DeliveryMethodId | null,
  paymentId: PaymentMethodId | null,
  paymentMode: PaymentMode = "total",
  installments: Installments = 1,
): CartTotals {
  const subtotal = cartSubtotal(lines);

  const delivery = deliveryMethods.find((d) => d.id === deliveryId);
  const shippingPending = delivery?.cost === null;
  const shippingCost = delivery?.cost ?? 0;

  const payment = paymentMethods.find((p) => p.id === paymentId);
  const paymentDiscount = payment?.transferDiscount
    ? subtotal - transferPrice(rates, subtotal)
    : 0;

  const useDeposit = paymentMode === "sena" && !!payment?.allowsDeposit;
  // Las cuotas solo aplican al pago total con tarjeta: la seña va en un pago.
  const n: Installments =
    payment?.allowsInstallments && !useDeposit ? installments : 1;
  const base = subtotal - paymentDiscount + shippingCost;
  const financingSurcharge = Math.round(
    (base * surchargePct(rates, n)) / 100,
  );

  const total = base + financingSurcharge;
  const dueNow = useDeposit ? depositAmount(rates, total) : total;

  return {
    subtotal,
    shippingCost,
    shippingPending,
    paymentDiscount,
    financingSurcharge,
    installments: n,
    total,
    transferTotal: transferPrice(rates, subtotal) + shippingCost,
    dueNow,
    balanceDue: useDeposit ? total - dueNow : 0,
    itemCount: lines.reduce((sum, l) => sum + l.quantity, 0),
  };
}
