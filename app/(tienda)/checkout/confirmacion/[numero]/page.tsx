import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Button } from "@/components/bt/button";
import { formatMoney } from "@/components/bt/format";
import { Panel } from "@/components/bt/panel";
import { StepList } from "@/components/bt/timeline";
import { Display, Eyebrow, Highlight, Mono, Price } from "@/components/bt/typography";
import { KeyValueList, OrderSummaryItem, SuccessMark, SummaryRow, SummaryRows, SummaryTotal } from "@/components/bt";
import { isOnlinePayment } from "@/lib/config";
import { COPY } from "@/lib/data/demo/copy";
import { fillTemplate } from "@/lib/data/demo/format";
import { paths } from "@/lib/paths";
import { NOINDEX } from "@/lib/seo";
import { syncPendingPayment } from "@/lib/server/online-payment";
import { getOrderForCustomer, publicTimeline } from "@/lib/server/order-queries";
import { getStore } from "@/lib/server/queries";
import { getOrderItemsInfo, getTransferDetails } from "@/lib/server/screens/compra-b";
import { waUrl } from "@/lib/whatsapp";
import { BUY } from "../../_lib/copy";
import {
  approvedAt,
  expiryLabel,
  firstName,
  lastPaymentRejected,
  longDate,
  relativeStamp,
  stepsDone,
} from "../../_lib/order-view";
import { TransferPanel } from "../../_lib/transfer-panel";
import { orderInstallments } from "@/lib/order-flow";

const C = COPY.confirmation;
const B = BUY.confirm;

export const metadata: Metadata = { title: B.metaTitle, robots: NOINDEX };

export const dynamic = "force-dynamic";

const GATEWAY: Record<string, string> = { mercadopago: "Mercado Pago", payway: "Payway" };

/**
 * 2e · Confirmación. El prototipo solo dibuja "Mercado Pago aprobado";
 * las demás variantes (transferencia, efectivo, pago online pendiente o
 * rechazado, vencido/cancelado, pedido sin bici) usan el mismo layout.
 * Gate: número + contacto (?e= lo arma createOrder o la pasarela).
 */
export default async function ConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ numero: string }>;
  searchParams: Promise<{ e?: string }>;
}) {
  const [{ numero }, { e }] = await Promise.all([params, searchParams]);
  if (!e) notFound();
  const found = await getOrderForCustomer(numero, e);
  if (!found) notFound();
  let full = found;
  if (await syncPendingPayment(full.order)) {
    full = (await getOrderForCustomer(numero, e)) ?? full;
  }
  const [runtime, info, bank] = await Promise.all([
    getStore(),
    getOrderItemsInfo(full.items),
    getTransferDetails(),
  ]);

  const { order, customer, items } = full;
  const contact = customer.email ?? customer.phone;
  const local = runtime.locations.find((l) => l.id === order.pickupLocationId) ?? runtime.locations[0];
  const name = firstName(customer.name);
  const timeline = publicTimeline(order);

  const method = order.paymentMethod;
  const online = isOnlinePayment(method);
  const isTransfer = method === "transferencia";
  const isCash = method === "efectivo";
  const closed = order.status === "CANCELADO" || order.status === "VENCIDO";
  const paid = timeline[1]?.state === "done";
  const waitingOnline = online && !paid && !closed;
  const rejected = waitingOnline && lastPaymentRejected(full);
  const gateway = GATEWAY[method] ?? "la pasarela";
  const expires = order.expiresAt && !paid ? expiryLabel(order.expiresAt) : null;
  const until = expires ? fillTemplate(B.until, { fecha: expires }) : "";
  const trackingHref = `${paths.tracking(order.number)}?e=${encodeURIComponent(contact)}`;
  const viewOrderHref = order.accountId ? paths.account() : trackingHref;
  const vars = { nombre: name, monto: formatMoney(order.total), pasarela: gateway, vence: until };

  /* ── Encabezado y pasos según el caso ── */
  let mark: ReactNode = <SuccessMark />;
  let title = fillTemplate(C.title, vars);
  let subtitle: string = info.hasBike ? C.subtitle : B.subtitleNoBike;
  let text: string = info.hasBike ? C.text : B.textNoBike;
  const prep = info.hasBike ? C.steps[1] : B.stepPrepNoBike;
  const ready = info.hasBike ? C.steps[2] : { ...C.steps[2], title: B.stepReadyNoBike };
  const payStamp = approvedAt(full);
  let steps: { title: string; description?: string }[] | null = [
    {
      title: C.steps[0].title,
      description: `${online ? gateway : (B.paymentLabels[method] ?? method)} · ${relativeStamp(payStamp ?? order.createdAt)}`,
    },
    { title: prep.title, description: prep.text },
    { title: ready.title, description: ready.text },
    { title: C.steps[3].title, description: C.steps[3].text },
  ];
  let actions: ReactNode = (
    <>
      <Button href={viewOrderHref} className="max-md:w-full">
        {C.viewOrder}
      </Button>
      <Button href="/" variant="secondary" className="max-md:w-full">
        {C.continueShopping}
      </Button>
    </>
  );

  if (closed) {
    mark = <SuccessMark tone="muted" symbol="✕" />;
    title = order.status === "VENCIDO" ? B.closed.expiredTitle : B.closed.cancelledTitle;
    subtitle = "";
    text = order.status === "VENCIDO" ? B.closed.expired : B.closed.cancelled;
    steps = null;
    actions = (
      <>
        <Button href={paths.catalog()} className="max-md:w-full">
          {B.closed.cta}
        </Button>
        <Button href={waUrl(runtime.whatsapp, fillTemplate(BUY.tracking.waMsg, { número: order.number }))} external variant="secondary" className="max-md:w-full">
          {B.online.wa}
        </Button>
      </>
    );
  } else if (waitingOnline) {
    mark = rejected ? <SuccessMark tone="muted" symbol="✕" /> : <SuccessMark tone="waiting" symbol="…" />;
    title = fillTemplate(rejected ? B.online.rejectedTitle : B.online.pendingTitle, vars);
    subtitle = rejected ? B.online.rejectedSubtitle : B.online.pendingSubtitle;
    text = fillTemplate(rejected ? B.online.rejectedText : B.online.pendingText, vars);
    steps[0] = { title: rejected ? B.online.stepRejected : B.online.step, description: gateway };
    actions = (
      <>
        <Button href={`/checkout/pagar/${order.number}?e=${encodeURIComponent(contact)}`} prefetch={false} className="max-md:w-full">
          {B.online.retry}
        </Button>
        <Button href={waUrl(runtime.whatsapp, fillTemplate(B.online.waMsg, { número: order.number }))} external variant="secondary" className="max-md:w-full">
          {B.online.wa}
        </Button>
      </>
    );
  } else if (isTransfer && !paid) {
    const received = !!order.transferReceiptUrl;
    mark = <SuccessMark tone="waiting" symbol="$" />;
    title = fillTemplate(B.transfer.title, vars);
    subtitle = B.transfer.subtitle;
    text = received ? B.transfer.textReceived : fillTemplate(B.transfer.text, vars);
    steps[0] = {
      title: B.transfer.step,
      description: received
        ? B.transfer.stepReceived
        : fillTemplate(B.transfer.stepWaiting, { vence: expires ? fillTemplate(B.untilShort, { fecha: expires }) : "" }),
    };
  } else if (isCash && !paid) {
    mark = <SuccessMark />;
    title = fillTemplate(B.cash.title, vars);
    subtitle = B.cash.subtitle;
    text = fillTemplate(B.cash.text, vars);
    steps[0] = { title: B.cash.step1.title, description: relativeStamp(order.createdAt) };
    steps[3] = { title: B.cash.step4.title, description: B.cash.step4.text };
  }
  const done = stepsDone(timeline, isCash);

  /* ── Resumen ── */
  const payLabel =
    online
      ? `${gateway}${orderInstallments(order) > 1 ? ` · ${orderInstallments(order)} cuotas` : ""}`
      : isTransfer && order.discount > 0
        ? `Transferencia · ${runtime.transferDiscount}% off`
        : (B.paymentLabels[method] ?? method);
  const payPanel: ReactNode =
    closed || paid ? null : isTransfer ? (
      <TransferPanel
        number={order.number}
        contact={contact}
        total={order.total}
        discountPct={runtime.transferDiscount}
        hasDiscount={order.discount > 0}
        bank={bank}
        whatsapp={runtime.whatsapp}
        receiptSent={!!order.transferReceiptUrl}
      />
    ) : isCash ? (
      <Panel as="section" surface="surface" padding="md" gap="md">
            <Eyebrow tone="yellow" size="md" as="h2">
              {B.cash.payTitle}
            </Eyebrow>
            <div className="flex items-end justify-between gap-4">
              <Eyebrow size="sm">{B.cash.payAmount}</Eyebrow>
              <Price amount={order.total} size="panel" tone="yellow" />
            </div>
            <KeyValueList layout="stacked" items={[{ label: B.cash.payUntil, value: expires ?? B.cash.noExpiry }]} />
          </Panel>
    ) : null;

  return (
    <div className="grid items-start gap-8 px-4 pt-8 pb-14 md:px-14 md:pt-16 md:pb-20 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-12">
      {/* Columna izquierda */}
      <div className="flex min-w-0 flex-col gap-6 md:gap-7">
        {mark}
        <div className="flex flex-col gap-[14px]">
          <Mono size={14} uppercase className="max-md:text-[12px]">
            {fillTemplate(C.eyebrow, { número: order.number, fecha: longDate(order.createdAt) })}
          </Mono>
          <Display size="confirm" className="break-words">
            {title}
            {subtitle && (
              <>
                <br />
                <Highlight>{subtitle}</Highlight>
              </>
            )}
          </Display>
          <p className="m-0 max-w-[560px] text-[17px] leading-[1.5] text-text-2 md:text-[19px]">{text}</p>
        </div>
        {payPanel && <div className="lg:hidden">{payPanel}</div>}
        {steps && <StepList steps={steps} done={done} />}
        <div className="flex gap-3 max-md:flex-col">{actions}</div>
      </div>

      {/* Columna derecha */}
      <div className="flex min-w-0 flex-col gap-4">
        {payPanel && <div className="max-lg:hidden">{payPanel}</div>}


        <Panel as="section" surface="paper" padding="lg" gap="lg">
          <Eyebrow tone="ink" size="md" as="h2">
            {C.summaryTitle}
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
                  label={fillTemplate(B.discount, { off: runtime.transferDiscount })}
                  value={`− ${formatMoney(order.discount)}`}
                  variant="discount"
                />
              </>
            )}
            <SummaryRow tone="paper" label={C.payment} value={payLabel} />
            <SummaryTotal tone="paper" label={C.total} amount={order.total} />
          </SummaryRows>
        </Panel>

        <Panel as="section" surface="surface" padding="md" gap="sm">
          <Eyebrow tone="yellow" size="md" as="h2">
            {C.pickupTitle}
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
