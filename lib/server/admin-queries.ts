import { and, asc, count, desc, eq, gte, inArray, lt, ne, notInArray, sql, type SQL } from "drizzle-orm";
import { store } from "@/lib/config";
import { addDays, localToUtc, toLocalParts, weekdayOf } from "@/lib/zoned-time";
import { products as seedProducts } from "@/lib/data/catalog";
import { getDb, schema } from "@/lib/server/db";
import { getOrderByNumber, type FullOrder } from "@/lib/server/order-queries";
import { expireStaleOrdersOnce } from "@/lib/server/orders";
import { resolveImage } from "@/lib/images";
import { bySeedOrder } from "@/lib/server/queries";
import { getProductMovements } from "@/lib/server/stock";
import type { Lead, OrderStatus, Product, ProductVariant } from "@/lib/types";

/**
 * Lecturas del panel de administración: SIEMPRE frescas (sin unstable_cache)
 * — el admin corre tras auth(), así que sus páginas son dinámicas de por sí
 * y el dueño tiene que ver el estado real, no un caché.
 */

/** Variante con su stock por sucursal (también las inactivas). */
export interface AdminVariant extends ProductVariant {
  stockByLocation: Record<string, number>;
}

export interface AdminProduct extends Omit<Product, "variants"> {
  /** Todas las variantes, activas e inactivas, en orden. */
  variants: AdminVariant[];
  /** true si difiere del seed original (badge EDITADO). Nunca en los custom. */
  edited: boolean;
  /** La portada no es la del catálogo original (o es una subida, en los custom). */
  customImage: boolean;
  /** Interesados de "avisame cuando vuelva" sin notificar. */
  pendingAlerts: number;
  /** qty por sucursal (todas las sucursales, también inactivas con stock). */
  stockByLocation: Record<string, number>;
  /** Nombre visible de la marca. */
  brandName: string;
  /** Label de su categoría para la fila: "Bicicletas". */
  categoryLabel: string;
}

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export async function getAdminProducts(): Promise<AdminProduct[]> {
  const db = await getDb();
  // Una sola lectura de product_stock: de ahí salen el total por producto,
  // por variante y la matriz por sucursal (antes eran tres).
  const [rows, cats, brands, variantRows, stockRows, alerts] = await Promise.all([
    db.select().from(schema.products),
    db.select({ slug: schema.categories.slug, label: schema.categories.label }).from(schema.categories),
    db.select({ id: schema.brands.id, name: schema.brands.name }).from(schema.brands),
    db
      .select()
      .from(schema.productVariants)
      .orderBy(asc(schema.productVariants.order), asc(schema.productVariants.id)),
    db.select().from(schema.productStock),
    db
      .select({ slug: schema.stockAlerts.productSlug, n: count() })
      .from(schema.stockAlerts)
      .where(eq(schema.stockAlerts.notified, false))
      .groupBy(schema.stockAlerts.productSlug),
  ]);
  const labelOf = new Map(cats.map((c) => [c.slug, c.label]));
  const brandOf = new Map(brands.map((b) => [b.id, b.name]));
  const alertsBySlug = new Map(alerts.map((a) => [a.slug, a.n]));
  const matrix = new Map<string, Map<string, number>>();
  const variantMatrix = new Map<string, Map<string, number>>();
  const variantTotal = new Map<string, number>();
  for (const st of stockRows) {
    const perLoc = matrix.get(st.productSlug) ?? new Map<string, number>();
    perLoc.set(st.locationId, (perLoc.get(st.locationId) ?? 0) + st.qty);
    matrix.set(st.productSlug, perLoc);
    const perVar = variantMatrix.get(st.variantId) ?? new Map<string, number>();
    perVar.set(st.locationId, st.qty);
    variantMatrix.set(st.variantId, perVar);
    variantTotal.set(st.variantId, (variantTotal.get(st.variantId) ?? 0) + st.qty);
  }
  const variants = new Map<string, ProductVariant[]>();
  for (const v of variantRows) {
    const list = variants.get(v.productSlug) ?? [];
    list.push({ ...v, stock: variantTotal.get(v.id) ?? 0 });
    variants.set(v.productSlug, list);
  }
  return bySeedOrder(rows).map((r) => {
    const perLoc = matrix.get(r.slug) ?? new Map<string, number>();
    const stock = [...perLoc.values()].reduce((s, q) => s + q, 0);
    const seed = r.custom ? undefined : seedProducts.find((p) => p.id === r.id);
    const seedImages = seed?.images.map(resolveImage) ?? [];
    // EDITADO = cualquier campo del catálogo distinto del original. Las
    // cantidades no cuentan: son inventario, no edición.
    const edited =
      !!seed &&
      (seed.name !== r.name ||
        seed.brandId !== r.brandId ||
        seed.category !== r.category ||
        seed.price !== r.price ||
        (seed.oldPrice ?? null) !== (r.oldPrice ?? null) ||
        (seed.tag ?? null) !== (r.tag ?? null) ||
        seed.description !== r.description ||
        seed.hidden !== r.hidden ||
        seed.featured !== r.featured ||
        (seed.stockOverride ?? null) !== (r.stockOverride ?? null) ||
        !sameJson(seed.chips, r.chips) ||
        !sameJson(seed.specs, r.specs) ||
        !sameJson(seedImages, r.images));
    return {
      ...r,
      stock,
      edited,
      customImage: r.custom ? r.images.length > 0 : (r.images[0] ?? null) !== (seedImages[0] ?? null),
      pendingAlerts: alertsBySlug.get(r.slug) ?? 0,
      stockByLocation: Object.fromEntries(perLoc),
      variants: (variants.get(r.slug) ?? []).map((v) => ({
        ...v,
        stockByLocation: Object.fromEntries(variantMatrix.get(v.id) ?? new Map()),
      })),
      brandName: brandOf.get(r.brandId) ?? "",
      categoryLabel: labelOf.get(r.category) ?? r.category,
    };
  });
}

/** Categorías del panel, en su orden, con todos sus modelos (también ocultos). */
export async function getAdminCategories() {
  const db = await getDb();
  const [cats, counts] = await Promise.all([
    db
      .select()
      .from(schema.categories)
      .orderBy(asc(schema.categories.order), asc(schema.categories.slug)),
    db
      .select({ category: schema.products.category, n: count() })
      .from(schema.products)
      .groupBy(schema.products.category),
  ]);
  const countOf = new Map(counts.map((c) => [c.category, c.n]));
  return cats.map((c) => ({
    ...c,
    count: countOf.get(c.slug) ?? 0,
  }));
}

export type AdminCategory = Awaited<ReturnType<typeof getAdminCategories>>[number];

/** Movimientos de stock de un producto para la tab del editor. */
export async function getAdminProductMovements(productSlug: string) {
  const db = await getDb();
  const [movements, locations] = await Promise.all([
    getProductMovements(db, productSlug),
    db.select({ id: schema.locations.id, shortName: schema.locations.shortName }).from(schema.locations),
  ]);
  // Solo los pedidos de esos movimientos (no la tabla entera).
  const orderIds = [...new Set(movements.map((m) => m.orderId).filter((id): id is string => !!id))];
  const orders = orderIds.length
    ? await db
        .select({ id: schema.orders.id, number: schema.orders.number })
        .from(schema.orders)
        .where(inArray(schema.orders.id, orderIds))
    : [];
  const locName = new Map(locations.map((l) => [l.id, l.shortName]));
  const orderNumber = new Map(orders.map((o) => [o.id, o.number]));
  return movements.map((m) => ({
    id: m.id,
    createdAt: m.createdAt,
    location: locName.get(m.locationId) ?? m.locationId,
    delta: m.delta,
    qtyAfter: m.qtyAfter,
    reason: m.reason,
    orderNumber: m.orderId ? (orderNumber.get(m.orderId) ?? null) : null,
    actor: m.actor,
  }));
}

export async function getAdminSettings() {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.id, "main"));
  if (!row) throw new Error("Settings sin seed: corré `pnpm db:seed`.");
  return row;
}

/**
 * Filtros de Consultas en SQL (los mismos de
 * app/admin/(panel)/consultas/filters.ts → matchesLead).
 */
const LATE_PAYMENT = sql`(${schema.leads.type} = 'pedido' and ${schema.leads.label} ~* '^pago tard[ií]o')`;
export const LEAD_FILTER_KEYS = ["todas", "nuevas", "pago-tardio", "producto", "pedido", "otras"] as const;
export type LeadFilterKey = (typeof LEAD_FILTER_KEYS)[number];

export function leadFilterWhere(f: string): SQL | undefined {
  switch (f) {
    case "nuevas":
      return ne(schema.leads.status, "atendida");
    case "pago-tardio":
      return LATE_PAYMENT;
    case "producto":
      return eq(schema.leads.type, "producto");
    case "pedido":
      return eq(schema.leads.type, "pedido");
    case "otras":
      return notInArray(schema.leads.type, ["producto", "pedido"]);
    default:
      return undefined;
  }
}

/** Página de consultas: las primeras `limit` del filtro y los contadores de los chips (una query). */
export async function getLeads(opts: { filter: string; limit: number }): Promise<{
  leads: Lead[];
  hasMore: boolean;
  counts: Record<LeadFilterKey, number>;
}> {
  const db = await getDb();
  const n = (f: LeadFilterKey) => sql<number>`count(*) filter (where ${leadFilterWhere(f)})`.mapWith(Number);
  const [rows, [counts]] = await Promise.all([
    db
      .select()
      .from(schema.leads)
      .where(leadFilterWhere(opts.filter))
      .orderBy(desc(schema.leads.ts), desc(schema.leads.id))
      .limit(opts.limit + 1),
    db
      .select({
        todas: count(),
        nuevas: n("nuevas"),
        "pago-tardio": n("pago-tardio"),
        producto: n("producto"),
        pedido: n("pedido"),
        otras: n("otras"),
      })
      .from(schema.leads),
  ]);
  return { leads: rows.slice(0, opts.limit), hasMore: rows.length > opts.limit, counts };
}

/** Suscriptores de la newsletter, más recientes primero. */
export async function getNewsletterSubscribers() {
  const db = await getDb();
  return db
    .select()
    .from(schema.newsletterSubscribers)
    .orderBy(desc(schema.newsletterSubscribers.createdAt));
}

/** Lunes y lunes siguiente (fechas locales) de la semana de hoy. */
export function currentWeek(now = new Date()): { from: string; to: string } {
  const today = toLocalParts(now, store.timeZone).date;
  const wd = weekdayOf(today); // 0 = domingo
  const from = addDays(today, wd === 0 ? -6 : 1 - wd);
  return { from, to: addDays(from, 7) };
}

/**
 * Contadores de los badges de la navegación del panel, en UNA query:
 * Pedidos = para accionar · Turnos = activos de la semana · Presupuestos =
 * nuevos · Productos = total · Consultas = sin atender.
 */
export async function getAdminNavCounts() {
  const db = await getDb();
  // Semana en curso (lunes a lunes) en la zona del local: el server corre en UTC.
  const { from, to } = currentWeek();
  const weekStart = localToUtc(from, "00:00", store.timeZone);
  const weekEnd = localToUtc(to, "00:00", store.timeZone);
  const sub = (q: SQL) => sql<number>`(${q})`.mapWith(Number);
  const [row] = await db
    .select({
      products: count(),
      ordersToAct: sub(
        sql`select count(*) from ${schema.orders} where ${inArray(schema.orders.status, ACTIONABLE_ORDER_STATUSES)}`,
      ),
      leads: sub(sql`select count(*) from ${schema.leads} where ${ne(schema.leads.status, "atendida")}`),
      quotesNew: sub(sql`select count(*) from ${schema.quoteRequests} where ${eq(schema.quoteRequests.status, "nuevo")}`),
      appointmentsWeek: sub(
        sql`select count(*) from ${schema.appointments} where ${and(
          inArray(schema.appointments.status, ["pendiente", "confirmado"]),
          gte(schema.appointments.startsAt, weekStart),
          lt(schema.appointments.startsAt, weekEnd),
        )}`,
      ),
    })
    .from(schema.products);
  return {
    /** Pedidos para accionar: cobrar, armar o entregar (incluye listos). */
    ordersToAct: row?.ordersToAct ?? 0,
    /** Turnos activos (sin confirmar + confirmados) de la semana en curso. */
    appointmentsWeek: row?.appointmentsWeek ?? 0,
    /** Presupuestos nuevos (sin cotizar). */
    quotesNew: row?.quotesNew ?? 0,
    products: row?.products ?? 0,
    /** Consultas sin atender. */
    leads: row?.leads ?? 0,
  };
}

export type AdminNavCounts = Awaited<ReturnType<typeof getAdminNavCounts>>;

/** Pedidos abiertos que piden una acción del mostrador (Sidebar → Pedidos). */
export const ACTIONABLE_ORDER_STATUSES: OrderStatus[] = [
  "PENDIENTE_PAGO",
  "SEÑADO",
  "PAGADO",
  "EN_PREPARACION",
  "LISTO_RETIRO",
];

/* ── Pedidos ──────────────────────────────────────────────── */

export async function getAdminOrder(number: string): Promise<FullOrder | null> {
  await expireStaleOrdersOnce();
  return getOrderByNumber(number);
}

export interface AdminCustomer {
  id: string;
  name: string;
  email: string | null;
  /** Normalizado (lib/phone.ts). */
  phone: string;
  /** Tiene cuenta creada. */
  hasAccount: boolean;
  ordersCount: number;
  appointmentsCount: number;
  quotesCount: number;
  totalSpent: number;
  /** Último pedido, turno o presupuesto. */
  lastContactAt: Date | null;
  createdAt: Date;
}

/**
 * Clientes (CRM, uno por WhatsApp) con sus números: pedidos, turnos,
 * presupuestos, gastado y último contacto (prototipo 3e).
 */
export async function getAdminCustomers(): Promise<AdminCustomer[]> {
  const db = await getDb();
  // Agregados por cliente en SQL (GROUP BY), no todas las filas.
  const [customers, orders, appts, quotes] = await Promise.all([
    db.select().from(schema.customers),
    db
      .select({
        customerId: schema.orders.customerId,
        n: count(),
        spent: sql<number>`coalesce(sum(${schema.orders.paidAmount}) filter (where ${notInArray(schema.orders.status, ["CANCELADO", "VENCIDO"])}), 0)`.mapWith(Number),
        last: sql<Date>`max(${schema.orders.createdAt})`.mapWith(schema.orders.createdAt),
      })
      .from(schema.orders)
      .groupBy(schema.orders.customerId),
    db
      .select({
        customerId: schema.appointments.customerId,
        n: count(),
        last: sql<Date>`max(${schema.appointments.createdAt})`.mapWith(schema.appointments.createdAt),
      })
      .from(schema.appointments)
      .groupBy(schema.appointments.customerId),
    db
      .select({
        customerId: schema.quoteRequests.customerId,
        n: count(),
        last: sql<Date>`max(${schema.quoteRequests.createdAt})`.mapWith(schema.quoteRequests.createdAt),
      })
      .from(schema.quoteRequests)
      .groupBy(schema.quoteRequests.customerId),
  ]);
  const oBy = new Map(orders.map((o) => [o.customerId, o]));
  const aBy = new Map(appts.map((a) => [a.customerId, a]));
  const qBy = new Map(quotes.map((q) => [q.customerId, q]));
  const latest = (...dates: (Date | null | undefined)[]) =>
    dates.reduce<Date | null>((m, d) => (d && (!m || d > m) ? d : m), null);
  return customers
    .map((c) => {
      const o = oBy.get(c.id);
      const a = aBy.get(c.id);
      const q = qBy.get(c.id);
      return {
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        hasAccount: !!c.accountId,
        ordersCount: o?.n ?? 0,
        appointmentsCount: a?.n ?? 0,
        quotesCount: q?.n ?? 0,
        totalSpent: o?.spent ?? 0,
        lastContactAt: latest(o?.last, a?.last, q?.last),
        createdAt: c.createdAt,
      };
    })
    .sort(
      (a, b) =>
        (b.lastContactAt?.getTime() ?? 0) - (a.lastContactAt?.getTime() ?? 0) ||
        b.totalSpent - a.totalSpent,
    );
}
