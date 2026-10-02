import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/admin/ui";
import { cx as cn } from "@/components/admin/cx";
import { formatARS, formatDateTime } from "@/lib/format";
import { getAdminLocations, getAdminOrder } from "@/lib/server/admin-queries";
import { STATUS_LABELS } from "@/lib/server/order-queries";
import {
  DELIVERY_LABEL,
  PAYMENT_LABEL,
  paymentLabel,
  statusPillClass,
} from "../order-ui";
import { OrderActions } from "./order-actions";

export const metadata: Metadata = { title: "Pedido" };

const kicker = "font-sans text-[10.5px] font-bold tracking-[.18em] text-ink/50";

export default async function AdminOrderPage({
  params,
}: {
  params: Promise<{ numero: string }>;
}) {
  const { numero } = await params;
  const full = await getAdminOrder(numero);
  if (!full) notFound();
  const { order, items, customer, payments } = full;
  const closed = order.status === "CANCELADO" || order.status === "VENCIDO";
  const locations = await getAdminLocations();
  // Con una sola sucursal el chip sobra: no agrega información.
  const orderLocationName =
    locations.length > 1
      ? (locations.find(
          (l) => l.id === (order.pickupLocationId ?? order.fulfillmentLocationId),
        )?.shortName ?? null)
      : null;
  // El total con 3 o 6 cuotas lleva el recargo del Plan MiPyME.
  const surcharge = Math.max(
    0,
    order.total - (order.subtotal - order.discount + order.shippingCost),
  );

  return (
    <div className="animate-fade-in">
      <Link
        href="/admin/pedidos"
        className="inline-flex items-center font-sans text-[13px] font-bold text-ink/55 transition-colors hover:text-ink max-[859px]:min-h-11"
      >
        ← Todos los pedidos
      </Link>
      <div className="mb-[18px] mt-2 flex flex-wrap items-center gap-3">
        <span className="font-display text-[26px] tracking-normal">Pedido #{order.number}</span>
        <span
          className={cn(
            "rounded-full px-3 py-[7px] font-sans text-[10.5px] font-bold tracking-[.12em]",
            statusPillClass(order.status),
          )}
        >
          {STATUS_LABELS[order.status].toUpperCase()}
        </span>
        <span className="font-sans text-xs text-ink/45">
          Creado el {formatDateTime(order.createdAt)}
          {order.expiresAt && order.status === "PENDIENTE_PAGO" && (
            <> · reserva hasta {formatDateTime(order.expiresAt)}</>
          )}
        </span>
      </div>

      <div className="grid items-start gap-[18px] min-[1000px]:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-[18px]">
          <Card>
            <div className={kicker}>PRODUCTOS</div>
            <div className="flex flex-col gap-2 font-sans text-sm text-ink/80">
              {items.map((it) => (
                <div key={it.id} className="flex justify-between gap-3">
                  <span>
                    {it.quantity}× {it.name}
                  </span>
                  <span className="font-semibold">{formatARS(it.unitPrice * it.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="mt-1 border-t border-ink/10 pt-3 font-sans text-sm">
              <div className="flex justify-between text-ink/60">
                <span>Subtotal</span>
                <span>{formatARS(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="mt-1 flex justify-between text-brand-deep">
                  <span>Descuento por transferencia</span>
                  <span>−{formatARS(order.discount)}</span>
                </div>
              )}
              <div className="mt-1 flex justify-between text-ink/60">
                <span>Envío</span>
                <span>
                  {order.deliveryMethod === "envio-coordinar"
                    ? "A cotizar"
                    : order.shippingCost > 0
                      ? formatARS(order.shippingCost)
                      : "Gratis"}
                </span>
              </div>
              {order.installments > 1 && surcharge > 0 && (
                <div className="mt-1 flex justify-between text-ink/60">
                  <span>Recargo Plan MiPyME ({order.installments} cuotas)</span>
                  <span>{formatARS(surcharge)}</span>
                </div>
              )}
              <div className="mt-2 flex justify-between font-display text-[19px] tracking-normal text-ink">
                <span>Total</span>
                <span>{formatARS(order.total)}</span>
              </div>
              {order.installments > 1 && (
                <div className="mt-1 flex justify-between text-ink/60">
                  <span>{order.installments} cuotas de</span>
                  <span>{formatARS(order.total / order.installments)}</span>
                </div>
              )}
              <div className="mt-1 flex justify-between text-ink/60">
                <span>Cobrado</span>
                <span>{formatARS(order.paidAmount)}</span>
              </div>
              {order.balanceDue > 0 && !closed && (
                <div className="mt-1 flex justify-between font-bold text-danger">
                  <span>{order.status === "SEÑADO" ? "Saldo de la seña" : "Falta cobrar"}</span>
                  <span>{formatARS(order.balanceDue)}</span>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <div className={kicker}>HISTORIAL</div>
            <div className="flex flex-col gap-2">
              {order.timeline.map((ev, i) => (
                <div
                  key={`${ev.key}-${i}`}
                  className="flex items-baseline justify-between gap-3 font-sans text-[13px]"
                >
                  <span className="flex items-center gap-2 text-ink/80">
                    <span
                      className={cn(
                        "inline-block h-2 w-2 flex-none rounded-full",
                        ev.state === "done" ? "bg-brand" : "bg-ink/20",
                      )}
                    />
                    {ev.label}
                  </span>
                  <span className="whitespace-nowrap text-ink/40">{ev.at}</span>
                </div>
              ))}
            </div>
            {payments.length > 0 && (
              <>
                <div className={cn(kicker, "mt-3")}>PAGOS</div>
                <div className="flex flex-col gap-2">
                  {payments.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-baseline justify-between gap-3 font-sans text-[13px]"
                    >
                      <span className="text-ink/80">
                        {PAYMENT_LABEL[p.method] ?? p.method}
                        {p.kind === "sena" ? " · seña" : p.kind === "saldo" ? " · saldo" : ""}
                        <span className="text-ink/40"> · {formatDateTime(p.createdAt)}</span>
                        {p.providerPaymentId && (
                          <span className="text-ink/40"> · {p.providerPaymentId}</span>
                        )}
                      </span>
                      <span
                        className={cn(
                          "font-bold",
                          p.status === "approved" ? "text-brand-deep" : "text-danger",
                        )}
                      >
                        {p.status === "approved" ? "" : p.status === "pending" ? "pendiente " : "rechazado "}
                        {formatARS(p.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-[18px]">
          <Card>
            <div className={kicker}>CLIENTE</div>
            <div className="font-sans text-sm leading-relaxed text-ink/80">
              <strong className="text-ink">{customer.name}</strong>
              <br />
              {customer.email}
              <br />
              {customer.phone}
            </div>
            <a
              href={`https://wa.me/${customer.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola ${customer.name.split(" ")[0]}! Te escribimos por tu pedido ${order.number}`)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center self-start rounded-full bg-ink px-5 py-[10px] font-sans text-[12.5px] font-bold text-cream transition-colors hover:bg-brand hover:text-night max-[859px]:min-h-11"
            >
              WhatsApp al cliente
            </a>
          </Card>

          <Card>
            <div className={kicker}>ENTREGA Y PAGO</div>
            <div className="font-sans text-sm leading-relaxed text-ink/80">
              {DELIVERY_LABEL[order.deliveryMethod]}
              {orderLocationName && (
                <>
                  {" "}
                  <span className="rounded-full bg-brand-pastel px-2 py-[2px] font-sans text-[10.5px] font-bold text-brand-deeper">
                    {order.deliveryMethod === "retiro" ? "RETIRA EN" : "DESPACHA"}{" "}
                    {orderLocationName.toUpperCase()}
                  </span>
                </>
              )}
              {order.deliveryAddress && (
                <>
                  <br />
                  {order.deliveryAddress}
                </>
              )}
              {order.pickupCode && (
                <>
                  <br />
                  Código de retiro: <strong className="text-ink">{order.pickupCode}</strong>
                </>
              )}
              <br />
              {paymentLabel(order.paymentMethod, order.installments)}
              {order.paymentMode === "sena" && ` · seña de ${formatARS(order.depositAmount)}`}
              {order.deliveryNotes && (
                <>
                  <br />
                  <span className="text-ink/55">Nota: {order.deliveryNotes}</span>
                </>
              )}
            </div>
          </Card>

          <OrderActions
            orderId={order.id}
            status={order.status}
            paymentMethod={order.paymentMethod}
            deliveryMethod={order.deliveryMethod}
            total={order.total}
            balanceDue={order.balanceDue}
          />
        </div>
      </div>
    </div>
  );
}
