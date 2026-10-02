"use server";

import { eq, ilike } from "drizzle-orm";
import { z } from "zod";
import { lexicon } from "@/lib/data/content";
import { products as seedProducts } from "@/lib/data/catalog";
import { resolveImage } from "@/lib/images";
import { slugify } from "@/lib/slug";
import { requireAdmin } from "@/lib/server/actions/guard";
import { getDb, schema, type Db } from "@/lib/server/db";
import { invalidatePublic } from "@/lib/server/revalidate";
import {
  applyStockMovement,
  setStockLevel,
  StockError,
  transferStock,
} from "@/lib/server/stock";
import { deleteUpload, readImageUpload, saveUpload } from "@/lib/server/uploads";

/**
 * Acciones del catálogo (/admin/productos y /admin/stock). El editor guarda
 * solo: cada campo llega por `patchProduct` con su debounce, validado con
 * zod; las acciones de la fila (precio, ★, stock, visible) son puntuales.
 * Todas invalidan el tag "catalog" (home, catálogo, fichas, comparador).
 */

const idSchema = z.string().trim().min(1).max(80);
const priceSchema = z.number().int().min(0).max(1_000_000_000).nullable();

type Result = { ok: true } | { ok: false; error: string };

/* ── Edición ──────────────────────────────────────────────── */

const specSchema = z.object({
  label: z.string().max(60),
  value: z.string().max(200),
});

const productPatchSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    category: z.string().trim().min(1).max(60),
    /** Nombre visible de la marca: si no existe, se crea. */
    brandName: z.string().trim().min(1).max(60),
    description: z.string().max(4000),
    /** null = "a consultar". */
    price: priceSchema,
    /** Precio anterior tachado; null = sin promo. */
    oldPrice: priceSchema,
    tag: z.string().trim().max(30).nullable(),
    chips: z.array(z.string().max(40)).max(8),
    specs: z.array(specSchema).max(60),
  })
  .partial();

export type ProductPatch = z.infer<typeof productPatchSchema>;

/** id de marca para un nombre: la existente (sin distinguir mayúsculas) o una nueva. */
async function brandIdFor(db: Db, name: string): Promise<string> {
  const [found] = await db
    .select({ id: schema.brands.id })
    .from(schema.brands)
    .where(ilike(schema.brands.name, name));
  if (found) return found.id;
  const base = slugify(name, 40) || "marca";
  let id = base;
  for (let i = 2; ; i++) {
    const [clash] = await db
      .select({ id: schema.brands.id })
      .from(schema.brands)
      .where(eq(schema.brands.id, id));
    if (!clash) break;
    id = `${base}-${i}`;
  }
  await db.insert(schema.brands).values({ id, name });
  return id;
}

/** Guardado parcial del editor (autosave). */
export async function patchProduct(id: unknown, patch: unknown): Promise<Result> {
  await requireAdmin();
  const parsedId = idSchema.safeParse(id);
  const parsed = productPatchSchema.safeParse(patch);
  if (!parsedId.success || !parsed.success) {
    return { ok: false, error: "Revisá los datos." };
  }
  const p = parsed.data;
  const db = await getDb();

  const set: Partial<typeof schema.products.$inferInsert> = {};
  if (p.name !== undefined) set.name = p.name;
  if (p.description !== undefined) set.description = p.description.trim();
  if (p.price !== undefined) set.price = p.price;
  if (p.oldPrice !== undefined) set.oldPrice = p.oldPrice || null;
  if (p.tag !== undefined) set.tag = p.tag?.trim() || null;
  if (p.chips !== undefined) set.chips = p.chips.map((c) => c.trim());
  if (p.specs !== undefined) set.specs = p.specs;
  if (p.category !== undefined) {
    const [cat] = await db
      .select({ slug: schema.categories.slug })
      .from(schema.categories)
      .where(eq(schema.categories.slug, p.category));
    if (!cat) return { ok: false, error: "Esa categoría no existe." };
    set.category = cat.slug;
  }
  if (p.brandName !== undefined) set.brandId = await brandIdFor(db, p.brandName);
  if (!Object.keys(set).length) return { ok: true };

  await db
    .update(schema.products)
    .set(set)
    .where(eq(schema.products.id, parsedId.data));
  invalidatePublic("catalog");
  return { ok: true };
}

/** Edición rápida del precio desde la fila (vacío = a consultar). */
export async function updateProductPrice(id: unknown, price: unknown): Promise<Result> {
  return patchProduct(id, { price });
}

export async function setProductHidden(id: unknown, hidden: unknown): Promise<Result> {
  await requireAdmin();
  const parsed = z.object({ id: idSchema, hidden: z.boolean() }).safeParse({ id, hidden });
  if (!parsed.success) return { ok: false, error: "Producto inválido." };
  const db = await getDb();
  await db
    .update(schema.products)
    .set({ hidden: parsed.data.hidden })
    .where(eq(schema.products.id, parsed.data.id));
  invalidatePublic("catalog");
  return { ok: true };
}

/** ★ Destacado en la home (aparecen en el orden del catálogo). */
export async function setProductFeatured(id: unknown, featured: unknown): Promise<Result> {
  await requireAdmin();
  const parsed = z.object({ id: idSchema, featured: z.boolean() }).safeParse({ id, featured });
  if (!parsed.success) return { ok: false, error: "Producto inválido." };
  const db = await getDb();
  await db
    .update(schema.products)
    .set({ featured: parsed.data.featured })
    .where(eq(schema.products.id, parsed.data.id));
  invalidatePublic("catalog");
  return { ok: true };
}

/**
 * Override manual de stock: "SIN STOCK" aunque haya unidades. Sin override
 * el estado se deriva de las cantidades (suma = 0 → sin stock).
 */
export async function setStockOverride(id: unknown, outOfStock: unknown): Promise<Result> {
  await requireAdmin();
  const parsed = z.object({ id: idSchema, on: z.boolean() }).safeParse({ id, on: outOfStock });
  if (!parsed.success) return { ok: false, error: "Producto inválido." };
  const db = await getDb();
  await db
    .update(schema.products)
    .set({ stockOverride: parsed.data.on ? "sin_stock" : null })
    .where(eq(schema.products.id, parsed.data.id));
  invalidatePublic("catalog");
  return { ok: true };
}

/* ── Alta, copia y baja ───────────────────────────────────── */

async function uniqueProductSlug(db: Db, name: string): Promise<string> {
  const base = slugify(name) || `producto-${Date.now()}`;
  let slug = base;
  for (let i = 2; ; i++) {
    const [clash] = await db
      .select({ id: schema.products.id })
      .from(schema.products)
      .where(eq(schema.products.slug, slug));
    if (!clash) return slug;
    slug = `${base}-${i}`;
  }
}

/** "+ Nuevo vehículo": nace vacío, sin stock y marcado custom (eliminable). */
export async function createProduct(
  category: unknown,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await requireAdmin();
  const db = await getDb();
  const cats = await db
    .select({ slug: schema.categories.slug })
    .from(schema.categories)
    .orderBy(schema.categories.order);
  const wanted = z.string().max(60).safeParse(category);
  const cat =
    cats.find((c) => wanted.success && c.slug === wanted.data)?.slug ?? cats[0]?.slug;
  if (!cat) return { ok: false, error: "Primero creá una categoría." };

  const [brand] = await db
    .select({ id: schema.brands.id })
    .from(schema.brands)
    .where(eq(schema.brands.id, lexicon.admin.newProductBrandId));
  const brandId =
    brand?.id ??
    (await db.select({ id: schema.brands.id }).from(schema.brands).limit(1))[0]?.id;
  if (!brandId) return { ok: false, error: "No hay marcas cargadas." };

  const slug = await uniqueProductSlug(db, lexicon.admin.newProduct);
  await db.insert(schema.products).values({
    id: slug,
    slug,
    name: lexicon.admin.newProduct,
    brandId,
    category: cat,
    price: null,
    tag: lexicon.admin.newProductTag,
    chips: [],
    specs: [],
    images: [],
    custom: true,
    createdAt: new Date().toISOString().slice(0, 10),
  });
  invalidatePublic("catalog");
  return { ok: true, id: slug };
}

/** "Duplicar": copia completa (sin stock, sin destacar), custom. */
export async function duplicateProduct(
  id: unknown,
): Promise<{ ok: true; id: string; name: string } | { ok: false; error: string }> {
  await requireAdmin();
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: "Producto inválido." };
  const db = await getDb();
  const [src] = await db
    .select()
    .from(schema.products)
    .where(eq(schema.products.id, parsedId.data));
  if (!src) return { ok: false, error: "Producto inexistente." };

  const name = `${src.name} (copia)`;
  const slug = await uniqueProductSlug(db, `${src.name} copia`);
  await db.insert(schema.products).values({
    ...src,
    id: slug,
    slug,
    name,
    featured: false,
    hidden: false,
    stockOverride: null,
    custom: true,
    createdAt: new Date().toISOString().slice(0, 10),
  });
  invalidatePublic("catalog");
  return { ok: true, id: slug, name };
}

/**
 * Elimina un producto creado desde el admin (los del catálogo original
 * solo se ocultan). Su inventario se borra; el libro de movimientos y
 * los pedidos que lo vendieron quedan como historial.
 */
export async function deleteProduct(id: unknown): Promise<Result> {
  await requireAdmin();
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: "Producto inválido." };
  const db = await getDb();
  const [row] = await db
    .select()
    .from(schema.products)
    .where(eq(schema.products.id, parsedId.data));
  if (!row) return { ok: false, error: "Producto inexistente." };
  if (!row.custom) {
    return { ok: false, error: "Los modelos del catálogo original se ocultan, no se eliminan." };
  }
  await db.delete(schema.productStock).where(eq(schema.productStock.productSlug, row.slug));
  await db.delete(schema.stockAlerts).where(eq(schema.stockAlerts.productSlug, row.slug));
  await db
    .update(schema.categories)
    .set({ imgProductId: null })
    .where(eq(schema.categories.imgProductId, row.id));
  await db.delete(schema.products).where(eq(schema.products.id, row.id));
  for (const url of row.images) await deleteUpload(url);
  invalidatePublic("catalog");
  return { ok: true };
}

/**
 * "↺ Descartar cambios y volver al original": todos los campos del
 * catálogo vuelven al seed (precio, precio anterior, categoría, marca,
 * fotos, specs, destacado, visibilidad, override). Las CANTIDADES no: son
 * inventario real, no edición del catálogo — se ajustan en Stock.
 */
export async function revertProduct(id: unknown): Promise<Result> {
  await requireAdmin();
  const parsedId = idSchema.safeParse(id);
  const seed = parsedId.success
    ? seedProducts.find((p) => p.id === parsedId.data)
    : undefined;
  if (!seed) return { ok: false, error: "No es un modelo del catálogo original." };
  const db = await getDb();
  const [cat] = await db
    .select({ slug: schema.categories.slug })
    .from(schema.categories)
    .where(eq(schema.categories.slug, seed.category));
  await db
    .update(schema.products)
    .set({
      name: seed.name,
      brandId: seed.brandId,
      // Si su categoría original ya no existe, se queda donde está.
      ...(cat ? { category: seed.category } : {}),
      price: seed.price,
      priceApprox: seed.priceApprox,
      oldPrice: seed.oldPrice,
      tag: seed.tag,
      chips: seed.chips,
      specs: seed.specs,
      images: seed.images.map(resolveImage),
      description: seed.description,
      hidden: seed.hidden,
      featured: seed.featured,
      stockOverride: seed.stockOverride,
    })
    .where(eq(schema.products.id, seed.id));
  invalidatePublic("catalog");
  return { ok: true };
}

/* ── Foto ─────────────────────────────────────────────────── */

type PhotoResult = { ok: true; images: string[] } | { ok: false; error: string };

/**
 * Foto principal (tab Foto): la subida reemplaza la portada; el resto de
 * la galería del producto se mantiene. Llega ya redimensionada por el
 * navegador (UPLOAD_LIMITS.product).
 */
export async function setProductPhoto(
  productId: unknown,
  formData: FormData,
): Promise<PhotoResult> {
  await requireAdmin();
  const parsedId = idSchema.safeParse(productId);
  if (!parsedId.success) return { ok: false, error: "Producto inválido." };
  const upload = await readImageUpload(formData.get("photo"));
  if (!upload.ok) return upload;

  const db = await getDb();
  const [row] = await db
    .select({ slug: schema.products.slug, images: schema.products.images })
    .from(schema.products)
    .where(eq(schema.products.id, parsedId.data));
  if (!row) return { ok: false, error: "Producto inexistente." };

  let url: string;
  try {
    url = await saveUpload("product", row.slug, upload.bytes, upload.mime);
  } catch (err) {
    console.error("[uploads] error subiendo foto de producto:", err);
    return { ok: false, error: "No se pudo subir la foto. Probá de nuevo." };
  }
  const [old, ...rest] = row.images;
  const images = [url, ...rest];
  await db
    .update(schema.products)
    .set({ images })
    .where(eq(schema.products.id, parsedId.data));
  if (old && old !== url) await deleteUpload(old);
  invalidatePublic("catalog");
  return { ok: true, images };
}

/**
 * "Volver a la foto del catálogo" (modelos del seed) o "Quitar foto"
 * (cargados desde el admin): la portada vuelve a la original o queda vacía.
 */
export async function revertProductPhoto(productId: unknown): Promise<PhotoResult> {
  await requireAdmin();
  const parsedId = idSchema.safeParse(productId);
  if (!parsedId.success) return { ok: false, error: "Producto inválido." };
  const db = await getDb();
  const [row] = await db
    .select({ images: schema.products.images })
    .from(schema.products)
    .where(eq(schema.products.id, parsedId.data));
  if (!row) return { ok: false, error: "Producto inexistente." };
  const seed = seedProducts.find((p) => p.id === parsedId.data);
  const original = seed ? seed.images.map(resolveImage) : [];
  const images = seed ? original : row.images.slice(1);
  await db
    .update(schema.products)
    .set({ images })
    .where(eq(schema.products.id, parsedId.data));
  for (const url of row.images) if (!images.includes(url)) await deleteUpload(url);
  invalidatePublic("catalog");
  return { ok: true, images };
}

/* ── Stock ────────────────────────────────────────────────── */

const manualReasons = ["ajuste", "reposicion"] as const;

const stockInputSchema = z.object({
  id: idSchema,
  locationId: idSchema,
  reason: z.enum(manualReasons),
});

async function slugOf(db: Db, id: string): Promise<string | null> {
  const [row] = await db
    .select({ slug: schema.products.slug })
    .from(schema.products)
    .where(eq(schema.products.id, id));
  return row?.slug ?? null;
}

type StockResult = { ok: true; qtyAfter: number } | { ok: false; error: string };

/** +/− del panel de Stock: un movimiento con su motivo, asentado en el libro. */
export async function adjustStock(input: unknown): Promise<StockResult> {
  const { actor } = await requireAdmin();
  const parsed = stockInputSchema
    .extend({ delta: z.number().int().min(-9999).max(9999).refine((n) => n !== 0) })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Ajuste inválido." };
  const db = await getDb();
  const slug = await slugOf(db, parsed.data.id);
  if (!slug) return { ok: false, error: "Producto inexistente." };
  try {
    const { qtyAfter } = await applyStockMovement(db, {
      productSlug: slug,
      locationId: parsed.data.locationId,
      delta: parsed.data.delta,
      reason: parsed.data.reason,
      actor,
    });
    invalidatePublic("catalog");
    return { ok: true, qtyAfter };
  } catch (err) {
    if (err instanceof StockError) return { ok: false, error: "No hay unidades para descontar." };
    throw err;
  }
}

/** "Fijar": lleva la cantidad de una sucursal a un valor absoluto. */
export async function setStockAt(input: unknown): Promise<StockResult> {
  const { actor } = await requireAdmin();
  const parsed = stockInputSchema
    .extend({ qty: z.number().int().min(0).max(9999) })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Cantidad inválida." };
  const db = await getDb();
  const slug = await slugOf(db, parsed.data.id);
  if (!slug) return { ok: false, error: "Producto inexistente." };
  try {
    const { qtyAfter } = await setStockLevel(db, {
      productSlug: slug,
      locationId: parsed.data.locationId,
      qty: parsed.data.qty,
      reason: parsed.data.reason,
      actor,
    });
    invalidatePublic("catalog");
    return { ok: true, qtyAfter };
  } catch (err) {
    if (err instanceof StockError) return { ok: false, error: err.message };
    throw err;
  }
}

/** Transferencia entre sucursales (solo se ofrece con más de una). */
export async function transferProductStock(input: unknown): Promise<Result> {
  const { actor } = await requireAdmin();
  const parsed = z
    .object({
      id: idSchema,
      from: idSchema,
      to: idSchema,
      qty: z.number().int().min(1).max(9999),
    })
    .refine((v) => v.from !== v.to)
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Transferencia inválida." };
  const db = await getDb();
  const slug = await slugOf(db, parsed.data.id);
  if (!slug) return { ok: false, error: "Producto inexistente." };
  try {
    await transferStock(db, {
      productSlug: slug,
      from: parsed.data.from,
      to: parsed.data.to,
      qty: parsed.data.qty,
      actor,
    });
    invalidatePublic("catalog");
    return { ok: true };
  } catch (err) {
    if (err instanceof StockError) return { ok: false, error: err.message };
    throw err;
  }
}
