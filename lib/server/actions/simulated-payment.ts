"use server";

import { isOnlinePayment } from "@/lib/config";
import { chargeAmount, isGatewayLive } from "@/lib/server/online-payment";
import { getOrderById } from "@/lib/server/order-queries";
import { applyPaymentResult } from "@/lib/server/payments";

/**
 * SANDBOX LOCAL de la pasarela (Payway, o MP si la tienda lo usa): solo
 * existe mientras esa pasarela no tiene credenciales. Ejecuta exactamente
 * la misma lógica interna que el webhook real (applyPaymentResult), así el
 * flujo probado es el de producción.
 *
 * El monto se calcula acá desde el pedido (la seña si el modo es "sena"),
 * igual que la pasarela reporta el monto real cobrado — nunca del cliente.
 */
export async function simulatePayment(
  orderId: string,
  approved: boolean,
): Promise<{ ok: boolean }> {
  if (
    typeof orderId !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(orderId) ||
    typeof approved !== "boolean"
  ) {
    return { ok: false };
  }
  const full = await getOrderById(orderId);
  if (!full) return { ok: false };
  const { order } = full;
  const method = order.paymentMethod;
  if (!isOnlinePayment(method) || isGatewayLive(method)) return { ok: false };

  const result = await applyPaymentResult({
    provider: method === "payway" ? "payway" : "mp",
    providerPaymentId: `sim-${order.number}-${approved ? "ap" : "re"}-${Date.now()}`,
    status: approved ? "approved" : "rejected",
    amount: chargeAmount(order),
    orderNumber: order.number,
  });
  return { ok: result.ok };
}
