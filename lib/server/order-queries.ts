import { desc, eq, inArray } from "drizzle-orm";
import { normalizeArPhone } from "@/lib/phone";
import { store } from "@/lib/config";
import { getDb, schema } from "@/lib/server/db";
import { expireStaleOrders } from "@/lib/server/orders";
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
  const db = await getDb();
  const [items, [customer], pays] = await Promise.all([
    db
      .select()
      .from(schema.orderItems)
      .where(eq(schema.orderItems.orderId, order.id)),
    db
      .select()
      .from(schema.customers)
      .where(eq(schema.customers.id, order.customerId)),
    db
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.orderId, order.id)),
  ]);
  if (!customer) return null;
  return { order, items, customer, payments: pays };
}

export async function getOrderById(id: string): Promise<FullOrder | null> {
  const db = await getDb();
  const [order] = await db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.id, id));
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
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.customerId, gate.customer.id))
    .orderBy(desc(schema.orders.createdAt));
  const result: FullOrder[] = [];
  for (const order of rows) {
    const full = await loadFull(order);
    if (full) result.push(full);
  }
  return result;
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
  const result: FullOrder[] = [];
  for (const order of rows) {
    const full = await loadFull(order);
    if (full) result.push(full);
  }
  return result;
}

/** Pedidos de varios ids (para listas del admin). */
export async function getOrdersByIds(ids: string[]): Promise<FullOrder[]> {
  if (!ids.length) return [];
  const db = await getDb();
  const rows = await db.select().from(schema.orders).where(inArray(schema.orders.id, ids));
  const out: FullOrder[] = [];
  for (const o of rows) {
    const full = await loadFull(o);
    if (full) out.push(full);
  }
  return out;
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
