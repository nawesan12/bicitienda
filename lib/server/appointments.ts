import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, gt, gte, inArray, lt, sql } from "drizzle-orm";
import { store } from "@/lib/config";
import { normalizeArPhone } from "@/lib/phone";
import {
  computeAvailability,
  customerCanModify,
  slotState,
  type AgendaSettings,
  type AvailabilityDay,
  type SlotState,
} from "@/lib/schedule";
import { COUNTERS, nextCounter } from "@/lib/server/counters";
import { upsertCustomer, type CustomerRow } from "@/lib/server/customers";
import { getDb, schema, type Db } from "@/lib/server/db";
import { runtimeSiteUrl } from "@/lib/site";
import type { AppointmentSource, AppointmentStatus } from "@/lib/types";
import { variantLabel } from "@/lib/variants";
import {
  addDays,
  isLocalDate,
  isLocalTime,
  localToUtc,
  longDayLabel,
  toLocalParts,
} from "@/lib/zoned-time";

/**
 * Turnos en el local (prueba de bici, asesoramiento): agenda, reserva,
 * confirmación, reprogramación, cancelación y asistencia.
 *
 * Capacidad garantizada en la base, sin transacciones interactivas (el
 * driver HTTP de Neon no las tiene): cada slot tiene una fila en
 * `appointment_slots` y reservar es `UPDATE … booked = booked + 1 WHERE
 * booked < capacidad RETURNING` — atómico. Dos reservas simultáneas al
 * último lugar: una pega y la otra no. Cancelar o reprogramar libera el
 * lugar con el UPDATE inverso. Las transiciones de estado son UPDATE …
 * WHERE status IN (<origen>): un doble clic no aplica dos veces.
 */

export type AppointmentRow = typeof schema.appointments.$inferSelect;
export type ServiceRow = typeof schema.appointmentServices.$inferSelect;

/** Estados que ocupan lugar en la agenda. */
export const ACTIVE_APPOINTMENT_STATUSES: AppointmentStatus[] = ["pendiente", "confirmado"];

export class AppointmentError extends Error {
  constructor(
    message: string,
    readonly code:
      | "SLOT"
      | "TOO_LATE"
      | "NOT_FOUND"
      | "STATE"
      | "INVALID"
      | "SERVICE" = "INVALID",
  ) {
    super(message);
    this.name = "AppointmentError";
  }
}

const SLOT_ERRORS: Record<Exclude<SlotState, "libre">, string> = {
  ocupado: "Ese horario se acaba de ocupar. Elegí otro.",
  bloqueado: "Ese horario no está disponible.",
  anticipacion: "Ese horario ya no se puede reservar online: elegí uno más adelante o escribinos por WhatsApp.",
  pasado: "Ese horario ya pasó.",
  fuera_de_rango: "Todavía no abrimos la agenda para esa fecha.",
};

/* ── Ajustes y agenda ─────────────────────────────────────── */

/** Ajustes de la agenda (siempre frescos: la reserva depende de ellos). */
export async function getAgendaSettings(db?: Db): Promise<AgendaSettings & { autoConfirm: boolean }> {
  const conn = db ?? (await getDb());
  const [s] = await conn.select().from(schema.settings).where(eq(schema.settings.id, "main"));
  if (!s) throw new Error("Settings sin seed: corré `pnpm db:seed`.");
  return {
    slotMinutes: s.slotMinutes,
    slotCapacity: s.slotCapacity,
    minNoticeMin: s.minNoticeMin,
    maxDaysAhead: s.maxDaysAhead,
    timeZone: store.timeZone,
    autoConfirm: s.autoConfirmAppointments,
  };
}

async function bookedMap(db: Db, from: Date, to: Date): Promise<Map<string, number>> {
  const rows = await db
    .select()
    .from(schema.appointmentSlots)
    .where(and(gte(schema.appointmentSlots.startsAt, from), lt(schema.appointmentSlots.startsAt, to)));
  return new Map(rows.map((r) => [r.startsAt.toISOString(), r.booked]));
}

async function blocksBetween(db: Db, from: Date, to: Date) {
  return db
    .select()
    .from(schema.scheduleBlocks)
    .where(and(lt(schema.scheduleBlocks.startsAt, to), gt(schema.scheduleBlocks.endsAt, from)));
}

/**
 * Disponibilidad para el calendario público: `days` días desde `from`
 * (fecha local; por defecto hoy). Respeta reglas, bloqueos, ocupación,
 * anticipación mínima y horizonte máximo.
 */
export async function getAvailability(
  opts: { from?: string; days?: number; now?: Date } = {},
): Promise<{ days: AvailabilityDay[]; settings: AgendaSettings }> {
  const db = await getDb();
  const settings = await getAgendaSettings(db);
  const now = opts.now ?? new Date();
  const today = toLocalParts(now, settings.timeZone).date;
  const from = opts.from && isLocalDate(opts.from) ? opts.from : today;
  const days = Math.min(Math.max(opts.days ?? settings.maxDaysAhead + 1, 1), 62);
  const start = localToUtc(from, "00:00", settings.timeZone);
  const end = localToUtc(addDays(from, days), "00:00", settings.timeZone);
  const [rules, blocks, booked] = await Promise.all([
    db.select().from(schema.scheduleRules),
    blocksBetween(db, start, end),
    bookedMap(db, start, end),
  ]);
  return {
    settings,
    days: computeAvailability({ rules, blocks, booked, settings, now, from, days }),
  };
}

/** Estado de un instante puntual para una reserva web. */
async function webSlotState(db: Db, startsAt: Date, settings: AgendaSettings, now: Date): Promise<SlotState> {
  const local = toLocalParts(startsAt, settings.timeZone);
  const { days } = await getAvailability({ from: local.date, days: 1, now });
  const slot = days[0]?.slots.find((s) => s.startsAt === startsAt.toISOString());
  if (!slot) return "bloqueado"; // no es un horario de la agenda
  // Revalida con la ocupación recién leída (getAvailability ya la incluye).
  return slotState({
    startsAt,
    date: local.date,
    settings,
    blocks: await blocksBetween(db, startsAt, new Date(startsAt.getTime() + settings.slotMinutes * 60_000)),
    booked: slot.booked,
    now,
  });
}

/* ── Capacidad atómica ────────────────────────────────────── */

/** Toma un lugar del slot. false si ya está lleno. */
export async function bookSlot(db: Db, startsAt: Date, capacity: number): Promise<boolean> {
  await db.insert(schema.appointmentSlots).values({ startsAt, booked: 0 }).onConflictDoNothing();
  const updated = await db
    .update(schema.appointmentSlots)
    .set({ booked: sql`${schema.appointmentSlots.booked} + 1` })
    .where(
      and(
        eq(schema.appointmentSlots.startsAt, startsAt),
        lt(schema.appointmentSlots.booked, capacity),
      ),
    )
    .returning();
  return updated.length > 0;
}

/** Libera un lugar del slot (cancelación, reprogramación). */
export async function releaseSlot(db: Db, startsAt: Date): Promise<void> {
  await db
    .update(schema.appointmentSlots)
    .set({ booked: sql`${schema.appointmentSlots.booked} - 1` })
    .where(and(eq(schema.appointmentSlots.startsAt, startsAt), gt(schema.appointmentSlots.booked, 0)));
}

/* ── Alta ─────────────────────────────────────────────────── */

export interface CreateAppointmentInput {
  serviceId: string;
  /** Instante ISO del slot, o fecha + hora locales. */
  startsAt?: string;
  date?: string;
  time?: string;
  name: string;
  phone: string;
  email?: string | null;
  note?: string;
  /** Producto (y talle) a probar, en servicios que lo admiten. */
  productSlug?: string | null;
  variantId?: string | null;
  accountId?: string | null;
  source: AppointmentSource;
  internalNote?: string;
  now?: Date;
}

function resolveStart(input: { startsAt?: string; date?: string; time?: string }, tz: string): Date | null {
  if (input.startsAt) {
    const d = new Date(input.startsAt);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (input.date && input.time && isLocalDate(input.date) && isLocalTime(input.time))
    return localToUtc(input.date, input.time, tz);
  return null;
}

async function nextAppointmentNumber(db: Db): Promise<string> {
  const n = await nextCounter(db, COUNTERS.appointment, 1);
  return `T-${String(n).padStart(4, "0")}`;
}

/**
 * Reserva un turno. Web: el slot tiene que estar libre según la agenda
 * (reglas, bloqueos, anticipación, horizonte). Manual (admin): puede
 * cargarse fuera de la agenda, pero la capacidad se respeta igual.
 */
export async function createAppointment(input: CreateAppointmentInput): Promise<AppointmentRow> {
  const db = await getDb();
  const settings = await getAgendaSettings(db);
  const now = input.now ?? new Date();

  const [service] = await db
    .select()
    .from(schema.appointmentServices)
    .where(eq(schema.appointmentServices.id, input.serviceId));
  if (!service || (!service.active && input.source === "web"))
    throw new AppointmentError("Elegí un servicio.", "SERVICE");

  const name = input.name.trim();
  const phone = normalizeArPhone(input.phone);
  if (name.length < 2) throw new AppointmentError("Completá tu nombre.");
  if (!phone)
    throw new AppointmentError("Revisá el WhatsApp: 10 dígitos con la característica (ej. 223 555-0182).");
  const email = input.email?.trim().toLowerCase() || null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AppointmentError("Revisá el email.");

  // Producto a probar: solo en servicios que lo admiten; en la web, solo
  // productos marcados "se puede probar".
  let productSlug: string | null = null;
  let variantId: string | null = null;
  if (input.productSlug && service.allowsProduct) {
    const [p] = await db
      .select()
      .from(schema.products)
      .where(eq(schema.products.slug, input.productSlug));
    if (!p || (input.source === "web" && (!p.testRide || p.hidden || p.status !== "publicado")))
      throw new AppointmentError("Ese modelo no está disponible para probar.");
    productSlug = p.slug;
    if (input.variantId) {
      const [v] = await db
        .select()
        .from(schema.productVariants)
        .where(and(eq(schema.productVariants.id, input.variantId), eq(schema.productVariants.productSlug, p.slug)));
      if (!v) throw new AppointmentError("Ese talle no existe.");
      variantId = v.id;
    }
  }

  const startsAt = resolveStart(input, settings.timeZone);
  if (!startsAt) throw new AppointmentError("Elegí día y horario.");
  if (input.source === "web") {
    const state = await webSlotState(db, startsAt, settings, now);
    if (state !== "libre") throw new AppointmentError(SLOT_ERRORS[state], state === "anticipacion" ? "TOO_LATE" : "SLOT");
  }

  const customer = await upsertCustomer(db, { name, phone, email });
  if (!(await bookSlot(db, startsAt, settings.slotCapacity)))
    throw new AppointmentError(SLOT_ERRORS.ocupado, "SLOT");

  try {
    const number = await nextAppointmentNumber(db);
    const status: AppointmentStatus =
      input.source === "manual" || settings.autoConfirm ? "confirmado" : "pendiente";
    const [row] = await db
      .insert(schema.appointments)
      .values({
        number,
        customerId: customer.id,
        accountId: input.accountId ?? customer.accountId ?? null,
        serviceId: service.id,
        productSlug,
        variantId,
        startsAt,
        durationMin: service.durationMin,
        status,
        source: input.source,
        note: (input.note ?? "").trim().slice(0, 500),
        internalNote: (input.internalNote ?? "").trim().slice(0, 1000),
        manageToken: randomBytes(18).toString("base64url"),
      })
      .returning();
    if (status === "confirmado") await notifyConfirmed(row.id);
    return row;
  } catch (err) {
    await releaseSlot(db, startsAt);
    throw err;
  }
}

async function notifyConfirmed(appointmentId: string): Promise<void> {
  const { sendAppointmentConfirmedEmail } = await import("@/lib/server/mail");
  await sendAppointmentConfirmedEmail(appointmentId);
}

/* ── Transiciones ─────────────────────────────────────────── */

async function getRow(db: Db, id: string): Promise<AppointmentRow> {
  const [row] = await db.select().from(schema.appointments).where(eq(schema.appointments.id, id));
  if (!row) throw new AppointmentError("Turno inexistente.", "NOT_FOUND");
  return row;
}

/** UPDATE condicional sobre el estado: null si otro lo cambió antes. */
async function transition(
  db: Db,
  id: string,
  from: AppointmentStatus[],
  set: Partial<typeof schema.appointments.$inferInsert>,
): Promise<AppointmentRow | null> {
  const [row] = await db
    .update(schema.appointments)
    .set({ ...set, updatedAt: new Date() })
    .where(and(eq(schema.appointments.id, id), inArray(schema.appointments.status, from)))
    .returning();
  return row ?? null;
}

/** Admin: pendiente → confirmado (manda el mail de turno confirmado). */
export async function confirmAppointment(id: string): Promise<AppointmentRow> {
  const db = await getDb();
  const row = await transition(db, id, ["pendiente"], { status: "confirmado" });
  if (!row) throw new AppointmentError("El turno ya no está pendiente.", "STATE");
  await notifyConfirmed(id);
  return row;
}

/** Admin: Vino / No vino. */
export async function markAttendance(id: string, attended: boolean): Promise<AppointmentRow> {
  const db = await getDb();
  const row = await transition(db, id, ACTIVE_APPOINTMENT_STATUSES, {
    status: attended ? "asistio" : "no_asistio",
  });
  if (!row) throw new AppointmentError("El turno ya está cerrado.", "STATE");
  return row;
}

export type Actor = "cliente" | "admin";

/**
 * Cancela un turno y libera el lugar. El cliente solo con la anticipación
 * mínima (más cerca, el botón abre WhatsApp); el admin siempre.
 */
export async function cancelAppointment(
  id: string,
  by: Actor,
  opts: {
    now?: Date;
    /** Motivo que va en el mail cuando cancela el local (feriado, bloqueo…). */
    reason?: string | null;
    /** false = sin mail de cancelación. */
    notify?: boolean;
  } = {},
): Promise<AppointmentRow> {
  const db = await getDb();
  const current = await getRow(db, id);
  if (by === "cliente") {
    const settings = await getAgendaSettings(db);
    if (!customerCanModify(current.startsAt, settings, opts.now ?? new Date()))
      throw new AppointmentError("Falta poco para el turno: escribinos por WhatsApp para cancelarlo.", "TOO_LATE");
  }
  const row = await transition(db, id, ACTIVE_APPOINTMENT_STATUSES, { status: "cancelado" });
  if (!row) throw new AppointmentError("El turno ya está cerrado.", "STATE");
  await releaseSlot(db, row.startsAt);
  if (opts.notify !== false) {
    const { sendAppointmentCancelledEmail } = await import("@/lib/server/mail");
    await sendAppointmentCancelledEmail(id, {
      by: by === "admin" ? "local" : "cliente",
      reason: opts.reason,
    });
  }
  return row;
}

/**
 * Reprograma: toma el lugar nuevo, crea el turno nuevo (mismo cliente,
 * servicio, producto y token de gestión) y marca el viejo "reprogramado",
 * liberando su lugar. Si el viejo cambió de estado en el medio, se
 * deshace el nuevo. El cliente necesita la anticipación mínima sobre el
 * turno viejo y un slot libre de la agenda; el admin solo la capacidad.
 */
export async function rescheduleAppointment(
  id: string,
  target: { startsAt?: string; date?: string; time?: string },
  by: Actor,
  opts: { now?: Date } = {},
): Promise<AppointmentRow> {
  const db = await getDb();
  const settings = await getAgendaSettings(db);
  const now = opts.now ?? new Date();
  const old = await getRow(db, id);
  if (!ACTIVE_APPOINTMENT_STATUSES.includes(old.status))
    throw new AppointmentError("El turno ya está cerrado.", "STATE");
  if (by === "cliente" && !customerCanModify(old.startsAt, settings, now))
    throw new AppointmentError("Falta poco para el turno: escribinos por WhatsApp para reprogramarlo.", "TOO_LATE");

  const startsAt = resolveStart(target, settings.timeZone);
  if (!startsAt) throw new AppointmentError("Elegí día y horario.");
  if (startsAt.getTime() === old.startsAt.getTime())
    throw new AppointmentError("Elegí un horario distinto.");
  if (by === "cliente") {
    const state = await webSlotState(db, startsAt, settings, now);
    if (state !== "libre") throw new AppointmentError(SLOT_ERRORS[state], state === "anticipacion" ? "TOO_LATE" : "SLOT");
  }
  if (!(await bookSlot(db, startsAt, settings.slotCapacity)))
    throw new AppointmentError(SLOT_ERRORS.ocupado, "SLOT");

  let fresh: AppointmentRow | null = null;
  try {
    const number = await nextAppointmentNumber(db);
    [fresh] = await db
      .insert(schema.appointments)
      .values({
        number,
        customerId: old.customerId,
        accountId: old.accountId,
        serviceId: old.serviceId,
        productSlug: old.productSlug,
        variantId: old.variantId,
        startsAt,
        durationMin: old.durationMin,
        status: old.status === "pendiente" && by === "cliente" ? "pendiente" : "confirmado",
        source: old.source,
        note: old.note,
        internalNote: old.internalNote,
        manageToken: old.manageToken,
        rescheduledFromId: old.id,
      })
      .returning();
    const closed = await transition(db, old.id, ACTIVE_APPOINTMENT_STATUSES, { status: "reprogramado" });
    if (!closed) throw new AppointmentError("El turno cambió mientras lo reprogramabas.", "STATE");
  } catch (err) {
    if (fresh) await db.delete(schema.appointments).where(eq(schema.appointments.id, fresh.id));
    await releaseSlot(db, startsAt);
    throw err;
  }
  await releaseSlot(db, old.startsAt);
  if (fresh.status === "confirmado") await notifyConfirmed(fresh.id);
  return fresh;
}

/** Nota interna del local. */
export async function setInternalNote(id: string, note: string): Promise<void> {
  const db = await getDb();
  await db
    .update(schema.appointments)
    .set({ internalNote: note.trim().slice(0, 1000), updatedAt: new Date() })
    .where(eq(schema.appointments.id, id));
}

/* ── Bloqueos y horario ───────────────────────────────────── */

/**
 * Bloquea un rango (fecha local + horas; sin horas, el día entero). Los
 * turnos ya tomados en el rango NO se cancelan solos: se avisan aparte.
 */
export async function blockSchedule(input: {
  date: string;
  from?: string;
  to?: string;
  reason?: string;
}): Promise<typeof schema.scheduleBlocks.$inferSelect> {
  if (!isLocalDate(input.date)) throw new AppointmentError("Fecha inválida.");
  const tz = store.timeZone;
  const from = input.from && isLocalTime(input.from) ? input.from : "00:00";
  const startsAt = localToUtc(input.date, from, tz);
  const endsAt =
    input.to && isLocalTime(input.to)
      ? localToUtc(input.date, input.to, tz)
      : localToUtc(addDays(input.date, 1), "00:00", tz);
  if (endsAt <= startsAt) throw new AppointmentError("El horario de fin tiene que ser posterior al de inicio.");
  const db = await getDb();
  const [row] = await db
    .insert(schema.scheduleBlocks)
    .values({ startsAt, endsAt, reason: (input.reason ?? "").trim().slice(0, 200) })
    .returning();
  return row;
}

export async function deleteBlock(id: number): Promise<void> {
  const db = await getDb();
  await db.delete(schema.scheduleBlocks).where(eq(schema.scheduleBlocks.id, id));
}

/** Reemplaza el horario semanal (Ajustes → Turnos). */
export async function replaceScheduleRules(
  rules: { weekday: number; startTime: string; endTime: string; active?: boolean }[],
): Promise<void> {
  for (const r of rules) {
    if (r.weekday < 0 || r.weekday > 6 || !isLocalTime(r.startTime) || !isLocalTime(r.endTime) || r.endTime <= r.startTime)
      throw new AppointmentError("Revisá los horarios.");
  }
  const db = await getDb();
  await db.delete(schema.scheduleRules);
  if (rules.length)
    await db.insert(schema.scheduleRules).values(rules.map((r) => ({ ...r, active: r.active ?? true })));
}

/* ── Lecturas ─────────────────────────────────────────────── */

export interface AppointmentView {
  appointment: AppointmentRow;
  customer: CustomerRow;
  service: ServiceRow;
  productName: string | null;
  variantLabel: string | null;
  /** "MTB rodado 29 · Talle M" o null. */
  productLabel: string | null;
  /** Fecha y hora locales. */
  date: string;
  time: string;
  /** "jueves 8 de octubre". */
  dayLabel: string;
  /** Link de gestión para el cliente (también sin cuenta). */
  manageUrl: string;
}

async function toViews(db: Db, rows: AppointmentRow[]): Promise<AppointmentView[]> {
  if (!rows.length) return [];
  const [customers, services, products, variants] = await Promise.all([
    db.select().from(schema.customers).where(inArray(schema.customers.id, [...new Set(rows.map((r) => r.customerId))])),
    db.select().from(schema.appointmentServices),
    db
      .select({ slug: schema.products.slug, name: schema.products.name })
      .from(schema.products)
      .where(inArray(schema.products.slug, rows.map((r) => r.productSlug ?? "").filter(Boolean).concat("__"))),
    db
      .select()
      .from(schema.productVariants)
      .where(inArray(schema.productVariants.id, rows.map((r) => r.variantId ?? "").filter(Boolean).concat("__"))),
  ]);
  const cBy = new Map(customers.map((c) => [c.id, c]));
  const sBy = new Map(services.map((s) => [s.id, s]));
  const pBy = new Map(products.map((p) => [p.slug, p.name]));
  const vBy = new Map(variants.map((v) => [v.id, v]));
  const base = runtimeSiteUrl();
  return rows.flatMap((a) => {
    const customer = cBy.get(a.customerId);
    const service = sBy.get(a.serviceId);
    if (!customer || !service) return [];
    const local = toLocalParts(a.startsAt, store.timeZone);
    const productName = a.productSlug ? (pBy.get(a.productSlug) ?? null) : null;
    const v = a.variantId ? vBy.get(a.variantId) : undefined;
    const vLabel = v ? variantLabel(v) || null : null;
    return [
      {
        appointment: a,
        customer,
        service,
        productName,
        variantLabel: vLabel,
        productLabel: productName ? [productName, vLabel].filter(Boolean).join(" · ") : null,
        date: local.date,
        time: local.time,
        dayLabel: longDayLabel(local.date),
        manageUrl: `${base}/turnos/${a.number}?t=${encodeURIComponent(a.manageToken)}`,
      },
    ];
  });
}

export async function getAppointmentView(id: string): Promise<AppointmentView | null> {
  const db = await getDb();
  const [row] = await db.select().from(schema.appointments).where(eq(schema.appointments.id, id));
  if (!row) return null;
  return (await toViews(db, [row]))[0] ?? null;
}

/**
 * Agenda del admin entre dos fechas locales (incluidas). `statuses`
 * filtra; por defecto, todos menos los reprogramados (que tienen sucesor).
 */
export async function getAppointmentsBetween(
  fromDate: string,
  toDate: string,
  opts: { statuses?: AppointmentStatus[] } = {},
): Promise<AppointmentView[]> {
  const db = await getDb();
  const start = localToUtc(fromDate, "00:00", store.timeZone);
  const end = localToUtc(addDays(toDate, 1), "00:00", store.timeZone);
  const statuses =
    opts.statuses ?? (["pendiente", "confirmado", "asistio", "no_asistio", "cancelado"] as AppointmentStatus[]);
  const rows = await db
    .select()
    .from(schema.appointments)
    .where(
      and(
        gte(schema.appointments.startsAt, start),
        lt(schema.appointments.startsAt, end),
        inArray(schema.appointments.status, statuses),
      ),
    )
    .orderBy(asc(schema.appointments.startsAt));
  return toViews(db, rows);
}

/** Bloqueos que tocan un rango de fechas locales. */
export async function getBlocksBetween(fromDate: string, toDate: string) {
  const db = await getDb();
  return blocksBetween(
    db,
    localToUtc(fromDate, "00:00", store.timeZone),
    localToUtc(addDays(toDate, 1), "00:00", store.timeZone),
  );
}

/** "Mis turnos" de una cuenta (próximos y pasados), sin los reprogramados. */
export async function getAppointmentsForAccount(accountId: string): Promise<AppointmentView[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.appointments)
    .where(eq(schema.appointments.accountId, accountId))
    .orderBy(desc(schema.appointments.startsAt));
  return toViews(db, rows.filter((r) => r.status !== "reprogramado"));
}

/** Turnos de un cliente del CRM (ficha del admin). */
export async function getAppointmentsForCustomer(customerId: string): Promise<AppointmentView[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.appointments)
    .where(eq(schema.appointments.customerId, customerId))
    .orderBy(desc(schema.appointments.startsAt));
  return toViews(db, rows);
}

/**
 * Turno para el link de gestión sin cuenta (número + token). Si fue
 * reprogramado, devuelve el turno vigente de la cadena.
 */
export async function getAppointmentForGuest(number: string, token: string): Promise<AppointmentView | null> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(schema.appointments)
    .where(eq(schema.appointments.number, number.trim().toUpperCase()));
  if (!row || !token || row.manageToken !== token) return null;
  let current = row;
  for (let i = 0; i < 20 && current.status === "reprogramado"; i++) {
    const [next] = await db
      .select()
      .from(schema.appointments)
      .where(eq(schema.appointments.rescheduledFromId, current.id));
    if (!next) break;
    current = next;
  }
  return (await toViews(db, [current]))[0] ?? null;
}

/** Servicios de turnos (activos para la web; todos para el admin). */
export async function getAppointmentServices(opts: { activeOnly?: boolean } = {}): Promise<ServiceRow[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.appointmentServices)
    .orderBy(asc(schema.appointmentServices.order));
  return opts.activeOnly ? rows.filter((r) => r.active) : rows;
}

/** Horario semanal (Ajustes → Turnos), por día y hora. */
export async function getScheduleRules() {
  const db = await getDb();
  return db
    .select()
    .from(schema.scheduleRules)
    .orderBy(asc(schema.scheduleRules.weekday), asc(schema.scheduleRules.startTime));
}

/** ¿El cliente puede reprogramar/cancelar todavía? (la UI decide botón o WhatsApp). */
export async function canCustomerModify(appt: Pick<AppointmentRow, "startsAt" | "status">, now = new Date()) {
  if (!ACTIVE_APPOINTMENT_STATUSES.includes(appt.status)) return false;
  const settings = await getAgendaSettings();
  return customerCanModify(appt.startsAt, settings, now);
}
