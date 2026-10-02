"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useConfirm } from "@/components/admin/confirm";
import { useToast } from "@/components/admin/toast";
import { btnDanger, btnDark, btnOutline, Card } from "@/components/admin/ui";
import { isOnlinePayment } from "@/lib/config";
import { formatARS, formatNumber } from "@/lib/format";
import {
  cancelOrder,
  confirmManualPayment,
  registerBalancePayment,
  setOrderStatus,
} from "@/lib/server/actions/orders";
import type {
  DeliveryMethodId,
  OrderStatus,
  PaymentMethodId,
} from "@/lib/types";

/**
 * Botonera de transiciones del pedido: qué acciones se ofrecen depende del
 * estado actual, y las delicadas (registrar pago, cancelar) confirman.
 */
export function OrderActions({
  orderId,
  status,
  paymentMethod,
  deliveryMethod,
  total,
  balanceDue,
}: {
  orderId: string;
  status: OrderStatus;
  paymentMethod: PaymentMethodId;
  deliveryMethod: DeliveryMethodId;
  total: number;
  balanceDue: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();
  const [balanceOpen, setBalanceOpen] = useState(false);

  const isPickup = deliveryMethod === "retiro";

  function run(fn: () => Promise<void>, done: string) {
    startTransition(async () => {
      await fn();
      toast(done);
      router.refresh();
    });
  }

  const primary = btnDark;
  const secondary = btnOutline;

  const actions: React.ReactNode[] = [];

  if (status === "PENDIENTE_PAGO" && !isOnlinePayment(paymentMethod)) {
    actions.push(
      <button
        key="pay"
        type="button"
        disabled={pending}
        className={primary}
        onClick={async () => {
          const ok = await confirm({
            icon: "$",
            title: "Registrar el pago",
            message: `Confirma que ${paymentMethod === "transferencia" ? "la transferencia" : "el efectivo"} por ${formatARS(total)} ya está en mano. El pedido pasa a PAGADO.`,
            label: "Sí, registrar",
          });
          if (ok)
            run(() => confirmManualPayment(orderId), "Pago registrado");
        }}
      >
        {paymentMethod === "transferencia"
          ? "Confirmar transferencia"
          : "Registrar pago en efectivo"}
      </button>,
    );
  }

  if (status === "SEÑADO" && balanceDue > 0) {
    actions.push(
      <button
        key="saldo"
        type="button"
        disabled={pending}
        className={primary}
        onClick={() => setBalanceOpen(true)}
      >
        Registrar saldo ({formatARS(balanceDue)})
      </button>,
    );
  }

  if (["PAGADO", "SEÑADO"].includes(status)) {
    actions.push(
      <button
        key="prep"
        type="button"
        disabled={pending}
        className={secondary}
        onClick={() =>
          run(
            () => setOrderStatus(orderId, "EN_PREPARACION"),
            "Pedido en preparación",
          )
        }
      >
        Pasar a preparación
      </button>,
    );
  }

  if (["PAGADO", "SEÑADO", "EN_PREPARACION"].includes(status)) {
    actions.push(
      isPickup ? (
        <button
          key="listo"
          type="button"
          disabled={pending}
          className={primary}
          onClick={() =>
            run(
              () => setOrderStatus(orderId, "LISTO_RETIRO"),
              "Marcado listo para retirar — email enviado",
            )
          }
        >
          Marcar listo para retirar
        </button>
      ) : (
        <button
          key="enviado"
          type="button"
          disabled={pending}
          className={primary}
          onClick={() =>
            run(
              () =>
                setOrderStatus(
                  orderId,
                  deliveryMethod === "envio-mdq"
                    ? "ENTREGA_COORDINADA"
                    : "ENVIADO",
                ),
              "Marcado en camino — email enviado",
            )
          }
        >
          {deliveryMethod === "envio-mdq"
            ? "Coordinar entrega"
            : "Marcar enviado"}
        </button>
      ),
    );
  }

  if (status === "LISTO_RETIRO") {
    actions.push(
      <button
        key="retirado"
        type="button"
        disabled={pending}
        className={primary}
        onClick={() =>
          run(() => setOrderStatus(orderId, "RETIRADO"), "Pedido retirado")
        }
      >
        Marcar retirado
      </button>,
    );
  }
  if (["ENVIADO", "ENTREGA_COORDINADA"].includes(status)) {
    actions.push(
      <button
        key="entregado"
        type="button"
        disabled={pending}
        className={primary}
        onClick={() =>
          run(() => setOrderStatus(orderId, "ENTREGADO"), "Pedido entregado")
        }
      >
        Marcar entregado
      </button>,
    );
  }

  const cancellable = [
    "PENDIENTE_PAGO",
    "SEÑADO",
    "PAGADO",
    "EN_PREPARACION",
    "LISTO_RETIRO",
  ].includes(status);

  return (
    <Card>
      <div className="font-sans text-[10.5px] font-bold tracking-[.18em] text-ink/50">
        ACCIONES
      </div>
      <div className="flex flex-col gap-[10px]">
        {actions.length > 0 ? (
          actions
        ) : (
          <div className="font-sans text-[13px] text-ink/50">
            {status === "PENDIENTE_PAGO"
              ? "Esperando el pago online del cliente."
              : "No hay acciones pendientes para este estado."}
          </div>
        )}
        {cancellable && (
          <button
            type="button"
            disabled={pending}
            className={btnDanger}
            onClick={async () => {
              const ok = await confirm({
                icon: "✕",
                title: "Cancelar el pedido",
                message:
                  "Si la reserva seguía activa, el stock vuelve al catálogo. Esta acción no se deshace.",
                label: "Sí, cancelar",
                destructive: true,
              });
              if (ok) run(() => cancelOrder(orderId), "Pedido cancelado");
            }}
          >
            Cancelar pedido
          </button>
        )}
      </div>
      {balanceOpen && (
        <BalanceModal
          balanceDue={balanceDue}
          pending={pending}
          onClose={() => setBalanceOpen(false)}
          onConfirm={(method, amount) => {
            setBalanceOpen(false);
            run(
              () => registerBalancePayment(orderId, method, amount),
              amount >= balanceDue
                ? "Saldo registrado — pedido pagado"
                : "Pago parcial del saldo registrado",
            );
          }}
        />
      )}
    </Card>
  );
}

/** Modal chico para registrar el saldo de un pedido señado. */
function BalanceModal({
  balanceDue,
  pending,
  onClose,
  onConfirm,
}: {
  balanceDue: number;
  pending: boolean;
  onClose: () => void;
  onConfirm: (method: "transferencia" | "efectivo", amount: number) => void;
}) {
  const [method, setMethod] = useState<"transferencia" | "efectivo">(
    "transferencia",
  );
  const [amountStr, setAmountStr] = useState(formatNumber(balanceDue));
  const amount = Number(amountStr.replace(/[^\d]/g, "")) || 0;

  const pill = (active: boolean) =>
    `flex-1 rounded-full border-[1.5px] px-4 py-[10px] font-sans text-[12.5px] font-bold transition-colors max-[859px]:min-h-11 ${
      active
        ? "border-brand bg-brand-pastel text-brand-deeper"
        : "border-ink/20 text-ink/55 hover:border-ink hover:text-ink"
    }`;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-5">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="animate-fade-in absolute inset-0 cursor-default bg-night/75 backdrop-blur-[4px]"
      />
      <div className="animate-admin-pop relative w-[484px] max-w-[94vw] rounded-[22px] bg-cream p-8 shadow-[0_40px_90px_rgba(0,0,0,.5)]">
        <div className="font-display text-[21px] tracking-normal text-ink">Registrar saldo</div>
        <p className="mt-2 font-sans text-[13px] leading-relaxed text-ink/60">
          Saldo pendiente: <strong>{formatARS(balanceDue)}</strong>. Con el
          total completo el pedido pasa a PAGADO y se avisa por email.
        </p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            className={pill(method === "transferencia")}
            onClick={() => setMethod("transferencia")}
          >
            Transferencia
          </button>
          <button
            type="button"
            className={pill(method === "efectivo")}
            onClick={() => setMethod("efectivo")}
          >
            Efectivo
          </button>
        </div>
        <div className="mt-3 flex items-center gap-[6px] rounded-[10px] border-[1.5px] border-ink/15 bg-white px-[14px] py-[11px] focus-within:border-brand">
          <span className="font-sans text-[13px] font-bold text-ink/45">$</span>
          <input
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            className="w-full border-none bg-transparent font-sans text-[14px] font-bold outline-none"
          />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className={btnOutline}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={pending || amount <= 0}
            onClick={() => onConfirm(method, amount)}
            className={btnDark}
          >
            Registrar {amount > 0 ? formatARS(amount) : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
