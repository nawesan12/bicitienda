import type { OrderStatus } from "@/lib/types";

/**
 * Lenguaje visual de los pedidos en el panel (pills del mismo sistema que
 * Consultas/Productos): grupo de filtro y colores por estado.
 */

export type OrderGroup = "pago" | "pagados" | "listos" | "cerrados";

export const ORDER_GROUPS: [key: OrderGroup | "todos", label: string][] = [
  ["todos", "Todos"],
  ["pago", "Esperando pago"],
  ["pagados", "Pagados"],
  ["listos", "Listos / En camino"],
  ["cerrados", "Cerrados"],
];

export function orderGroup(status: OrderStatus): OrderGroup {
  if (status === "PENDIENTE_PAGO") return "pago";
  if (["SEÑADO", "PAGADO", "EN_PREPARACION"].includes(status)) return "pagados";
  if (["LISTO_RETIRO", "ENVIADO", "ENTREGA_COORDINADA"].includes(status)) return "listos";
  return "cerrados";
}

/** Clases de la pill de estado. */
export function statusPillClass(status: OrderStatus): string {
  if (status === "CANCELADO" || status === "VENCIDO") return "bg-danger-bg text-danger";
  switch (orderGroup(status)) {
    case "pago":
      return "bg-night text-brand";
    case "pagados":
      return "bg-brand-pastel text-brand-deeper";
    case "listos":
      return "bg-brand text-night";
    default:
      return "bg-chip text-ink/60";
  }
}

export const PAYMENT_LABEL: Record<string, string> = {
  payway: "Payway",
  mercadopago: "Mercado Pago",
  transferencia: "Transferencia",
  efectivo: "Efectivo en el local",
};

export const DELIVERY_LABEL: Record<string, string> = {
  retiro: "Retiro en el local",
  "envio-mdq": "Entrega a domicilio",
  "envio-coordinar": "Envío a coordinar",
};

/** "Payway · 6 cuotas" / "Transferencia". */
export function paymentLabel(method: string, installments: number): string {
  const base = PAYMENT_LABEL[method] ?? method;
  return installments > 1 ? `${base} · ${installments} cuotas` : base;
}
