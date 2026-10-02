import type { OrderStatus, PaymentMethodId } from "@/lib/types";

/**
 * Máquina de estados de un pedido de retiro, la del prototipo (`NEXT`):
 *
 *   Transf. pendiente →(Validar transferencia)→ Pagado
 *   Pagado →(Pasar a armado)→ Armando
 *   Armando →(Marcar lista para retirar)→ Listo para retirar
 *   Listo para retirar →(Marcar como retirada)→ Retirado
 *   Paga en local →(Registrar pago y retiro)→ Retirado
 *
 * más CANCELADO (devuelve el stock) desde cualquier estado abierto, y
 * VENCIDO (reserva sin pago que pasó su plazo). Un pago con Mercado Pago
 * pendiente no tiene botón: lo resuelve la pasarela.
 *
 * Puro: lo usan el server (transiciones atómicas en lib/server/orders.ts)
 * y la UI del admin (labels, pills, botón amarillo, timeline).
 */

export interface OrderLike {
  status: OrderStatus;
  paymentMethod: PaymentMethodId;
}

/** Etapa visible del pedido (la pill del admin). */
export type OrderStage =
  | "transf_pendiente"
  | "paga_en_local"
  | "pago_pendiente"
  | "señado"
  | "pagado"
  | "armando"
  | "listo"
  | "retirado"
  | "cancelado"
  | "vencido"
  | "en_camino"
  | "entregado";

export function orderStage(o: OrderLike): OrderStage {
  switch (o.status) {
    case "PENDIENTE_PAGO":
      if (o.paymentMethod === "transferencia") return "transf_pendiente";
      if (o.paymentMethod === "efectivo") return "paga_en_local";
      return "pago_pendiente";
    case "SEÑADO":
      return "señado";
    case "PAGADO":
      return "pagado";
    case "EN_PREPARACION":
      return "armando";
    case "LISTO_RETIRO":
      return "listo";
    case "RETIRADO":
      return "retirado";
    case "CANCELADO":
      return "cancelado";
    case "VENCIDO":
      return "vencido";
    case "ENVIADO":
    case "ENTREGA_COORDINADA":
      return "en_camino";
    case "ENTREGADO":
      return "entregado";
  }
}

export const STAGE_LABELS: Record<OrderStage, string> = {
  transf_pendiente: "Transf. pendiente",
  paga_en_local: "Paga en local",
  pago_pendiente: "Pago pendiente",
  señado: "Señado",
  pagado: "Pagado",
  armando: "Armando",
  listo: "Listo para retirar",
  retirado: "Retirado",
  cancelado: "Cancelado",
  vencido: "Vencido",
  en_camino: "En camino",
  entregado: "Entregado",
};

export function orderStageLabel(o: OrderLike): string {
  return STAGE_LABELS[orderStage(o)];
}

export interface OrderTransition {
  /** Texto del botón amarillo. */
  label: string;
  from: OrderStatus;
  to: OrderStatus;
  /** Registra el cobro manual (transferencia validada o efectivo). */
  registersPayment: boolean;
}

/** La próxima transición del botón amarillo, o null si no hay. */
export function nextTransition(o: OrderLike): OrderTransition | null {
  switch (o.status) {
    case "PENDIENTE_PAGO":
      if (o.paymentMethod === "transferencia")
        return { label: "Validar transferencia", from: o.status, to: "PAGADO", registersPayment: true };
      if (o.paymentMethod === "efectivo")
        return { label: "Registrar pago y retiro", from: o.status, to: "RETIRADO", registersPayment: true };
      return null;
    case "PAGADO":
      return { label: "Pasar a armado", from: o.status, to: "EN_PREPARACION", registersPayment: false };
    case "EN_PREPARACION":
      return { label: "Marcar lista para retirar", from: o.status, to: "LISTO_RETIRO", registersPayment: false };
    case "LISTO_RETIRO":
      return { label: "Marcar como retirada", from: o.status, to: "RETIRADO", registersPayment: false };
    default:
      return null;
  }
}

const FINAL: OrderStatus[] = ["RETIRADO", "ENTREGADO", "CANCELADO", "VENCIDO"];

/** Se puede cancelar mientras no esté retirado ni cerrado. */
export function canCancel(o: Pick<OrderLike, "status">): boolean {
  return !FINAL.includes(o.status);
}

export function isFinal(o: Pick<OrderLike, "status">): boolean {
  return FINAL.includes(o.status);
}

/** Pasos de la timeline del admin (prototipo 3a). */
export const PROGRESS_STEPS = [
  "Pedido recibido",
  "Pago confirmado",
  "Armado y ajuste",
  "Listo para retirar",
  "Retirado",
] as const;

/**
 * Cuántos pasos de PROGRESS_STEPS están hechos (el `DONE` del prototipo):
 * el siguiente es el "actual".
 */
export function progressDone(o: OrderLike): number {
  switch (orderStage(o)) {
    case "transf_pendiente":
    case "paga_en_local":
    case "pago_pendiente":
      return 1;
    case "señado":
    case "pagado":
    case "armando":
      return 2;
    case "listo":
    case "en_camino":
      return 4;
    case "retirado":
    case "entregado":
      return 5;
    default:
      return 0;
  }
}
