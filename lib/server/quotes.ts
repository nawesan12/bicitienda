import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { formatARS } from "@/lib/format";
import { normalizeArPhone } from "@/lib/phone";
import { closedQuoteNote, nextQuoteTransition, OPEN_QUOTE_STATUSES } from "@/lib/quote-flow";
import { COUNTERS, nextCounter } from "@/lib/server/counters";
import { upsertCustomer, withSnapshotName, type CustomerRow } from "@/lib/server/customers";
import { getDb, schema, type Db } from "@/lib/server/db";
import { sendQuoteReceivedEmail, sendQuoteSentEmail } from "@/lib/server/mail";
import { createManualOrder } from "@/lib/server/orders";
import type { QuoteKind, QuoteStatus } from "@/lib/types";
import { variantLabel } from "@/lib/variants";
import { waUrl } from "@/lib/whatsapp";

/**
 * Pedidos de presupuesto (5a/5b): el cliente pide sin cargo, el local
 * cotiza por ítems, lo manda por WhatsApp, lo marca aceptado y "Crear
 * pedido" genera el pedido con esas líneas. Transiciones atómicas (UPDATE
 * … WHERE status = <origen>).
 */

export type QuoteRow = typeof schema.quoteRequests.$inferSelect;
export type QuoteLineRow = typeof schema.quoteLines.$inferSelect;

export class QuoteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuoteError";
  }
}

async function nextQuoteNumber(db: Db): Promise<string> {
  const n = await nextCounter(db, COUNTERS.quote, 213);
  return `P-${String(n).padStart(4, "0")}`;
}

/** Título por defecto: el comienzo del detalle, cortado en palabra. */
function titleFrom(detail: string): string {
  const flat = detail.replace(/\s+/g, " ").trim();
  if (flat.length <= 60) return flat;
  return `${flat.slice(0, 60).replace(/\s+\S*$/, "")}…`;
}

export async function createQuoteRequest(input: {
  kind: QuoteKind;
  detail: string;
  forBike?: string;
  budget?: string;
  photos?: string[];
  name: string;
  phone: string;
  email?: string | null;
  accountId?: string | null;
}): Promise<QuoteRow> {
  const db = await getDb();
  const phone = normalizeArPhone(input.phone);
  if (!phone) throw new QuoteError("Revisá el WhatsApp: 10 dígitos con la característica (ej. 223 555-0182).");
  const detail = input.detail.trim();
  if (detail.length < 10) throw new QuoteError("Contanos un poco más (al menos 10 caracteres).");
  if (input.name.trim().length < 2) throw new QuoteError("Completá tu nombre.");
  const customer = await upsertCustomer(db, { name: input.name, phone, email: input.email ?? null });
  const number = await nextQuoteNumber(db);
  const [row] = await db
    .insert(schema.quoteRequests)
    .values({
      number,
      kind: input.kind,
      title: titleFrom(detail),
      detail: detail.slice(0, 4000),
      forBike: (input.forBike ?? "").trim().slice(0, 200),
      budget: (input.budget ?? "").trim().slice(0, 100),
      photos: (input.photos ?? []).slice(0, 6),
      customerId: customer.id,
      customerName: input.name.trim(),
      accountId: input.accountId ?? customer.accountId ?? null,
      status: "nuevo",
    })
    .returning();
  await sendQuoteReceivedEmail(row.id);
  return row;
}

/* ── Cotización (admin) ───────────────────────────────────── */

export async function updateQuote(
  id: string,
  patch: { title?: string; eta?: string; validUntil?: string | null },
): Promise<void> {
  const db = await getDb();
  const set: Partial<typeof schema.quoteRequests.$inferInsert> = { updatedAt: new Date() };
  if (patch.title !== undefined) set.title = patch.title.trim().slice(0, 120);
  if (patch.eta !== undefined) set.eta = patch.eta.trim().slice(0, 80);
  if (patch.validUntil !== undefined) set.validUntil = patch.validUntil || null;
  await db.update(schema.quoteRequests).set(set).where(eq(schema.quoteRequests.id, id));
}

export interface QuoteLineInput {
  name: string;
  price: number;
  quantity?: number;
  productSlug?: string | null;
  variantId?: string | null;
}

/**
 * Reemplaza los ítems de la cotización (solo abierta y antes de crear el
 * pedido). Un ítem del catálogo valida que su variante exista.
 */
export async function setQuoteLines(id: string, lines: QuoteLineInput[]): Promise<void> {
  const db = await getDb();
  const [q] = await db.select().from(schema.quoteRequests).where(eq(schema.quoteRequests.id, id));
  if (!q) throw new QuoteError("Presupuesto inexistente.");
  if (!OPEN_QUOTE_STATUSES.includes(q.status)) throw new QuoteError("El presupuesto está cerrado.");
  for (const l of lines) {
    if (!l.name.trim() || !Number.isInteger(l.price) || l.price < 0)
      throw new QuoteError("Cada ítem necesita nombre y precio.");
    if (l.variantId) {
      const [v] = await db
        .select({ slug: schema.productVariants.productSlug })
        .from(schema.productVariants)
        .where(eq(schema.productVariants.id, l.variantId));
      if (!v || (l.productSlug && v.slug !== l.productSlug)) throw new QuoteError("Un ítem apunta a un talle inexistente.");
      l.productSlug = v.slug;
    }
  }
  await db.delete(schema.quoteLines).where(eq(schema.quoteLines.quoteId, id));
  if (lines.length)
    await db.insert(schema.quoteLines).values(
      lines.map((l, i) => ({
        quoteId: id,
        name: l.name.trim().slice(0, 160),
        price: l.price,
        quantity: Math.max(1, Math.trunc(l.quantity ?? 1)),
        productSlug: l.productSlug ?? null,
        variantId: l.variantId ?? null,
        order: i,
      })),
    );
  await db.update(schema.quoteRequests).set({ updatedAt: new Date() }).where(eq(schema.quoteRequests.id, id));
}

async function claim(db: Db, id: string, from: QuoteStatus, to: QuoteStatus, extra: Partial<typeof schema.quoteRequests.$inferInsert> = {}) {
  const [row] = await db
    .update(schema.quoteRequests)
    .set({ status: to, updatedAt: new Date(), ...extra })
    .where(and(eq(schema.quoteRequests.id, id), eq(schema.quoteRequests.status, from)))
    .returning();
  return row ?? null;
}

export type AdvanceQuoteResult =
  | { ok: true; status: QuoteStatus; whatsappUrl?: string; orderNumber?: string }
  | { ok: false; error: string };

/**
 * El botón amarillo: Enviar por WhatsApp (devuelve el link wa.me con la
 * cotización) → Marcar aceptado → Crear pedido (lo crea con las líneas).
 */
export async function advanceQuote(
  id: string,
  opts: { expectedFrom?: QuoteStatus; paymentMethod?: "transferencia" | "efectivo" } = {},
): Promise<AdvanceQuoteResult> {
  const db = await getDb();
  const full = await getQuote(id);
  if (!full) return { ok: false, error: "Presupuesto inexistente." };
  const { quote, lines, customer } = full;
  if (opts.expectedFrom && quote.status !== opts.expectedFrom)
    return { ok: false, error: "El presupuesto cambió. Recargá la página." };
  const t = nextQuoteTransition(quote.status);
  if (!t) return { ok: false, error: closedQuoteNote(quote.status) ?? "Sin próximo paso." };
  if (!lines.length) return { ok: false, error: "Agregá al menos un ítem a la cotización." };

  if (t.to === "cotizado") {
    const row = await claim(db, id, t.from, t.to);
    if (!row) return { ok: false, error: "El presupuesto cambió. Recargá la página." };
    // Además del WhatsApp, el mail con la cotización (si dejó email).
    await sendQuoteSentEmail(id);
    return { ok: true, status: t.to, whatsappUrl: quoteWhatsAppUrl(full) };
  }
  if (t.to === "aceptado") {
    const row = await claim(db, id, t.from, t.to);
    if (!row) return { ok: false, error: "El presupuesto cambió. Recargá la página." };
    return { ok: true, status: t.to };
  }

  // Crear pedido: se reclama el estado primero (un doble clic no crea dos
  // pedidos); si el pedido falla, se devuelve el presupuesto a "aceptado".
  const claimed = await claim(db, id, "aceptado", "pedido_creado");
  if (!claimed) return { ok: false, error: "El presupuesto cambió. Recargá la página." };
  const variantIds = lines.map((l) => l.variantId).filter((v): v is string => !!v);
  const variants = variantIds.length
    ? await db.select().from(schema.productVariants).where(inArray(schema.productVariants.id, variantIds))
    : [];
  const vBy = new Map(variants.map((v) => [v.id, v]));
  let result: Awaited<ReturnType<typeof createManualOrder>>;
  try {
    result = await createManualOrder({
    customerId: customer.id,
    customerName: customer.name,
    accountId: quote.accountId,
    paymentMethod: opts.paymentMethod ?? "transferencia",
    quoteId: quote.id,
    note: `Presupuesto ${quote.number}${quote.eta ? ` · demora ${quote.eta}` : ""}`,
    lines: lines.map((l) => {
      const v = l.variantId ? vBy.get(l.variantId) : undefined;
      return {
        name: l.name,
        unitPrice: l.price,
        quantity: l.quantity,
        productSlug: l.productSlug,
        variantId: l.variantId,
        variantLabel: v ? variantLabel(v) || null : null,
      };
    }),
    });
  } catch (err) {
    await claim(db, id, "pedido_creado", "aceptado");
    throw err;
  }
  if (!result.ok) {
    await claim(db, id, "pedido_creado", "aceptado");
    return { ok: false, error: result.error };
  }
  await db
    .update(schema.quoteRequests)
    .set({ orderId: result.orderId })
    .where(eq(schema.quoteRequests.id, id));
  return { ok: true, status: "pedido_creado", orderNumber: result.number };
}

/** "Rechazar": mientras esté abierto. */
export async function rejectQuote(id: string): Promise<boolean> {
  const db = await getDb();
  const [row] = await db
    .update(schema.quoteRequests)
    .set({ status: "rechazado", updatedAt: new Date() })
    .where(and(eq(schema.quoteRequests.id, id), inArray(schema.quoteRequests.status, OPEN_QUOTE_STATUSES)))
    .returning();
  return !!row;
}

/* ── Lecturas ─────────────────────────────────────────────── */

export interface FullQuote {
  quote: QuoteRow;
  lines: QuoteLineRow[];
  customer: CustomerRow;
  total: number;
}

export async function getQuote(id: string): Promise<FullQuote | null> {
  const db = await getDb();
  const [quote] = await db.select().from(schema.quoteRequests).where(eq(schema.quoteRequests.id, id));
  if (!quote) return null;
  return (await hydrate(db, [quote]))[0] ?? null;
}

export async function getQuoteByNumber(number: string): Promise<FullQuote | null> {
  const db = await getDb();
  const [quote] = await db
    .select()
    .from(schema.quoteRequests)
    .where(eq(schema.quoteRequests.number, number.trim().replace(/^#/, "").toUpperCase()));
  if (!quote) return null;
  return (await hydrate(db, [quote]))[0] ?? null;
}

async function hydrate(db: Db, quotes: QuoteRow[]): Promise<FullQuote[]> {
  if (!quotes.length) return [];
  const ids = quotes.map((q) => q.id);
  const [lines, customers] = await Promise.all([
    db.select().from(schema.quoteLines).where(inArray(schema.quoteLines.quoteId, ids)).orderBy(asc(schema.quoteLines.order)),
    db.select().from(schema.customers).where(inArray(schema.customers.id, [...new Set(quotes.map((q) => q.customerId))])),
  ]);
  const cBy = new Map(customers.map((c) => [c.id, c]));
  return quotes.flatMap((quote) => {
    const customer = cBy.get(quote.customerId);
    if (!customer) return [];
    const own = lines.filter((l) => l.quoteId === quote.id);
    return [{ quote, lines: own, customer: withSnapshotName(customer, quote.customerName), total: own.reduce((s, l) => s + l.price * l.quantity, 0) }];
  });
}

/** Listado del admin (más nuevos primero), con filtro por estados. */
export async function listQuotes(opts: { statuses?: QuoteStatus[] } = {}): Promise<FullQuote[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.quoteRequests)
    .where(opts.statuses ? inArray(schema.quoteRequests.status, opts.statuses) : undefined)
    .orderBy(desc(schema.quoteRequests.createdAt));
  return hydrate(db, rows);
}

/** Contadores de los chips (Todos · Nuevos · Cotizados · Aceptados · Cerrados). */
export async function quoteCounts(): Promise<Record<QuoteStatus, number> & { total: number }> {
  const db = await getDb();
  const rows = await db.select({ status: schema.quoteRequests.status }).from(schema.quoteRequests);
  const out = { nuevo: 0, cotizado: 0, aceptado: 0, pedido_creado: 0, rechazado: 0, total: rows.length };
  for (const r of rows) out[r.status] += 1;
  return out;
}

export async function getQuotesForAccount(accountId: string): Promise<FullQuote[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.quoteRequests)
    .where(eq(schema.quoteRequests.accountId, accountId))
    .orderBy(desc(schema.quoteRequests.createdAt));
  return hydrate(db, rows);
}

export async function getQuotesForCustomer(customerId: string): Promise<FullQuote[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.quoteRequests)
    .where(eq(schema.quoteRequests.customerId, customerId))
    .orderBy(desc(schema.quoteRequests.createdAt));
  return hydrate(db, rows);
}

/* ── WhatsApp ─────────────────────────────────────────────── */

/** "8 oct" (para el mail y el WhatsApp de la cotización). */
export function quoteValidLabel(date: string | null): string | null {
  return validLabel(date);
}

function validLabel(date: string | null): string | null {
  if (!date) return null;
  const [, m, d] = date.split("-").map(Number);
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${d} ${meses[m - 1]}`;
}

/** Texto de la cotización para mandar por WhatsApp. */
export function quoteWhatsAppText(full: FullQuote): string {
  const first = full.customer.name.split(" ")[0];
  const items = full.lines
    .map((l) => `• ${l.quantity > 1 ? `${l.quantity} × ` : ""}${l.name}: ${formatARS(l.price * l.quantity)}`)
    .join("\n");
  const parts = [
    `¡Hola ${first}! Te pasamos el presupuesto ${full.quote.number}:`,
    items,
    `Total: ${formatARS(full.total)}`,
  ];
  if (full.quote.eta) parts.push(`Demora: ${full.quote.eta}.`);
  const valid = validLabel(full.quote.validUntil);
  if (valid) parts.push(`Válido hasta el ${valid}.`);
  parts.push("Si te sirve, respondé este mensaje y lo encargamos.");
  return parts.join("\n");
}

export function quoteWhatsAppUrl(full: FullQuote): string {
  return waUrl(full.customer.phone, quoteWhatsAppText(full));
}
