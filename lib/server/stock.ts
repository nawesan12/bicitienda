import { and, eq, gte, inArray, sql } from "drizzle-orm";
import type { Db } from "@/lib/server/db";
import * as schema from "@/lib/server/db/schema";
import type { StockMovementReason } from "@/lib/types";

/**
 * La ÚNICA puerta de escritura del inventario. Todo cambio de stock —
 * venta, cancelación, vencimiento, ajuste del admin, transferencia entre
 * sucursales, reposición, importación, seed — pasa por
 * `applyStockMovement`, que hace el UPDATE condicional atómico y asienta
 * el movimiento en el libro.
 *
 * El stock vive por VARIANTE (talle × color) y sucursal. Un producto sin
 * talles tiene una sola variante ("Único", id `<slug>--u`).
 *
 * Sin transacciones interactivas (el driver HTTP de Neon no las soporta):
 * la atomicidad de cada movimiento la da el UPDATE condicional con
 * RETURNING; las operaciones compuestas (transferencia, reservas de varios
 * ítems) compensan con el movimiento inverso si un paso falla.
 */

export class StockError extends Error {
  constructor(
    message: string,
    readonly code: "INSUFICIENTE" | "SUCURSAL" | "VARIANTE" = "INSUFICIENTE",
  ) {
    super(message);
    this.name = "StockError";
  }
}

export interface StockMovementInput {
  variantId: string;
  /** Slug del producto de la variante. Si falta, se busca. */
  productSlug?: string;
  locationId: string;
  /** Positivo repone, negativo descuenta. Nunca deja qty < 0. */
  delta: number;
  reason: StockMovementReason;
  orderId?: string | null;
  /** "admin" cuando la variación es manual. */
  actor?: string | null;
}

async function productSlugOf(db: Db, variantId: string): Promise<string> {
  const [row] = await db
    .select({ slug: schema.productVariants.productSlug })
    .from(schema.productVariants)
    .where(eq(schema.productVariants.id, variantId));
  if (!row) throw new StockError(`Variante inexistente: ${variantId}.`, "VARIANTE");
  return row.slug;
}

/**
 * Aplica un movimiento de stock. Atómico: el UPDATE solo pega si el
 * resultado no queda negativo; si no pega, no se movió nada y se lanza
 * StockError. Devuelve la cantidad real posterior.
 */
export async function applyStockMovement(
  db: Db,
  input: StockMovementInput,
): Promise<{ qtyAfter: number }> {
  const delta = Math.trunc(input.delta);
  if (!delta) return { qtyAfter: await qtyAt(db, input.variantId, input.locationId) };
  const productSlug = input.productSlug ?? (await productSlugOf(db, input.variantId));

  // La fila puede no existir todavía (variante nueva o sucursal nueva).
  await db
    .insert(schema.productStock)
    .values({
      variantId: input.variantId,
      productSlug,
      locationId: input.locationId,
      qty: 0,
    })
    .onConflictDoNothing();

  const updated = await db
    .update(schema.productStock)
    .set({ qty: sql`${schema.productStock.qty} + ${delta}` })
    .where(
      and(
        eq(schema.productStock.variantId, input.variantId),
        eq(schema.productStock.locationId, input.locationId),
        gte(schema.productStock.qty, Math.max(0, -delta)),
      ),
    )
    .returning();

  if (!updated.length)
    throw new StockError(
      `Stock insuficiente de ${input.variantId} en ${input.locationId}.`,
    );

  const qtyAfter = updated[0].qty;
  await db.insert(schema.stockMovements).values({
    variantId: input.variantId,
    productSlug,
    locationId: input.locationId,
    delta,
    qtyAfter,
    reason: input.reason,
    orderId: input.orderId ?? null,
    actor: input.actor ?? null,
  });
  return { qtyAfter };
}

export async function qtyAt(
  db: Db,
  variantId: string,
  locationId: string,
): Promise<number> {
  const [row] = await db
    .select({ qty: schema.productStock.qty })
    .from(schema.productStock)
    .where(
      and(
        eq(schema.productStock.variantId, variantId),
        eq(schema.productStock.locationId, locationId),
      ),
    );
  return row?.qty ?? 0;
}

/**
 * Fija el stock de una variante en una sucursal en un valor absoluto
 * (ajuste del admin, importación). Se traduce al delta contra el valor
 * actual para que el libro registre la variación real; si no cambia, no
 * se asienta nada (idempotente).
 */
export async function setStockLevel(
  db: Db,
  input: {
    variantId: string;
    productSlug?: string;
    locationId: string;
    qty: number;
    reason?: StockMovementReason;
    actor?: string | null;
  },
): Promise<{ qtyAfter: number }> {
  const target = Math.max(0, Math.trunc(input.qty));
  const current = await qtyAt(db, input.variantId, input.locationId);
  return applyStockMovement(db, {
    variantId: input.variantId,
    productSlug: input.productSlug,
    locationId: input.locationId,
    delta: target - current,
    reason: input.reason ?? "ajuste",
    actor: input.actor,
  });
}

/**
 * Transferencia entre sucursales: dos movimientos 'transferencia' (salida
 * y entrada). Si la entrada fallara, se compensa la salida.
 */
export async function transferStock(
  db: Db,
  input: {
    variantId: string;
    from: string;
    to: string;
    qty: number;
    actor?: string | null;
  },
): Promise<void> {
  const qty = Math.trunc(input.qty);
  if (qty <= 0) throw new StockError("La cantidad a transferir debe ser positiva.");
  if (input.from === input.to)
    throw new StockError("Elegí dos sucursales distintas.", "SUCURSAL");
  const productSlug = await productSlugOf(db, input.variantId);

  await applyStockMovement(db, {
    variantId: input.variantId,
    productSlug,
    locationId: input.from,
    delta: -qty,
    reason: "transferencia",
    actor: input.actor,
  });
  try {
    await applyStockMovement(db, {
      variantId: input.variantId,
      productSlug,
      locationId: input.to,
      delta: qty,
      reason: "transferencia",
      actor: input.actor,
    });
  } catch (err) {
    // Compensación: la salida vuelve a su sucursal.
    await applyStockMovement(db, {
      variantId: input.variantId,
      productSlug,
      locationId: input.from,
      delta: qty,
      reason: "transferencia",
      actor: input.actor,
    });
    throw err;
  }
}

/**
 * Devuelve EXACTAMENTE lo que un pedido tiene descontado: suma por
 * variante y sucursal todos sus movimientos (ventas negativas, vueltas
 * positivas) y repone el saldo neto. Idempotente: una segunda llamada
 * encuentra saldo 0 y no mueve nada. Funciona también si el pedido volvió
 * a reservar después de vencer (pago tardío) y se cancela otra vez.
 */
export async function revertOrderMovements(
  db: Db,
  orderId: string,
  reason: Extract<StockMovementReason, "cancelacion" | "vencimiento">,
): Promise<void> {
  const moves = await db
    .select()
    .from(schema.stockMovements)
    .where(
      and(
        eq(schema.stockMovements.orderId, orderId),
        inArray(schema.stockMovements.reason, ["venta", "cancelacion", "vencimiento"]),
      ),
    );
  const net = new Map<string, { variantId: string; productSlug: string; locationId: string; delta: number }>();
  for (const m of moves) {
    const key = `${m.variantId}|${m.locationId}`;
    const entry = net.get(key) ?? {
      variantId: m.variantId,
      productSlug: m.productSlug,
      locationId: m.locationId,
      delta: 0,
    };
    entry.delta += m.delta;
    net.set(key, entry);
  }
  for (const e of net.values()) {
    if (e.delta >= 0) continue;
    await applyStockMovement(db, {
      variantId: e.variantId,
      productSlug: e.productSlug,
      locationId: e.locationId,
      delta: -e.delta, // el saldo es negativo: esto repone
      reason,
      orderId,
    });
  }
}

/* ── Lecturas ─────────────────────────────────────────────── */

/** qty por variante y sucursal: Map variantId → Map loc → qty. */
export async function getVariantStockMatrix(
  db: Db,
  productSlugs?: string[],
): Promise<Map<string, Map<string, number>>> {
  const rows = productSlugs
    ? await db
        .select()
        .from(schema.productStock)
        .where(inArray(schema.productStock.productSlug, productSlugs))
    : await db.select().from(schema.productStock);
  const map = new Map<string, Map<string, number>>();
  for (const r of rows) {
    const inner = map.get(r.variantId) ?? new Map<string, number>();
    inner.set(r.locationId, r.qty);
    map.set(r.variantId, inner);
  }
  return map;
}

/**
 * qty por producto y sucursal (suma de sus variantes):
 * Map slug → Map loc → qty.
 */
export async function getStockMatrix(
  db: Db,
  productSlugs?: string[],
): Promise<Map<string, Map<string, number>>> {
  const rows = productSlugs
    ? await db
        .select()
        .from(schema.productStock)
        .where(inArray(schema.productStock.productSlug, productSlugs))
    : await db.select().from(schema.productStock);
  const map = new Map<string, Map<string, number>>();
  for (const r of rows) {
    const inner = map.get(r.productSlug) ?? new Map<string, number>();
    inner.set(r.locationId, (inner.get(r.locationId) ?? 0) + r.qty);
    map.set(r.productSlug, inner);
  }
  return map;
}

/** Totales agregados por producto: Map slug → SUM(qty). */
export async function getStockTotals(db: Db): Promise<Map<string, number>> {
  const rows = await db
    .select({
      slug: schema.productStock.productSlug,
      total: sql<number>`sum(${schema.productStock.qty})`.mapWith(Number),
    })
    .from(schema.productStock)
    .groupBy(schema.productStock.productSlug);
  return new Map(rows.map((r) => [r.slug, r.total]));
}

/** Totales agregados por variante: Map variantId → SUM(qty). */
export async function getVariantTotals(db: Db): Promise<Map<string, number>> {
  const rows = await db
    .select({
      id: schema.productStock.variantId,
      total: sql<number>`sum(${schema.productStock.qty})`.mapWith(Number),
    })
    .from(schema.productStock)
    .groupBy(schema.productStock.variantId);
  return new Map(rows.map((r) => [r.id, r.total]));
}

/** Últimos movimientos de un producto, más recientes primero. */
export async function getProductMovements(db: Db, productSlug: string, limit = 50) {
  return db
    .select()
    .from(schema.stockMovements)
    .where(eq(schema.stockMovements.productSlug, productSlug))
    .orderBy(sql`${schema.stockMovements.createdAt} desc, ${schema.stockMovements.id} desc`)
    .limit(limit);
}
