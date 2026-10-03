import { and, count, gte, inArray, lt } from "drizzle-orm";
import { store } from "@/lib/config";
import { getAdminProducts } from "@/lib/server/admin-queries";
import { getDb, schema } from "@/lib/server/db";
import { addDays, localToUtc, toLocalParts, weekdayOf } from "@/lib/zoned-time";

/**
 * Lecturas de las pantallas del admin del agente D2 (ola 1): navegación,
 * productos (3c/3d), clientes (3e), consultas y ajustes (3f). Solo
 * lecturas; las escrituras nuevas están en `admin-d2-actions.ts` (server
 * actions con el guard del admin).
 */

/** Lunes y lunes siguiente (fechas locales) de la semana de hoy. */
export function currentWeek(now = new Date()): { from: string; to: string } {
  const today = toLocalParts(now, store.timeZone).date;
  const wd = weekdayOf(today); // 0 = domingo
  const from = addDays(today, wd === 0 ? -6 : 1 - wd);
  return { from, to: addDays(from, 7) };
}

/**
 * Turnos activos (sin confirmar + confirmados) de la semana en curso: el
 * contador "Turnos 14" del sidebar es el de la semana, como la agenda 3b.
 */
export async function appointmentsThisWeek(): Promise<number> {
  const db = await getDb();
  const { from, to } = currentWeek();
  const [row] = await db
    .select({ n: count() })
    .from(schema.appointments)
    .where(
      and(
        inArray(schema.appointments.status, ["pendiente", "confirmado"]),
        gte(schema.appointments.startsAt, localToUtc(from, "00:00", store.timeZone)),
        lt(schema.appointments.startsAt, localToUtc(to, "00:00", store.timeZone)),
      ),
    );
  return row?.n ?? 0;
}

/* ── Productos (3c) ───────────────────────────────────────── */

export type ProductRowStatus = "publicado" | "sin_stock" | "borrador";

export interface ProductListRow {
  id: string;
  slug: string;
  name: string;
  sku: string | null;
  categoryLabel: string;
  /** Grupo del nav (bicicletas, accesorios, repuestos, importados). */
  group: string | null;
  price: number | null;
  image: string | null;
  /** "S 1 · M 3 · L 2 · XL 0" / "Único 3" / "Unidades 12". */
  stockLabel: string;
  stock: number;
  testRide: boolean;
  status: ProductRowStatus;
}

/** Grupo raíz de una categoría (sube por parentSlug). */
export function rootGroup(
  slug: string,
  bySlug: Map<string, { slug: string; parentSlug: string | null }>,
): string | null {
  let c = bySlug.get(slug);
  for (let i = 0; c?.parentSlug && i < 10; i++) c = bySlug.get(c.parentSlug);
  return c?.slug ?? null;
}

/** Texto de stock de la fila (3c): por talle, o "Único"/"Unidades" sin talles. */
export function stockLabelOf(
  variants: { size: string; color: string; stock: number; active: boolean }[],
  group: string | null,
): string {
  const active = variants.filter((v) => v.active);
  // Sin talles reales (solo "Único", con o sin color) = unidades.
  const sized = active.filter((v) => v.size !== "Único");
  if (!sized.length) {
    const n = active.reduce((s, v) => s + v.stock, 0);
    return `${group === "bicicletas" ? "Único" : "Unidades"} ${n}`;
  }
  const bySize = new Map<string, number>();
  for (const v of sized) bySize.set(v.size, (bySize.get(v.size) ?? 0) + v.stock);
  return [...bySize].map(([s, n]) => `${s} ${n}`).join(" · ");
}

/** Estado de la fila: Borrador > Sin stock > Publicado (adminStatus del prototipo). */
export function rowStatus(p: { status: string; hidden: boolean; stock: number; stockOverride: string | null }): ProductRowStatus {
  if (p.status === "borrador" || p.hidden) return "borrador";
  if (p.stock <= 0 || p.stockOverride === "sin_stock") return "sin_stock";
  return "publicado";
}

export interface ProductListData {
  rows: ProductListRow[];
  total: number;
  groups: { slug: string; label: string; count: number }[];
  outOfStock: number;
}

/** Listado de 3c con búsqueda (nombre o SKU, también de variantes) y filtro. */
export async function getProductList(opts: { q?: string; filter?: string } = {}): Promise<ProductListData> {
  const db = await getDb();
  const [products, cats] = await Promise.all([getAdminProducts(), db.select().from(schema.categories)]);
  const bySlug = new Map(cats.map((c) => [c.slug, c]));
  const all: ProductListRow[] = products.map((p) => {
    const group = rootGroup(p.category, bySlug);
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      sku: p.sku ?? null,
      categoryLabel: p.categoryLabel,
      group,
      price: p.price,
      image: p.images[0] ?? null,
      stockLabel: stockLabelOf(p.variants, group),
      stock: p.stock,
      testRide: p.testRide,
      status: rowStatus({ status: p.status, hidden: p.hidden, stock: p.stock, stockOverride: p.stockOverride ?? null }),
    };
  });
  const skusOf = new Map(products.map((p) => [p.id, p.variants.map((v) => v.sku.toLowerCase())]));

  const groups = cats
    .filter((c) => !c.parentSlug)
    .sort((a, b) => a.order - b.order)
    .map((c) => ({ slug: c.slug, label: c.label, count: all.filter((r) => r.group === c.slug).length }));

  const q = opts.q?.trim().toLowerCase();
  let rows = all;
  if (opts.filter === "sin-stock") rows = rows.filter((r) => r.stock <= 0);
  else if (opts.filter) rows = rows.filter((r) => r.group === opts.filter);
  if (q)
    rows = rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.sku ?? "").toLowerCase().includes(q) ||
        (skusOf.get(r.id) ?? []).some((s) => s.includes(q)),
    );
  return { rows, total: all.length, groups, outOfStock: all.filter((r) => r.stock <= 0).length };
}

/* ── Editar producto (3d) ─────────────────────────────────── */

export interface EditorVariant {
  id: string;
  size: string;
  color: string;
  heightRange: string;
  sku: string;
  stock: number;
}

export interface ProductEditorData {
  id: string;
  slug: string;
  name: string;
  category: string;
  categoryLabel: string;
  /** "" = marca placeholder ("[Marca a confirmar]"). */
  brandName: string;
  tag: string;
  description: string;
  price: number | null;
  images: string[];
  status: "publicado" | "borrador";
  featured: boolean;
  testRide: boolean;
  hideWhenOut: boolean;
  /** Se puede eliminar (creado desde el admin). */
  custom: boolean;
  /** Variantes activas (la "Único" sin color incluida si es la única). */
  variants: EditorVariant[];
  categories: { slug: string; label: string; group: string | null }[];
  transferDiscount: number;
  maxInstallments: number;
}

export async function getProductEditor(id: string): Promise<ProductEditorData | null> {
  const db = await getDb();
  const [products, cats, settingsRows] = await Promise.all([
    getAdminProducts(),
    db.select().from(schema.categories),
    db.select().from(schema.settings),
  ]);
  const p = products.find((x) => x.id === id);
  if (!p) return null;
  const s = settingsRows[0];
  const groups = cats.filter((c) => !c.parentSlug).sort((a, b) => a.order - b.order);
  // Select de categoría: cada grupo y sus tipos, en orden del menú.
  const categories = groups.flatMap((g) => [
    { slug: g.slug, label: g.label, group: null as string | null },
    ...cats
      .filter((c) => c.parentSlug === g.slug)
      .sort((a, b) => a.order - b.order)
      .map((c) => ({ slug: c.slug, label: c.label, group: g.label })),
  ]);
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    category: p.category,
    categoryLabel: p.categoryLabel,
    brandName: p.brandId === "sin-marca" ? "" : p.brandName,
    tag: p.tag ?? "",
    description: p.description ?? "",
    price: p.price,
    images: p.images,
    status: p.status === "borrador" ? "borrador" : "publicado",
    featured: p.featured,
    testRide: p.testRide,
    hideWhenOut: p.hideWhenOut,
    custom: p.custom,
    variants: p.variants
      .filter((v) => v.active)
      .map((v) => ({
        id: v.id,
        size: v.size,
        color: v.color,
        heightRange: v.heightRange ?? "",
        sku: v.sku,
        stock: v.stock,
      })),
    categories,
    transferDiscount: s?.transferDiscount ?? 10,
    maxInstallments: s?.maxInstallments ?? 6,
  };
}
