import { zonedParts } from "@/lib/format";
import type { FullOrder, TimelineStep } from "@/lib/server/order-queries";

/**
 * Helpers de presentación de un pedido para la confirmación (2e) y el
 * seguimiento: fechas en la hora del local, el medio de pago y el avance
 * de los 4 pasos del diseño a partir de publicTimeline().
 */

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** "1 de octubre 2026" (el eyebrow de 2e lo pasa a mayúsculas). */
export function longDate(date: Date): string {
  const p = zonedParts(date);
  return `${p.day} de ${MESES[p.month]} ${p.year}`;
}

/** "hoy 14:32" / "ayer 09:10" / "28 sep 18:05" en la hora del local. */
export function relativeStamp(date: Date, now = new Date()): string {
  const p = zonedParts(date);
  const n = zonedParts(now);
  const y = zonedParts(new Date(now.getTime() - 86400_000));
  const time = `${p.hh}:${p.mm}`;
  if (p.day === n.day && p.month === n.month && p.year === n.year) return `hoy ${time}`;
  if (p.day === y.day && p.month === y.month && p.year === y.year) return `ayer ${time}`;
  return `${p.day} ${MESES[p.month].slice(0, 3)} ${time}`;
}

/** "jueves 8 de octubre, 14:32" para los vencimientos de reserva. */
export function expiryLabel(date: Date): string {
  const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const p = zonedParts(date);
  return `${DIAS[p.weekday]} ${p.day} de ${MESES[p.month]}, ${p.hh}:${p.mm} hs`;
}

/** Primer nombre para el H1 ("¡Listo, Juan!"). */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

/** Fecha del pago aprobado (la última), si la hay. */
export function approvedAt(full: FullOrder): Date | null {
  const ok = full.payments.filter((p) => p.status === "approved");
  return ok.length ? ok[ok.length - 1].createdAt : null;
}

/** El último intento online fue rechazado. */
export function lastPaymentRejected(full: FullOrder): boolean {
  const last = [...full.payments].sort((a, b) => +a.createdAt - +b.createdAt).pop();
  return last?.status === "rejected";
}

/**
 * Cuántos de los 4 pasos del diseño están hechos
 * (Pago · Armado · Lista para retirar · Retirás). En efectivo el paso 1
 * es la reserva (siempre hecha) y el pago va al final, con el retiro.
 */
export function stepsDone(timeline: TimelineStep[], cash: boolean): number {
  const [, pay, ready, delivered] = timeline;
  if (delivered?.state === "done") return 4;
  if (ready?.state === "done") return 3;
  if (cash) return 1;
  return pay?.state === "done" ? 1 : 0;
}
