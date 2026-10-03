"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useToast } from "@/components/admin/toast";
import { Button, buttonClasses, cx, FormError, Modal } from "@/components/bt";
import { advanceOrder, cancelOrder } from "@/lib/server/actions/orders";
import type { OrderStatus } from "@/lib/types";

const DONE_TOAST: Partial<Record<OrderStatus, string>> = {
  PAGADO: "Transferencia validada · pedido pagado",
  EN_PREPARACION: "Pedido en armado",
  LISTO_RETIRO: "Listo para retirar · avisale por WhatsApp",
  RETIRADO: "Pedido retirado",
};

/**
 * Botonera del pedido (3a / 4i): botón amarillo con la próxima transición
 * de lib/order-flow.ts, "Avisar por WhatsApp" (wa.me con la plantilla
 * "Pedido listo" cuando está listo) y "Cancelar pedido" (devuelve el
 * stock). Las transiciones que registran un cobro y la cancelación
 * piden confirmación.
 */
export function OrderPanelActions({
  orderId,
  number,
  next,
  canCancel,
  whatsappUrl,
  whatsappIsTemplate,
  variant,
}: {
  orderId: string;
  number: string;
  next: { label: string; from: OrderStatus; to: OrderStatus } | null;
  canCancel: boolean;
  whatsappUrl: string;
  whatsappIsTemplate: boolean;
  variant: "panel" | "page";
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [ask, setAsk] = useState<null | "pay" | "cancel">(null);
  const [error, setError] = useState<string | null>(null);
  const registersPayment = next?.from === "PENDIENTE_PAGO";

  function advance() {
    if (!next) return;
    setError(null);
    start(async () => {
      const res = await advanceOrder(orderId, next.from);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setAsk(null);
      toast(DONE_TOAST[res.status] ?? "Pedido actualizado");
      router.refresh();
    });
  }

  function cancel() {
    setError(null);
    start(async () => {
      const res = await cancelOrder(orderId);
      if (!res.ok) {
        setError("No se pudo cancelar: el pedido cambió de estado. Recargá la página.");
        return;
      }
      setAsk(null);
      toast("Pedido cancelado · el stock volvió al catálogo");
      router.refresh();
    });
  }

  const page = variant === "page";
  const wa = (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      title={whatsappIsTemplate ? "Abre WhatsApp con el mensaje “Pedido listo”" : "Abre el chat de WhatsApp con el cliente"}
      className={cx(buttonClasses({ variant: "secondary", size: "sm" }), "min-w-0 flex-1 justify-center whitespace-normal px-2 text-center leading-[1.15]", page && "max-lg:min-h-[50px] max-lg:w-full max-lg:text-[15px]")}
    >
      Avisar por WhatsApp
    </a>
  );

  return (
    <>
      {error && !ask && <FormError>{error}</FormError>}
      {next && (
        <Button
          variant="primary"
          size="full"
          disabled={pending}
          onClick={() => (registersPayment ? setAsk("pay") : advance())}
          className={cx("text-[15px] lg:py-4", page && "max-lg:min-h-[52px]")}
        >
          {pending && !ask ? "Guardando…" : next.label}
        </Button>
      )}
      {page ? (
        <>
          <div className="flex flex-col gap-[10px] lg:hidden">
            {wa}
            {canCancel && (
              <button
                type="button"
                onClick={() => setAsk("cancel")}
                className="min-h-11 self-center text-[13px] font-extrabold uppercase tracking-[.06em] text-red-light hover:underline"
              >
                Cancelar pedido
              </button>
            )}
          </div>
          <div className="flex gap-[10px] max-lg:hidden">
            {wa}
            {canCancel && (
              <Button variant="danger" size="sm" className="min-w-0 flex-1 whitespace-normal px-2 leading-[1.15]" onClick={() => setAsk("cancel")}>
                Cancelar pedido
              </Button>
            )}
          </div>
        </>
      ) : (
        <div className="flex gap-[10px]">
          {wa}
          {canCancel && (
            <Button variant="danger" size="sm" className="min-w-0 flex-1 whitespace-normal px-2 leading-[1.15]" onClick={() => setAsk("cancel")}>
              Cancelar pedido
            </Button>
          )}
        </div>
      )}

      <Modal
        open={ask === "pay"}
        onClose={() => setAsk(null)}
        title={next?.label ?? ""}
        width={420}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setAsk(null)}>
              Volver
            </Button>
            <Button variant="primary" size="sm" disabled={pending} onClick={advance}>
              {pending ? "Guardando…" : "Sí, registrar"}
            </Button>
          </>
        }
      >
        <p className="m-0 text-[15px] leading-[1.5] text-text-2">
          {next?.to === "RETIRADO"
            ? `Registra el pago en efectivo del pedido #${number} y lo marca como retirado.`
            : `Confirmá que la transferencia del pedido #${number} ya está acreditada. El pedido pasa a Pagado y le llega el mail de confirmación.`}
        </p>
        <FormError>{error}</FormError>
      </Modal>

      <Modal
        open={ask === "cancel"}
        onClose={() => setAsk(null)}
        title="Cancelar pedido"
        width={420}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setAsk(null)}>
              Volver
            </Button>
            <Button variant="danger" size="sm" disabled={pending} onClick={cancel}>
              {pending ? "Cancelando…" : "Sí, cancelar"}
            </Button>
          </>
        }
      >
        <p className="m-0 text-[15px] leading-[1.5] text-text-2">
          El pedido #{number} pasa a Cancelado y el stock vuelve al catálogo. Si ya hubo un pago, la devolución se hace a mano. No se puede deshacer.
        </p>
        <FormError>{error}</FormError>
      </Modal>
    </>
  );
}
