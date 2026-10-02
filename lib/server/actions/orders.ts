"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/lib/server/actions/guard";
import { getDb, schema } from "@/lib/server/db";
import { sendOrderEmail } from "@/lib/server/mail";
import { invalidateAdmin } from "@/lib/server/revalidate";
import {
  advanceOrder as advanceOrderInternal,
  appendEvent,
  cancelOrder as cancelOrderInternal,
  makeEvent,
  type AdvanceResult,
} from "@/lib/server/orders";
import type { OrderStatus } from "@/lib/types";

const idSchema = z.string().trim().min(1).max(80);
const statusSchema = z.enum([
  "PENDIENTE_PAGO",
  "SEÑADO",
  "PAGADO",
  "EN_PREPARACION",
  "LISTO_RETIRO",
  "ENVIADO",
  "ENTREGA_COORDINADA",
  "RETIRADO",
  "ENTREGADO",
  "CANCELADO",
  "VENCIDO",
]);
const balanceSchema = z.object({
  method: z.enum(["transferencia", "efectivo"]),
  amount: z.number().int().min(1).max(1_000_000_000),
});

/**
 * Acciones del tablero de pedidos. Cada transición registra su evento en la
 * timeline y dispara el email que corresponda; el guard exige sesión.
 */

async function getOrder(orderId: string) {
  const db = await getDb();
  const [order] = await db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.id, orderId));
  return order;
}

/**
 * El botón amarillo del pedido (prototipo 3a): aplica la próxima
 * transición de la máquina de lib/order-flow.ts — Validar transferencia,
 * Pasar a armado, Marcar lista para retirar, Marcar como retirada o
 * Registrar pago y retiro. `expectedFrom` es el estado que el admin está
 * viendo: si cambió, no avanza.
 */
export async function advanceOrder(
  orderId: unknown,
  expectedFrom?: unknown,
): Promise<AdvanceResult> {
  await requireAdmin();
  const id = idSchema.safeParse(orderId);
  const from = expectedFrom === undefined ? null : statusSchema.safeParse(expectedFrom);
  if (!id.success || (from && !from.success))
    return { ok: false, error: "Pedido inválido." };
  const result = await advanceOrderInternal(id.data, from?.success ? from.data : undefined);
  if (result.ok) invalidateAdmin();
  return result;
}

/**
 * Confirma a mano el pago de una reserva (transferencia validada o
 * efectivo). Para transferencia equivale al botón "Validar transferencia";
 * el efectivo se registra junto con el retiro (advanceOrder).
 */
export async function confirmManualPayment(orderId: string) {
  await requireAdmin();
  if (!idSchema.safeParse(orderId).success) return;
  const order = await getOrder(orderId);
  if (!order || order.status !== "PENDIENTE_PAGO") return;
  await advanceOrderInternal(order.id, "PENDIENTE_PAGO");
}

/**
 * Registra el saldo de un pedido señado (transferencia o efectivo en el
 * local). Al completarse el total, el pedido pasa a PAGADO.
 */
export async function registerBalancePayment(
  orderId: string,
  method: "transferencia" | "efectivo",
  amount: number,
) {
  await requireAdmin();
  const parsed = balanceSchema.safeParse({ method, amount });
  if (!idSchema.safeParse(orderId).success || !parsed.success) return;
  const db = await getDb();
  const order = await getOrder(orderId);
  if (!order || order.status !== "SEÑADO") return;

  const value = Math.min(parsed.data.amount, Math.max(0, order.total - order.paidAmount));
  if (!value) return;

  await db.insert(schema.payments).values({
    orderId: order.id,
    kind: "saldo",
    method,
    amount: value,
    status: "approved",
  });

  const paid = order.paidAmount + value;
  const balance = Math.max(0, order.total - paid);
  const completed = balance === 0;

  await db
    .update(schema.orders)
    .set({
      paidAmount: paid,
      balanceDue: balance,
      ...(completed ? { status: "PAGADO" as const } : {}),
    })
    .where(eq(schema.orders.id, order.id));

  await appendEvent(
    order.id,
    makeEvent(
      "PAGO",
      completed
        ? "Saldo recibido — pago completado"
        : `Pago parcial del saldo registrado`,
    ),
  );
  if (completed) await sendOrderEmail(order.id, "confirmacion");
}

/** Transiciones simples del ciclo de entrega. */
export async function setOrderStatus(orderId: string, status: OrderStatus) {
  await requireAdmin();
  if (!idSchema.safeParse(orderId).success || !statusSchema.safeParse(status).success) return;
  const db = await getDb();
  const order = await getOrder(orderId);
  if (!order) return;

  const allowed: Partial<Record<OrderStatus, OrderStatus[]>> = {
    EN_PREPARACION: ["PAGADO", "SEÑADO"],
    LISTO_RETIRO: ["PAGADO", "SEÑADO", "EN_PREPARACION"],
    ENVIADO: ["PAGADO", "SEÑADO", "EN_PREPARACION"],
    ENTREGA_COORDINADA: ["PAGADO", "SEÑADO", "EN_PREPARACION"],
    RETIRADO: ["LISTO_RETIRO"],
    ENTREGADO: ["ENVIADO", "ENTREGA_COORDINADA", "LISTO_RETIRO"],
  };
  if (!allowed[status]?.includes(order.status)) return;

  const claimed = await db
    .update(schema.orders)
    .set({ status })
    .where(and(eq(schema.orders.id, orderId), eq(schema.orders.status, order.status)))
    .returning();
  if (!claimed.length) return;

  if (status === "EN_PREPARACION") {
    await appendEvent(orderId, makeEvent("PAGO", "Pedido en preparación"));
  } else if (status === "LISTO_RETIRO") {
    await appendEvent(orderId, makeEvent("LISTO", "Listo para retirar"));
    await sendOrderEmail(orderId, "listo");
  } else if (status === "ENVIADO" || status === "ENTREGA_COORDINADA") {
    await appendEvent(orderId, makeEvent("LISTO", "En camino"));
    await sendOrderEmail(orderId, "en-camino");
  } else if (status === "RETIRADO" || status === "ENTREGADO") {
    await appendEvent(
      orderId,
      makeEvent("ENTREGADO", status === "RETIRADO" ? "Retirado" : "Entregado"),
    );
  }
}

/** Cancela (pill propia) y devuelve el stock, salvo que ya esté retirado. */
export async function cancelOrder(orderId: unknown): Promise<{ ok: boolean }> {
  await requireAdmin();
  const id = idSchema.safeParse(orderId);
  if (!id.success) return { ok: false };
  const ok = await cancelOrderInternal(id.data);
  if (ok) invalidateAdmin();
  return { ok };
}
