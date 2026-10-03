import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Button, TextLink } from "@/components/bt/button";
import { formatMoney } from "@/components/bt/format";
import { Panel } from "@/components/bt/panel";
import { OrderPill, type OrderPillStatus } from "@/components/bt/pill";
import { StepList } from "@/components/bt/timeline";
import { Display, Eyebrow, Mono } from "@/components/bt/typography";
import { OrderSummaryItem, SummaryRow, SummaryRows, SummaryTotal } from "@/components/bt";
import { isOnlinePayment } from "@/lib/config";
import { COPY } from "@/lib/data/demo/copy";
import { fillTemplate } from "@/lib/data/demo/format";
import { paths } from "@/lib/paths";
import { NOINDEX } from "@/lib/seo";
import { getOrderForCustomer, publicTimeline, type OrderRow } from "@/lib/server/order-queries";
import { getStore } from "@/lib/server/queries";
import { withinRateLimit } from "@/lib/server/rate-limit";
import { getOrderItemsInfo, getTransferDetails } from "@/lib/server/screens/compra-b";
import { waUrl } from "@/lib/whatsapp";
import { BUY } from "../../checkout/_lib/copy";
import { approvedAt, expiryLabel, longDate, relativeStamp, stepsDone } from "../../checkout/_lib/order-view";
import { TransferPanel } from "../../checkout/_lib/transfer-panel";
import { orderInstallments } from "@/lib/order-flow";

const T = BUY.tracking;
const B = BUY.confirm;
const C = COPY.confirmation;

export const metadata: Metadata = { title: T.metaTitle, robots: NOINDEX };

export const dynamic = "force-dynamic";

const GATEWAY: Record<string, string> = { mercadopago: "Mercado Pago", payway: "Payway" };

/** Estado del core + medio → pill del handoff (tabla de components/bt/README.md). */
function pillStatus(order: OrderRow): OrderPillStatus {
  switch (order.status) {
    case "PENDIENTE_PAGO":
      return order.paymentMethod === "efectivo" ? "paga_local" : "transf_pendiente";
    case "EN_PREPARACION":
      return "armando";
    case "LISTO_RETIRO":
      return "listo";
    case "RETIRADO":
    case "ENTREGADO":
      return "retirado";
    case "CANCELADO":
    case "VENCIDO":
      return "cancelado";
    default:
      return "pagado";
  }
}

/**
 * Seguimiento de un pedido (sin cuenta): número + email o WhatsApp en
 * ?e=. Con transferencia pendiente muestra los datos bancarios y el
 * comprobante en #comprobante (el mail de transferencia linkea ahí).
 */
export default async function TrackingPage({
  params,
  searchParams,
}: {
  params: Promise<{ numero: string }>;
  searchParams: Promise<{ e?: string }>;
}) {
  const [{ numero }, { e }] = await Promise.all([params, searchParams]);
  if (!e) notFound();
  // Anti-enumeración: el par número + contacto se prueba de a pocos por minuto.
  if (!(await withinRateLimit("tracking", 20))) notFound();
  const full = await getOrderForCustomer(numero, e);
  if (!full) notFound();
  const [runtime, info, bank] = await Promise.all([getStore(), getOrderItemsInfo(full.items), getTransferDetails()]);

  const { order, items, customer } = full;
  const contact = customer.email ?? customer.phone;
  const local = runtime.locations.find((l) => l.id === order.pickupLocationId) ?? runtime.locations[0];
  const timeline = publicTimeline(order);
  const method = order.paymentMethod;
  const online = isOnlinePayment(method);
  const isCash = method === "efectivo";
  const isTransfer = method === "transferencia";
  const closed = order.status === "CANCELADO" || order.status === "VENCIDO";
  const paid = timeline[1]?.state === "done";
  const gateway = GATEWAY[method] ?? (B.paymentLabels[method] ?? method);
  const expires = order.expiresAt && !paid ? expiryLabel(order.expiresAt) : null;
  const vence = expires ? fillTemplate(B.untilShort, { fecha: expires }) : "";

  const prep = info.hasBike ? C.steps[1] : B.stepPrepNoBike;
  const ready = info.hasBike ? C.steps[2] : { ...C.steps[2], title: B.stepReadyNoBike };
  const payStamp = approvedAt(full);
  const first = isCash
    ? { title: B.cash.step1.title, description: relativeStamp(order.createdAt) }
    : paid
      ? { title: C.steps[0].title, description: `${gateway} · ${relativeStamp(payStamp ?? order.createdAt)}` }
      : isTransfer
        ? {
            title: B.transfer.step,
            description: order.transferReceiptUrl ? B.transfer.stepReceived : fillTemplate(B.transfer.stepWaiting, { vence }),
          }
        : { title: B.online.step, description: gateway };
  const steps = [
    first,
    { title: prep.title, description: prep.text },
    { title: ready.title, description: ready.text },
    isCash
      ? { title: B.cash.step4.title, description: B.cash.step4.text }
      : { title: C.steps[3].title, description: C.steps[3].text },
  ];

  const payLabel =
    online
      ? `${gateway}${orderInstallments(order) > 1 ? ` · ${orderInstallments(order)} cuotas` : ""}`
      : isTransfer && order.discount > 0
        ? `Transferencia · ${runtime.transferDiscount}% off`
        : (B.paymentLabels[method] ?? method);

  return (
    <div className="grid items-start gap-8 px-4 pt-6 pb-14 md:px-14 md:pt-10 md:pb-20 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-12">
      <div className="flex min-w-0 flex-col gap-6 md:gap-7">
        <TextLink href={paths.tracking()} tone="muted" className="self-start">
          {T.back}
        </TextLink>
        <div className="flex flex-col gap-[14px]">
          <Mono size={14} uppercase className="max-md:text-[12px]">
            {fillTemplate(T.orderEyebrow, { número: order.number, fecha: longDate(order.createdAt) })}
          </Mono>
          <div className="flex flex-wrap items-center gap-4">
            <Display size="page" as="h1">
              {order.number}
            </Display>
            <OrderPill status={pillStatus(order)} size="lg" />
          </div>
          {closed && (
            <p className="m-0 max-w-[560px] text-[17px] leading-[1.5] text-text-2 md:text-[19px]">
              {order.status === "VENCIDO" ? B.closed.expired : B.closed.cancelled}
            </p>
          )}
          {online && !paid && !closed && (
            <p className="m-0 max-w-[560px] text-[17px] leading-[1.5] text-text-2">
              {fillTemplate(B.online.pendingText, { pasarela: gateway, vence: expires ? fillTemplate(B.until, { fecha: expires }) : "" })}
            </p>
          )}
        </div>

        {isTransfer && !paid && !closed && (
          <TransferPanel
            id="comprobante"
            number={order.number}
            contact={contact}
            total={order.total}
            discountPct={runtime.transferDiscount}
            hasDiscount={order.discount > 0}
            bank={bank}
            whatsapp={runtime.whatsapp}
            receiptSent={!!order.transferReceiptUrl}
          />
        )}

        {!closed && (
          <section className="flex flex-col gap-3">
            <Eyebrow size="md" as="h2">
              {T.progress}
            </Eyebrow>
            <StepList steps={steps} done={stepsDone(timeline, isCash)} />
          </section>
        )}

        <div className="flex gap-3 max-md:flex-col">
          {online && !paid && !closed && (
            <Button href={`/checkout/pagar/${order.number}?e=${encodeURIComponent(contact)}`} prefetch={false} className="max-md:w-full">
              {B.online.retry}
            </Button>
          )}
          <Button
            href={waUrl(runtime.whatsapp, fillTemplate(T.waMsg, { número: order.number }))}
            external
            variant={online && !paid && !closed ? "secondary" : "primary"}
            className="max-md:w-full"
          >
            {T.wa}
          </Button>
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        <Panel as="section" surface="paper" padding="lg" gap="lg">
          <Eyebrow tone="ink" size="md" as="h2">
            {T.items}
          </Eyebrow>
          <ul className="m-0 flex list-none flex-col gap-[14px] p-0">
            {items.map((it) => (
              <OrderSummaryItem
                key={it.id}
                image={info.imageById[it.id] ?? null}
                name={it.name}
                meta={[it.variantLabel, `x${it.quantity}`].filter(Boolean).join(" · ")}
                price={formatMoney(it.unitPrice * it.quantity)}
              />
            ))}
          </ul>
          <SummaryRows tone="paper">
            {order.discount > 0 && (
              <>
                <SummaryRow tone="paper" label={B.subtotal} value={formatMoney(order.subtotal)} />
                <SummaryRow
                  tone="paper"
                  variant="discount"
                  label={fillTemplate(B.discount, { off: runtime.transferDiscount })}
                  value={`− ${formatMoney(order.discount)}`}
                />
              </>
            )}
            <SummaryRow tone="paper" label={C.payment} value={payLabel} />
            <SummaryTotal tone="paper" label={C.total} amount={order.total} />
          </SummaryRows>
        </Panel>

        <Panel as="section" surface="surface" padding="md" gap="sm">
          <Eyebrow tone="yellow" size="md" as="h2">
            {T.pickup}
          </Eyebrow>
          <p className="m-0 text-[20px] font-extrabold">{C.pickupPlace}</p>
          <p className="m-0 text-[15px] leading-[1.5] text-text-2">
            {local?.address || runtime.address}
            <br />
            {local?.hours || runtime.hours}
          </p>
          <p className="m-0 text-[15px] leading-[1.5] text-text-2">{C.pickupNote}</p>
          {order.pickupCode && !closed && (
            <p className="m-0 flex flex-wrap items-baseline gap-x-2 text-[13px] text-text-3">
              {B.pickupCode}
              <Mono size={14} tone="paper">
                {order.pickupCode}
              </Mono>
            </p>
          )}
        </Panel>
      </div>
    </div>
  );
}
