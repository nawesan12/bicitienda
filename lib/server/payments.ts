import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/server/db";
import { sendOrderEmail } from "@/lib/server/mail";
import { appendEvent, makeEvent } from "@/lib/server/orders";
import type { PaymentProvider } from "@/lib/types";

/**
 * Resultado de un pago online, agnóstico de la pasarela. La MISMA función
 * la ejecutan los webhooks (Payway / Mercado Pago) y el sandbox local de
 * /checkout/pago-simulado — así el flujo que se prueba sin credenciales es
 * el real.
 *
 * Idempotente por (providerPaymentId): reintentos del webhook no duplican
 * nada. El monto SIEMPRE viene de la pasarela (consultado server-side),
 * nunca del cliente.
 */
export type PaymentStatus = "approved" | "rejected" | "pending";

export interface PaymentResult {
  provider: PaymentProvider;
  /** id del pago en la pasarela (o "sim-…" en el sandbox local). */
  providerPaymentId: string;
  status: PaymentStatus;
  /** Monto cobrado en pesos. */
  amount: number;
  /** Número visible del pedido (la referencia que viaja a la pasarela). */
  orderNumber: string;
}

const PROVIDER_LABEL: Record<PaymentProvider, string> = {
  payway: "Payway",
  mp: "Mercado Pago",
};

const PROVIDER_METHOD = {
  payway: "payway",
  mp: "mercadopago",
} as const;

export async function applyPaymentResult(
  result: PaymentResult,
): Promise<{ ok: boolean; already?: boolean; ignored?: boolean }> {
  // Un pago todavía en proceso no se asienta: llegará otra notificación.
  if (result.status === "pending") return { ok: true, ignored: true };

  const db = await getDb();

  // Idempotencia: si ese pago ya está registrado, no se toca nada.
  const dup = await db
    .select({ id: schema.payments.id })
    .from(schema.payments)
    .where(eq(schema.payments.providerPaymentId, result.providerPaymentId));
  if (dup.length) return { ok: true, already: true };

  const [order] = await db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.number, result.orderNumber));
  if (!order) return { ok: false };

  const approved = result.status === "approved";
  // Un pago de seña cubre solo la reserva; el saldo se registra después
  // desde el admin (transferencia o al retirar/recibir).
  const isDeposit =
    order.paymentMode === "sena" && result.amount < order.total;

  // Dos notificaciones simultáneas del mismo pago: la unique de
  // provider_payment_id hace que solo una inserte; la otra sale acá.
  const inserted = await db
    .insert(schema.payments)
    .values({
      orderId: order.id,
      kind: isDeposit ? "sena" : "total",
      method: PROVIDER_METHOD[result.provider],
      amount: result.amount,
      provider: result.provider,
      providerPaymentId: result.providerPaymentId,
      status: approved ? "approved" : "rejected",
    })
    .onConflictDoNothing({ target: schema.payments.providerPaymentId })
    .returning();
  if (!inserted.length) return { ok: true, already: true };

  if (!approved) {
    // Rechazado: el pedido sigue esperando pago (puede reintentar).
    return { ok: true };
  }

  if (order.status === "PENDIENTE_PAGO") {
    const paid = order.paidAmount + result.amount;
    const balance = Math.max(0, order.total - paid);
    await db
      .update(schema.orders)
      .set({
        status: isDeposit ? "SEÑADO" : "PAGADO",
        paidAmount: paid,
        balanceDue: balance,
        expiresAt: null,
      })
      .where(eq(schema.orders.id, order.id));
    const via = PROVIDER_LABEL[result.provider];
    await appendEvent(
      order.id,
      makeEvent(
        "PAGO",
        isDeposit ? `Seña recibida con ${via}` : `Pago acreditado con ${via}`,
      ),
    );
    await sendOrderEmail(order.id, "confirmacion");
  }

  return { ok: true };
}
