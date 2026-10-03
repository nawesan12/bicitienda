import { and, count, gte, inArray, lt } from "drizzle-orm";
import { store } from "@/lib/config";
import { QUOTE_PILL } from "@/components/bt/pill";
import { formatArPhone } from "@/lib/phone";
import { STORE_INFO } from "@/lib/data/demo/settings";
import { features } from "@/lib/features";
import { getAdminCustomers, getAdminProducts, getAdminSettings, type AdminCustomer } from "@/lib/server/admin-queries";
import { getAppointmentServices, getScheduleRules } from "@/lib/server/appointments";
import { isGatewayConfigured, isPaymentSandboxAllowed } from "@/lib/server/payment-availability";
import { getCustomerDetail } from "@/lib/server/admin-crm";
import { STATUS_LABELS } from "@/lib/server/order-queries";
import { customerWhatsApp, getWhatsAppTemplates } from "@/lib/server/whatsapp-templates";
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
  hideWhenOut: boolean;
  /** Se puede eliminar (creado desde el admin). */
  custom: boolean;
  /** Variantes activas (la "Único" sin color incluida si es la única). */
  variants: EditorVariant[];
  categories: { slug: string; label: string; group: string | null }[];
  transferDiscount: number;
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
  };
}

/* ── Clientes (3e) ────────────────────────────────────────── */

/** "Hoy", "Ayer", "Hace 3 días", "Hace 1 semana", "Hace 2 meses". */
export function relativeDay(at: Date | null, now = new Date()): string {
  if (!at) return "—";
  const a = toLocalParts(at, store.timeZone).date;
  const b = toLocalParts(now, store.timeZone).date;
  const days = Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
  if (days <= 0) return "Hoy";
  if (days === 1) return "Ayer";
  if (days < 7) return `Hace ${days} días`;
  if (days < 30) {
    const w = Math.floor(days / 7);
    return `Hace ${w} ${w === 1 ? "semana" : "semanas"}`;
  }
  if (days < 365) {
    const m = Math.floor(days / 30);
    return `Hace ${m} ${m === 1 ? "mes" : "meses"}`;
  }
  const y = Math.floor(days / 365);
  return `Hace ${y} ${y === 1 ? "año" : "años"}`;
}

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export interface CustomerListRow extends AdminCustomer {
  phoneLabel: string;
  lastContactLabel: string;
}

export type HistoryKind = "pedido" | "turno" | "presupuesto";

export interface HistoryItem {
  kind: HistoryKind;
  text: string;
  at: string;
  href?: string;
}

export interface CustomerCard {
  id: string;
  name: string;
  /** "Cliente desde marzo 2025". */
  since: string;
  email: string | null;
  phoneLabel: string;
  whatsappUrl: string;
  hasAccount: boolean;
  orders: number;
  appointments: number;
  quotes: number;
  spent: number;
  history: HistoryItem[];
  /** Tiene turnos pero ningún pedido (variante 3e). */
  appointmentsOnly: boolean;
}

export function customerRows(all: AdminCustomer[], q?: string): CustomerListRow[] {
  const needle = q?.trim().toLowerCase();
  const digits = needle?.replace(/\D/g, "");
  return all
    .filter(
      (c) =>
        !needle ||
        c.name.toLowerCase().includes(needle) ||
        (c.email ?? "").toLowerCase().includes(needle) ||
        (!!digits && digits.length >= 3 && c.phone.includes(digits)),
    )
    .map((c) => ({ ...c, phoneLabel: formatArPhone(c.phone), lastContactLabel: relativeDay(c.lastContactAt) }));
}

export async function getCustomersScreen(opts: { q?: string; c?: string }) {
  const all = await getAdminCustomers();
  const rows = customerRows(all, opts.q);
  const selectedId = rows.find((r) => r.id === opts.c)?.id ?? rows[0]?.id ?? null;
  const card = selectedId ? await getCustomerCard(selectedId) : null;
  return { rows, total: all.length, card };
}

export async function getCustomerCard(id: string): Promise<CustomerCard | null> {
  const d = await getCustomerDetail(id);
  if (!d) return null;
  const c = d.customer;
  const created = toLocalParts(c.createdAt, store.timeZone).date;
  const [y, m] = created.split("-").map(Number);
  const longMonth = new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("es-AR", { month: "long", timeZone: "UTC" });
  const history: HistoryItem[] = [
    ...d.orders.map((o) => ({
      kind: "pedido" as const,
      text: [`#${o.order.number}`, o.items.map((i) => i.name).join(" + "), STATUS_LABELS[o.order.status]]
        .filter(Boolean)
        .join(" · "),
      at: o.order.createdAt.toISOString(),
      href: `/admin/pedidos/${o.order.number}`,
    })),
    ...d.appointments.map((a) => {
      const [, mm, dd] = a.date.split("-").map(Number);
      return {
        kind: "turno" as const,
        text: `${a.service.name} · ${WEEKDAYS[weekdayOf(a.date)]} ${dd} ${MONTHS[mm - 1]} ${a.time}${
          ["cancelado", "no_asistio"].includes(a.appointment.status) ? ` · ${a.appointment.status === "cancelado" ? "Cancelado" : "No vino"}` : ""
        }`,
        at: a.appointment.startsAt.toISOString(),
      };
    }),
    ...d.quotes.map((q) => ({
      kind: "presupuesto" as const,
      text: [q.quote.number, q.quote.title || q.quote.detail.slice(0, 60), QUOTE_PILL[q.quote.status]?.label]
        .filter(Boolean)
        .join(" · "),
      at: q.quote.createdAt.toISOString(),
    })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  return {
    id: c.id,
    name: c.name,
    since: `Cliente desde ${longMonth} ${y}`,
    email: c.email,
    phoneLabel: formatArPhone(c.phone),
    whatsappUrl: customerWhatsApp(c.phone),
    hasAccount: d.hasAccount,
    orders: d.orders.length,
    appointments: d.appointments.length,
    quotes: d.quotes.length,
    spent: d.totalSpent,
    history,
    appointmentsOnly: d.orders.length === 0 && d.appointments.length > 0,
  };
}

/* ── Ajustes (3f) ─────────────────────────────────────────── */

export interface SettingsScreen {
  local: { address: string; whatsapp: string; email: string; instagram: string; hours: string };
  /** Día 0–6 (domingo = 0) → franjas de mañana y tarde ("10:00 – 13:00" o ""). */
  schedule: { weekday: number; open: boolean; am: string; pm: string }[];
  agenda: { slotCapacity: number; minNoticeMin: number; maxDaysAhead: number; slotMinutes: number };
  services: { id: string; name: string; note: string; active: boolean }[];
  payments: {
    gateway: { name: string; state: "conectado" | "prueba" | "sin_configurar" } | null;
    transferDiscount: number;
    maxInstallments: number;
    transferAlias: string;
    transferCbu: string;
    transferHolder: string;
    transferBank: string;
    reservationHours: number;
    cashEnabled: boolean;
    cashReservationHours: number | null;
    cashFeature: boolean;
  };
  templates: { id: "turno_confirmado" | "pedido_listo"; name: string; when: string; body: string }[];
}

export async function getSettingsScreen(): Promise<SettingsScreen> {
  const [s, rules, services, templates] = await Promise.all([
    getAdminSettings(),
    getScheduleRules(),
    getAppointmentServices(),
    getWhatsAppTemplates(),
  ]);
  const schedule = [1, 2, 3, 4, 5, 6, 0].map((wd) => {
    const day = rules.filter((r) => r.weekday === wd && r.active);
    const am = day.find((r) => r.startTime < "14:00");
    const pm = day.find((r) => r.startTime >= "14:00");
    const fmt = (r?: { startTime: string; endTime: string }) => (r ? `${r.startTime} – ${r.endTime}` : "");
    return { weekday: wd, open: day.length > 0, am: fmt(am), pm: fmt(pm) };
  });
  const method = store.features.payments.payway ? "payway" : store.features.payments.mp ? "mercadopago" : null;
  const gateway = method
    ? {
        name: method === "payway" ? "Payway" : "Mercado Pago",
        state: isGatewayConfigured(method)
          ? ("conectado" as const)
          : isPaymentSandboxAllowed()
            ? ("prueba" as const)
            : ("sin_configurar" as const),
      }
    : null;
  return {
    local: {
      address: s.address,
      whatsapp: s.whatsapp,
      email: STORE_INFO.email,
      instagram: s.instagram ? `@${s.instagram}` : "",
      hours: s.hours,
    },
    schedule,
    agenda: { slotCapacity: s.slotCapacity, minNoticeMin: s.minNoticeMin, maxDaysAhead: s.maxDaysAhead, slotMinutes: s.slotMinutes },
    services: services.map((x) => ({
      id: x.id,
      name: x.name,
      note: [`${x.durationMin} min`, x.priceNote.toLowerCase()].filter(Boolean).join(" · "),
      active: x.active,
    })),
    payments: {
      gateway,
      transferDiscount: s.transferDiscount,
      maxInstallments: s.maxInstallments,
      transferAlias: s.transferAlias,
      transferCbu: s.transferCbu,
      transferHolder: s.transferHolder,
      transferBank: s.transferBank,
      reservationHours: s.reservationHours,
      cashEnabled: s.cashEnabled,
      cashReservationHours: s.cashReservationHours,
      cashFeature: features.cashPayment,
    },
    templates: templates
      .filter((t) => t.id === "turno_confirmado" || t.id === "pedido_listo")
      .sort((a, b) => (a.id === "turno_confirmado" ? -1 : b.id === "turno_confirmado" ? 1 : 0))
      .map((t) => ({ id: t.id as "turno_confirmado" | "pedido_listo", name: t.name, when: t.trigger, body: t.body })),
  };
}
