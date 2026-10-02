import { timingSafeEqual } from "node:crypto";
import type { PaymentResult, PaymentStatus } from "@/lib/server/payments";
import { runtimeSiteUrl } from "@/lib/site";

/**
 * Payway (ex Decidir, Prisma Medios de Pago) — "Formulario de pago" /
 * checkout hosteado por link, por REST y sin SDK. El cliente nunca carga la
 * tarjeta en nuestra web: se lo redirige al formulario de Payway.
 *
 * ── Fuentes (los SDK oficiales de Payway; la doc de Stoplight
 *    https://documentacion-ventasonline.payway.com.ar/ es una SPA) ──────
 *   - SDK Node, README "Formulario de pago" (tabla de campos y ejemplo):
 *     https://github.com/payway-ar/sdk-node-ventaonline#formpago
 *     endpoints en lib/utils/constants.js y lib/services/checkout.js
 *   - SDK PHP, README "Formulario de Pago" (GenerateLink) y
 *     Decidir/lib/RESTClient.php (URL y header apikey):
 *     https://github.com/payway-ar/sdk-php-ventaonline#getvalidateform
 *   - SDK Java, README "Link Checkout" (campo `id`, notifications_url):
 *     https://github.com/payway-ar/sdk-java-ventaonline#linkCheckout
 *   - "Información de un Pago" / "Listado de Pagos" (GET /payments):
 *     https://github.com/payway-ar/sdk-java-ventaonline#getpaymentinfo
 *
 * ── Endpoints ─────────────────────────────────────────────────────────
 *   Base sandbox:    https://developers.decidir.com
 *   Base producción: https://ventasonline.payway.com.ar
 *
 *   POST {base}/api/v1/checkout-payment-button/link   (apikey: privada)
 *     → { "payment_link": "https://…/web/checkout/<payment_id>" }
 *     (formulario: developers.decidir.com en sandbox, live.decidir.com en
 *     producción — lo devuelve armado la API)
 *   GET  {base}/api/v2/payments/{id}                  (apikey: privada)
 *   GET  {base}/api/v2/payments?siteOperationId=<ref> (apikey: privada)
 *
 * ── Campos que mandamos al crear el link (tabla del SDK Node) ─────────
 *   origin_platform, payment_description (excluyente con products),
 *   currency "ARS", total_price, site, success_url, cancel_url,
 *   notifications_url, template_id 1 (sin Cybersource), installments [n],
 *   plan_gobierno (true en 3/6 cuotas: "plan de financiamiento de cuotas
 *   (por ejemplo: Plan Ahora, MiPyME, etc.)"), public_apikey, auth_3ds, y
 *   `id` (SDK Java/PHP: referencia del comercio).
 *
 * ── Montos ────────────────────────────────────────────────────────────
 *   En la API de pagos (v2) `amount` va en CENTAVOS ("Importe Maximo =
 *   922337203685 ($9223372036.85)", README del SDK PHP). Para total_price
 *   del checkout la doc se contradice (PHP: "Numérico (centavos)" con
 *   ejemplo 1200.00; Node/Java: pesos con decimales 2500.49/3000.00).
 *
 * ── Notificación (webhook) ────────────────────────────────────────────
 *   La doc solo dice que notifications_url recibe "notificaciones
 *   relacionadas con la operación": no documenta formato ni firma. Por eso
 *   el webhook NO confía en el body: toma de ahí un id/referencia, consulta
 *   el pago a la API con la clave privada y solo aplica lo que dice la API
 *   (site_id propio, referencia de un pedido nuestro, estado y monto). Como
 *   defensa extra, la URL lleva un token propio (PAYWAY_WEBHOOK_TOKEN).
 *
 * Sin PAYWAY_SITE_ID/PUBLIC_KEY/PRIVATE_KEY no se llama a nada: el checkout
 * va al sandbox local /checkout/pago-simulado, que ejecuta la misma
 * lógica interna (applyPaymentResult).
 */

export interface PaywayConfig {
  env: "sandbox" | "production";
  siteId: string;
  publicKey: string;
  privateKey: string;
}

export function paywayConfig(): PaywayConfig | null {
  const siteId = process.env.PAYWAY_SITE_ID?.trim();
  const publicKey = process.env.PAYWAY_PUBLIC_KEY?.trim();
  const privateKey = process.env.PAYWAY_PRIVATE_KEY?.trim();
  if (!siteId || !publicKey || !privateKey) return null;
  const env =
    process.env.PAYWAY_ENV?.trim().toLowerCase() === "production"
      ? "production"
      : "sandbox";
  return { env, siteId, publicKey, privateKey };
}

export function isPaywayConfigured(): boolean {
  return paywayConfig() !== null;
}

function apiBase(cfg: PaywayConfig): string {
  return cfg.env === "production"
    ? "https://ventasonline.payway.com.ar"
    : "https://developers.decidir.com";
}

/** Headers comunes: apikey privada + X-Source (base64 de service/grouper/developer, como los SDK). */
function headers(cfg: PaywayConfig): Record<string, string> {
  const xSource = Buffer.from(
    JSON.stringify({ service: "SDK-Node", grouper: "", developer: "" }),
  ).toString("base64");
  return {
    apikey: cfg.privateKey,
    "Content-Type": "application/json",
    "Cache-Control": "no-cache",
    "X-Source": xSource,
  };
}

/* ── Referencia del pedido ──────────────────────────────────────── */

/**
 * Referencia única por intento de pago: `<número de pedido>-<sello>`. El
 * site_transaction_id de Payway "no puede repetirse", así que un
 * reintento del mismo pedido lleva otro sello; el número de pedido se
 * recupera de la referencia con `orderNumberFromReference`.
 */
export function makeReference(orderNumber: string): string {
  return `${orderNumber}-${Date.now().toString(36)}`;
}

export function orderNumberFromReference(ref: string | null | undefined): string | null {
  const m = /^(\d{1,12})-[a-z0-9]+$/.exec(ref ?? "");
  return m ? m[1] : null;
}

/* ── Crear el link de pago ──────────────────────────────────────── */

export interface CheckoutInput {
  orderNumber: string;
  /** Monto a cobrar en pesos (el total, o la seña). */
  amount: number;
  /** 1, 3 o 6. La seña va siempre en 1. */
  installments: 1 | 3 | 6;
  description: string;
  email: string;
}

/**
 * total_price: se manda en pesos con dos decimales, como los ejemplos de
 * los SDK Node y Java.
 * TODO(payway-keys): confirmar en sandbox si el link cobra $1.234,00 al
 * mandar 1234.00 (pesos) o $12,34 (centavos, como dice la tabla del SDK
 * PHP). Si fuera en centavos, devolver `Math.round(amount * 100)`.
 */
function toCheckoutAmount(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export async function createPaywayCheckout(
  input: CheckoutInput,
): Promise<{ url: string; reference: string }> {
  const cfg = paywayConfig();
  if (!cfg) throw new Error("Payway sin configurar.");

  const reference = makeReference(input.orderNumber);
  const back = `${runtimeSiteUrl()}/checkout/confirmacion/${input.orderNumber}?e=${encodeURIComponent(input.email)}`;
  const token = process.env.PAYWAY_WEBHOOK_TOKEN;
  const notify = `${runtimeSiteUrl()}/api/payway/webhook${token ? `?t=${encodeURIComponent(token)}` : ""}`;

  const body = {
    // TODO(payway-keys): confirmar que `id` (SDK Java/PHP) queda como
    // site_transaction_id del pago; si no, la conciliación usa solo el id
    // de pago que llegue en la notificación.
    id: reference,
    origin_platform: "SDK-Node",
    payment_description: input.description.slice(0, 100),
    currency: "ARS",
    total_price: toCheckoutAmount(input.amount),
    site: cfg.siteId,
    success_url: `${back}&pago=ok`,
    cancel_url: `${back}&pago=cancelado`,
    notifications_url: notify,
    template_id: 1,
    installments: [input.installments],
    // Plan MiPyME: 3 y 6 cuotas con el recargo de Ajustes (ya incluido en
    // el monto). TODO(payway-keys): confirmar con el comercio habilitado
    // que plan_gobierno=true ofrece el plan MiPyME y no otro plan.
    plan_gobierno: input.installments > 1,
    public_apikey: cfg.publicKey,
    auth_3ds: false,
  };

  const res = await fetch(
    `${apiBase(cfg)}/api/v1/checkout-payment-button/link`,
    { method: "POST", headers: headers(cfg), body: JSON.stringify(body) },
  );
  if (!res.ok) {
    throw new Error(`Payway link ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as { payment_link?: string };
  if (!json.payment_link) {
    throw new Error(`Payway link sin payment_link: ${JSON.stringify(json)}`);
  }
  return { url: json.payment_link, reference };
}

/* ── Consultar pagos ────────────────────────────────────────────── */

/** Lo que nos importa de un pago de la API v2. */
interface PaywayPayment {
  id: number | string;
  site_transaction_id?: string | null;
  site_id?: string | null;
  status?: string | null;
  /** En centavos. */
  amount?: number | null;
  installments?: number | null;
}

/**
 * Estados de la API de pagos → los nuestros. "approved" acredita;
 * "rejected"/"annulled" son rechazo; el resto (pre_approved, review…) queda
 * pendiente hasta la próxima notificación.
 * TODO(payway-keys): validar en sandbox la lista real de estados que
 * reporta un pago hecho desde el formulario.
 */
function mapStatus(status: string | null | undefined): PaymentStatus {
  const s = (status ?? "").toLowerCase();
  if (s === "approved" || s === "accredited") return "approved";
  if (s === "rejected" || s === "annulled" || s === "canceled" || s === "cancelled")
    return "rejected";
  return "pending";
}

/** Pago de la API → resultado agnóstico, o null si no es de un pedido nuestro. */
export function toPaymentResult(
  p: PaywayPayment,
  cfg: PaywayConfig,
): PaymentResult | null {
  // Solo pagos de nuestro site.
  if (p.site_id && String(p.site_id).replace(/^0+/, "") !== cfg.siteId.replace(/^0+/, ""))
    return null;
  const orderNumber = orderNumberFromReference(p.site_transaction_id);
  if (!orderNumber || p.amount == null) return null;
  return {
    provider: "payway",
    providerPaymentId: String(p.id),
    status: mapStatus(p.status),
    amount: Math.round(Number(p.amount) / 100),
    orderNumber,
  };
}

export async function fetchPaywayPayment(
  paymentId: string,
): Promise<PaywayPayment | null> {
  const cfg = paywayConfig();
  if (!cfg || !/^[A-Za-z0-9-]{1,40}$/.test(paymentId)) return null;
  const res = await fetch(`${apiBase(cfg)}/api/v2/payments/${paymentId}`, {
    headers: headers(cfg),
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

/** Pagos asociados a una referencia (site_transaction_id) nuestra. */
export async function findPaywayPayments(
  reference: string,
): Promise<PaywayPayment[]> {
  const cfg = paywayConfig();
  if (!cfg || !orderNumberFromReference(reference)) return [];
  const qs = new URLSearchParams({ siteOperationId: reference, pageSize: "10" });
  const res = await fetch(`${apiBase(cfg)}/api/v2/payments?${qs}`, {
    headers: headers(cfg),
    cache: "no-store",
  });
  if (!res.ok) return [];
  // TODO(payway-keys): confirmar la forma del listado ({ results: [...] }
  // en la v2 de Decidir) con una respuesta real del sandbox.
  const json = (await res.json()) as { results?: PaywayPayment[] };
  return json.results ?? [];
}

/* ── Notificación ───────────────────────────────────────────────── */

/** Token propio de la notifications_url, comparado en tiempo constante. */
export function verifyWebhookToken(token: string | null): boolean {
  const expected = process.env.PAYWAY_WEBHOOK_TOKEN;
  if (!expected) {
    // Sin token configurado se acepta (igual se re-consulta la API), pero
    // en producción conviene setearlo.
    return process.env.NODE_ENV !== "production";
  }
  if (!token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Extrae de la notificación lo que sirve para re-consultar: ids de pago y
 * referencias. El body nunca se usa como verdad.
 * TODO(payway-keys): ver una notificación real del sandbox y dejar solo
 * los campos que efectivamente manda Payway.
 */
export function notificationCandidates(body: unknown): {
  paymentIds: string[];
  references: string[];
} {
  const paymentIds = new Set<string>();
  const references = new Set<string>();
  const visit = (o: unknown, depth: number) => {
    if (!o || typeof o !== "object" || depth > 3) return;
    for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
      if (typeof v === "object") {
        visit(v, depth + 1);
        continue;
      }
      if (typeof v !== "string" && typeof v !== "number") continue;
      const value = String(v);
      if (["payment_id", "paymentid", "id", "charge_id", "transaction_id"].includes(k.toLowerCase())) {
        if (/^\d{1,20}$/.test(value)) paymentIds.add(value);
      }
      if (orderNumberFromReference(value)) references.add(value);
    }
  };
  visit(body, 0);
  return { paymentIds: [...paymentIds].slice(0, 5), references: [...references].slice(0, 5) };
}

/**
 * Concilia: consulta a la API todo lo que se pueda identificar y devuelve
 * los resultados de pedidos nuestros. Lo usan el webhook y la página de
 * confirmación (por si la notificación no llegó).
 */
export async function resolvePaywayResults(opts: {
  paymentIds?: string[];
  references?: string[];
}): Promise<PaymentResult[]> {
  const cfg = paywayConfig();
  if (!cfg) return [];
  const payments: PaywayPayment[] = [];
  for (const id of opts.paymentIds ?? []) {
    const p = await fetchPaywayPayment(id);
    if (p) payments.push(p);
  }
  for (const ref of opts.references ?? []) {
    payments.push(...(await findPaywayPayments(ref)));
  }
  const seen = new Set<string>();
  const results: PaymentResult[] = [];
  for (const p of payments) {
    const r = toPaymentResult(p, cfg);
    if (r && !seen.has(r.providerPaymentId)) {
      seen.add(r.providerPaymentId);
      results.push(r);
    }
  }
  return results;
}
