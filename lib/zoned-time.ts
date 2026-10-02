/**
 * Fechas "de pared" en la zona horaria del local (IANA, p. ej.
 * America/Argentina/Buenos_Aires) ↔ instantes UTC, sin dependencias. La
 * agenda razona en fecha local ("2026-10-08") + hora local ("17:30"); la
 * base guarda timestamptz. Puro: server y navegador.
 */

const formatters = new Map<string, Intl.DateTimeFormat>();

function fmt(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "short",
      hourCycle: "h23",
    });
    formatters.set(timeZone, f);
  }
  return f;
}

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export interface LocalParts {
  /** "2026-10-08" */
  date: string;
  /** "17:30" */
  time: string;
  /** 0 = domingo */
  weekday: number;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

/** Componentes locales de un instante en `timeZone`. */
export function toLocalParts(instant: Date, timeZone: string): LocalParts {
  const p = Object.fromEntries(fmt(timeZone).formatToParts(instant).map((x) => [x.type, x.value]));
  const year = Number(p.year);
  const month = Number(p.month);
  const day = Number(p.day);
  const hour = Number(p.hour) % 24;
  const minute = Number(p.minute);
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    time: `${String(hour).padStart(2, "0")}:${p.minute}`,
    weekday: WEEKDAYS[p.weekday] ?? 0,
    year,
    month,
    day,
    hour,
    minute,
  };
}

function offsetMs(instant: number, timeZone: string): number {
  const p = Object.fromEntries(fmt(timeZone).formatToParts(new Date(instant)).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour) % 24,
    Number(p.minute),
    Number(p.second),
  );
  return asUtc - Math.floor(instant / 1000) * 1000;
}

/** "2026-10-08" + "17:30" en `timeZone` → instante UTC. */
export function localToUtc(date: string, time: string, timeZone: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const off1 = offsetMs(guess, timeZone);
  let t = guess - off1;
  const off2 = offsetMs(t, timeZone);
  if (off2 !== off1) t = guess - off2;
  return new Date(t);
}

/** Suma días a una fecha local "YYYY-MM-DD" (calendario puro, sin zona). */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return t.toISOString().slice(0, 10);
}

/** Día de la semana (0 = domingo) de una fecha local "YYYY-MM-DD". */
export function weekdayOf(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Diferencia en días entre dos fechas locales (b − a). */
export function daysBetween(a: string, b: string): number {
  const [ya, ma, da] = a.split("-").map(Number);
  const [yb, mb, db] = b.split("-").map(Number);
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86_400_000);
}

/** "HH:MM" → minutos desde la medianoche. */
export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** minutos → "HH:MM". */
export function fromMinutes(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

export const isLocalDate = (s: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(s);
export const isLocalTime = (s: string): boolean => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** "jueves 8 de octubre" de una fecha local. */
export function longDayLabel(date: string): string {
  const [, m, d] = date.split("-").map(Number);
  return `${DIAS[weekdayOf(date)]} ${d} de ${MESES[m - 1]}`;
}
