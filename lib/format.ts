import { store } from "@/lib/config";

/**
 * Formato de moneda argentino: punto de miles, sin decimales. `$42.900`.
 * Se redondea porque el catálogo nunca maneja centavos.
 */
export function formatARS(amount: number): string {
  return `$${Math.round(amount).toLocaleString("es-AR", {
    maximumFractionDigits: 0,
  })}`;
}

/** Igual que formatARS pero sin el signo, para inputs y tablas. */
export function formatNumber(amount: number): string {
  return Math.round(amount).toLocaleString("es-AR", {
    maximumFractionDigits: 0,
  });
}

/** Porcentaje de descuento entre precio viejo y actual: 19 para "−19%". */
export function discountPercent(price: number, oldPrice: number): number {
  return Math.round((1 - price / oldPrice) * 100);
}

const DIAS = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/** "martes 2 de septiembre" */
export function formatLongDate(date: Date): string {
  return `${DIAS[date.getDay()]} ${date.getDate()} de ${MESES[date.getMonth()]}`;
}

/** "2 sep" */
export function formatShortDate(date: Date): string {
  return `${date.getDate()} ${MESES[date.getMonth()].slice(0, 3)}`;
}

/**
 * Baja solo la primera letra, para encajar un nombre propio dentro de una
 * frase sin romperlo: "Retiro en Galería Torreón L17" → "retiro en Galería
 * Torreón L17". `toLowerCase()` a secas arruinaría el nombre del local.
 */
export function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/* ── Fechas en la zona horaria de la tienda ──────────────────── */


/** Zona de la tienda: el server corre en UTC, el dueño no. */
export const TIME_ZONE = store.timeZone;

const partsFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  day: "numeric",
  month: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: TIME_ZONE,
});

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** Componentes de una fecha en la hora del local (día de semana 0 = domingo). */
export function zonedParts(date: Date): {
  weekday: number;
  day: number;
  month: number;
  year: number;
  hh: string;
  mm: string;
} {
  const p = Object.fromEntries(
    partsFmt.formatToParts(date).map((x) => [x.type, x.value]),
  );
  return {
    weekday: WEEKDAY_INDEX[p.weekday] ?? 0,
    day: Number(p.day),
    month: Number(p.month) - 1,
    year: Number(p.year),
    hh: p.hour,
    mm: p.minute,
  };
}

/**
 * "01 oct, 18:30" en la hora del local (admin, CSV). Armado a mano sobre
 * `zonedParts`: el texto de Intl varía entre el ICU de Node y el del
 * navegador (12/24 h, espacios finos) y rompería la hidratación.
 */
export function formatDateTime(date: Date | string): string {
  const t = zonedParts(typeof date === "string" ? new Date(date) : date);
  return `${String(t.day).padStart(2, "0")} ${MESES[t.month].slice(0, 3)}, ${t.hh}:${t.mm}`;
}
