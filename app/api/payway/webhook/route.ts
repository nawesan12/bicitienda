import { NextResponse } from "next/server";
import { store } from "@/lib/config";
import { applyPaymentResult } from "@/lib/server/payments";
import {
  isPaywayConfigured,
  notificationCandidates,
  resolvePaywayResults,
  verifyWebhookToken,
} from "@/lib/server/payway";

/**
 * Notificación de Payway (notifications_url del link de pago). Producción
 * pura: sin credenciales responde 404 (en local el flujo pasa por el
 * sandbox /checkout/pago-simulado, que ejecuta la misma lógica interna).
 *
 * Reglas (ver el encabezado de lib/server/payway.ts):
 *   - token propio en la URL (?t=PAYWAY_WEBHOOK_TOKEN), en tiempo constante;
 *   - el body solo aporta ids/referencias: estado y monto se consultan a
 *     la API de Payway con la clave privada, y solo cuentan pagos de
 *     nuestro site y con referencia de un pedido nuestro;
 *   - idempotente (applyPaymentResult por provider_payment_id);
 *   - 200 rápido aunque no haya nada que aplicar, para que no reintente
 *     de más.
 */
export async function POST(request: Request) {
  if (!store.features.payments.payway || !isPaywayConfigured()) {
    return NextResponse.json({ error: "not configured" }, { status: 404 });
  }

  const url = new URL(request.url);
  if (!verifyWebhookToken(url.searchParams.get("t"))) {
    return NextResponse.json({ error: "bad token" }, { status: 401 });
  }

  // JSON o form-urlencoded (TODO(payway-keys): confirmar el formato real).
  let body: unknown = {};
  const raw = (await request.text()).slice(0, 20_000);
  try {
    body = JSON.parse(raw);
  } catch {
    body = Object.fromEntries(new URLSearchParams(raw));
  }
  // Algunos avisos pueden venir solo por query string.
  const query = Object.fromEntries(url.searchParams);
  delete query.t;

  const fromBody = notificationCandidates(body);
  const fromQuery = notificationCandidates(query);
  const candidates = {
    paymentIds: [...new Set([...fromBody.paymentIds, ...fromQuery.paymentIds])],
    references: [...new Set([...fromBody.references, ...fromQuery.references])],
  };
  if (!candidates.paymentIds.length && !candidates.references.length) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    const results = await resolvePaywayResults(candidates);
    for (const r of results) await applyPaymentResult(r);
    return NextResponse.json({ ok: true, applied: results.length });
  } catch (err) {
    // 500: que Payway reintente más tarde.
    console.error("[payway] error procesando notificación:", err);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
