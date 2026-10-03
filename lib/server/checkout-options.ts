import { deliveryMethods, isOnlinePayment, paymentMethods } from "@/lib/config";
import { isOnlinePaymentAvailable } from "@/lib/server/payment-availability";
import type { RuntimeStore } from "@/lib/server/queries";
import type { DeliveryMethod, PaymentMethod } from "@/lib/types";

/**
 * Medios de pago y de entrega que ofrece el checkout, con los textos
 * armados desde los AJUSTES vigentes (no desde lib/config.ts): % de
 * transferencia, horas de reserva, cuotas, costo de envío. Filtra lo que
 * no está disponible ahora: efectivo apagado en Ajustes o una pasarela sin
 * credenciales en producción.
 */

export interface CheckoutOption extends PaymentMethod {
  /** Texto corto para el resumen ("Ahorrás…", "Pagás al retirar"). */
  note: string;
}

function hoursLabel(h: number): string {
  return h % 24 === 0 && h >= 48 ? `${h / 24} días` : `${h} hs`;
}

export function paymentOptions(runtime: RuntimeStore): CheckoutOption[] {
  return paymentMethods
    .filter((p) => (p.id === "efectivo" ? runtime.cashEnabled : true))
    .filter((p) => !isOnlinePayment(p.id) || isOnlinePaymentAvailable(p.id))
    .map((p) => {
      switch (p.id) {
        case "mercadopago": {
          // Tope real de Checkout Pro (Ajustes → Pagos), sin prometer interés.
          const n = runtime.maxInstallments;
          return {
            ...p,
            detail: n > 1 ? `${p.detail} Hasta ${n} cuotas.` : p.detail,
            note: n > 1 ? `Hasta ${n} cuotas` : "En un pago",
          };
        }
        case "transferencia":
          return {
            ...p,
            name: runtime.transferDiscount > 0 ? `Transferencia · ${runtime.transferDiscount}% off` : "Transferencia",
            detail: `Te pasamos el alias al confirmar. Reservamos el stock ${hoursLabel(runtime.reservationHours)}.`,
            note: runtime.transferDiscount > 0 ? `${runtime.transferDiscount}% de descuento` : "",
          };
        case "efectivo":
          return {
            ...p,
            detail:
              runtime.cashReservationHours == null
                ? "Reservás online y pagás cuando la retirás."
                : `Reservás online y pagás cuando la retirás (te la guardamos ${hoursLabel(runtime.cashReservationHours)}).`,
            note: "Pagás al retirar",
          };
        default:
          return { ...p, note: "" };
      }
    });
}

export function deliveryOptions(runtime: RuntimeStore): DeliveryMethod[] {
  return deliveryMethods.map((d) => {
    if (d.id === "envio-mdq") return { ...d, cost: runtime.localShippingCost };
    if (d.isPickup) return { ...d, detail: `${runtime.locations[0]?.address ?? d.detail} · sin cargo` };
    return d;
  });
}
