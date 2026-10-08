"use server";

import { and, asc, eq, ilike, ne } from "drizzle-orm";
import { z } from "zod";
import { lexicon } from "@/lib/data/content";
import { brands, products as seedProducts } from "@/lib/data/catalog";
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
import {
  createVariant,
  ensureDefaultVariant,
  getVariantsBySlug,
  removeVariant,
  updateVariant,
  VariantError,
} from "@/lib/server/variants";
import { resolveVariant } from "@/lib/variants";

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
    /** SKU del producto (único). "" = sin SKU. */
    sku: z.string().trim().max(60),
    rodado: z.string().trim().max(20).nullable(),
    hideWhenOut: z.boolean(),
    status: z.enum(["publicado", "borrador"]),
    hidden: z.boolean(),
    featured: z.boolean(),
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
  if (p.rodado !== undefined) set.rodado = p.rodado?.trim() || null;
  if (p.hideWhenOut !== undefined) set.hideWhenOut = p.hideWhenOut;
  if (p.status !== undefined) set.status = p.status;
  if (p.hidden !== undefined) set.hidden = p.hidden;
  if (p.featured !== undefined) set.featured = p.featured;
  if (p.sku !== undefined) {
    const sku = p.sku.toUpperCase() || null;
    if (sku) {
      const [clash] = await db
        .select({ id: schema.products.id })
        .from(schema.products)
        .where(and(eq(schema.products.sku, sku), ne(schema.products.id, parsedId.data)));
      if (clash) return { ok: false, error: `El SKU ${sku} ya está en uso.` };
    }
    set.sku = sku;
  }
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
/**
 * Categoría por defecto de un producto nuevo: la primera HOJA (sin
 * subcategorías) en el orden del árbol — `order` del padre, después el
 * propio, después el slug —, así es determinista aunque haya empates de
 * `order` entre niveles ("bicicletas" y "bicicletas-nuevas") y nunca cae en
 * una categoría que solo agrupa. Con el seed: "bicicletas-nuevas".
 */
function defaultCategory(
  cats: { slug: string; parentSlug: string | null; order: number }[],
): string | undefined {
  const bySlug = new Map(cats.map((c) => [c.slug, c]));
  const parents = new Set(cats.map((c) => c.parentSlug).filter(Boolean));
  const key = (c: (typeof cats)[number]) => {
    const parent = c.parentSlug ? bySlug.get(c.parentSlug) : undefined;
    return parent ? [parent.order, c.order] : [c.order, -1];
  };
  const pool = cats.filter((c) => !parents.has(c.slug));
  return [...(pool.length ? pool : cats)].sort((a, b) => {
    const [a1, a2] = key(a);
    const [b1, b2] = key(b);
    return a1 - b1 || a2 - b2 || a.slug.localeCompare(b.slug);
  })[0]?.slug;
}

/** Datos que se cargan en el modal de "+ Nuevo producto" (todo opcional). */
const newProductSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    price: priceSchema,
    /** Marca escrita en el modal: la existente o una nueva. Vacía = "a confirmar". */
    brandName: z.string().trim().max(60),
    description: z.string().trim().max(4000),
    /** Unidades iniciales en la sucursal principal (talle "Único"). */
    stock: z.number().int().min(0).max(9999),
    published: z.boolean(),
  })
  .partial();

export async function createProduct(
  category: unknown,
  fields?: unknown,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { actor } = await requireAdmin();
  const parsedFields = newProductSchema.safeParse(fields ?? {});
  if (!parsedFields.success) return { ok: false, error: "Revisá los datos del producto." };
  const name = parsedFields.data.name ?? lexicon.admin.newProduct;
  const db = await getDb();
  const cats = await db
    .select({
      slug: schema.categories.slug,
      parentSlug: schema.categories.parentSlug,
      order: schema.categories.order,
    })
    .from(schema.categories);
  const wanted = z.string().max(60).safeParse(category);
  const cat =
    cats.find((c) => wanted.success && c.slug === wanted.data)?.slug ?? defaultCategory(cats);
  if (!cat) return { ok: false, error: "Primero creá una categoría." };

  // Con marca escrita, la existente o una nueva. Sin marca nace "a
  // confirmar"; con la base en blanco (seed --vacio) no hay ninguna marca:
  // se crea ahí mismo en vez de frenar el alta.
  let brandId = lexicon.admin.newProductBrandId;
  if (parsedFields.data.brandName) {
    brandId = await brandIdFor(db, parsedFields.data.brandName);
  } else {
    const placeholder = brands.find((b) => b.id === brandId);
    await db
      .insert(schema.brands)
      .values({ id: brandId, name: placeholder?.name ?? "[Marca a confirmar]" })
      .onConflictDoNothing({ target: schema.brands.id });
  }

  const slug = await uniqueProductSlug(db, name);
  await db.insert(schema.products).values({
    id: slug,
    slug,
    name,
    brandId,
    category: cat,
    price: parsedFields.data.price ?? null,
    description: parsedFields.data.description ?? "",
    status: parsedFields.data.published === false ? "borrador" : "publicado",
    tag: lexicon.admin.newProductTag,
    chips: [],
    specs: [],
    images: [],
    custom: true,
    createdAt: new Date().toISOString().slice(0, 10),
  });
  const variantId = await ensureDefaultVariant(db, slug);
  const stock = parsedFields.data.stock ?? 0;
  if (stock > 0) {
    const [loc] = await db
      .select({ id: schema.locations.id })
      .from(schema.locations)
      .where(eq(schema.locations.active, true))
      .orderBy(asc(schema.locations.order))
      .limit(1);
    if (loc)
      await setStockLevel(db, { variantId, productSlug: slug, locationId: loc.id, qty: stock, reason: "ajuste", actor });
  }
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
    sku: null,
    featured: false,
    hidden: false,
    stockOverride: null,
    custom: true,
    createdAt: new Date().toISOString().slice(0, 10),
  });
  // Mismas variantes (talle × color × altura), sin stock y con SKU nuevo.
  const srcVariants = (await getVariantsBySlug(db, { productSlugs: [src.slug] })).get(src.slug) ?? [];
  const sized = srcVariants.filter((v) => v.active && !(v.size === "Único" && !v.color));
  if (sized.length) {
    for (const v of sized)
      await createVariant(db, slug, {
        size: v.size,
        color: v.color,
        heightRange: v.heightRange,
        order: v.order,
      });
  } else {
    await ensureDefaultVariant(db, slug);
  }
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
  const [sold] = await db
    .select({ id: schema.orderItems.id })
    .from(schema.orderItems)
    .where(eq(schema.orderItems.productSlug, row.slug))
    .limit(1);
  if (sold) {
    return {
      ok: false,
      error: "Tiene ventas registradas: ocultalo o pasalo a borrador en vez de eliminarlo.",
    };
  }
  await db.delete(schema.productStock).where(eq(schema.productStock.productSlug, row.slug));
  await db.delete(schema.stockMovements).where(eq(schema.stockMovements.productSlug, row.slug));
  await db.delete(schema.productVariants).where(eq(schema.productVariants.productSlug, row.slug));
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
  /** Variante (talle × color). Opcional si el producto tiene una sola activa. */
  variantId: idSchema.optional(),
  locationId: idSchema,
  reason: z.enum(manualReasons),
});

/** Slug del producto y la variante a mover (la pedida o la única activa). */
async function targetOf(
  db: Db,
  id: string,
  variantId?: string,
): Promise<{ slug: string; variantId: string } | { error: string }> {
  const [row] = await db
    .select({ slug: schema.products.slug })
    .from(schema.products)
    .where(eq(schema.products.id, id));
  if (!row) return { error: "Producto inexistente." };
  const variants = (await getVariantsBySlug(db, { productSlugs: [row.slug] })).get(row.slug) ?? [];
  const v = variantId
    ? variants.find((x) => x.id === variantId)
    : resolveVariant(variants);
  if (!v) return { error: variantId ? "Variante inexistente." : "Elegí el talle/color." };
  return { slug: row.slug, variantId: v.id };
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
  const target = await targetOf(db, parsed.data.id, parsed.data.variantId);
  if ("error" in target) return { ok: false, error: target.error };
  try {
    const { qtyAfter } = await applyStockMovement(db, {
      variantId: target.variantId,
      productSlug: target.slug,
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
  const target = await targetOf(db, parsed.data.id, parsed.data.variantId);
  if ("error" in target) return { ok: false, error: target.error };
  try {
    const { qtyAfter } = await setStockLevel(db, {
      variantId: target.variantId,
      productSlug: target.slug,
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
      variantId: idSchema.optional(),
      from: idSchema,
      to: idSchema,
      qty: z.number().int().min(1).max(9999),
    })
    .refine((v) => v.from !== v.to)
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Transferencia inválida." };
  const db = await getDb();
  const target = await targetOf(db, parsed.data.id, parsed.data.variantId);
  if ("error" in target) return { ok: false, error: target.error };
  try {
    await transferStock(db, {
      variantId: target.variantId,
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

/* ── Variantes (talle × color) ────────────────────────────── */

const variantSchema = z.object({
  size: z.string().trim().min(1).max(20),
  color: z.string().trim().max(40).optional(),
  heightRange: z.string().trim().max(40).nullable().optional(),
  sku: z.string().trim().max(60).nullable().optional(),
  order: z.number().int().min(0).max(999).optional(),
  active: z.boolean().optional(),
});

export type VariantPatch = Partial<z.infer<typeof variantSchema>>;

type VariantResult = { ok: true; variantId?: string } | { ok: false; error: string };

async function variantAction(fn: () => Promise<VariantResult>): Promise<VariantResult> {
  try {
    const r = await fn();
    if (r.ok) invalidatePublic("catalog");
    return r;
  } catch (err) {
    if (err instanceof VariantError) return { ok: false, error: err.message };
    throw err;
  }
}

/** Alta de una variante (talle × color × altura sugerida). */
export async function addProductVariant(productId: unknown, input: unknown): Promise<VariantResult> {
  await requireAdmin();
  const id = idSchema.safeParse(productId);
  const parsed = variantSchema.safeParse(input);
  if (!id.success || !parsed.success) return { ok: false, error: "Revisá talle y color." };
  const db = await getDb();
  const [row] = await db
    .select({ slug: schema.products.slug })
    .from(schema.products)
    .where(eq(schema.products.id, id.data));
  if (!row) return { ok: false, error: "Producto inexistente." };
  return variantAction(async () => {
    const v = await createVariant(db, row.slug, parsed.data);
    return { ok: true, variantId: v.id };
  });
}

/** Edición de talle, color, altura, SKU, orden o activa. */
export async function patchProductVariant(variantId: unknown, patch: unknown): Promise<VariantResult> {
  await requireAdmin();
  const id = idSchema.safeParse(variantId);
  const parsed = variantSchema.partial().safeParse(patch);
  if (!id.success || !parsed.success) return { ok: false, error: "Revisá los datos de la variante." };
  const db = await getDb();
  return variantAction(async () => {
    await updateVariant(db, id.data, parsed.data);
    return { ok: true, variantId: id.data };
  });
}

/** Quita una variante sin stock (se desactiva si tiene historial). */
export async function deleteProductVariant(variantId: unknown): Promise<VariantResult> {
  await requireAdmin();
  const id = idSchema.safeParse(variantId);
  if (!id.success) return { ok: false, error: "Variante inválida." };
  const db = await getDb();
  return variantAction(async () => {
    await removeVariant(db, id.data);
    return { ok: true };
  });
}
