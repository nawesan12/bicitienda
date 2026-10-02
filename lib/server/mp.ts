import type { CartLine } from "@/lib/types";
import type { schema } from "@/lib/server/db";
import { store } from "@/lib/config";
import { runtimeSiteUrl } from "@/lib/site";

/**
 * Mercado Pago Checkout Pro por REST, sin SDK (una dependencia menos y la
 * API es estable). Queda en el core detrás de `features.payments.mp`
 * (Rodar cobra con Payway). Con MP_ACCESS_TOKEN se crea la preferencia
 * real y el cliente va a Checkout Pro; sin token, el checkout redirige al
 * sandbox local (/checkout/pago-simulado) que ejecuta la misma lógica
 * interna. La referencia externa es el número de pedido, igual que en
 * Payway, así applyPaymentResult no distingue pasarelas.
 */

type OrderRow = typeof schema.orders.$inferSelect;

export function isMpConfigured(): boolean {
  return !!process.env.MP_ACCESS_TOKEN;
}

/** Crea la preferencia y devuelve el init_point al que redirigir. */
export async function createPreference(
  order: OrderRow,
  lines: CartLine[],
  email: string,
): Promise<string> {
  const base = runtimeSiteUrl();
  const backUrl = `${base}/checkout/confirmacion/${order.number}?e=${encodeURIComponent(email)}`;

  // Con seña se cobra SOLO el monto de la seña: un ítem único por ese valor
  // (el detalle del pedido completo vive en la web, no en Checkout Pro).
  const items =
    order.paymentMode === "sena"
      ? [
          {
            id: `sena-${order.number}`,
            title: `Seña de reserva — pedido ${order.number}`,
            quantity: 1,
            unit_price: order.depositAmount,
            currency_id: "ARS",
          },
        ]
      : lines.map((l) => ({
          id: l.productSlug,
          title: l.product.name,
          quantity: l.quantity,
          unit_price: l.unitPrice,
          currency_id: "ARS",
        }));

  const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      // Idempotencia del lado de MP ante reintentos de red.
      "X-Idempotency-Key": order.id,
    },
    body: JSON.stringify({
      external_reference: order.number,
      items,
      payer: { email },
      back_urls: { success: backUrl, pending: backUrl, failure: backUrl },
      auto_return: "approved",
      notification_url: `${base}/api/mp/webhook`,
      // Lo que el cliente ve en el resumen de la tarjeta (MP corta a 22).
      statement_descriptor: store.brandName.toUpperCase().slice(0, 22),
    }),
  });

  if (!res.ok) {
    throw new Error(`MP preferences ${res.status}: ${await res.text()}`);
  }
  const pref = (await res.json()) as { id: string; init_point: string };

  const { getDb, schema: s } = await import("@/lib/server/db");
  const { eq } = await import("drizzle-orm");
  const db = await getDb();
  await db
    .update(s.orders)
    .set({ providerCheckoutId: pref.id })
    .where(eq(s.orders.id, order.id));

  return pref.init_point;
}

/** Consulta un pago a la API de MP (lo hace el webhook, nunca el cliente). */
export async function fetchPayment(paymentId: string): Promise<{
  id: string;
  status: string;
  external_reference: string | null;
  transaction_amount: number;
} | null> {
  const res = await fetch(
    `https://api.mercadopago.com/v1/payments/${paymentId}`,
    {
      headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
    },
  );
  if (!res.ok) return null;
  return res.json();
}

/**
 * Valida la firma `x-signature` del webhook (formato oficial:
 * "ts=…,v1=…", HMAC-SHA256 de "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
 * con la clave secreta del panel de MP).
 */
export async function verifyWebhookSignature(opts: {
  signature: string | null;
  requestId: string | null;
  dataId: string | null;
}): Promise<boolean> {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret || !opts.signature || !opts.dataId) return false;

  const parts = Object.fromEntries(
    opts.signature.split(",").map((kv) => kv.trim().split("=") as [string, string]),
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const manifest = `id:${opts.dataId};request-id:${opts.requestId ?? ""};ts:${ts};`;
  const { createHmac, timingSafeEqual } = await import("node:crypto");
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
  } catch {
    return false;
  }
}
