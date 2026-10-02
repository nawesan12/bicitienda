import {
  addDays,
  daysBetween,
  fromMinutes,
  localToUtc,
  toLocalParts,
  toMinutes,
  weekdayOf,
} from "@/lib/zoned-time";

/**
 * Disponibilidad de turnos, pura (la usan el server y los tests):
 *
 *   slots = reglas semanales del día − bloqueos − ocupados (capacidad)
 *           − los que no respetan la anticipación mínima − los que pasan
 *           el horizonte máximo.
 *
 * La capacidad REAL se garantiza en la base al reservar (UPDATE
 * condicional sobre appointment_slots): esto es lo que se muestra.
 */

export interface ScheduleRuleLike {
  weekday: number;
  startTime: string;
  endTime: string;
  active: boolean;
}

export interface BlockLike {
  startsAt: Date;
  endsAt: Date;
}

export interface AgendaSettings {
  slotMinutes: number;
  slotCapacity: number;
  minNoticeMin: number;
  maxDaysAhead: number;
  timeZone: string;
}

/**
 * Estado de un slot: libre, o el motivo por el que no se puede reservar.
 * "ocupado" = llegó a la capacidad.
 */
export type SlotState = "libre" | "ocupado" | "bloqueado" | "anticipacion" | "pasado" | "fuera_de_rango";

export interface Slot {
  /** "17:30" hora local. */
  time: string;
  /** Instante ISO (UTC). */
  startsAt: string;
  state: SlotState;
  available: boolean;
  /** Turnos ya tomados en el slot. */
  booked: number;
}

export interface AvailabilityDay {
  /** "2026-10-08" local. */
  date: string;
  weekday: number;
  /** El local atiende turnos ese día (hay reglas). */
  open: boolean;
  /** Hay al menos un slot libre. */
  available: boolean;
  slots: Slot[];
}

/** Horarios de inicio de un día según las reglas: cada `slotMinutes`. */
export function slotTimesFor(
  rules: ScheduleRuleLike[],
  weekday: number,
  slotMinutes: number,
): string[] {
  const times = new Set<number>();
  for (const r of rules) {
    if (!r.active || r.weekday !== weekday) continue;
    const start = toMinutes(r.startTime);
    const end = toMinutes(r.endTime);
    for (let t = start; t + slotMinutes <= end; t += slotMinutes) times.add(t);
  }
  return [...times].sort((a, b) => a - b).map(fromMinutes);
}

function overlaps(aStart: number, aEnd: number, b: BlockLike): boolean {
  return aStart < b.endsAt.getTime() && b.startsAt.getTime() < aEnd;
}

/** Estado de un slot puntual (también lo usa la reserva para validar). */
export function slotState(opts: {
  startsAt: Date;
  date: string;
  settings: AgendaSettings;
  blocks: BlockLike[];
  booked: number;
  now: Date;
}): SlotState {
  const { startsAt, settings, now } = opts;
  const start = startsAt.getTime();
  const end = start + settings.slotMinutes * 60_000;
  if (start <= now.getTime()) return "pasado";
  const today = toLocalParts(now, settings.timeZone).date;
  if (daysBetween(today, opts.date) > settings.maxDaysAhead) return "fuera_de_rango";
  if (start - now.getTime() < settings.minNoticeMin * 60_000) return "anticipacion";
  if (opts.blocks.some((b) => overlaps(start, end, b))) return "bloqueado";
  if (opts.booked >= settings.slotCapacity) return "ocupado";
  return "libre";
}

/**
 * Disponibilidad de `days` días desde `from` (fecha local). `booked` es la
 * ocupación por instante ISO (appointment_slots).
 */
export function computeAvailability(opts: {
  rules: ScheduleRuleLike[];
  blocks: BlockLike[];
  booked: Map<string, number>;
  settings: AgendaSettings;
  now: Date;
  from: string;
  days: number;
}): AvailabilityDay[] {
  const out: AvailabilityDay[] = [];
  for (let i = 0; i < opts.days; i++) {
    const date = addDays(opts.from, i);
    const weekday = weekdayOf(date);
    const times = slotTimesFor(opts.rules, weekday, opts.settings.slotMinutes);
    const slots: Slot[] = times.map((time) => {
      const startsAt = localToUtc(date, time, opts.settings.timeZone);
      const iso = startsAt.toISOString();
      const booked = opts.booked.get(iso) ?? 0;
      const state = slotState({
        startsAt,
        date,
        settings: opts.settings,
        blocks: opts.blocks,
        booked,
        now: opts.now,
      });
      return { time, startsAt: iso, state, available: state === "libre", booked };
    });
    out.push({
      date,
      weekday,
      open: times.length > 0,
      available: slots.some((s) => s.available),
      slots,
    });
  }
  return out;
}

/**
 * ¿El cliente todavía puede reprogramar o cancelar? Solo con la
 * anticipación mínima; más cerca del turno, el botón abre WhatsApp.
 */
export function customerCanModify(
  startsAt: Date,
  settings: Pick<AgendaSettings, "minNoticeMin">,
  now: Date,
): boolean {
  return startsAt.getTime() - now.getTime() >= settings.minNoticeMin * 60_000;
}
