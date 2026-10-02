import { DEMO_PHOTOS as P } from "./photos";
import type { DemoOrder, DemoOrderStatus, PaymentMethod } from "./types";

/**
 * Pedidos demo (`ORD` de 3a + `orders` de 2i + `myOrders` de 2g).
 *
 * Inconsistencias del handoff resueltas:
 *  - Los pedidos por transferencia traen el precio YA descontado
 *    (#BT-10481: 323.910 = 359.900 × 0,9; #BT-10475: 287.910 = 319.900 × 0,9).
 *    Acá se guarda el precio de LISTA y el 10% se aplica por el medio de
 *    pago (el total que se ve sigue siendo 323.910 / 287.910).
 *  - Los ítems usan nombres cortos ("MTB rodado 29 · 21 vel.", "Remera de
 *    ciclismo"); se enlazan al producto del catálogo por `productSlug` y se
 *    guarda el nombre del pedido como `name`.
 *  - "Casco infantil" (#BT-10479, $ 29.900) no existe en el catálogo demo:
 *    `productSlug: null`, con la foto del casco MTB como en el prototipo.
 *  - Mi cuenta (2g) muestra #BT-10482 "Armando", pero 3a/2i lo tienen
 *    "Pagado": manda 3a (Pagado). #BT-10288 (kit luces, 3 jul 2026,
 *    Retirado) solo aparece en 2g: se suma como pedido histórico de Juan.
 *  - "Remera… Talle L", "Casco infantil · Talle S", "Casco urbano · M/L":
 *    el talle queda en `variantLabel`; la variante es "Único" (ver
 *    products.ts).
 *  - Fechas: "1 oct" = hoy de la demo (2026-10-01, jueves).
 *
 * Numeración: `BT-` desde 10482 (el próximo pedido real será BT-10483).
 */

/** Rótulos de los estados (pills de 3a, 2i y 2g). */
export const ORDER_STATUS_LABEL: Record<DemoOrderStatus, string> = {
  transf_pendiente: "Transf. pendiente",
  paga_en_local: "Paga en local",
  pagado: "Pagado",
  armando: "Armando",
  listo_retiro: "Listo para retirar",
  retirado: "Retirado",
  cancelado: "Cancelado",
};

/**
 * Colores de las pills (bg, fg, borde) del prototipo (`STC`).
 * "Cancelado" no está en el handoff: mismo estilo que "Rechazado".
 */
export const ORDER_STATUS_PILL: Record<DemoOrderStatus, { bg: string; fg: string; bd: string }> = {
  transf_pendiente: { bg: "#d7261e", fg: "#ffffff", bd: "#d7261e" },
  paga_en_local: { bg: "transparent", fg: "#ffd21f", bd: "#ffd21f" },
  pagado: { bg: "#ffd21f", fg: "#121110", bd: "#ffd21f" },
  armando: { bg: "#3a362f", fg: "#f4efe4", bd: "#3a362f" },
  listo_retiro: { bg: "#f4efe4", fg: "#121110", bd: "#f4efe4" },
  retirado: { bg: "transparent", fg: "#8d867a", bd: "#3a362f" },
  cancelado: { bg: "transparent", fg: "#8d867a", bd: "#5a554c" },
};

/** Botón amarillo de 3a: acción → próximo estado (`NEXT`). */
export const ORDER_NEXT: Partial<Record<DemoOrderStatus, { label: string; to: DemoOrderStatus }>> = {
  transf_pendiente: { label: "Validar transferencia", to: "pagado" },
  pagado: { label: "Pasar a armado", to: "armando" },
  armando: { label: "Marcar lista para retirar", to: "listo_retiro" },
  listo_retiro: { label: "Marcar como retirada", to: "retirado" },
  paga_en_local: { label: "Registrar pago y retiro", to: "retirado" },
};

/** Línea de tiempo del detalle (3a/4i) y cuántos pasos están hechos (`DONE`). */
export const ORDER_TIMELINE = [
  "Pedido recibido",
  "Pago confirmado",
  "Armado y ajuste",
  "Listo para retirar",
  "Retirado",
] as const;
export const ORDER_TIMELINE_DONE: Record<DemoOrderStatus, number> = {
  transf_pendiente: 1,
  paga_en_local: 1,
  pagado: 2,
  armando: 2,
  listo_retiro: 4,
  retirado: 5,
  cancelado: 1,
};

/** Rótulo del medio de pago como lo muestra 3a. */
export function paymentLabel(payment: PaymentMethod, installments: number | null): string {
  if (payment === "transfer") return "Transferencia · 10% off";
  if (payment === "cash") return "Efectivo en el local";
  return "Mercado Pago · " + (installments && installments > 1 ? `${installments} cuotas` : "1 pago");
}

export const ORDERS: DemoOrder[] = [
  {
    number: "BT-10482",
    customer: { name: "Juan Pérez", phone: "223 555-0182", email: "juanperez@gmail.com" },
    createdAt: "2026-10-01T14:32:00-03:00",
    payment: "mp",
    installments: 6,
    status: "pagado",
    items: [
      { productSlug: "mtb-rodado-29-21-vel-aluminio", name: "MTB rodado 29 · 21 vel.", size: "M", color: "Negro / amarillo", variantLabel: "Talle M · Negro/amarillo", qty: 1, unitPrice: 489900, photo: P.mtb29 },
      { productSlug: "casco-urbano-regulable-m-l", name: "Casco urbano regulable", size: "Único", color: "Negro", variantLabel: "M/L · Negro", qty: 1, unitPrice: 54900, photo: P.cascoUrbano },
    ],
    transferReceipt: null,
  },
  {
    number: "BT-10481",
    customer: { name: "Lucía Gómez", phone: "223 555-0144", email: "lugomez@hotmail.com" },
    createdAt: "2026-10-01T12:05:00-03:00",
    payment: "transfer",
    installments: null,
    status: "transf_pendiente",
    items: [
      // Prototipo: 323.910 (ya con 10% off). Lista: 359.900.
      { productSlug: "urbana-rodado-28-canasto", name: "Urbana rodado 28 · canasto", size: "M", color: "Crema", variantLabel: "Talle M · Crema", qty: 1, unitPrice: 359900, photo: P.urbana28 },
    ],
    // 3a muestra "Comprobante adjunto · comprobante_10481.pdf".
    transferReceipt: "comprobante_10481.pdf",
  },
  {
    number: "BT-10480",
    customer: { name: "Martín Ruiz", phone: "223 555-0127", email: "mruiz.mdp@gmail.com" },
    createdAt: "2026-09-30T18:40:00-03:00",
    payment: "mp",
    installments: 1,
    status: "armando",
    items: [
      { productSlug: "gravel-700c-2x9-vel", name: "Gravel 700c · 2x9 vel.", size: "L", color: null, variantLabel: "Talle L", qty: 1, unitPrice: 899900, photo: P.gravel },
    ],
    transferReceipt: null,
  },
  {
    number: "BT-10479",
    customer: { name: "Sofía Díaz", phone: "223 555-0163", email: "sofi.diaz@gmail.com" },
    createdAt: "2026-09-30T11:15:00-03:00",
    payment: "cash",
    installments: null,
    status: "paga_en_local",
    items: [
      { productSlug: "infantil-rodado-16-rueditas", name: "Infantil rodado 16 · rueditas", size: "Único", color: "Rojo", variantLabel: "Rojo", qty: 1, unitPrice: 189900, photo: P.infantil16 },
      { productSlug: null, name: "Casco infantil", size: "S", color: null, variantLabel: "Talle S", qty: 1, unitPrice: 29900, photo: P.cascoMtb },
    ],
    transferReceipt: null,
  },
  {
    number: "BT-10477",
    customer: { name: "Diego Sosa", phone: "223 555-0190", email: "diegososa@yahoo.com" },
    createdAt: "2026-09-29T16:02:00-03:00",
    payment: "mp",
    installments: 3,
    status: "listo_retiro",
    items: [
      { productSlug: "kit-luces-delantera-trasera", name: "Kit luces delantera + trasera", size: "Único", color: null, variantLabel: "USB recargable", qty: 1, unitPrice: 24900, photo: P.local },
      { productSlug: "remera-de-ciclismo-manga-corta", name: "Remera de ciclismo", size: "Único", color: null, variantLabel: "Talle L", qty: 1, unitPrice: 42900, photo: P.remera },
    ],
    transferReceipt: null,
  },
  {
    number: "BT-10475",
    customer: { name: "Carla Méndez", phone: "223 555-0111", email: "carla.mendez@gmail.com" },
    createdAt: "2026-09-28T10:20:00-03:00",
    payment: "transfer",
    installments: null,
    status: "listo_retiro",
    items: [
      // Prototipo: 287.910 (ya con 10% off). Lista: 319.900.
      { productSlug: "paseo-rodado-26-guardabarros", name: "Paseo rodado 26 · guardabarros", size: "M", color: null, variantLabel: "Talle M", qty: 1, unitPrice: 319900, photo: P.paseo26 },
    ],
    transferReceipt: null,
  },
  {
    number: "BT-10471",
    customer: { name: "Pablo Ferreyra", phone: "223 555-0175", email: "pferreyra@gmail.com" },
    createdAt: "2026-09-26T17:48:00-03:00",
    payment: "mp",
    installments: 6,
    status: "retirado",
    items: [
      { productSlug: "mtb-rodado-29-doble-suspension", name: "MTB rodado 29 · doble suspensión", size: "L", color: null, variantLabel: "Talle L", qty: 1, unitPrice: 1249900, photo: P.mtb29Doble },
    ],
    transferReceipt: null,
  },
  {
    // Solo en 2g (Mi cuenta de Juan): histórico.
    number: "BT-10288",
    customer: { name: "Juan Pérez", phone: "223 555-0182", email: "juanperez@gmail.com" },
    createdAt: "2026-07-03T11:00:00-03:00",
    payment: "mp",
    installments: 1,
    status: "retirado",
    items: [
      { productSlug: "kit-luces-delantera-trasera", name: "Kit luces", size: "Único", color: null, variantLabel: "USB recargable", qty: 1, unitPrice: 24900, photo: P.local },
    ],
    transferReceipt: null,
  },
];

/** Próximo número de pedido después de la demo. */
export const NEXT_ORDER_NUMBER = 10483;

/** Subtotal de lista de un pedido. */
export const orderSubtotal = (o: DemoOrder) => o.items.reduce((a, i) => a + i.unitPrice * i.qty, 0);

/** Total cobrado: transferencia con el % off; el resto, lista. */
export function orderTotal(o: DemoOrder, transferDiscountPct = 10): number {
  const sub = orderSubtotal(o);
  return o.payment === "transfer" ? Math.round(sub * (1 - transferDiscountPct / 100)) : sub;
}
