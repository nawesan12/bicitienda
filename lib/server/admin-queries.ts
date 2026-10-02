import { asc, count, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { products as seedProducts } from "@/lib/data/catalog";
import { getDb, schema } from "@/lib/server/db";
import {
  getOrderById,
  type FullOrder,
} from "@/lib/server/order-queries";
import { expireStaleOrders } from "@/lib/server/orders";
import { resolveImage } from "@/lib/images";
import { bySeedOrder, withContentDefaults } from "@/lib/server/queries";
import {
  getProductMovements,
  getStockMatrix,
  getVariantStockMatrix,
} from "@/lib/server/stock";
import { getVariantsBySlug } from "@/lib/server/variants";
import type {
  AgendaEvent,
  Article,
  Lead,
  OrderStatus,
  Product,
  ProductVariant,
  StoreLocation,
} from "@/lib/types";

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
  const [rows, matrix, cats, brands, variants, variantMatrix] = await Promise.all([
    db.select().from(schema.products),
    getStockMatrix(db),
    db.select().from(schema.categories),
    db.select().from(schema.brands),
    getVariantsBySlug(db),
    getVariantStockMatrix(db),
  ]);
  const labelOf = new Map(cats.map((c) => [c.slug, c.label]));
  const brandOf = new Map(brands.map((b) => [b.id, b.name]));
  const alerts = await db
    .select({ slug: schema.stockAlerts.productSlug, n: count() })
    .from(schema.stockAlerts)
    .where(eq(schema.stockAlerts.notified, false))
    .groupBy(schema.stockAlerts.productSlug);
  const alertsBySlug = new Map(alerts.map((a) => [a.slug, a.n]));
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
  const [cats, prods] = await Promise.all([
    db
      .select()
      .from(schema.categories)
      .orderBy(asc(schema.categories.order), asc(schema.categories.slug)),
    db
      .select({ id: schema.products.id, category: schema.products.category })
      .from(schema.products),
  ]);
  return cats.map((c) => ({
    ...c,
    count: prods.filter((p) => p.category === c.slug).length,
  }));
}

export type AdminCategory = Awaited<ReturnType<typeof getAdminCategories>>[number];

/* ── Sucursales ───────────────────────────────────────────── */

export interface AdminLocation extends StoreLocation {
  order: number;
  active: boolean;
  /** Unidades totales en la sucursal. */
  totalUnits: number;
  /** Productos con al menos una unidad acá. */
  productsWithStock: number;
  /** Pedidos que retiran o despachan desde acá. */
  ordersCount: number;
}

/** Todas las sucursales (también inactivas), con sus números. */
export async function getAdminLocations(): Promise<AdminLocation[]> {
  const db = await getDb();
  const [rows, stockRows, orderRows] = await Promise.all([
    db
      .select()
      .from(schema.locations)
      .orderBy(asc(schema.locations.order), asc(schema.locations.id)),
    db
      .select({
        locationId: schema.productStock.locationId,
        units: sql<number>`sum(${schema.productStock.qty})`.mapWith(Number),
        prods: sql<number>`count(*) filter (where ${schema.productStock.qty} > 0)`.mapWith(Number),
      })
      .from(schema.productStock)
      .groupBy(schema.productStock.locationId),
    db
      .select({
        pickup: schema.orders.pickupLocationId,
        fulfillment: schema.orders.fulfillmentLocationId,
      })
      .from(schema.orders),
  ]);
  const stockBy = new Map(stockRows.map((s) => [s.locationId, s]));
  const ordersBy = new Map<string, number>();
  for (const o of orderRows) {
    for (const id of [o.pickup, o.fulfillment]) {
      if (id) ordersBy.set(id, (ordersBy.get(id) ?? 0) + 1);
    }
  }
  return rows.map((l) => ({
    ...l,
    totalUnits: stockBy.get(l.id)?.units ?? 0,
    productsWithStock: stockBy.get(l.id)?.prods ?? 0,
    ordersCount: ordersBy.get(l.id) ?? 0,
  }));
}

/** Movimientos de stock de un producto para la tab del editor. */
export async function getAdminProductMovements(productSlug: string) {
  const db = await getDb();
  const [movements, locations, orders] = await Promise.all([
    getProductMovements(db, productSlug),
    db.select().from(schema.locations),
    db
      .select({ id: schema.orders.id, number: schema.orders.number })
      .from(schema.orders),
  ]);
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

export async function getAdminArticles(): Promise<Article[]> {
  const db = await getDb();
  return db
    .select()
    .from(schema.articles)
    .orderBy(asc(schema.articles.order), asc(schema.articles.id));
}

export async function getAdminAgenda(): Promise<AgendaEvent[]> {
  const db = await getDb();
  return db
    .select()
    .from(schema.agendaEvents)
    .orderBy(asc(schema.agendaEvents.date));
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

/** Consultas (leads), más recientes primero. */
export async function getLeads(): Promise<Lead[]> {
  const db = await getDb();
  return db.select().from(schema.leads).orderBy(desc(schema.leads.ts));
}

/** Suscriptores de la newsletter, más recientes primero. */
export async function getNewsletterSubscribers() {
  const db = await getDb();
  return db
    .select()
    .from(schema.newsletterSubscribers)
    .orderBy(desc(schema.newsletterSubscribers.createdAt));
}

/** Estados que cuentan como "pedido activo" (badge y métrica). */
export const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  "PENDIENTE_PAGO",
  "SEÑADO",
  "PAGADO",
  "EN_PREPARACION",
  "LISTO_RETIRO",
  "ENVIADO",
  "ENTREGA_COORDINADA",
];

/** Números del Resumen: las 8 métricas del prototipo y la newsletter. */
export async function getAdminStats() {
  const db = await getDb();
  const [products, articles, agenda, newLeads, subscribers, lastSub] =
    await Promise.all([
      db
        .select({ hidden: schema.products.hidden, price: schema.products.price })
        .from(schema.products),
      db.select({ n: count() }).from(schema.articles),
      db.select({ n: count() }).from(schema.agendaEvents),
      db
        .select({ n: count() })
        .from(schema.leads)
        .where(ne(schema.leads.status, "atendida")),
      db.select({ n: count() }).from(schema.newsletterSubscribers),
      db
        .select({ email: schema.newsletterSubscribers.email })
        .from(schema.newsletterSubscribers)
        .orderBy(desc(schema.newsletterSubscribers.createdAt))
        .limit(1),
    ]);
  const hidden = products.filter((p) => p.hidden).length;
  return {
    products: products.length,
    published: products.length - hidden,
    hidden,
    noPrice: products.filter((p) => p.price == null).length,
    articles: articles[0]?.n ?? 0,
    agenda: agenda[0]?.n ?? 0,
    newLeads: newLeads[0]?.n ?? 0,
    subscribers: subscribers[0]?.n ?? 0,
    lastSubscriber: lastSub[0]?.email ?? null,
  };
}

/** Contadores para los badges de la navegación del panel. */
export async function getAdminNavCounts() {
  const db = await getDb();
  const [prod, art, ag, ord, leads] = await Promise.all([
    db.select({ n: count() }).from(schema.products),
    db.select({ n: count() }).from(schema.articles),
    db.select({ n: count() }).from(schema.agendaEvents),
    db
      .select({ n: count() })
      .from(schema.orders)
      .where(inArray(schema.orders.status, PENDING_ORDER_STATUSES)),
    db
      .select({ n: count() })
      .from(schema.leads)
      .where(ne(schema.leads.status, "atendida")),
  ]);
  return {
    products: prod[0]?.n ?? 0,
    articles: art[0]?.n ?? 0,
    agenda: ag[0]?.n ?? 0,
    orders: ord[0]?.n ?? 0,
    leads: leads[0]?.n ?? 0,
  };
}

/**
 * Pedidos que esperan una acción del local: cobrar, saldar la seña,
 * preparar o despachar. Es el contador de Pedidos en la navegación.
 */
export const PENDING_ORDER_STATUSES: OrderStatus[] = [
  "PENDIENTE_PAGO",
  "SEÑADO",
  "PAGADO",
  "EN_PREPARACION",
];

/* ── Stock ────────────────────────────────────────────────── */

export interface LedgerEntry {
  id: number;
  createdAt: Date;
  productName: string;
  productId: string | null;
  location: string;
  delta: number;
  qtyAfter: number;
  reason: string;
  orderNumber: string | null;
}

/** Libro de movimientos (los últimos `limit`, más recientes primero). */
export async function getStockLedger(limit = 80): Promise<LedgerEntry[]> {
  const db = await getDb();
  const [movements, products, locations, orders] = await Promise.all([
    db
      .select()
      .from(schema.stockMovements)
      .orderBy(desc(schema.stockMovements.createdAt), desc(schema.stockMovements.id))
      .limit(limit),
    db
      .select({ id: schema.products.id, slug: schema.products.slug, name: schema.products.name })
      .from(schema.products),
    db.select().from(schema.locations),
    db.select({ id: schema.orders.id, number: schema.orders.number }).from(schema.orders),
  ]);
  const prodBySlug = new Map(products.map((p) => [p.slug, p]));
  const locName = new Map(locations.map((l) => [l.id, l.shortName]));
  const orderNumber = new Map(orders.map((o) => [o.id, o.number]));
  return movements.map((m) => ({
    id: m.id,
    createdAt: m.createdAt,
    productName: prodBySlug.get(m.productSlug)?.name ?? m.productSlug,
    productId: prodBySlug.get(m.productSlug)?.id ?? null,
    location: locName.get(m.locationId) ?? m.locationId,
    delta: m.delta,
    qtyAfter: m.qtyAfter,
    reason: m.reason,
    orderNumber: m.orderId ? (orderNumber.get(m.orderId) ?? null) : null,
  }));
}

/* ── Pedidos ──────────────────────────────────────────────── */

export interface AdminOrderSummary {
  id: string;
  number: string;
  status: OrderStatus;
  customerName: string;
  itemsLabel: string;
  total: number;
  /** Saldo pendiente de un pedido señado. 0 si está saldado. */
  balanceDue: number;
  createdAt: Date;
  expiresAt: Date | null;
  paymentMethod: string;
  deliveryMethod: string;
  /** Cuotas con tarjeta (1, 3 o 6). */
  installments: number;
}

/** Todos los pedidos con su cliente y resumen de items, más recientes primero. */
export async function getAdminOrders(): Promise<AdminOrderSummary[]> {
  await expireStaleOrders();
  const db = await getDb();
  const rows = await db
    .select({
      order: schema.orders,
      customerName: schema.customers.name,
    })
    .from(schema.orders)
    .innerJoin(
      schema.customers,
      eq(schema.orders.customerId, schema.customers.id),
    )
    .orderBy(desc(schema.orders.createdAt));

  const items = await db.select().from(schema.orderItems);
  const byOrder = new Map<string, string[]>();
  for (const it of items) {
    const list = byOrder.get(it.orderId) ?? [];
    list.push(`${it.quantity}× ${it.name}`);
    byOrder.set(it.orderId, list);
  }

  return rows.map(({ order, customerName }) => ({
    id: order.id,
    number: order.number,
    status: order.status,
    customerName,
    itemsLabel: (byOrder.get(order.id) ?? []).join(" · "),
    total: order.total,
    balanceDue: order.balanceDue,
    createdAt: order.createdAt,
    expiresAt: order.expiresAt,
    paymentMethod: order.paymentMethod,
    deliveryMethod: order.deliveryMethod,
    installments: order.installments,
  }));
}

export async function getAdminOrder(number: string): Promise<FullOrder | null> {
  await expireStaleOrders();
  const db = await getDb();
  const [order] = await db
    .select({ id: schema.orders.id })
    .from(schema.orders)
    .where(eq(schema.orders.number, number));
  if (!order) return null;
  return getOrderById(order.id);
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
  const [customers, orders, appts, quotes] = await Promise.all([
    db.select().from(schema.customers),
    db
      .select({
        customerId: schema.orders.customerId,
        status: schema.orders.status,
        paidAmount: schema.orders.paidAmount,
        createdAt: schema.orders.createdAt,
      })
      .from(schema.orders),
    db
      .select({ customerId: schema.appointments.customerId, at: schema.appointments.createdAt })
      .from(schema.appointments),
    db
      .select({ customerId: schema.quoteRequests.customerId, at: schema.quoteRequests.createdAt })
      .from(schema.quoteRequests),
  ]);
  const byId = new Map<string, AdminCustomer>(
    customers.map((c) => [
      c.id,
      {
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        hasAccount: !!c.accountId,
        ordersCount: 0,
        appointmentsCount: 0,
        quotesCount: 0,
        totalSpent: 0,
        lastContactAt: null,
        createdAt: c.createdAt,
      },
    ]),
  );
  const touch = (e: AdminCustomer, at: Date) => {
    if (!e.lastContactAt || at > e.lastContactAt) e.lastContactAt = at;
  };
  for (const o of orders) {
    const e = byId.get(o.customerId);
    if (!e) continue;
    e.ordersCount += 1;
    if (!["CANCELADO", "VENCIDO"].includes(o.status)) e.totalSpent += o.paidAmount;
    touch(e, o.createdAt);
  }
  for (const a of appts) {
    const e = byId.get(a.customerId);
    if (!e) continue;
    e.appointmentsCount += 1;
    touch(e, a.at);
  }
  for (const q of quotes) {
    const e = byId.get(q.customerId);
    if (!e) continue;
    e.quotesCount += 1;
    touch(e, q.at);
  }
  return [...byId.values()].sort(
    (a, b) =>
      (b.lastContactAt?.getTime() ?? 0) - (a.lastContactAt?.getTime() ?? 0) ||
      b.totalSpent - a.totalSpent,
  );
}

/** Top 5 de modelos más consultados por WhatsApp (Resumen). */
export async function getTopConsulted(): Promise<{ label: string; n: number }[]> {
  const db = await getDb();
  return db
    .select({ label: schema.leads.label, n: sql<number>`count(*)::int` })
    .from(schema.leads)
    .where(eq(schema.leads.type, "producto"))
    .groupBy(schema.leads.label)
    .orderBy(desc(sql`count(*)`))
    .limit(5);
}

/** Contenido editable completo (con los defaults del seed), siempre fresco. */
export async function getAdminContent() {
  const settings = await getAdminSettings();
  return { settings, content: withContentDefaults(settings.content) };
}

/** Overrides de los textos de la web (clave → valor editado). */
export async function getAdminTexts(): Promise<Record<string, string>> {
  const db = await getDb();
  const rows = await db.select().from(schema.texts);
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}
