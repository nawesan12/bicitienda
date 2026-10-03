import type { LeadStatus, LeadType } from "@/lib/types";

/**
 * Filtros de Consultas (pantalla y export CSV). En BiciTienda caen acá:
 * los botones de WhatsApp de las fichas (producto), un aviso por pedido
 * y el de "Pago tardío" (pedido), y el resto de los botones (otras).
 */
export const LEAD_FILTERS = [
  ["todas", "Todas"],
  ["nuevas", "Sin atender"],
  ["pago-tardio", "Pago tardío"],
  ["producto", "Productos"],
  ["pedido", "Pedidos"],
  ["otras", "Otras"],
] as const;

export type LeadFilter = (typeof LEAD_FILTERS)[number][0];

export const isLatePayment = (l: { type: LeadType; label: string }) =>
  l.type === "pedido" && /^pago tard[ií]o/i.test(l.label);

export function matchesLead(l: { type: LeadType; label: string; status: LeadStatus }, f: string): boolean {
  switch (f) {
    case "nuevas":
      return l.status !== "atendida";
    case "pago-tardio":
      return isLatePayment(l);
    case "producto":
      return l.type === "producto";
    case "pedido":
      return l.type === "pedido";
    case "otras":
      return l.type !== "producto" && l.type !== "pedido";
    default:
      return true;
  }
}
