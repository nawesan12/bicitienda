import { and, count, desc, eq, gte, lt } from "drizzle-orm";
import type { OrderPillStatus } from "@/components/bt/pill";
import { store } from "@/lib/config";
import { canCancel, nextTransition, orderStage, progressDone } from "@/lib/order-flow";
import { formatArPhone } from "@/lib/phone";
import { closedQuoteNote, isQuoteOpen, nextQuoteTransition, QUOTE_KIND_LABELS } from "@/lib/quote-flow";
import { getAdminOrder } from "@/lib/server/admin-queries";
import {
  getAgendaSettings,
  getAppointmentServices,
  getAppointmentsBetween,
  getAppointmentView,
  getBlocksBetween,
  getScheduleRules,
  type AppointmentView,
} from "@/lib/server/appointments";
import { getDb, schema } from "@/lib/server/db";
import { expireStaleOrders } from "@/lib/server/orders";
import { listQuotes, quoteWhatsAppUrl, type FullQuote } from "@/lib/server/quotes";
import { customerWhatsApp, orderReadyWhatsApp, appointmentWhatsApp } from "@/lib/server/whatsapp-templates";
import type { AppointmentStatus, OrderStatus, PaymentMethodId, QuoteStatus } from "@/lib/types";
import { addDays, fromMinutes, localToUtc, toLocalParts, toMinutes, weekdayOf } from "@/lib/zoned-time";

/**
 * Lecturas de las pantallas de operación del admin (ola 1 · D1): Resumen
 * (2i/4h), Pedidos (3a/4i), Turnos (3b) y Presupuestos (5b). Server-only
 * y siempre frescas (el panel es dinámico). Las acciones son las del core
 * (lib/server/actions/{orders,admin-appointments,quotes}.ts); los links de
 * WhatsApp se arman acá con las plantillas, sin envío automático.
 */

const TZ = store.timeZone;

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/* ── Fechas ───────────────────────────────────────────────── */

/** "Hoy" real en la zona del local. */
export function localNow(now = new Date()) {
  const p = toLocalParts(now, TZ);
  return { now, date: p.date, minutes: p.hour * 60 + p.minute };
}

function dayNum(date: string): number {
  return Number(date.slice(8, 10));
}
function monthShort(date: string): string {
  return MESES[Number(date.slice(5, 7)) - 1];
}

/** "sábado 3 oct" (desktop) / "sáb 3 oct" (mobile). */
export function todayTitle(date: string) {
  const wd = weekdayOf(date);
  return {
    long: `${DIAS[wd]} ${dayNum(date)} ${monthShort(date)}`,
    short: `${DIAS[wd].slice(0, 3)} ${dayNum(date)} ${monthShort(date)}`,
  };
}

/** "1 oct · 12:05" (meta del pedido, sin año). */
export function stamp(at: Date): string {
  const p = toLocalParts(at, TZ);
  return `${p.day} ${MESES[p.month - 1]} · ${p.time}`;
}

/** "Hoy · 10:12" / "Ayer · 18:05" / "28 sep" (tabla de presupuestos). */
export function relativeStamp(at: Date, today: string): string {
  const p = toLocalParts(at, TZ);
  if (p.date === today) return `Hoy · ${p.time}`;
  if (p.date === addDays(today, -1)) return `Ayer · ${p.time}`;
  return `${p.day} ${MESES[p.month - 1]}`;
}

/** Lunes de la semana de `date` (el domingo cuenta como la semana siguiente). */
export function mondayOf(date: string): string {
  const wd = weekdayOf(date);
  return wd === 0 ? addDays(date, 1) : addDays(date, -(wd - 1));
}

/** "5 – 10 oct 2026" (o "28 sep – 3 oct 2026"). */
export function weekLabel(monday: string): string {
  const sat = addDays(monday, 5);
  const year = sat.slice(0, 4);
  return monthShort(monday) === monthShort(sat)
    ? `${dayNum(monday)} – ${dayNum(sat)} ${monthShort(sat)} ${year}`
    : `${dayNum(monday)} ${monthShort(monday)} – ${dayNum(sat)} ${monthShort(sat)} ${year}`;
}

/** "Jueves 8 oct · 17:30". */
export function whenLabel(date: string, time: string): string {
  const d = DIAS[weekdayOf(date)];
  return `${d[0].toUpperCase()}${d.slice(1)} ${dayNum(date)} ${monthShort(date)} · ${time}`;
}

/* ── Pedidos ──────────────────────────────────────────────── */

/** Etapa del core → clave de OrderPill (README de bt). */
export function orderPillStatus(o: { status: OrderStatus; paymentMethod: PaymentMethodId }): OrderPillStatus {
  switch (orderStage(o)) {
    case "transf_pendiente":
      return "transf_pendiente";
    case "paga_en_local":
      return "paga_local";
    case "pago_pendiente":
      return "transf_pendiente";
    case "señado":
    case "pagado":
      return "pagado";
    case "armando":
      return "armando";
    case "listo":
    case "en_camino":
      return "listo";
    case "retirado":
    case "entregado":
      return "retirado";
    default:
      return "cancelado";
  }
}

/** "Transferencia · 10% off" · "Mercado Pago · 6 cuotas" · "Efectivo en el local". */
export function paymentText(o: { paymentMethod: PaymentMethodId; installments: number; discount: number }): string {
  switch (o.paymentMethod) {
    case "transferencia":
      return o.discount > 0 ? `Transferencia · ${store.transferDiscount}% off` : "Transferencia";
    case "efectivo":
      return "Efectivo en el local";
    case "mercadopago":
      return `Mercado Pago · ${o.installments > 1 ? `${o.installments} cuotas` : "1 pago"}`;
    case "payway":
      return `Tarjeta · ${o.installments > 1 ? `${o.installments} cuotas` : "1 pago"}`;
    default:
      return o.paymentMethod;
  }
}

export type OrderFilter = "todos" | "transf" | "local" | "armar" | "listos" | "retirados" | "cancelados";

export const ORDER_FILTERS: { key: OrderFilter; label: string; pills: OrderPillStatus[] | null }[] = [
  { key: "todos", label: "Todos", pills: null },
  { key: "transf", label: "Transf. pendiente", pills: ["transf_pendiente"] },
  { key: "local", label: "Paga en local", pills: ["paga_local"] },
  { key: "armar", label: "Para armar", pills: ["pagado", "armando"] },
  { key: "listos", label: "Listos", pills: ["listo"] },
  { key: "retirados", label: "Retirados", pills: ["retirado"] },
  { key: "cancelados", label: "Cancelados", pills: ["cancelado"] },
];

export type OrderRange = "7" | "30" | "todo";

export interface OrderRow {
  id: string;
  number: string;
  status: OrderStatus;
  pill: OrderPillStatus;
  customerName: string;
  phone: string;
  /** "MTB rodado 29 · Casco urbano" (con "2×" si hay más de uno). */
  itemsLabel: string;
  total: number;
  createdAt: Date;
  open: boolean;
}

const OPEN_STATUSES: OrderStatus[] = ["PENDIENTE_PAGO", "SEÑADO", "PAGADO", "EN_PREPARACION", "LISTO_RETIRO", "ENVIADO", "ENTREGA_COORDINADA"];

async function loadOrderRows(): Promise<OrderRow[]> {
  await expireStaleOrders();
  const db = await getDb();
  const [rows, items] = await Promise.all([
    db
      .select({ order: schema.orders, name: schema.customers.name, phone: schema.customers.phone })
      .from(schema.orders)
      .innerJoin(schema.customers, eq(schema.orders.customerId, schema.customers.id))
      .orderBy(desc(schema.orders.createdAt)),
    db
      .select({ orderId: schema.orderItems.orderId, name: schema.orderItems.name, quantity: schema.orderItems.quantity })
      .from(schema.orderItems),
  ]);
  const byOrder = new Map<string, string[]>();
  for (const it of items) {
    const list = byOrder.get(it.orderId) ?? [];
    list.push(it.quantity > 1 ? `${it.quantity}× ${it.name}` : it.name);
    byOrder.set(it.orderId, list);
  }
  return rows.map(({ order, name, phone }) => ({
    id: order.id,
    number: order.number,
    status: order.status,
    pill: orderPillStatus(order),
    customerName: name,
    phone,
    itemsLabel: (byOrder.get(order.id) ?? []).join(" · "),
    total: order.total,
    createdAt: order.createdAt,
    open: OPEN_STATUSES.includes(order.status),
  }));
}

function matchesQuery(r: OrderRow, q: string): boolean {
  const s = q.trim().toLowerCase().replace(/^#/, "");
  if (!s) return true;
  const digits = s.replace(/\D/g, "");
  return (
    r.number.toLowerCase().includes(s) ||
    r.customerName.toLowerCase().includes(s) ||
    r.itemsLabel.toLowerCase().includes(s) ||
    (digits.length >= 3 && r.phone.includes(digits))
  );
}

/**
 * Tablero de pedidos (3a). El rango ("Últimos 7 días") recorta solo los
 * cerrados: un pedido abierto siempre aparece, aunque sea viejo.
 */
export async function getOrdersBoard(opts: { filter: OrderFilter; range: OrderRange; q: string }) {
  const all = await loadOrderRows();
  const since = opts.range === "todo" ? null : Date.now() - Number(opts.range) * 86_400_000;
  const inRange = all.filter((r) => matchesQuery(r, opts.q) && (r.open || !since || r.createdAt.getTime() >= since));
  const counts = Object.fromEntries(
    ORDER_FILTERS.map((f) => [f.key, f.pills ? inRange.filter((r) => f.pills!.includes(r.pill)).length : inRange.length]),
  ) as Record<OrderFilter, number>;
  const pills = ORDER_FILTERS.find((f) => f.key === opts.filter)?.pills ?? null;
  const rows = pills ? inRange.filter((r) => pills.includes(r.pill)) : inRange;
  return { rows, counts };
}

export interface OrderDetail {
  id: string;
  number: string;
  status: OrderStatus;
  pill: OrderPillStatus;
  meta: string;
  customerName: string;
  phoneLabel: string;
  items: { id: number; name: string; variant: string | null; image: string; price: number; quantity: number }[];
  payment: string;
  delivery: string;
  total: number;
  receipt: { href: string; fileName: string; kind: "pdf" | "image" } | null;
  done: number;
  cancelled: boolean;
  next: { label: string; from: OrderStatus; to: OrderStatus } | null;
  canCancel: boolean;
  /** wa.me con la plantilla "Pedido listo" (o un chat con el número de pedido). */
  whatsappUrl: string;
  whatsappIsTemplate: boolean;
  /** Chat libre ("Escribir →"). */
  chatUrl: string;
}

const DELIVERY: Record<string, string> = {
  retiro: "Retiro en el local",
  "envio-mdq": "Entrega a domicilio",
  "envio-coordinar": "Envío a coordinar",
};

export async function getOrderDetail(number: string): Promise<OrderDetail | null> {
  const full = await getAdminOrder(number);
  if (!full) return null;
  const { order, items, customer } = full;
  const first = customer.name.split(" ")[0];
  const ready = order.status === "LISTO_RETIRO" ? await orderReadyWhatsApp(order.id) : null;
  const next = nextTransition(order);
  const receiptUrl = order.transferReceiptUrl;
  const ext = receiptUrl ? (receiptUrl.split("?")[0].split(".").pop() ?? "").toLowerCase() : "";
  return {
    id: order.id,
    number: order.number,
    status: order.status,
    pill: orderPillStatus(order),
    meta: `#${order.number} · ${stamp(order.createdAt)}`,
    customerName: customer.name,
    phoneLabel: formatArPhone(customer.phone),
    items: items.map((it) => ({
      id: it.id,
      name: it.name,
      variant: it.variantLabel,
      image: it.image,
      price: it.unitPrice * it.quantity,
      quantity: it.quantity,
    })),
    payment: paymentText(order),
    delivery: DELIVERY[order.deliveryMethod] ?? order.deliveryMethod,
    total: order.total,
    receipt:
      receiptUrl && order.paymentMethod === "transferencia"
        ? {
            href: receiptUrl,
            fileName: `comprobante_${order.number.replace(/\D/g, "")}.${ext === "pdf" ? "pdf" : ext || "jpg"}`,
            kind: ext === "pdf" ? "pdf" : "image",
          }
        : null,
    done: progressDone(order),
    cancelled: order.status === "CANCELADO" || order.status === "VENCIDO",
    next: next ? { label: next.label, from: next.from, to: next.to } : null,
    canCancel: canCancel(order),
    whatsappUrl: ready?.url ?? customerWhatsApp(customer.phone, `¡Hola ${first}! Te escribimos de ${store.brandName} por tu pedido #${order.number}.`),
    whatsappIsTemplate: !!ready,
    chatUrl: customerWhatsApp(customer.phone),
  };
}

/** Filas del CSV "Exportar" (mismo filtro y rango que la pantalla). */
export async function getOrdersExport(opts: { filter: OrderFilter; range: OrderRange; q: string }) {
  const { rows } = await getOrdersBoard(opts);
  return rows;
}

/* ── Resumen ──────────────────────────────────────────────── */

export type TodayStatus = "hecho" | "ahora" | "confirmado" | "sin_confirmar" | "no_vino";

export interface TodayAppointment {
  id: string;
  time: string;
  name: string;
  service: string;
  detail: string;
  status: TodayStatus;
}

function apptDetail(v: AppointmentView): string {
  return v.productLabel ?? v.appointment.note ?? "";
}

function todayStatus(v: AppointmentView, nowMin: number): TodayStatus {
  const s = v.appointment.status;
  if (s === "asistio") return "hecho";
  if (s === "no_asistio") return "no_vino";
  const start = toMinutes(v.time);
  if (s === "confirmado" && nowMin >= start && nowMin < start + v.appointment.durationMin) return "ahora";
  return s === "pendiente" ? "sin_confirmar" : "confirmado";
}

/** Resumen "Hoy": KPIs del día real, turnos de hoy y pedidos por atender. */
export async function getResumen() {
  await expireStaleOrders();
  const { now, date, minutes } = localNow();
  const db = await getDb();
  const dayStart = localToUtc(date, "00:00", TZ);
  const dayEnd = localToUtc(addDays(date, 1), "00:00", TZ);
  const [ordersToday, ready, transfers, appts, rows] = await Promise.all([
    db
      .select({ n: count() })
      .from(schema.orders)
      .where(and(gte(schema.orders.createdAt, dayStart), lt(schema.orders.createdAt, dayEnd))),
    db.select({ n: count() }).from(schema.orders).where(eq(schema.orders.status, "LISTO_RETIRO")),
    db
      .select({ n: count() })
      .from(schema.orders)
      .where(and(eq(schema.orders.status, "PENDIENTE_PAGO"), eq(schema.orders.paymentMethod, "transferencia"))),
    getAppointmentsBetween(date, date, { statuses: ["pendiente", "confirmado", "asistio", "no_asistio"] }),
    loadOrderRows(),
  ]);
  const today: TodayAppointment[] = appts.map((v) => ({
    id: v.appointment.id,
    time: v.time,
    name: v.customer.name,
    service: v.service.name,
    detail: apptDetail(v),
    status: todayStatus(v, minutes),
  }));
  const actionable: OrderStatus[] = ["PENDIENTE_PAGO", "SEÑADO", "PAGADO", "EN_PREPARACION", "LISTO_RETIRO"];
  return {
    now,
    date,
    monday: mondayOf(date),
    kpis: {
      ordersToday: ordersToday[0]?.n ?? 0,
      readyForPickup: ready[0]?.n ?? 0,
      appointmentsToday: today.filter((a) => a.status !== "no_vino").length,
      transfersToValidate: transfers[0]?.n ?? 0,
    },
    today,
    orders: rows.filter((r) => actionable.includes(r.status)),
  };
}

/* ── Turnos ───────────────────────────────────────────────── */

export type AgendaService = "prueba" | "asesoramiento" | "otro";

export interface AgendaAppointment {
  id: string;
  date: string;
  time: string;
  name: string;
  serviceId: string;
  service: AgendaService;
  serviceName: string;
  detail: string;
  status: AppointmentStatus;
}

export interface AgendaCellData {
  date: string;
  time: string;
  closed: boolean;
  block: { id: number; reason: string } | null;
  appointments: AgendaAppointment[];
}

export interface AgendaDay {
  date: string;
  short: string;
  num: number;
  isToday: boolean;
  isPast: boolean;
  open: boolean;
}

export interface AgendaData {
  monday: string;
  label: string;
  today: string;
  days: AgendaDay[];
  /** Grupos de filas (mañana / tarde) con una celda por día. */
  groups: { label: string | null; rows: { time: string; cells: AgendaCellData[] }[] }[];
  appointments: AgendaAppointment[];
  blocks: { id: number; date: string; from: string; to: string; reason: string; allDay: boolean }[];
  slotMinutes: number;
  services: { id: string; name: string; allowsProduct: boolean }[];
}

function serviceKind(id: string): AgendaService {
  if (id === "prueba") return "prueba";
  if (id === "asesoramiento") return "asesoramiento";
  return "otro";
}

/** Agenda Lun–Sáb de la semana del `monday`, con la grilla armada desde el horario. */
export async function getAgendaWeek(monday: string): Promise<AgendaData> {
  const { date: today } = localNow();
  const saturday = addDays(monday, 5);
  const [settings, rules, views, blocks, services] = await Promise.all([
    getAgendaSettings(),
    getScheduleRules(),
    getAppointmentsBetween(monday, saturday, { statuses: ["pendiente", "confirmado", "asistio", "no_asistio"] }),
    getBlocksBetween(monday, saturday),
    getAppointmentServices(),
  ]);
  const step = settings.slotMinutes;
  const dates = Array.from({ length: 6 }, (_, i) => addDays(monday, i));
  const activeRules = rules.filter((r) => r.active);

  // Franjas abiertas por día de la semana (minutos).
  const openRanges = (date: string) =>
    activeRules.filter((r) => r.weekday === weekdayOf(date)).map((r) => [toMinutes(r.startTime), toMinutes(r.endTime)] as const);

  const appointments: AgendaAppointment[] = views.map((v) => ({
    id: v.appointment.id,
    date: v.date,
    time: v.time,
    name: v.customer.name,
    serviceId: v.service.id,
    service: serviceKind(v.service.id),
    serviceName: v.service.name,
    detail: apptDetail(v),
    status: v.appointment.status,
  }));

  // Filas: todos los inicios de slot del horario + los turnos fuera de horario.
  const times = new Set<number>();
  for (const r of activeRules) {
    if (r.weekday === 0) continue;
    for (let m = toMinutes(r.startTime); m + step <= toMinutes(r.endTime); m += step) times.add(m);
  }
  for (const a of appointments) times.add(toMinutes(a.time));
  const sorted = [...times].sort((a, b) => a - b);

  const blockRows = blocks.map((b) => {
    const s = toLocalParts(b.startsAt, TZ);
    const e = toLocalParts(b.endsAt, TZ);
    return {
      id: b.id,
      start: b.startsAt.getTime(),
      end: b.endsAt.getTime(),
      date: s.date,
      from: s.time,
      to: e.date !== s.date ? "24:00" : e.time,
      reason: b.reason,
      allDay: s.time === "00:00" && (e.date !== s.date || e.time === "00:00"),
    };
  });

  const groups: AgendaData["groups"] = [];
  let prev: number | null = null;
  for (const m of sorted) {
    if (prev === null || m - prev > step) {
      groups.push({ label: groups.length === 0 ? null : m >= 13 * 60 ? "Tarde" : "", rows: [] });
    }
    prev = m;
    const time = fromMinutes(m);
    const cells = dates.map((date) => {
      const start = localToUtc(date, time, TZ).getTime();
      const end = start + step * 60_000;
      const block = blockRows.find((b) => b.start < end && b.end > start);
      const appts = appointments.filter((a) => a.date === date && a.time === time);
      const closed = !openRanges(date).some(([a, b]) => m >= a && m + step <= b);
      return {
        date,
        time,
        closed,
        block: block ? { id: block.id, reason: block.reason } : null,
        appointments: appts,
      };
    });
    groups[groups.length - 1].rows.push({ time, cells });
  }

  return {
    monday,
    label: weekLabel(monday),
    today,
    days: dates.map((date) => ({
      date,
      short: DIAS_CORTOS[weekdayOf(date)],
      num: dayNum(date),
      isToday: date === today,
      isPast: date < today,
      open: openRanges(date).length > 0,
    })),
    groups,
    appointments,
    blocks: blockRows.map(({ id, date, from, to, reason, allDay }) => ({ id, date, from, to, reason, allDay })),
    slotMinutes: step,
    services: services.map((s) => ({ id: s.id, name: s.name, allowsProduct: s.allowsProduct })),
  };
}

export interface AppointmentDetail {
  id: string;
  number: string;
  service: AgendaService;
  serviceName: string;
  name: string;
  when: string;
  date: string;
  time: string;
  detail: string;
  customerNote: string;
  phoneLabel: string;
  status: AppointmentStatus;
  internalNote: string;
  /** wa.me con la plantilla "Turno confirmado". */
  whatsappUrl: string | null;
}

export async function getAppointmentDetail(id: string): Promise<AppointmentDetail | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const v = await getAppointmentView(id);
  if (!v) return null;
  const wa = await appointmentWhatsApp(id);
  return {
    id,
    number: v.appointment.number,
    service: serviceKind(v.service.id),
    serviceName: v.service.name,
    name: v.customer.name,
    when: whenLabel(v.date, v.time),
    date: v.date,
    time: v.time,
    detail: v.productLabel ?? (v.appointment.note || "—"),
    customerNote: v.productLabel && v.appointment.note ? v.appointment.note : "",
    phoneLabel: formatArPhone(v.customer.phone),
    status: v.appointment.status,
    internalNote: v.appointment.internalNote,
    whatsappUrl: wa?.url ?? null,
  };
}

/* ── Presupuestos ─────────────────────────────────────────── */

export type QuoteFilter = "todos" | "nuevos" | "cotizados" | "aceptados" | "cerrados";

export const QUOTE_FILTER_DEFS: { key: QuoteFilter; label: string; statuses: QuoteStatus[] | null }[] = [
  { key: "todos", label: "Todos", statuses: null },
  { key: "nuevos", label: "Nuevos", statuses: ["nuevo"] },
  { key: "cotizados", label: "Cotizados", statuses: ["cotizado"] },
  { key: "aceptados", label: "Aceptados", statuses: ["aceptado"] },
  { key: "cerrados", label: "Cerrados", statuses: ["pedido_creado", "rechazado"] },
];

export interface QuoteRowView {
  id: string;
  number: string;
  when: string;
  title: string;
  customerName: string;
  kind: string;
  status: QuoteStatus;
}

function quoteMatches(f: FullQuote, q: string): boolean {
  const s = q.trim().toLowerCase().replace(/^#/, "");
  if (!s) return true;
  return [f.quote.number, f.quote.title, f.quote.detail, f.customer.name].some((x) => x.toLowerCase().includes(s));
}

export async function getQuotesBoard(opts: { filter: QuoteFilter; q: string }) {
  const { date: today } = localNow();
  const all = (await listQuotes()).filter((f) => quoteMatches(f, opts.q));
  const counts = Object.fromEntries(
    QUOTE_FILTER_DEFS.map((d) => [d.key, d.statuses ? all.filter((f) => d.statuses!.includes(f.quote.status)).length : all.length]),
  ) as Record<QuoteFilter, number>;
  const statuses = QUOTE_FILTER_DEFS.find((d) => d.key === opts.filter)?.statuses ?? null;
  const list = statuses ? all.filter((f) => statuses.includes(f.quote.status)) : all;
  const rows: QuoteRowView[] = list.map((f) => ({
    id: f.quote.id,
    number: f.quote.number,
    when: relativeStamp(f.quote.createdAt, today),
    title: f.quote.title || f.quote.detail,
    customerName: f.customer.name,
    kind: QUOTE_KIND_LABELS[f.quote.kind],
    status: f.quote.status,
  }));
  return { rows, counts, full: list, today };
}

export interface QuoteDetail {
  id: string;
  number: string;
  status: QuoteStatus;
  meta: string;
  title: string;
  customerLine: string;
  kind: string;
  detail: string;
  forBike: string;
  budget: string;
  photos: string[];
  lines: { name: string; price: number; quantity: number; productSlug: string | null; variantId: string | null }[];
  eta: string;
  validUntil: string | null;
  open: boolean;
  next: { label: string; to: QuoteStatus } | null;
  closedNote: string | null;
  orderNumber: string | null;
  whatsappUrl: string;
}

export async function getQuoteDetail(full: FullQuote, today: string): Promise<QuoteDetail> {
  const { quote, lines, customer } = full;
  let orderNumber: string | null = null;
  if (quote.orderId) {
    const db = await getDb();
    const [o] = await db.select({ number: schema.orders.number }).from(schema.orders).where(eq(schema.orders.id, quote.orderId));
    orderNumber = o?.number ?? null;
  }
  const next = nextQuoteTransition(quote.status);
  return {
    id: quote.id,
    number: quote.number,
    status: quote.status,
    meta: `#${quote.number} · ${relativeStamp(quote.createdAt, today)}`,
    title: quote.title || quote.detail,
    customerLine: `${customer.name} · WhatsApp ${formatArPhone(customer.phone)}`,
    kind: QUOTE_KIND_LABELS[quote.kind],
    detail: quote.detail,
    forBike: quote.forBike,
    budget: quote.budget,
    photos: quote.photos,
    lines: lines.map((l) => ({ name: l.name, price: l.price, quantity: l.quantity, productSlug: l.productSlug, variantId: l.variantId })),
    eta: quote.eta,
    validUntil: quote.validUntil,
    open: isQuoteOpen(quote.status),
    next: next ? { label: next.label, to: next.to } : null,
    closedNote: closedQuoteNote(quote.status),
    orderNumber,
    whatsappUrl: lines.length ? quoteWhatsAppUrl(full) : customerWhatsApp(customer.phone),
  };
}
