import { unstable_cache } from "next/cache";
import type { AppointmentPillStatus, OrderPillStatus, QuotePillStatus } from "@/components/bt/pill";
import { formatMoney } from "@/components/bt/format";
import { store, WHATSAPP_PENDING } from "@/lib/config";
import { COPY } from "@/lib/data/demo/copy";
import { img, resolveImage } from "@/lib/images";
import { paths } from "@/lib/paths";
import { formatArPhone } from "@/lib/phone";
import { getMyAppointments, getMyOrders, getMyQuotes } from "@/lib/server/account-queries";
import {
  canCustomerModify,
  getAgendaSettings,
  getAppointmentForGuest,
  getAppointmentServices,
  type AppointmentView,
} from "@/lib/server/appointments";
import { getCurrentAccount } from "@/lib/server/customer-auth";
import type { FullOrder, OrderRow } from "@/lib/server/order-queries";
import { BACKUP_REVALIDATE, getStore, getVisibleProducts } from "@/lib/server/queries";
import type { FullQuote } from "@/lib/server/quotes";
import { variantLabel } from "@/lib/variants";
import { waUrl } from "@/lib/whatsapp";
import { toLocalParts } from "@/lib/zoned-time";
import type { QuoteKind } from "@/lib/types";

/**
 * Lecturas de las pantallas del agente C (turnos 2f, Mi cuenta 2g,
 * presupuesto 5a, gestión de turno por link). Solo lectura: arman view
 * models serializables para las islas cliente a partir de las queries del
 * core, sin tocarlas.
 */

/* ── Turnos (2f/4e) ───────────────────────────────────────── */

export interface BookingService {
  id: string;
  /** Nombre de la card ("Asesoramiento"). */
  name: string;
  /** Nombre del resumen ("Asesoramiento de compra"). */
  summaryName: string;
  description: string;
  durationMin: number;
  allowsProduct: boolean;
}

export interface BookingData {
  services: BookingService[];
  maxDaysAhead: number;
  /** Anticipación mínima para reservar/cambiar online (min). */
  minNoticeMin: number;
  timeZone: string;
  address: string;
}

const SUMMARY_NAMES: Record<string, string> = COPY.appointment.summaryServiceName;

/**
 * Servicios activos + horizonte de la agenda para /turnos (estática). Tag
 * "settings": las actions del admin que editan servicios, horario y
 * ajustes de agenda (lib/server/actions/admin-appointments.ts) llaman a
 * invalidatePublic("settings").
 */
export const getBookingData = unstable_cache(
  async (): Promise<BookingData> => {
    const [services, agenda, runtime] = await Promise.all([
      getAppointmentServices({ activeOnly: true }),
      getAgendaSettings(),
      getStore(),
    ]);
    return {
      services: services.map((s) => ({
        id: s.id,
        name: s.name,
        summaryName: SUMMARY_NAMES[s.id] ?? s.name,
        description: s.description,
        durationMin: s.durationMin,
        allowsProduct: s.allowsProduct,
      })),
      maxDaysAhead: agenda.maxDaysAhead,
      minNoticeMin: agenda.minNoticeMin,
      timeZone: agenda.timeZone || store.timeZone,
      address: runtime.address,
    };
  },
  ["cliente-c-booking"],
  { tags: ["settings"], revalidate: 300 },
);

export interface TestRideBike {
  slug: string;
  name: string;
  image: string | null;
  variants: { id: string; size: string; label: string; height: string | null; available: boolean }[];
}

/** Bicis publicadas que se pueden probar (para "Bici a probar" / "Cambiar"). */
export const getTestRideBikes = unstable_cache(
  async (): Promise<TestRideBike[]> => {
    const products = await getVisibleProducts();
    return products
      .filter((p) => p.testRide)
      .map((p) => ({
        slug: p.slug,
        name: p.name,
        image: p.images[0] ? img(resolveImage(p.images[0]), { w: 240 }) : null,
        variants: p.variants
          .filter((v) => v.active)
          .map((v) => ({
            id: v.id,
            size: v.size,
            label: variantLabel(v),
            height: v.heightRange,
            available: v.stock > 0,
          })),
      }));
  },
  ["cliente-c-test-ride"],
  { tags: ["catalog"], revalidate: BACKUP_REVALIDATE },
);

/* ── Presupuesto (5a/5d) ──────────────────────────────────── */

export interface QuoteContact {
  /** Número formateado o el placeholder "[Número a confirmar]". */
  whatsappLabel: string;
  whatsappHref: string | null;
}

export async function getQuoteContact(): Promise<QuoteContact> {
  const runtime = await getStore();
  const pending = runtime.whatsapp === WHATSAPP_PENDING;
  return {
    whatsappLabel: pending ? "[Número a confirmar]" : formatArPhone(runtime.whatsapp),
    whatsappHref: pending
      ? null
      : waUrl(runtime.whatsapp, "¡Hola! Quiero pedir un presupuesto."),
  };
}

/* ── Mi cuenta (2g/4f) y gestión por link ─────────────────── */

const DOW = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MON = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function weekdayOf(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export interface AppointmentCardView {
  id: string;
  number: string;
  serviceId: string;
  serviceName: string;
  status: AppointmentPillStatus;
  /** "Jueves" / "Jue". */
  weekday: string;
  weekdayShort: string;
  /** "8". */
  day: string;
  /** "Oct". */
  month: string;
  /** "2026-10-08" / "17:30". */
  date: string;
  time: string;
  /** "Jueves 8 de octubre". */
  dayLabel: string;
  /** "MTB rodado 29 · Talle M · 30 min" (desktop). */
  detail: string;
  /** "MTB rodado 29 · Talle M · 30 min" sin modelo largo (mobile = igual, se corta por CSS). */
  durationMin: number;
  address: string;
  /** El cliente puede reprogramar/cancelar online (anticipación). */
  canModify: boolean;
  /** Link de WhatsApp al local para cuando ya no se puede online. */
  whatsappHref: string;
}

async function toCardView(v: AppointmentView, address: string, whatsapp: string): Promise<AppointmentCardView> {
  const wd = weekdayOf(v.date);
  const [, m, d] = v.date.split("-").map(Number);
  const dayLabel = cap(v.dayLabel);
  const detail = [v.productLabel, `${v.appointment.durationMin} min`].filter(Boolean).join(" · ");
  const msg = `¡Hola! Tengo el turno #${v.appointment.number} (${v.service.name}, ${dayLabel} a las ${v.time}) y necesito cambiarlo.`;
  return {
    id: v.appointment.id,
    number: v.appointment.number,
    serviceId: v.service.id,
    serviceName: v.service.name,
    status: v.appointment.status as AppointmentPillStatus,
    weekday: DOW[wd],
    weekdayShort: DOW[wd].slice(0, 3),
    day: String(d),
    month: cap(MON[m - 1]),
    date: v.date,
    time: v.time,
    dayLabel,
    detail,
    durationMin: v.appointment.durationMin,
    address,
    canModify: await canCustomerModify(v.appointment),
    whatsappHref: waUrl(whatsapp, msg),
  };
}

export interface PastAppointmentView {
  id: string;
  /** "12 SEP 2026 · 11:00". */
  dateLabel: string;
  serviceName: string;
  detail: string;
  status: AppointmentPillStatus;
}

function toPastView(v: AppointmentView): PastAppointmentView {
  const [y, m, d] = v.date.split("-").map(Number);
  return {
    id: v.appointment.id,
    dateLabel: `${d} ${MON[m - 1]} ${y} · ${v.time}`.toUpperCase(),
    serviceName: v.service.name,
    detail: v.productLabel ?? v.appointment.note ?? "",
    status: v.appointment.status as AppointmentPillStatus,
  };
}

/** OrderStatus + medio → OrderPill (tabla de components/bt/README). */
export function orderPillStatus(order: Pick<OrderRow, "status" | "paymentMethod">): OrderPillStatus | null {
  switch (order.status) {
    case "PENDIENTE_PAGO":
      if (order.paymentMethod === "transferencia") return "transf_pendiente";
      if (order.paymentMethod === "efectivo") return "paga_local";
      return null; // pago online en curso: sin pill en bt
    case "SEÑADO":
    case "PAGADO":
      return "pagado";
    case "EN_PREPARACION":
      return "armando";
    case "LISTO_RETIRO":
      return "listo";
    case "RETIRADO":
    case "ENTREGADO":
      return "retirado";
    case "CANCELADO":
    case "VENCIDO":
      return "cancelado";
    default:
      return "armando";
  }
}

function shortDate(d: Date): string {
  const local = toLocalParts(d, store.timeZone).date;
  const [y, m, day] = local.split("-").map(Number);
  return `${day} ${MON[m - 1]} ${y}`;
}

export interface AccountOrderView {
  number: string;
  pill: OrderPillStatus | null;
  itemsLabel: string;
  /** "1 oct 2026 · $ 544.800". */
  meta: string;
  image: string | null;
  href: string | null;
}

function toOrderView(f: FullOrder, email: string): AccountOrderView {
  const first = f.items[0];
  return {
    number: f.order.number,
    pill: orderPillStatus(f.order),
    itemsLabel: f.items.map((i) => i.name).join(" + "),
    meta: `${shortDate(f.order.createdAt)} · ${formatMoney(f.order.total)}`,
    image: first?.image ? img(resolveImage(first.image), { w: 200 }) : null,
    href: `${paths.tracking(f.order.number)}?e=${encodeURIComponent(f.customer.email || email)}`,
  };
}

const KIND_LABEL: Record<QuoteKind, string> = {
  bici: "Bicicleta",
  rep: "Repuesto",
  imp: "Importado",
  otro: "Otra consulta",
};

export interface AccountQuoteView {
  number: string;
  status: QuotePillStatus;
  kind: string;
  title: string;
  /** "28 sep 2026" (+ " · $ 120.000 · 30 días" si está cotizado). */
  meta: string;
}

function toQuoteView(q: FullQuote): AccountQuoteView {
  const detail = q.quote.title || q.quote.detail;
  const extra = q.total > 0 && q.quote.status !== "nuevo" ? [formatMoney(q.total), q.quote.eta].filter(Boolean) : [];
  return {
    number: q.quote.number,
    status: q.quote.status as QuotePillStatus,
    kind: KIND_LABEL[q.quote.kind] ?? q.quote.kind,
    title: detail.length > 90 ? `${detail.slice(0, 88).trimEnd()}…` : detail,
    meta: [shortDate(q.quote.createdAt), ...extra].join(" · "),
  };
}

export interface AccountScreen {
  account: { name: string; firstName: string; email: string; phone: string };
  next: AppointmentCardView | null;
  /** Otros turnos activos además del próximo. */
  upcoming: AppointmentCardView[];
  past: PastAppointmentView[];
  orders: AccountOrderView[];
  quotes: AccountQuoteView[];
}

/** Todo lo de /cuenta en una lectura. null = sin sesión. */
export async function getAccountScreen(): Promise<AccountScreen | null> {
  const account = await getCurrentAccount();
  if (!account) return null;
  const [appts, orders, quotes, runtime] = await Promise.all([
    getMyAppointments(),
    getMyOrders(),
    getMyQuotes(),
    getStore(),
  ]);
  const upcoming = await Promise.all(
    (appts?.upcoming ?? []).map((v) => toCardView(v, runtime.address, runtime.whatsapp)),
  );
  const past = (appts?.past ?? [])
    .sort((a, b) => b.appointment.startsAt.getTime() - a.appointment.startsAt.getTime())
    .map(toPastView);
  return {
    account: {
      name: account.name,
      firstName: account.name.trim().split(/\s+/)[0] ?? account.name,
      email: account.email,
      phone: formatArPhone(account.phone),
    },
    next: upcoming[0] ?? null,
    upcoming: upcoming.slice(1),
    past,
    orders: (orders ?? [])
      .sort((a, b) => b.order.createdAt.getTime() - a.order.createdAt.getTime())
      .map((o) => toOrderView(o, account.email)),
    quotes: (quotes ?? [])
      .sort((a, b) => b.quote.createdAt.getTime() - a.quote.createdAt.getTime())
      .map(toQuoteView),
  };
}

/** /turnos/[numero]?t=… : turno de un invitado por su link de gestión. */
export async function getGuestAppointmentScreen(
  number: string,
  token: string,
): Promise<{ appointment: AppointmentCardView; customerName: string } | null> {
  const view = await getAppointmentForGuest(number, token);
  if (!view) return null;
  const runtime = await getStore();
  return {
    appointment: await toCardView(view, runtime.address, runtime.whatsapp),
    customerName: view.customer.name,
  };
}
