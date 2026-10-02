import type { OrderStatus } from "@/lib/types";

/**
 * Pill de estado de un pedido (seguimiento y "Mis pedidos"), con los tres
 * tonos del handoff: verde (en curso / ok), rojo (cerrado) y neutro
 * (esperando el pago).
 */
export function statusPill(status: OrderStatus): string {
  const tone =
    status === "CANCELADO" || status === "VENCIDO"
      ? "bg-danger-bg text-danger"
      : status === "PENDIENTE_PAGO"
        ? "bg-chip text-ink/70"
        : "bg-brand-pastel text-brand-deeper";
  return `inline-flex items-center whitespace-nowrap rounded-full px-[14px] py-[7px] font-sans text-[11px] font-bold uppercase tracking-[.12em] ${tone}`;
}
