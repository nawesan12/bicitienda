import { and, eq, gte, inArray, sql } from "drizzle-orm";
import type { Db } from "@/lib/server/db";
import * as schema from "@/lib/server/db/schema";
import type { StockMovementReason } from "@/lib/types";

/**
 * La ÚNICA puerta de escritura del inventario. Todo cambio de stock —
 * venta, cancelación, vencimiento, ajuste del admin, transferencia entre
 * sucursales, reposición, seed — pasa por `applyStockMovement`, que hace
 * el UPDATE condicional atómico y asienta el movimiento en el libro.
 *
 * Sin transacciones interactivas (el driver HTTP de Neon no las soporta):
 * la atomicidad de cada movimiento la da el UPDATE condicional con
 * RETURNING; las operaciones compuestas (transferencia, reservas de varios
 * ítems) compensan con el movimiento inverso si un paso falla.
 */

export class StockError extends Error {
  constructor(
    message: string,
    readonly code: "INSUFICIENTE" | "SUCURSAL" = "INSUFICIENTE",
  ) {
    super(message);
    this.name = "StockError";
  }
}

export interface StockMovementInput {
  productSlug: string;
  locationId: string;
  /** Positivo repone, negativo descuenta. Nunca deja qty < 0. */
  delta: number;
  reason: StockMovementReason;
  orderId?: string | null;
  /** Email del admin cuando la variación es manual. */
  actor?: string | null;
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
  if (!delta) return { qtyAfter: await qtyAt(db, input.productSlug, input.locationId) };

  // La fila puede no existir todavía (producto nuevo o sucursal nueva).
  await db
    .insert(schema.productStock)
    .values({ productSlug: input.productSlug, locationId: input.locationId, qty: 0 })
    .onConflictDoNothing();

  const updated = await db
    .update(schema.productStock)
    .set({ qty: sql`${schema.productStock.qty} + ${delta}` })
    .where(
      and(
        eq(schema.productStock.productSlug, input.productSlug),
        eq(schema.productStock.locationId, input.locationId),
        gte(schema.productStock.qty, Math.max(0, -delta)),
      ),
    )
    .returning();

  if (!updated.length)
    throw new StockError(
      `Stock insuficiente de ${input.productSlug} en ${input.locationId}.`,
    );

  const qtyAfter = updated[0].qty;
  await db.insert(schema.stockMovements).values({
    productSlug: input.productSlug,
    locationId: input.locationId,
    delta,
    qtyAfter,
    reason: input.reason,
    orderId: input.orderId ?? null,
    actor: input.actor ?? null,
  });
  return { qtyAfter };
}

async function qtyAt(
  db: Db,
  productSlug: string,
  locationId: string,
): Promise<number> {
  const [row] = await db
    .select({ qty: schema.productStock.qty })
    .from(schema.productStock)
    .where(
      and(
        eq(schema.productStock.productSlug, productSlug),
        eq(schema.productStock.locationId, locationId),
      ),
    );
  return row?.qty ?? 0;
}

/**
 * Fija el stock de una sucursal en un valor absoluto (ajuste del admin).
 * Se traduce al delta contra el valor actual para que el libro registre
 * la variación real.
 */
export async function setStockLevel(
  db: Db,
  input: {
    productSlug: string;
    locationId: string;
    qty: number;
    reason?: StockMovementReason;
    actor?: string | null;
  },
): Promise<{ qtyAfter: number }> {
  const target = Math.max(0, Math.trunc(input.qty));
  const current = await qtyAt(db, input.productSlug, input.locationId);
  return applyStockMovement(db, {
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
    productSlug: string;
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

  await applyStockMovement(db, {
    productSlug: input.productSlug,
    locationId: input.from,
    delta: -qty,
    reason: "transferencia",
    actor: input.actor,
  });
  try {
    await applyStockMovement(db, {
      productSlug: input.productSlug,
      locationId: input.to,
      delta: qty,
      reason: "transferencia",
      actor: input.actor,
    });
  } catch (err) {
    // Compensación: la salida vuelve a su sucursal.
    await applyStockMovement(db, {
      productSlug: input.productSlug,
      locationId: input.from,
      delta: qty,
      reason: "transferencia",
      actor: input.actor,
    });
    throw err;
  }
}

/**
 * Revierte EXACTAMENTE lo que un pedido descontó: busca sus movimientos
 * 'venta' y aplica el inverso en cada sucursal. No recalcula nada — si la
 * venta salió 2 de Rivadavia y 1 de Güemes, vuelven 2 y 1 a cada una.
 */
export async function revertOrderMovements(
  db: Db,
  orderId: string,
  reason: Extract<StockMovementReason, "cancelacion" | "vencimiento">,
): Promise<void> {
  const sold = await db
    .select()
    .from(schema.stockMovements)
    .where(
      and(
        eq(schema.stockMovements.orderId, orderId),
        eq(schema.stockMovements.reason, "venta"),
      ),
    );

  // Idempotencia: si ya se revirtió (hay movimientos de vuelta con este
  // orderId), no se devuelve dos veces.
  const returned = await db
    .select()
    .from(schema.stockMovements)
    .where(
      and(
        eq(schema.stockMovements.orderId, orderId),
        inArray(schema.stockMovements.reason, ["cancelacion", "vencimiento"]),
      ),
    );
  if (returned.length) return;

  for (const m of sold) {
    await applyStockMovement(db, {
      productSlug: m.productSlug,
      locationId: m.locationId,
      delta: -m.delta, // la venta fue negativa: esto repone
      reason,
      orderId,
    });
  }
}

/* ── Lecturas ─────────────────────────────────────────────── */

/** qty por sucursal para un conjunto de productos: Map slug → Map loc → qty. */
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
    inner.set(r.locationId, r.qty);
    map.set(r.productSlug, inner);
  }
  return map;
}

/** Totales agregados: Map slug → SUM(qty). */
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

/** Últimos movimientos de un producto, más recientes primero. */
export async function getProductMovements(db: Db, productSlug: string, limit = 50) {
  return db
    .select()
    .from(schema.stockMovements)
    .where(eq(schema.stockMovements.productSlug, productSlug))
    .orderBy(sql`${schema.stockMovements.createdAt} desc, ${schema.stockMovements.id} desc`)
    .limit(limit);
}
