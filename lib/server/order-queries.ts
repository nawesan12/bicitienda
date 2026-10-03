import { asc, desc, eq, inArray } from "drizzle-orm";
import { normalizeArPhone } from "@/lib/phone";
import { store } from "@/lib/config";
import { getDb, schema } from "@/lib/server/db";
import { withSnapshotName } from "@/lib/server/customers";
import { expireStaleOrdersOnce as expireStaleOrders } from "@/lib/server/orders";
import type { OrderEvent, OrderStatus } from "@/lib/types";

/**
 * Lecturas de pedidos. Siempre frescas (nada de unstable_cache: son datos
 * transaccionales) y con el barrido perezoso de reservas vencidas antes de
 * responder — así el estado que se ve es el real aunque no haya cron.
 */

export type OrderRow = typeof schema.orders.$inferSelect;
export type OrderItemRow = typeof schema.orderItems.$inferSelect;
export type CustomerRow = typeof schema.customers.$inferSelect;

export interface FullOrder {
  order: OrderRow;
  items: OrderItemRow[];
  customer: CustomerRow;
  payments: (typeof schema.payments.$inferSelect)[];
}

async function loadFull(order: OrderRow): Promise<FullOrder | null> {
  return (await loadFullMany([order]))[0] ?? null;
}

/**
 * Ítems, cliente y pagos de varios pedidos en TRES queries (inArray), no
 * tres por pedido. Respeta el orden de `orders`; los pedidos sin cliente
 * (no debería pasar: FK) se omiten.
 */
async function loadFullMany(orders: OrderRow[]): Promise<FullOrder[]> {
  if (!orders.length) return [];
  const db = await getDb();
  const ids = orders.map((o) => o.id);
  const customerIds = [...new Set(orders.map((o) => o.customerId))];
  const [items, customers, pays] = await Promise.all([
    db
      .select()
      .from(schema.orderItems)
      .where(inArray(schema.orderItems.orderId, ids))
      .orderBy(asc(schema.orderItems.id)),
    db
      .select()
      .from(schema.customers)
      .where(inArray(schema.customers.id, customerIds)),
    db
      .select()
      .from(schema.payments)
      .where(inArray(schema.payments.orderId, ids)),
  ]);
  const customerById = new Map(customers.map((c) => [c.id, c]));
  const out: FullOrder[] = [];
  for (const order of orders) {
    const customer = customerById.get(order.customerId);
    if (!customer) continue;
    out.push({
      order,
      items: items.filter((it) => it.orderId === order.id),
      customer: withSnapshotName(customer, order.customerName),
      payments: pays.filter((p) => p.orderId === order.id),
    });
  }
  return out;
}

export async function getOrderById(id: string): Promise<FullOrder | null> {
  const db = await getDb();
  const [order] = await db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.id, id));
  return order ? loadFull(order) : null;
}

/** Pedido completo por número exacto ("BT-10482"), sin normalizar. */
export async function getOrderByNumber(number: string): Promise<FullOrder | null> {
  const db = await getDb();
  const [order] = await db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.number, number));
  return order ? loadFull(order) : null;
}

/**
 * true si `contact` (email o WhatsApp) es el del cliente. El email se
 * compara en minúsculas; el teléfono, normalizado.
 */
export function contactMatches(
  customer: { email: string | null; phone: string },
  contact: string,
): boolean {
  const c = contact.trim().toLowerCase();
  if (!c) return false;
  if (customer.email && c === customer.email.toLowerCase()) return true;
  const phone = normalizeArPhone(c);
  return !!phone && phone === customer.phone;
}

/** "#BT-10482", "bt-10482", "10482" → "BT-10482" (el prefijo es opcional). */
export function normalizeOrderNumber(input: string): string {
  const raw = input.trim().replace(/^#/, "").toUpperCase();
  const prefix = (store.orderPrefix ?? "").toUpperCase();
  if (prefix && /^\d+$/.test(raw)) return `${prefix}${raw}`;
  return raw;
}

/**
 * Pedido para el público: exige el par número + contacto (email o
 * WhatsApp del pedido) — nunca se expone un pedido ajeno por adivinar el
 * número.
 */
export async function getOrderForCustomer(
  number: string,
  contact: string,
): Promise<FullOrder | null> {
  await expireStaleOrders();
  const db = await getDb();
  const [order] = await db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.number, normalizeOrderNumber(number)));
  if (!order) return null;
  const full = await loadFull(order);
  if (!full) return null;
  if (!contactMatches(full.customer, contact)) return null;
  return full;
}

/** Pedidos de un cliente, validados con el número de alguno de sus pedidos. */
export async function getOrdersForEmail(
  contact: string,
  anyOrderNumber: string,
): Promise<FullOrder[] | null> {
  const gate = await getOrderForCustomer(anyOrderNumber, contact);
  if (!gate) return null;
  return getOrdersByCustomer(gate.customer.id);
}

/** Pedidos de un cliente (ficha del CRM y "mis pedidos" por email), más recientes primero. */
export async function getOrdersByCustomer(customerId: string): Promise<FullOrder[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.customerId, customerId))
    .orderBy(desc(schema.orders.createdAt));
  return loadFullMany(rows);
}

/** "Mis pedidos" de una cuenta, más recientes primero. */
export async function getOrdersForAccount(accountId: string): Promise<FullOrder[]> {
  await expireStaleOrders();
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.accountId, accountId))
    .orderBy(desc(schema.orders.createdAt));
  return loadFullMany(rows);
}

/* ── Timeline pública de 4 hitos ──────────────────────────── */

export interface TimelineStep {
  key: OrderEvent["key"];
  label: string;
  at: string | null;
  state: "done" | "current" | "pending";
}

const PAID: OrderStatus[] = [
  "SEÑADO",
  "PAGADO",
  "EN_PREPARACION",
  "LISTO_RETIRO",
  "ENVIADO",
  "ENTREGA_COORDINADA",
  "RETIRADO",
  "ENTREGADO",
];
const READY: OrderStatus[] = [
  "LISTO_RETIRO",
  "ENVIADO",
  "ENTREGA_COORDINADA",
  "RETIRADO",
  "ENTREGADO",
];
const DONE: OrderStatus[] = ["RETIRADO", "ENTREGADO"];

export function publicTimeline(order: OrderRow): TimelineStep[] {
  const isPickup = order.deliveryMethod === "retiro";
  const lastAt = (key: OrderEvent["key"]) =>
    [...order.timeline].reverse().find((e) => e.key === key)?.at ?? null;

  const paid = PAID.includes(order.status);
  const ready = READY.includes(order.status);
  const done = DONE.includes(order.status);

  const steps: TimelineStep[] = [
    {
      key: "CONFIRMADO",
      label: "Pedido confirmado",
      at: lastAt("CONFIRMADO"),
      state: "done",
    },
    {
      key: "PAGO",
      label: !paid
        ? "Esperando el pago"
        : order.balanceDue > 0
          ? "Seña recibida — saldo pendiente"
          : order.depositAmount > 0
            ? "Saldo recibido — pago completo"
            : "Pago acreditado",
      at: lastAt("PAGO"),
      state: paid ? "done" : "current",
    },
    {
      key: "LISTO",
      label: isPickup ? "Listo para retirar" : "En camino",
      at: lastAt("LISTO"),
      state: ready ? "done" : paid ? "current" : "pending",
    },
    {
      key: "ENTREGADO",
      label: isPickup ? "Retirado" : "Entregado",
      at: lastAt("ENTREGADO"),
      state: done ? "done" : ready ? "current" : "pending",
    },
  ];
  return steps;
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDIENTE_PAGO: "Pendiente de pago",
  SEÑADO: "Señado",
  PAGADO: "Pagado",
  EN_PREPARACION: "En preparación",
  LISTO_RETIRO: "Listo para retirar",
  ENVIADO: "Enviado",
  ENTREGA_COORDINADA: "Entrega coordinada",
  RETIRADO: "Retirado",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
  VENCIDO: "Vencido",
};
