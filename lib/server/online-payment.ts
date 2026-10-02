import { eq } from "drizzle-orm";
import { store } from "@/lib/config";
import { getDb, schema } from "@/lib/server/db";
import {
  createPreference,
  isMpConfigured,
  mpStatus,
  searchPaymentsByReference,
} from "@/lib/server/mp";
import { applyPaymentResult } from "@/lib/server/payments";
import { isPaymentSandboxAllowed } from "@/lib/server/payment-availability";
import {
  createPaywayCheckout,
  isPaywayConfigured,
  resolvePaywayResults,
} from "@/lib/server/payway";
import type { CartLine, PaymentMethodId } from "@/lib/types";

/**
 * Punto único para mandar a pagar un pedido online, sea cual sea la
 * pasarela. Con credenciales va al checkout real (Payway: formulario
 * hosteado; MP: Checkout Pro); sin credenciales, al sandbox local
 * /checkout/pago-simulado, que ejecuta la misma lógica que el webhook.
 */

type OrderRow = typeof schema.orders.$inferSelect;

/** Monto que se cobra ahora: la seña si se reserva, si no lo que falta. */
export function chargeAmount(order: OrderRow): number {
  return order.paymentMode === "sena" && order.status === "PENDIENTE_PAGO"
    ? order.depositAmount
    : order.total - order.paidAmount;
}

/** true si la pasarela del medio de pago tiene credenciales reales. */
export function isGatewayLive(method: PaymentMethodId): boolean {
  if (method === "payway") return isPaywayConfigured();
  if (method === "mercadopago") return isMpConfigured();
  return false;
}

function sandboxUrl(order: OrderRow): string {
  if (!isPaymentSandboxAllowed())
    throw new Error("Pasarela sin credenciales en producción: el sandbox está cerrado.");
  return `/checkout/pago-simulado?order=${order.id}`;
}

/** URL a la que redirigir al cliente para pagar. */
export async function startOnlinePayment(
  order: OrderRow,
  email: string | null,
  lines: CartLine[] = [],
): Promise<string> {
  const method = order.paymentMethod;
  if (method === "payway" && store.features.payments.payway) {
    if (!isPaywayConfigured()) return sandboxUrl(order);
    const deposit = order.paymentMode === "sena" && order.status === "PENDIENTE_PAGO";
    const { url, reference } = await createPaywayCheckout({
      orderNumber: order.number,
      amount: chargeAmount(order),
      // La seña va siempre en un pago; las cuotas solo con el total.
      installments: deposit ? 1 : (order.installments as 1 | 3 | 6),
      description: deposit
        ? `Seña pedido ${order.number} · ${store.brandName}`
        : `Pedido ${order.number} · ${store.brandName}`,
      email: email ?? "",
    });
    const db = await getDb();
    await db
      .update(schema.orders)
      .set({ providerCheckoutId: reference })
      .where(eq(schema.orders.id, order.id));
    return url;
  }
  if (method === "mercadopago" && store.features.payments.mp) {
    if (!isMpConfigured()) return sandboxUrl(order);
    const { getSettings } = await import("@/lib/server/queries");
    const settings = await getSettings();
    return createPreference(order, lines, email, {
      maxInstallments: settings.maxInstallments,
    });
  }
  throw new Error(`Medio de pago sin pasarela online: ${method}`);
}

/**
 * Conciliación perezosa: si el pedido sigue esperando un pago de Payway,
 * consulta la API por su referencia (por si la notificación no llegó o
 * llegó antes de que el pago se aprobara). La usa la confirmación.
 */
export async function syncPendingPayment(order: OrderRow): Promise<boolean> {
  if (
    order.status === "PENDIENTE_PAGO" &&
    order.paymentMethod === "mercadopago" &&
    isMpConfigured()
  ) {
    try {
      let changed = false;
      for (const p of await searchPaymentsByReference(order.number)) {
        if (p.external_reference !== order.number) continue;
        const applied = await applyPaymentResult({
          provider: "mp",
          providerPaymentId: String(p.id),
          status: mpStatus(p.status),
          amount: Math.round(p.transaction_amount),
          orderNumber: order.number,
          installments: p.installments,
        });
        changed ||= applied.ok && !applied.already && !applied.ignored;
      }
      return changed;
    } catch (err) {
      console.error("[mp] error conciliando el pedido", order.number, err);
      return false;
    }
  }
  if (
    order.status !== "PENDIENTE_PAGO" ||
    order.paymentMethod !== "payway" ||
    !order.providerCheckoutId ||
    !isPaywayConfigured()
  ) {
    return false;
  }
  try {
    const results = await resolvePaywayResults({
      references: [order.providerCheckoutId],
    });
    let changed = false;
    for (const r of results) {
      if (r.orderNumber !== order.number) continue;
      const applied = await applyPaymentResult(r);
      changed ||= applied.ok && !applied.already && !applied.ignored;
    }
    return changed;
  } catch (err) {
    console.error("[payway] error conciliando el pedido", order.number, err);
    return false;
  }
}
