import { NextResponse } from "next/server";
import { store } from "@/lib/config";
import {
  fetchPayment,
  isMpConfigured,
  mpStatus,
  verifyWebhookSignature,
} from "@/lib/server/mp";
import { applyPaymentResult } from "@/lib/server/payments";

/**
 * Webhook de Mercado Pago (IPN de pagos). Producción pura: sin credenciales
 * configuradas responde 404 (en local el flujo pasa por el sandbox de
 * /checkout/pago-simulado, que ejecuta la misma lógica interna).
 *
 * Reglas: firma verificada, el monto y el estado se consultan a la API de
 * MP (nunca se confía en el body), idempotente por el id del pago, y 200
 * rápido para que MP no reintente de más.
 */
export async function POST(request: Request) {
  if (
    !store.features.payments.mp ||
    !isMpConfigured() ||
    !process.env.MP_WEBHOOK_SECRET
  ) {
    return NextResponse.json({ error: "not configured" }, { status: 404 });
  }

  const url = new URL(request.url);
  let body: { type?: string; data?: { id?: string } } = {};
  try {
    body = await request.json();
  } catch {
    /* algunos eventos llegan solo por query string */
  }

  const dataId =
    body.data?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id");
  const type = body.type ?? url.searchParams.get("type") ?? "";

  const valid = await verifyWebhookSignature({
    signature: request.headers.get("x-signature"),
    requestId: request.headers.get("x-request-id"),
    dataId,
  });
  if (!valid) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  // Solo interesan los eventos de pago.
  if (!dataId || !type.includes("payment")) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const payment = await fetchPayment(dataId);
  if (!payment?.external_reference) {
    // Puede ser un pago aún no consultable: 200 igual, MP reintenta.
    return NextResponse.json({ ok: true, pending: true });
  }

  await applyPaymentResult({
    provider: "mp",
    providerPaymentId: String(payment.id),
    status: mpStatus(payment.status),
    amount: Math.round(payment.transaction_amount),
    orderNumber: payment.external_reference,
    installments: payment.installments,
  });

  return NextResponse.json({ ok: true });
}
