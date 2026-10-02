"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/lib/server/actions/guard";
import { getDb, schema } from "@/lib/server/db";
import { sendOrderEmail } from "@/lib/server/mail";
import {
  appendEvent,
  cancelOrder as cancelOrderInternal,
  makeEvent,
} from "@/lib/server/orders";
import type { OrderStatus } from "@/lib/types";

const idSchema = z.string().trim().min(1).max(80);
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

/** Confirma a mano un pago por transferencia o efectivo. */
export async function confirmManualPayment(orderId: string) {
  await requireAdmin();
  if (!idSchema.safeParse(orderId).success) return;
  const db = await getDb();
  const order = await getOrder(orderId);
  if (!order || order.status !== "PENDIENTE_PAGO") return;

  await db.insert(schema.payments).values({
    orderId: order.id,
    kind: "total",
    method: order.paymentMethod,
    amount: order.total,
    status: "approved",
  });
  await db
    .update(schema.orders)
    .set({
      status: "PAGADO",
      paidAmount: order.total,
      balanceDue: 0,
      expiresAt: null,
    })
    .where(eq(schema.orders.id, order.id));
  await appendEvent(
    order.id,
    makeEvent(
      "PAGO",
      order.paymentMethod === "transferencia"
        ? "Transferencia acreditada"
        : "Pago en efectivo registrado",
    ),
  );
  await sendOrderEmail(order.id, "confirmacion");
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
  if (!idSchema.safeParse(orderId).success) return;
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

  await db
    .update(schema.orders)
    .set({ status })
    .where(eq(schema.orders.id, orderId));

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

/** Cancela y restaura stock si la reserva seguía viva. */
export async function cancelOrder(orderId: string) {
  await requireAdmin();
  if (!idSchema.safeParse(orderId).success) return;
  await cancelOrderInternal(orderId);
}
