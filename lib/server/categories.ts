import { eq, sql } from "drizzle-orm";
import { slugify } from "@/lib/slug";
import { schema, type Db } from "@/lib/server/db";

/** URL libre para una categoría (`except`: la propia, al renombrarla). */
export async function uniquePathSlug(db: Db, label: string, except?: string): Promise<string> {
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

/**
 * Inserta una categoría al final del orden, con su URL sacada del nombre.
 * La usan el alta del admin y la importación de planilla (categorías que
 * la planilla nombra y todavía no existen). Sin validar ni invalidar caché.
 */
export async function insertCategory(
  db: Db,
  label: string,
  parentSlug: string | null = null,
): Promise<{ slug: string; label: string }> {
  const [{ last }] = await db
    .select({ last: sql<number>`coalesce(max(${schema.categories.order}), 0)` })
    .from(schema.categories);
  const slug = `cat${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
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
  return { slug, label };
}
