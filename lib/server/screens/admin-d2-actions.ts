"use server";

import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { patchProduct } from "@/lib/server/actions/products";
import { requireAdmin } from "@/lib/server/actions/guard";
import { getDb, schema, type Db } from "@/lib/server/db";
import { invalidatePublic } from "@/lib/server/revalidate";
import { setStockLevel, StockError } from "@/lib/server/stock";
import { deleteUpload, readImageUpload, saveUpload } from "@/lib/server/uploads";
import {
  createVariant,
  getVariantsBySlug,
  removeVariant,
  updateVariant,
  VariantError,
} from "@/lib/server/variants";

/**
 * Server actions nuevas de las pantallas del agente D2 (ola 1). Todas
 * pasan por `requireAdmin()` como las del core.
 *
 * - 3d "Guardar cambios": un solo guardado para todo lo editado (datos,
 *   visibilidad, orden de fotos, variantes y stock). Los datos del
 *   producto siguen validándose en `patchProduct`.
 * - Fotos: `addProductPhoto` suma una foto al final de la galería
 *   (`setProductPhoto` del core solo reemplaza la portada).
 */

type Result = { ok: true } | { ok: false; error: string };

const idSchema = z.string().trim().min(1).max(80);

async function productRow(db: Db, id: string) {
  const [row] = await db
    .select({ slug: schema.products.slug, images: schema.products.images })
    .from(schema.products)
    .where(eq(schema.products.id, id));
  return row;
}

/** Sucursal principal (la activa de menor orden): el stock de 3d va ahí. */
async function mainLocationId(db: Db): Promise<string | null> {
  const [loc] = await db
    .select({ id: schema.locations.id })
    .from(schema.locations)
    .where(eq(schema.locations.active, true))
    .orderBy(asc(schema.locations.order))
    .limit(1);
  return loc?.id ?? null;
}

/** "Subir fotos": la foto se guarda al instante y queda al final de la galería. */
export async function addProductPhoto(
  productId: unknown,
  formData: FormData,
): Promise<{ ok: true; images: string[] } | { ok: false; error: string }> {
  await requireAdmin();
  const id = idSchema.safeParse(productId);
  if (!id.success) return { ok: false, error: "Producto inválido." };
  const upload = await readImageUpload(formData.get("photo"));
  if (!upload.ok) return upload;
  const db = await getDb();
  const row = await productRow(db, id.data);
  if (!row) return { ok: false, error: "Producto inexistente." };
  if (row.images.length >= 12) return { ok: false, error: "Hasta 12 fotos por producto." };
  let url: string;
  try {
    url = await saveUpload("product", row.slug, upload.bytes, upload.mime);
  } catch (err) {
    console.error("[uploads] error subiendo foto de producto:", err);
    return { ok: false, error: "No se pudo subir la foto. Probá de nuevo." };
  }
  const images = [...row.images, url];
  await db.update(schema.products).set({ images }).where(eq(schema.products.id, id.data));
  invalidatePublic("catalog");
  return { ok: true, images };
}

const variantInput = z.object({
  /** id existente; vacío = variante nueva. */
  id: z.string().trim().max(80).optional(),
  size: z.string().trim().min(1).max(20),
  color: z.string().trim().max(40),
  heightRange: z.string().trim().max(40),
  sku: z.string().trim().max(60),
  stock: z.number().int().min(0).max(9999),
});

const editorSchema = z.object({
  /** Mismo contrato que `patchProduct` (se valida ahí). */
  patch: z.record(z.string(), z.unknown()),
  /** Galería en el orden final (la primera es la portada). */
  images: z.array(z.string().max(1000)).max(12),
  variants: z.array(variantInput).max(80),
  /** Variantes quitadas (se borran o se desactivan si tienen historial). */
  removed: z.array(z.string().trim().min(1).max(80)).max(80),
});

/**
 * "Guardar cambios" de 3d. Orden: datos → fotos → bajas → altas/ediciones
 * de variantes → stock. Si algo falla, devuelve el error y lo anterior
 * queda guardado (cada paso es idempotente: se puede reintentar).
 */
export async function saveProductEditor(productId: unknown, input: unknown): Promise<Result> {
  const { actor } = await requireAdmin();
  const id = idSchema.safeParse(productId);
  const parsed = editorSchema.safeParse(input);
  if (!id.success || !parsed.success) return { ok: false, error: "Revisá los datos." };
  const { patch, images, variants, removed } = parsed.data;
  const db = await getDb();
  const row = await productRow(db, id.data);
  if (!row) return { ok: false, error: "Producto inexistente." };

  const r = await patchProduct(id.data, patch);
  if (!r.ok) return r;

  // Fotos: solo reordenar o quitar las que ya tiene (las nuevas entran por addProductPhoto).
  const current = new Set(row.images);
  if (images.some((u) => !current.has(u)) || new Set(images).size !== images.length) {
    return { ok: false, error: "Las fotos cambiaron mientras editabas: recargá la página." };
  }
  if (images.join("\n") !== row.images.join("\n")) {
    await db.update(schema.products).set({ images }).where(eq(schema.products.id, id.data));
    for (const url of row.images) if (!images.includes(url)) await deleteUpload(url);
  }

  try {
    const existing = (await getVariantsBySlug(db, { productSlugs: [row.slug] })).get(row.slug) ?? [];
    const byId = new Map(existing.map((v) => [v.id, v]));
    for (const vid of removed) {
      const v = byId.get(vid);
      if (!v) continue;
      // Una variante con stock primero se lleva a 0 (queda asentado en el libro).
      if (v.stock > 0) {
        const loc = await mainLocationId(db);
        if (loc) await setStockLevel(db, { variantId: vid, productSlug: row.slug, locationId: loc, qty: 0, reason: "ajuste", actor });
      }
      await removeVariant(db, vid);
    }

    const loc = await mainLocationId(db);
    let order = 0;
    for (const v of variants) {
      const data = {
        size: v.size,
        color: v.color,
        heightRange: v.heightRange || null,
        ...(v.sku ? { sku: v.sku } : {}),
        order: order++,
      };
      let variantId = v.id && byId.has(v.id) ? v.id : null;
      if (variantId) {
        await updateVariant(db, variantId, { ...data, active: true });
      } else {
        variantId = (await createVariant(db, row.slug, data)).id;
      }
      const before = variantId && byId.get(variantId) ? byId.get(variantId)!.stock : 0;
      if (loc && v.stock !== before) {
        await setStockLevel(db, {
          variantId,
          productSlug: row.slug,
          locationId: loc,
          qty: v.stock,
          reason: "ajuste",
          actor,
        });
      }
    }
  } catch (err) {
    invalidatePublic("catalog");
    if (err instanceof VariantError || err instanceof StockError) return { ok: false, error: err.message };
    throw err;
  }
  invalidatePublic("catalog");
  return { ok: true };
}
