"use server";

import { eq, notInArray, sql } from "drizzle-orm";
import { z } from "zod";
import { articles as seedArticles } from "@/lib/data/content";
import { slugify } from "@/lib/slug";
import { requireAdmin } from "@/lib/server/actions/guard";
import { getDb, schema, type Db } from "@/lib/server/db";
import { invalidatePublic } from "@/lib/server/revalidate";

/**
 * Novedades (/admin/novedades). "+ Nueva nota" la crea al instante (como
 * el prototipo) y el modal la guarda campo a campo.
 */

const idSchema = z.string().trim().min(1).max(80);

type Result = { ok: true } | { ok: false; error: string };

/** Título con el que nace una nota (y del que sale su URL inicial). */
const NEW_TITLE = "Nueva nota";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

async function uniqueSlug(db: Db, title: string, except?: string): Promise<string> {
  const base = slugify(title) || `nota-${Date.now()}`;
  let slug = base;
  for (let i = 2; ; i++) {
    const [clash] = await db
      .select({ id: schema.articles.id })
      .from(schema.articles)
      .where(eq(schema.articles.slug, slug));
    if (!clash || clash.id === except) return slug;
    slug = `${base}-${i}`;
  }
}

export async function createArticle(): Promise<
  { ok: true; id: string } | { ok: false; error: string }
> {
  await requireAdmin();
  const db = await getDb();
  const slug = await uniqueSlug(db, NEW_TITLE);
  const now = new Date();
  // Las notas nuevas van arriba de todo (menor `order` primero).
  const [{ first }] = await db
    .select({ first: sql<number>`coalesce(min(${schema.articles.order}), 1)` })
    .from(schema.articles);
  await db.insert(schema.articles).values({
    id: slug,
    slug,
    tag: "NOVEDADES",
    date: `${MESES[now.getMonth()]} ${now.getFullYear()}`,
    readMinutes: 2,
    title: NEW_TITLE,
    excerpt: "",
    paras: [],
    ctaTitle: "¿Te quedó alguna duda?",
    ctaLabel: "Consultanos",
    ctaKind: "wa",
    ctaMsg: "Hola!",
    published: true,
    order: Number(first) - 1,
  });
  invalidatePublic("content");
  return { ok: true, id: slug };
}

const patchSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    tag: z.string().trim().max(30),
    date: z.string().trim().max(30),
    /** "4 min" o "4": se guardan los minutos. */
    read: z.string().max(20),
    excerpt: z.string().trim().max(400),
    paras: z.array(z.string().max(4000)).max(60),
    ctaTitle: z.string().trim().max(120),
    ctaLabel: z.string().trim().max(60),
    ctaMsg: z.string().trim().max(500),
  })
  .partial();

export async function patchArticle(id: unknown, patch: unknown): Promise<Result> {
  await requireAdmin();
  const parsedId = idSchema.safeParse(id);
  const parsed = patchSchema.safeParse(patch);
  if (!parsedId.success || !parsed.success) return { ok: false, error: "Revisá los datos." };
  const db = await getDb();
  const [row] = await db
    .select()
    .from(schema.articles)
    .where(eq(schema.articles.id, parsedId.data));
  if (!row) return { ok: false, error: "Nota inexistente." };

  const { read, paras, ctaMsg, tag, ...rest } = parsed.data;
  const set: Partial<typeof schema.articles.$inferInsert> = { ...rest };
  if (tag !== undefined) set.tag = tag.toUpperCase() || "NOTA";
  if (read !== undefined) {
    const n = parseInt(read.replace(/[^\d]/g, ""), 10);
    if (n > 0) set.readMinutes = Math.min(120, n);
  }
  if (paras !== undefined) set.paras = paras.map((p) => p.trim()).filter(Boolean);
  // Editar el mensaje la vuelve una nota con cierre a WhatsApp.
  if (ctaMsg !== undefined) {
    set.ctaMsg = ctaMsg;
    set.ctaKind = "wa";
  }
  // Una nota recién creada tiene la URL de "Nueva nota": al titularla, la
  // URL toma su título. Las publicadas con título propio conservan la suya.
  if (rest.title !== undefined && row.slug.startsWith(slugify(NEW_TITLE))) {
    set.slug = await uniqueSlug(db, rest.title, row.id);
  }
  await db.update(schema.articles).set(set).where(eq(schema.articles.id, row.id));
  invalidatePublic("content");
  return { ok: true };
}

export async function deleteArticle(id: unknown): Promise<Result> {
  await requireAdmin();
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: "Nota inválida." };
  const db = await getDb();
  await db.delete(schema.articles).where(eq(schema.articles.id, parsedId.data));
  invalidatePublic("content");
  return { ok: true };
}

/** "↺ Restaurar originales": vuelven las notas del seed, sin las nuevas. */
export async function resetArticles(): Promise<Result> {
  await requireAdmin();
  const db = await getDb();
  await db
    .delete(schema.articles)
    .where(notInArray(schema.articles.id, seedArticles.map((a) => a.id)));
  for (const a of seedArticles) {
    const row = {
      id: a.id,
      slug: a.slug,
      tag: a.tag,
      date: a.date,
      readMinutes: a.readMinutes,
      title: a.title,
      excerpt: a.excerpt,
      paras: a.paras,
      ctaTitle: a.ctaTitle,
      ctaLabel: a.ctaLabel,
      ctaKind: a.ctaKind,
      ctaMsg: a.ctaMsg,
      published: a.published,
      order: a.order,
    };
    await db
      .insert(schema.articles)
      .values(row)
      .onConflictDoUpdate({ target: schema.articles.id, set: row });
  }
  invalidatePublic("content");
  return { ok: true };
}
