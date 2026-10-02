/**
 * Formatos de dinero del handoff: `'$ ' + Math.round(n).toLocaleString('es-AR')`
 * (sin decimales, punto de miles). Ej: `$ 489.900`.
 */
export function formatMoney(amount: number): string {
  return "$ " + Math.round(amount).toLocaleString("es-AR");
}

/** Valor de cada cuota sin interés (sin redondear: lo redondea formatMoney). */
export function installmentAmount(price: number, installments: number): number {
  return installments > 0 ? price / installments : price;
}

/** Precio con el % off de transferencia aplicado. */
export function transferPrice(price: number, discountPct: number): number {
  return price * (1 - discountPct / 100);
}

/** "6 x $ 81.650 sin interés" */
export function installmentsLabel(price: number, installments: number): string {
  return `${installments} x ${formatMoney(installmentAmount(price, installments))} sin interés`;
}

/** "$ 440.910 por transferencia" */
export function transferLabel(price: number, discountPct: number): string {
  return `${formatMoney(transferPrice(price, discountPct))} por transferencia`;
}
