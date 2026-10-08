"use server";

import { asc, count, eq, notInArray, sql } from "drizzle-orm";
import { z } from "zod";
import { lexicon } from "@/lib/data/content";
import { categories as seedCategories, products as seedProducts } from "@/lib/data/catalog";
import { slugify } from "@/lib/slug";
import { requireAdmin } from "@/lib/server/actions/guard";
import { getDb, schema, type Db } from "@/lib/server/db";
import { invalidatePublic } from "@/lib/server/revalidate";

/**
 * Categorías (/admin/productos → Categorías). Arman los filtros del
 * catálogo, las tarjetas del home y los links del pie; el orden de acá es
 * el de la web. Regla dura: no se borra una categoría con modelos.
 */

const slugSchema = z.string().trim().min(1).max(60);

type Result = { ok: true } | { ok: false; error: string };

/** Nombre con el que nace una categoría (y del que sale su URL inicial). */
const NEW_LABEL = "Nueva categoría";

async function uniquePathSlug(db: Db, label: string, except?: string): Promise<string> {
  const base = slugify(label, 50) || "categoria";
  let candidate = base;
  for (let i = 2; ; i++) {
    const [clash] = await db
      .select({ slug: schema.categories.slug })
      .from(schema.categories)
      .where(eq(schema.categories.pathSlug, candidate));
    if (!clash || clash.slug === except) return candidate;
    candidate = `${base}-${i}`;
  }
}

/** Datos del modal de "+ Nueva categoría": nombre y grupo del menú (opcional). */
const newCategorySchema = z
  .object({
    label: z.string().trim().min(1).max(60),
    parentSlug: slugSchema.nullable(),
  })
  .partial();

export async function createCategory(input?: unknown): Promise<
  { ok: true; slug: string } | { ok: false; error: string }
> {
  await requireAdmin();
  const parsed = newCategorySchema.safeParse(input ?? {});
  if (!parsed.success) return { ok: false, error: "Poné un nombre de hasta 60 letras." };
  const label = parsed.data.label ?? NEW_LABEL;
  const db = await getDb();
  let parentSlug: string | null = null;
  if (parsed.data.parentSlug) {
    // Solo se cuelga de un grupo (raíz): la jerarquía tiene dos niveles.
    const [parent] = await db
      .select({ slug: schema.categories.slug, parentSlug: schema.categories.parentSlug })
      .from(schema.categories)
      .where(eq(schema.categories.slug, parsed.data.parentSlug));
    if (!parent || parent.parentSlug) return { ok: false, error: "Ese grupo no existe." };
    parentSlug = parent.slug;
  }
  const [{ last }] = await db
    .select({ last: sql<number>`coalesce(max(${schema.categories.order}), 0)` })
    .from(schema.categories);
  const slug = `cat${Date.now().toString(36)}`;
  await db.insert(schema.categories).values({
    slug,
    label,
    single: label.toUpperCase(),
    sub: "",
    home: true,
    imgProductId: null,
    parentSlug,
    pathSlug: await uniquePathSlug(db, label),
    order: Number(last) + 1,
  });
  invalidatePublic("catalog");
  return { ok: true, slug };
}

const patchSchema = z
  .object({
    label: z.string().trim().min(1).max(60),
    single: z.string().trim().max(60),
    sub: z.string().trim().max(80),
    home: z.boolean(),
    imgProductId: z.string().trim().max(80).nullable(),
  })
  .partial();

export async function patchCategory(slug: unknown, patch: unknown): Promise<Result> {
  await requireAdmin();
  const parsedSlug = slugSchema.safeParse(slug);
  const parsed = patchSchema.safeParse(patch);
  if (!parsedSlug.success || !parsed.success) return { ok: false, error: "Revisá los datos." };
  const db = await getDb();
  const [row] = await db
    .select()
    .from(schema.categories)
    .where(eq(schema.categories.slug, parsedSlug.data));
  if (!row) return { ok: false, error: "Categoría inexistente." };

  const set: Partial<typeof schema.categories.$inferInsert> = { ...parsed.data };
  if (parsed.data.single !== undefined) set.single = parsed.data.single.toUpperCase();
  if (parsed.data.imgProductId !== undefined) set.imgProductId = parsed.data.imgProductId || null;
  // Una categoría recién creada todavía tiene la URL de "Nueva categoría":
  // al bautizarla, la URL toma su nombre. Las que ya tenían nombre propio
  // conservan su URL (links compartidos, SEO).
  if (
    parsed.data.label !== undefined &&
    row.pathSlug.startsWith(slugify(NEW_LABEL, 50))
  ) {
    set.pathSlug = await uniquePathSlug(db, parsed.data.label, row.slug);
  }
  await db.update(schema.categories).set(set).where(eq(schema.categories.slug, row.slug));
  invalidatePublic("catalog");
  return { ok: true };
}

/** ↑/↓: intercambia el orden con la vecina. */
export async function moveCategory(slug: unknown, dir: unknown): Promise<Result> {
  await requireAdmin();
  const parsed = z
    .object({ slug: slugSchema, dir: z.union([z.literal(-1), z.literal(1)]) })
    .safeParse({ slug, dir });
  if (!parsed.success) return { ok: false, error: "Movimiento inválido." };
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.categories)
    .orderBy(asc(schema.categories.order), asc(schema.categories.slug));
  const i = rows.findIndex((r) => r.slug === parsed.data.slug);
  const j = i + parsed.data.dir;
  if (i < 0 || j < 0 || j >= rows.length) return { ok: true };
  [rows[i], rows[j]] = [rows[j], rows[i]];
  // Renumera todo: así órdenes repetidos del pasado no traban el swap.
  for (const [k, r] of rows.entries()) {
    if (r.order !== k + 1)
      await db
        .update(schema.categories)
        .set({ order: k + 1 })
        .where(eq(schema.categories.slug, r.slug));
  }
  invalidatePublic("catalog");
  return { ok: true };
}

export async function deleteCategory(slug: unknown): Promise<Result> {
  await requireAdmin();
  const parsed = slugSchema.safeParse(slug);
  if (!parsed.success) return { ok: false, error: "Categoría inválida." };
  const db = await getDb();
  const [{ n }] = await db
    .select({ n: count() })
    .from(schema.products)
    .where(eq(schema.products.category, parsed.data));
  if (n > 0) {
    return { ok: false, error: `Primero mové sus ${n} ${n === 1 ? lexicon.unit : lexicon.unitPlural} a otra categoría` };
  }
  const [{ total }] = await db.select({ total: count() }).from(schema.categories);
  if (total <= 1) return { ok: false, error: "Tiene que quedar al menos una categoría." };
  await db.delete(schema.categories).where(eq(schema.categories.slug, parsed.data));
  invalidatePublic("catalog");
  return { ok: true };
}

/**
 * "↺ Restaurar categorías originales": vuelven las del seed con sus datos.
 * Los modelos de categorías nuevas pasan a su categoría original (los del
 * seed) o a la primera (los cargados desde el admin): un producto nunca
 * queda sin categoría.
 */
export async function resetCategories(): Promise<Result> {
  await requireAdmin();
  const db = await getDb();
  for (const c of seedCategories) {
    const row = {
      slug: c.slug,
      label: c.label,
      single: c.single,
      sub: c.sub,
      home: c.home,
      imgProductId: c.imgProductId,
      pathSlug: c.pathSlug,
      order: c.order,
    };
    // Si una categoría nueva tomó el pathSlug de una original, lo libera.
    await db
      .update(schema.categories)
      .set({ pathSlug: sql`${schema.categories.slug} || '-' || ${schema.categories.pathSlug}` })
      .where(eq(schema.categories.pathSlug, c.pathSlug));
    await db
      .insert(schema.categories)
      .values(row)
      .onConflictDoUpdate({ target: schema.categories.slug, set: row });
  }
  const keep = seedCategories.map((c) => c.slug);
  const stray = await db
    .select({ id: schema.products.id })
    .from(schema.products)
    .where(notInArray(schema.products.category, keep));
  for (const p of stray) {
    const seed = seedProducts.find((s) => s.id === p.id);
    await db
      .update(schema.products)
      .set({ category: seed?.category ?? seedCategories[0].slug })
      .where(eq(schema.products.id, p.id));
  }
  await db.delete(schema.categories).where(notInArray(schema.categories.slug, keep));
  invalidatePublic("catalog");
  return { ok: true };
}
