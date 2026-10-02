/**
 * Helpers de formato del prototipo (puros, sin dependencias), para que los
 * datos demo y el copy se rendericen igual que en el handoff.
 */

/** `$ 489.900` (es-AR, sin decimales): `'$ ' + Math.round(n).toLocaleString('es-AR')`. */
export function ars(n: number): string {
  return "$ " + Math.round(n).toLocaleString("es-AR");
}

/** Precio con el % off de transferencia (el prototipo: `price * 0.9`). */
export function transferPrice(price: number, discountPct: number): number {
  return Math.round(price * (1 - discountPct / 100));
}

/** Valor de cada cuota sin interés (el prototipo: `price / 6`). */
export function installmentValue(price: number, installments: number): number {
  return Math.round(price / installments);
}

/**
 * Completa `{clave}` en un texto (copy y plantillas de WhatsApp). Las
 * claves sin valor quedan tal cual, para que se note el faltante.
 */
export function fillTemplate(text: string, vars: Record<string, string | number>): string {
  return text.replace(/\{([^{}]+)\}/g, (m, k: string) =>
    k in vars ? String(vars[k]) : m,
  );
}
