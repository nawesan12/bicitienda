import { and, count, desc, eq, gte, ilike, inArray, like, lt, or, sql, type SQL } from "drizzle-orm";
import type { OrderPillStatus } from "@/components/bt/pill";
import { store } from "@/lib/config";
import { canCancel, nextTransition, orderInstallments, orderStage, progressDone } from "@/lib/order-flow";
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
import { expireStaleOrdersOnce } from "@/lib/server/orders";
import { listQuotes, quoteWhatsAppUrl, type FullQuote } from "@/lib/server/quotes";
import { appointmentMessage, customerWhatsApp, orderReadyMessage } from "@/lib/server/whatsapp-templates";
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
export function paymentText(o: {
  paymentMethod: PaymentMethodId;
  installments: number;
  /** Cuotas reportadas por la pasarela (ver orderInstallments). */
  paidInstallments?: number | null;
  discount: number;
}): string {
  const n = orderInstallments(o);
  switch (o.paymentMethod) {
    case "transferencia":
      return o.discount > 0 ? `Transferencia · ${store.transferDiscount}% off` : "Transferencia";
    case "efectivo":
      return "Efectivo en el local";
    case "mercadopago":
      return `Mercado Pago · ${n > 1 ? `${n} cuotas` : "1 pago"}`;
    case "payway":
      return `Tarjeta · ${n > 1 ? `${n} cuotas` : "1 pago"}`;
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

/** Pedidos que piden una acción del mostrador (Resumen y badge de Pedidos). */
const ACTIONABLE: OrderStatus[] = ["PENDIENTE_PAGO", "SEÑADO", "PAGADO", "EN_PREPARACION", "LISTO_RETIRO"];

const O = schema.orders;
const OI = schema.orderItems;
const C = schema.customers;

/** "MTB rodado 29 · 2× Casco urbano": resumen de ítems armado en la misma query. */
const ITEMS_LABEL = sql<string>`coalesce((
  select string_agg(case when ${OI.quantity} > 1 then ${OI.quantity} || '× ' || ${OI.name} else ${OI.name} end, ' · ' order by ${OI.id})
  from ${OI} where ${OI.orderId} = ${O.id}
), '')`;

/** Nombre del pedido (el del checkout) o, si no hay, el de la ficha. */
const CUSTOMER_NAME = sql`coalesce(nullif(trim(${O.customerName}), ''), ${C.name})`;

/** Búsqueda (número, cliente, ítems o WhatsApp) en SQL; undefined = sin filtro. */
function querySql(q: string): SQL | undefined {
  const s = q.trim().toLowerCase().replace(/^#/, "");
  if (!s) return undefined;
  const pattern = `%${s.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const digits = s.replace(/\D/g, "");
  return or(
    ilike(O.number, pattern),
    sql`${CUSTOMER_NAME} ilike ${pattern}`,
    sql`exists (select 1 from ${OI} where ${OI.orderId} = ${O.id} and ${OI.name} ilike ${pattern})`,
    digits.length >= 3 ? like(C.phone, `%${digits}%`) : undefined,
  );
}

/** Filas del tablero en UNA query (pedido + cliente + resumen de ítems). */
async function loadOrderRows(opts: { where?: SQL; limit?: number } = {}): Promise<OrderRow[]> {
  const db = await getDb();
  const base = db
    .select({
      id: O.id,
      number: O.number,
      status: O.status,
      paymentMethod: O.paymentMethod,
      customerName: O.customerName,
      total: O.total,
      createdAt: O.createdAt,
      name: C.name,
      phone: C.phone,
      itemsLabel: ITEMS_LABEL,
    })
    .from(O)
    .innerJoin(C, eq(O.customerId, C.id))
    .where(opts.where)
    .orderBy(desc(O.createdAt), desc(O.id));
  const rows = opts.limit ? await base.limit(opts.limit) : await base;
  return rows.map((o) => ({
    id: o.id,
    number: o.number,
    status: o.status,
    pill: orderPillStatus(o),
    customerName: o.customerName?.trim() || o.name,
    phone: o.phone,
    itemsLabel: o.itemsLabel,
    total: o.total,
    createdAt: o.createdAt,
    open: OPEN_STATUSES.includes(o.status),
  }));
}

/** Pedidos por página del tablero ("Ver más" suma otra tanda). */
export const ORDERS_PAGE = 50;

/**
 * Tablero de pedidos (3a). El rango ("Últimos 7 días") recorta solo los
 * cerrados: un pedido abierto siempre aparece, aunque sea viejo. Filtros,
 * rango y búsqueda van en SQL; los contadores de los chips salen de un
 * COUNT agrupado por estado y medio de pago (la etapa del pill depende de
 * los dos) y la lista trae solo `limit` filas (sin límite: el export).
 */
export async function getOrdersBoard(opts: { filter: OrderFilter; range: OrderRange; q: string; limit?: number }) {
  await expireStaleOrdersOnce();
  const db = await getDb();
  const since = opts.range === "todo" ? null : new Date(Date.now() - Number(opts.range) * 86_400_000);
  const where = and(since ? or(inArray(O.status, OPEN_STATUSES), gte(O.createdAt, since)) : undefined, querySql(opts.q));
  const pills = ORDER_FILTERS.find((f) => f.key === opts.filter)?.pills ?? null;

  const groupsQuery = db
    .select({ status: O.status, paymentMethod: O.paymentMethod, n: count() })
    .from(O)
    .innerJoin(C, eq(O.customerId, C.id))
    .where(where)
    .groupBy(O.status, O.paymentMethod);
  const fetchRows = (pillWhere?: SQL) =>
    loadOrderRows({ where: and(where, pillWhere), limit: opts.limit ? opts.limit + 1 : undefined });

  // "Todos": filas y contadores en paralelo. Con un chip, las filas se
  // filtran por los pares (estado, medio) que caen en ese pill.
  let groups: Awaited<typeof groupsQuery>;
  let rows: OrderRow[];
  if (!pills) {
    [groups, rows] = await Promise.all([groupsQuery, fetchRows()]);
  } else {
    groups = await groupsQuery;
    const pairs = groups.filter((g) => pills.includes(orderPillStatus(g)));
    rows = pairs.length
      ? await fetchRows(or(...pairs.map((g) => and(eq(O.status, g.status), eq(O.paymentMethod, g.paymentMethod)))))
      : [];
  }

  const counts = Object.fromEntries(
    ORDER_FILTERS.map((f) => [
      f.key,
      groups.filter((g) => !f.pills || f.pills.includes(orderPillStatus(g))).reduce((sum, g) => sum + g.n, 0),
    ]),
  ) as Record<OrderFilter, number>;
  const hasMore = !!opts.limit && rows.length > opts.limit;
  return { rows: hasMore ? rows.slice(0, opts.limit) : rows, counts, hasMore };
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
  const ready = order.status === "LISTO_RETIRO" ? await orderReadyMessage(full) : null;
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

/** Filas del CSV "Exportar" (mismo filtro y rango que la pantalla, sin límite). */
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
  /** Nombre del servicio ("Reparación", "Asesoramiento"…). */
  service: string;
  kind: AgendaService;
  detail: string;
  status: TodayStatus;
  /** wa.me al cliente (chat directo, sin plantilla). */
  whatsappUrl: string;
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
  await expireStaleOrdersOnce();
  const { now, date, minutes } = localNow();
  const db = await getDb();
  const dayStart = localToUtc(date, "00:00", TZ);
  const dayEnd = localToUtc(addDays(date, 1), "00:00", TZ);
  const isToday = and(gte(O.createdAt, dayStart), lt(O.createdAt, dayEnd));
  const isReady = eq(O.status, "LISTO_RETIRO");
  const isTransfer = and(eq(O.status, "PENDIENTE_PAGO"), eq(O.paymentMethod, "transferencia"));
  const [[k], appts, orders] = await Promise.all([
    // Los tres KPIs de pedidos en una query (índices de estado y fecha).
    db
      .select({
        ordersToday: sql<number>`count(*) filter (where ${isToday})`.mapWith(Number),
        readyForPickup: sql<number>`count(*) filter (where ${isReady})`.mapWith(Number),
        transfersToValidate: sql<number>`count(*) filter (where ${isTransfer})`.mapWith(Number),
      })
      .from(O)
      .where(or(isToday, inArray(O.status, ["LISTO_RETIRO", "PENDIENTE_PAGO"]))),
    getAppointmentsBetween(date, date, { statuses: ["pendiente", "confirmado", "asistio", "no_asistio"] }),
    // Solo los que piden acción (no todos los pedidos de la historia).
    loadOrderRows({ where: inArray(O.status, ACTIONABLE) }),
  ]);
  const today: TodayAppointment[] = appts.map((v) => ({
    id: v.appointment.id,
    time: v.time,
    name: v.customer.name,
    service: v.service.name,
    kind: serviceKind(v.service.id),
    detail: apptDetail(v),
    status: todayStatus(v, minutes),
    whatsappUrl: customerWhatsApp(
      v.customer.phone,
      serviceKind(v.service.id) === "reparacion"
        ? `¡Hola ${v.customer.name.split(" ")[0]}! Te escribimos de ${store.brandName} por tu turno de taller de hoy a las ${v.time}.`
        : undefined,
    ),
  }));
  // Taller: lo que más deja; va destacado arriba en el Resumen.
  const repairs = today.filter((a) => a.kind === "reparacion");
  return {
    now,
    date,
    monday: mondayOf(date),
    kpis: {
      ordersToday: k?.ordersToday ?? 0,
      readyForPickup: k?.readyForPickup ?? 0,
      appointmentsToday: today.filter((a) => a.status !== "no_vino").length,
      transfersToValidate: k?.transfersToValidate ?? 0,
      /** Reparaciones de hoy que siguen en pie (sin "No vino"). */
      repairsToday: repairs.filter((a) => a.status !== "no_vino").length,
    },
    today,
    repairs,
    orders,
  };
}

/* ── Turnos ───────────────────────────────────────────────── */

export type AgendaService = "reparacion" | "asesoramiento" | "otro";

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
  services: { id: string; name: string }[];
}

function serviceKind(id: string): AgendaService {
  if (id === "reparacion") return "reparacion";
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
    // Turno manual: solo servicios activos (la "prueba" vieja queda inactiva).
    services: services.filter((s) => s.active).map((s) => ({ id: s.id, name: s.name })),
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

/** true si todas las palabras de `a` ya están en `b` (nota del cliente redundante). */
function wordsIn(a: string, b: string): boolean {
  const words = (x: string) => x.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const set = new Set(words(b));
  return words(a).every((w) => set.has(w));
}

export async function getAppointmentDetail(id: string): Promise<AppointmentDetail | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const v = await getAppointmentView(id);
  if (!v) return null;
  const wa = await appointmentMessage(v);
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
    customerNote: v.productLabel && v.appointment.note && !wordsIn(v.appointment.note, v.productLabel) ? v.appointment.note : "",
    phoneLabel: formatArPhone(v.customer.phone),
    status: v.appointment.status,
    internalNote: v.appointment.internalNote,
    whatsappUrl: wa.url,
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
