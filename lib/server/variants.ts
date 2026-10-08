import { randomBytes } from "node:crypto";
import { and, asc, eq, inArray, ne, sql } from "drizzle-orm";
import { slugify } from "@/lib/slug";
import type { Db } from "@/lib/server/db";
import * as schema from "@/lib/server/db/schema";
import { getVariantTotals } from "@/lib/server/stock";
import { SINGLE_SIZE, type ProductVariant } from "@/lib/types";
import { defaultVariantId, defaultVariantSku } from "@/lib/variants";

/**
 * Variantes (talle × color) del lado del server: lecturas con stock y las
 * altas/bajas que usan el admin y la importación. El stock NO se toca acá:
 * pasa siempre por lib/server/stock.ts.
 */

export type VariantRow = typeof schema.productVariants.$inferSelect;

export class VariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VariantError";
  }
}

/**
 * Variantes por producto con su stock total: Map slug → variantes en orden.
 * `activeOnly` filtra las desactivadas (la web); el admin las ve todas.
 */
export async function getVariantsBySlug(
  db: Db,
  opts: { productSlugs?: string[]; activeOnly?: boolean } = {},
): Promise<Map<string, ProductVariant[]>> {
  const conds = [];
  if (opts.productSlugs) conds.push(inArray(schema.productVariants.productSlug, opts.productSlugs));
  if (opts.activeOnly) conds.push(eq(schema.productVariants.active, true));
  const [rows, totals] = await Promise.all([
    db
      .select()
      .from(schema.productVariants)
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(asc(schema.productVariants.order), asc(schema.productVariants.id)),
    getVariantTotals(db, opts.productSlugs),
  ]);
  const map = new Map<string, ProductVariant[]>();
  for (const r of rows) {
    const list = map.get(r.productSlug) ?? [];
    list.push({ ...r, stock: totals.get(r.id) ?? 0 });
    map.set(r.productSlug, list);
  }
  return map;
}

/** La variante "Único" de un producto (idempotente). */
export async function ensureDefaultVariant(
  db: Db,
  productSlug: string,
  productSku?: string | null,
): Promise<string> {
  const id = defaultVariantId(productSlug);
  await db
    .insert(schema.productVariants)
    .values({
      id,
      productSlug,
      size: SINGLE_SIZE,
      color: "",
      sku: await uniqueSku(db, defaultVariantSku(productSlug, productSku)),
      order: 0,
      active: true,
    })
    .onConflictDoNothing();
  return id;
}

/** SKU libre: el pedido o con sufijo -2, -3… si ya existe. */
async function uniqueSku(db: Db, wanted: string, exceptId?: string): Promise<string> {
  const base = wanted.trim().toUpperCase();
  let sku = base;
  for (let i = 2; ; i++) {
    const [clash] = await db
      .select({ id: schema.productVariants.id })
      .from(schema.productVariants)
      .where(
        exceptId
          ? and(eq(schema.productVariants.sku, sku), ne(schema.productVariants.id, exceptId))
          : eq(schema.productVariants.sku, sku),
      );
    if (!clash) return sku;
    sku = `${base}-${i}`;
  }
}

export interface VariantInput {
  size: string;
  color?: string;
  heightRange?: string | null;
  /** Sin SKU se arma uno: <SKU o SLUG>-<TALLE>[-<COLOR>]. */
  sku?: string | null;
  order?: number;
  active?: boolean;
}

export function autoSku(productSlug: string, productSku: string | null, v: VariantInput): string {
  const parts = [(productSku || productSlug).toUpperCase()];
  parts.push(v.size === SINGLE_SIZE ? "U" : slugify(v.size, 12).toUpperCase());
  if (v.color) parts.push(slugify(v.color, 16).toUpperCase());
  return parts.join("-");
}

/**
 * Alta de una variante. Si el producto solo tenía la "Único" sin stock ni
 * historial, esa se desactiva: pasa a tener talles.
 */
export async function createVariant(
  db: Db,
  productSlug: string,
  input: VariantInput,
): Promise<VariantRow> {
  const [product] = await db
    .select({ slug: schema.products.slug, sku: schema.products.sku })
    .from(schema.products)
    .where(eq(schema.products.slug, productSlug));
  if (!product) throw new VariantError("Producto inexistente.");
  const size = input.size.trim() || SINGLE_SIZE;
  const color = (input.color ?? "").trim();

  const [dup] = await db
    .select({ id: schema.productVariants.id, active: schema.productVariants.active })
    .from(schema.productVariants)
    .where(
      and(
        eq(schema.productVariants.productSlug, productSlug),
        eq(schema.productVariants.size, size),
        eq(schema.productVariants.color, color),
      ),
    );
  if (dup) throw new VariantError("Esa combinación de talle y color ya existe.");

  const sku = input.sku?.trim()
    ? input.sku.trim().toUpperCase()
    : await uniqueSku(db, autoSku(productSlug, product.sku, { ...input, size, color }));
  const [skuClash] = await db
    .select({ id: schema.productVariants.id })
    .from(schema.productVariants)
    .where(eq(schema.productVariants.sku, sku));
  if (skuClash) throw new VariantError(`El SKU ${sku} ya está en uso.`);

  const [maxOrder] = await db
    .select({ n: sql<number>`coalesce(max(${schema.productVariants.order}), -1)`.mapWith(Number) })
    .from(schema.productVariants)
    .where(eq(schema.productVariants.productSlug, productSlug));
  const id =
    size === SINGLE_SIZE && !color
      ? defaultVariantId(productSlug)
      : `${productSlug}--${randomBytes(4).toString("hex")}`;
  const [row] = await db
    .insert(schema.productVariants)
    .values({
      id,
      productSlug,
      size,
      color,
      heightRange: input.heightRange?.trim() || null,
      sku,
      order: input.order ?? (maxOrder?.n ?? -1) + 1,
      active: input.active ?? true,
    })
    .returning();

  if (size !== SINGLE_SIZE || color) await retireEmptyDefault(db, productSlug);
  return row;
}

/** Desactiva la "Único" si quedó vacía al pasar a tener talles. */
async function retireEmptyDefault(db: Db, productSlug: string): Promise<void> {
  const id = defaultVariantId(productSlug);
  const totals = await getVariantTotals(db, [productSlug]);
  if ((totals.get(id) ?? 0) > 0) return;
  await db
    .update(schema.productVariants)
    .set({ active: false })
    .where(eq(schema.productVariants.id, id));
}

/** Edición de talle, color, altura, SKU, orden o estado. */
export async function updateVariant(
  db: Db,
  variantId: string,
  patch: Partial<VariantInput>,
): Promise<void> {
  const [v] = await db
    .select()
    .from(schema.productVariants)
    .where(eq(schema.productVariants.id, variantId));
  if (!v) throw new VariantError("Variante inexistente.");
  const set: Partial<typeof schema.productVariants.$inferInsert> = {};
  if (patch.size !== undefined) set.size = patch.size.trim() || SINGLE_SIZE;
  if (patch.color !== undefined) set.color = patch.color.trim();
  if (patch.heightRange !== undefined) set.heightRange = patch.heightRange?.trim() || null;
  if (patch.order !== undefined) set.order = patch.order;
  if (patch.active !== undefined) set.active = patch.active;
  if (patch.sku !== undefined && patch.sku?.trim()) {
    const sku = patch.sku.trim().toUpperCase();
    const [clash] = await db
      .select({ id: schema.productVariants.id })
      .from(schema.productVariants)
      .where(and(eq(schema.productVariants.sku, sku), ne(schema.productVariants.id, variantId)));
    if (clash) throw new VariantError(`El SKU ${sku} ya está en uso.`);
    set.sku = sku;
  }
  if (set.size !== undefined || set.color !== undefined) {
    const size = set.size ?? v.size;
    const color = set.color ?? v.color;
    const [dup] = await db
      .select({ id: schema.productVariants.id })
      .from(schema.productVariants)
      .where(
        and(
          eq(schema.productVariants.productSlug, v.productSlug),
          eq(schema.productVariants.size, size),
          eq(schema.productVariants.color, color),
          ne(schema.productVariants.id, variantId),
        ),
      );
    if (dup) throw new VariantError("Esa combinación de talle y color ya existe.");
  }
  if (!Object.keys(set).length) return;
  await db
    .update(schema.productVariants)
    .set(set)
    .where(eq(schema.productVariants.id, variantId));
}

/**
 * Baja de una variante: se borra si nunca tuvo stock, ventas ni
 * movimientos; si tiene historial, se desactiva. No se puede dar de baja
 * con unidades en stock (primero se ajusta a 0). Nunca deja al producto
 * sin variantes activas: si era la última, se reactiva la "Único".
 */
export async function removeVariant(
  db: Db,
  variantId: string,
): Promise<{ deleted: boolean }> {
  const [v] = await db
    .select()
    .from(schema.productVariants)
    .where(eq(schema.productVariants.id, variantId));
  if (!v) throw new VariantError("Variante inexistente.");
  const totals = await getVariantTotals(db, [v.productSlug]);
  if ((totals.get(variantId) ?? 0) > 0)
    throw new VariantError("La variante tiene stock: llevalo a 0 antes de quitarla.");

  const [moved] = await db
    .select({ id: schema.stockMovements.id })
    .from(schema.stockMovements)
    .where(eq(schema.stockMovements.variantId, variantId))
    .limit(1);
  const [sold] = await db
    .select({ id: schema.orderItems.id })
    .from(schema.orderItems)
    .where(eq(schema.orderItems.variantId, variantId))
    .limit(1);

  let deleted = false;
  if (moved || sold) {
    await db
      .update(schema.productVariants)
      .set({ active: false })
      .where(eq(schema.productVariants.id, variantId));
  } else {
    await db.delete(schema.productStock).where(eq(schema.productStock.variantId, variantId));
    await db.delete(schema.productVariants).where(eq(schema.productVariants.id, variantId));
    deleted = true;
  }

  const [left] = await db
    .select({ id: schema.productVariants.id })
    .from(schema.productVariants)
    .where(
      and(
        eq(schema.productVariants.productSlug, v.productSlug),
        eq(schema.productVariants.active, true),
      ),
    )
    .limit(1);
  if (!left) {
    const id = await ensureDefaultVariant(db, v.productSlug);
    await db
      .update(schema.productVariants)
      .set({ active: true })
      .where(eq(schema.productVariants.id, id));
  }
  return { deleted };
}
