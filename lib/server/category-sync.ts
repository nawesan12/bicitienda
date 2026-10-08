import { eq, inArray } from "drizzle-orm";
import { categories as targets } from "@/lib/data/catalog";
import { LEGACY_CATEGORIES } from "@/lib/data/demo/categories";
import { slugify } from "@/lib/slug";
import type { Db } from "@/lib/server/db";
import * as schema from "@/lib/server/db/schema";

/**
 * Deja las categorías de la base como las del catálogo (lib/data/catalog.ts)
 * sin perder productos. La usan el seed y `pnpm db:categorias` (producción).
 *
 *  - Las categorías del catálogo se crean o se actualizan (nombre, grupo,
 *    orden, URL, si van en el home). La foto y el subtítulo que haya
 *    elegido el admin se respetan.
 *  - Las viejas (`LEGACY_CATEGORIES`: MTB, Cascos…) pasan sus productos a la
 *    nueva y se borran.
 *  - Una categoría creada a mano con el mismo nombre o la misma URL que una
 *    del catálogo ("Cubiertas") se fusiona: sus productos pasan a la del
 *    catálogo y se borra.
 *  - Un producto que quedó en un grupo con tipos (Bicicletas) pasa al
 *    primer tipo de ese grupo (Bicicletas Nuevas): los grupos no llevan
 *    productos.
 *  - Las demás categorías creadas a mano quedan como están.
 *
 * Idempotente. Con `apply: false` solo calcula el plan.
 */

export interface CategorySyncPlan {
  created: string[];
  updated: string[];
  /** slug → slug de destino (viejas y duplicadas), que después se borran. */
  removed: { slug: string; label: string; into: string }[];
  moved: { product: string; from: string; to: string }[];
  /** Creadas a mano que no se tocan. */
  kept: string[];
  /** Nombre de cada categoría del catálogo, por slug (para mostrar el plan). */
  labels: Record<string, string>;
  /**
   * La base todavía tiene la estructura vieja (quedan categorías de
   * `LEGACY_CATEGORIES` o nunca se crearon las nuevas). Es lo que muestra el
   * aviso del admin: renombrar o borrar una categoría después no lo vuelve
   * a mostrar.
   */
  outdated: boolean;
}

const norm = (s: string) => slugify(s);

export async function syncCategories(db: Db, opts: { apply: boolean }): Promise<CategorySyncPlan> {
  const current = await db.select().from(schema.categories);
  const products = await db
    .select({ id: schema.products.id, category: schema.products.category })
    .from(schema.products);

  const targetSlugs = new Set(targets.map((t) => t.slug));
  const bySlug = new Map(current.map((c) => [c.slug, c]));

  // Grupo con tipos → su primer tipo (destino de los productos sueltos en el grupo).
  const firstLeaf = new Map<string, string>();
  for (const t of [...targets].sort((a, b) => a.order - b.order))
    if (t.parentSlug && !firstLeaf.has(t.parentSlug)) firstLeaf.set(t.parentSlug, t.slug);
  const leafOf = (slug: string) => firstLeaf.get(slug) ?? slug;

  // Viejas y duplicadas de una del catálogo: a dónde van sus productos.
  const removed: CategorySyncPlan["removed"] = [];
  for (const c of current) {
    if (targetSlugs.has(c.slug)) continue;
    let into: string | undefined = LEGACY_CATEGORIES[c.slug];
    if (!into) {
      const twin = targets.find((t) => t.pathSlug === c.pathSlug || norm(t.label) === norm(c.label));
      into = twin?.slug;
    }
    if (into) removed.push({ slug: c.slug, label: c.label, into: leafOf(into) });
  }
  const removedSlugs = new Set(removed.map((r) => r.slug));
  const kept = current.filter((c) => !targetSlugs.has(c.slug) && !removedSlugs.has(c.slug)).map((c) => c.label);

  const destination = (category: string): string | null => {
    const r = removed.find((x) => x.slug === category);
    if (r) return r.into;
    if (firstLeaf.has(category)) return firstLeaf.get(category)!;
    return null;
  };
  const moved: CategorySyncPlan["moved"] = [];
  for (const p of products) {
    const to = destination(p.category);
    if (to && to !== p.category) moved.push({ product: p.id, from: p.category, to });
  }

  const labelOf = (slug: string) => targets.find((t) => t.slug === slug)?.label ?? slug;
  const describe = (t: (typeof targets)[number]) =>
    t.parentSlug ? `${t.label} (en ${labelOf(t.parentSlug)})` : `${t.label} (grupo del menú)`;
  const created = targets.filter((t) => !bySlug.has(t.slug)).map(describe);
  const updated = targets
    .filter((t) => {
      const c = bySlug.get(t.slug);
      return (
        c &&
        (c.label !== t.label ||
          c.parentSlug !== (t.parentSlug ?? null) ||
          c.order !== t.order ||
          c.pathSlug !== t.pathSlug ||
          c.home !== t.home)
      );
    })
    .map(describe);

  const labels = Object.fromEntries(targets.map((t) => [t.slug, t.label]));
  const newLeaves = targets.filter((t) => t.parentSlug);
  const outdated =
    current.some((c) => c.slug in LEGACY_CATEGORIES) || !newLeaves.some((t) => bySlug.has(t.slug));
  const plan = { created, updated, removed, moved, kept, labels, outdated };
  if (!opts.apply) return plan;

  // 1. Las URLs del catálogo tienen que estar libres: la que las ocupe
  //    (vieja, duplicada o creada a mano) pasa a una URL con su slug.
  const targetPaths = new Map(targets.map((t) => [t.pathSlug, t.slug]));
  for (const c of current) {
    const owner = targetPaths.get(c.pathSlug);
    if (owner && owner !== c.slug)
      await db
        .update(schema.categories)
        .set({ pathSlug: `${c.pathSlug}-${c.slug}` })
        .where(eq(schema.categories.slug, c.slug));
  }

  // 2. Categorías del catálogo: raíces primero (los tipos referencian al grupo).
  const sorted = [...targets].sort((a, b) => Number(!!a.parentSlug) - Number(!!b.parentSlug));
  for (const t of sorted) {
    const base = {
      label: t.label,
      single: t.single,
      home: t.home,
      pathSlug: t.pathSlug,
      order: t.order,
      parentSlug: t.parentSlug ?? null,
    };
    if (bySlug.has(t.slug)) {
      await db.update(schema.categories).set(base).where(eq(schema.categories.slug, t.slug));
    } else {
      await db.insert(schema.categories).values({ slug: t.slug, sub: t.sub, imgProductId: t.imgProductId, ...base });
    }
  }

  // 3. Productos a su categoría nueva.
  for (const m of moved)
    await db.update(schema.products).set({ category: m.to }).where(eq(schema.products.id, m.product));

  // 4. Fuera las viejas y duplicadas (sus hijas quedan sin grupo).
  if (removedSlugs.size) {
    const gone = [...removedSlugs];
    await db
      .update(schema.categories)
      .set({ parentSlug: null })
      .where(inArray(schema.categories.parentSlug, gone));
    await db.delete(schema.categories).where(inArray(schema.categories.slug, gone));
  }
  return plan;
}
