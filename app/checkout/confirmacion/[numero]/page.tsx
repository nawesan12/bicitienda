import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StoreShell } from "@/components/store/store-shell";
import { isOnlinePayment, whatsappLink } from "@/lib/config";
import { lexicon } from "@/lib/data/content";
import { formatARS } from "@/lib/format";
import { img } from "@/lib/images";
import { syncPendingPayment } from "@/lib/server/online-payment";
import { getOrderForCustomer } from "@/lib/server/order-queries";
import { getStore } from "@/lib/server/queries";

const t = lexicon.commerce.confirm;

export const metadata: Metadata = {
  title: t.metaTitle,
  robots: { index: false },
};

export const dynamic = "force-dynamic";

/** Bloque de la caja de precio (negro / crema / pastel), como en la ficha. */
function Block({
  label,
  value,
  tone,
  sub,
}: {
  label: string;
  value: string;
  tone: "night" | "chip" | "pastel";
  sub?: string;
}) {
  const bg =
    tone === "night"
      ? "bg-night text-cream"
      : tone === "pastel"
        ? "bg-brand-pastel text-brand-deeper"
        : "bg-chip text-ink";
  return (
    <div className={`min-w-0 rounded-xl px-[14px] py-[11px] ${bg}`}>
      <div
        className={`font-sans text-[10px] font-bold tracking-[.14em] ${
          tone === "night" ? "text-cream/60" : tone === "chip" ? "text-ink/55" : ""
        }`}
      >
        {label}
      </div>
      <div
        className={`font-display mt-[3px] break-words text-[19px] font-extrabold tracking-normal ${
          tone === "night" ? "text-brand" : ""
        }`}
      >
        {value}
      </div>
      {sub && (
        <div
          className={`mt-[2px] font-sans text-[11.5px] ${
            tone === "night" ? "text-cream/55" : "opacity-70"
          }`}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

/**
 * Confirmación post-compra, con instrucciones según el medio de pago.
 * Gate: número + email (llega en ?e= desde el checkout o las URLs de
 * retorno de la pasarela). Si el pedido sigue esperando un pago online,
 * antes de mostrarlo se concilia con la pasarela (por si la notificación
 * todavía no llegó).
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
  const [found, runtime] = await Promise.all([
    getOrderForCustomer(numero, e),
    getStore(),
  ]);
  if (!found) notFound();
  let full = found;
  if (await syncPendingPayment(full.order)) {
    full = (await getOrderForCustomer(numero, e)) ?? full;
  }

  const { order, customer, items } = full;
  // Sucursal del pedido: la elegida al retirar, o la principal.
  const pickupLocal =
    runtime.locations.find((l) => l.id === order.pickupLocationId) ??
    runtime.locations[0];
  const paid = order.paidAmount >= order.total && order.total > 0;
  const señado = order.status === "SEÑADO" && order.balanceDue > 0;
  const ok = paid || señado;
  const isPickup = order.deliveryMethod === "retiro";
  const trackingHref = `/seguimiento/${order.number}?e=${encodeURIComponent(customer.email ?? customer.phone)}`;
  const isTransfer = order.paymentMethod === "transferencia";
  const isCash = order.paymentMethod === "efectivo";
  const online = isOnlinePayment(order.paymentMethod);
  // El recargo del Plan MiPyME no se guarda aparte: es lo que el total
  // tiene por encima de subtotal − descuento + envío.
  const surcharge = Math.max(
    0,
    order.total - (order.subtotal - order.discount + order.shippingCost),
  );

  const expires = order.expiresAt
    ? new Intl.DateTimeFormat("es-AR", {
        weekday: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(order.expiresAt)
    : null;

  // Pago online sin acreditar (rechazado o abandonado en la pasarela).
  const pendingOnline = !ok && online && order.status === "PENDIENTE_PAGO";
  const co = lexicon.commerce.checkout;
  const title = paid
    ? t.titlePaid(order.number)
    : señado
      ? t.titleDeposit(order.number)
      : pendingOnline && t.titlePending
        ? t.titlePending(order.number)
        : t.titleConfirmed(order.number);
  const body = paid
    ? t.bodyPaid
    : señado
      ? t.bodyDeposit
      : isTransfer
        ? t.bodyTransfer
        : isCash
          ? t.bodyCash
          : t.bodyPending;

  return (
    <StoreShell>
      <section className="bg-grid-dark bg-night px-[clamp(16px,4vw,40px)] pb-[90px] pt-[60px] text-cream [--grid-size:48px]">
        <div className="animate-pop-in mx-auto w-[680px] max-w-full">
          <div className="text-center">
            <div
              className={`mx-auto flex h-[84px] w-[84px] items-center justify-center rounded-full text-[38px] font-bold ${
                ok ? "bg-brand text-night" : "bg-cream text-night"
              }`}
            >
              {ok ? "✓" : "⏱"}
            </div>
            <div className="mt-6 font-sans text-[11px] font-bold tracking-[.26em] text-brand">
              {t.kicker}
            </div>
            <h1 className="font-display mb-0 mt-3 text-[clamp(32px,4.4vw,54px)] leading-[1.02]">
              {title}
            </h1>
            <p className="mx-auto mb-0 mt-4 max-w-[48ch] font-sans text-[15px] leading-[1.65] text-cream/65">
              {body}
            </p>

            {pendingOnline && (
              <a
                href={`/checkout/pagar/${order.number}?e=${encodeURIComponent(customer.email ?? customer.phone)}`}
                className="mt-6 inline-block rounded-full bg-brand px-7 py-[15px] font-sans text-[15px] font-bold text-night hover:bg-brand-hover"
              >
                {t.retry}
              </a>
            )}
          </div>

          {/* Ticket: instrucciones de pago + resumen */}
          <div className="mt-9 rounded-[24px] bg-white p-[clamp(18px,3vw,28px)] text-ink">
            {!paid && isTransfer && (
              <Section kicker={t.transferKicker}>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(min(170px,100%),1fr))] gap-2">
                  <Block tone="night" label={t.alias} value={runtime.transferAlias} />
                  <Block
                    tone="pastel"
                    label={t.amount(runtime.transferDiscount)}
                    value={formatARS(order.total)}
                    sub={expires ? `${t.reservedUntil} ${expires}` : undefined}
                  />
                </div>
              </Section>
            )}

            {!paid && isCash && (
              <Section kicker={t.cashKicker}>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(min(170px,100%),1fr))] gap-2">
                  <Block tone="night" label={t.pickupCode} value={order.pickupCode ?? "—"} />
                  <Block
                    tone="chip"
                    label={lexicon.commerce.checkout.total.toUpperCase()}
                    value={formatARS(order.total)}
                    sub={expires ? `${t.reservedUntil} ${expires}` : undefined}
                  />
                </div>
                <div className="mt-2 font-sans text-[12.5px] text-ink/55">
                  {pickupLocal.address} · {pickupLocal.hours}
                </div>
              </Section>
            )}

            {señado && (
              <Section kicker={t.depositKicker}>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(min(150px,100%),1fr))] gap-2">
                  <Block tone="pastel" label={t.depositPaid} value={formatARS(order.paidAmount)} />
                  <Block tone="night" label={t.balance} value={formatARS(order.balanceDue)} />
                  <Block tone="chip" label={t.balanceAlias.toUpperCase()} value={runtime.transferAlias} />
                </div>
                {isPickup && order.pickupCode && (
                  <div className="mt-2 font-sans text-[13px] text-ink/65">
                    {t.pickupCode}: <strong className="text-ink">{order.pickupCode}</strong>
                  </div>
                )}
              </Section>
            )}

            {pendingOnline && (
              <Section kicker={t.planKicker}>
                {order.paymentMode === "sena" && order.depositAmount > 0 ? (
                  <Block
                    tone="night"
                    label={co
                      .payNow(Math.round((order.depositAmount / order.total) * 100))
                      .toUpperCase()}
                    value={formatARS(order.depositAmount)}
                    sub={`${co.balanceLater}: ${formatARS(order.total - order.depositAmount)}`}
                  />
                ) : (
                  <Block
                    tone="night"
                    label={
                      order.installments > 1
                        ? t.planLine(order.installments, formatARS(Math.round(order.total / order.installments))).toUpperCase()
                        : t.planOne.toUpperCase()
                    }
                    value={formatARS(order.total)}
                    sub={surcharge > 0 ? t.planSurcharge(formatARS(surcharge)) : undefined}
                  />
                )}
              </Section>
            )}

            {paid && online && (
              <Section kicker={t.planKicker}>
                <Block
                  tone="night"
                  label={
                    order.installments > 1
                      ? t.planLine(order.installments, formatARS(Math.round(order.total / order.installments))).toUpperCase()
                      : t.planOne.toUpperCase()
                  }
                  value={formatARS(order.total)}
                  sub={surcharge > 0 ? t.planSurcharge(formatARS(surcharge)) : undefined}
                />
              </Section>
            )}

            {paid && isPickup && order.pickupCode && (
              <Section kicker={t.pickupKicker}>
                <Block tone="pastel" label={t.pickupCode} value={order.pickupCode} />
                <div className="mt-2 font-sans text-[12.5px] text-ink/55">
                  {pickupLocal.address} · {pickupLocal.hours}
                </div>
              </Section>
            )}

            {!isPickup && (
              <Section kicker={co.address}>
                <div className="font-sans text-[14px] font-semibold leading-[1.5] text-ink">
                  {order.deliveryAddress || co.shippingPending}
                </div>
              </Section>
            )}

            <Section kicker={t.summaryKicker} last>
              <div className="flex flex-col gap-3">
                {items.map((it) => (
                  <div key={it.id} className="flex items-center gap-3">
                    <div className="relative aspect-[4/3] w-[60px] flex-none overflow-hidden rounded-[10px] bg-cream-4">
                      {it.image && (
                        // eslint-disable-next-line @next/next/no-img-element -- Cloudinary transforma (img())
                        <img
                          src={img(it.image, { w: 140 })}
                          alt=""
                          className="absolute inset-1 block h-[calc(100%-8px)] w-[calc(100%-8px)] object-contain mix-blend-multiply"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 font-display text-[14px] leading-[1.2]">
                      {it.quantity}× {it.name}
                    </div>
                    <div className="whitespace-nowrap font-sans text-[13.5px] font-bold">
                      {formatARS(it.unitPrice * it.quantity)}
                    </div>
                  </div>
                ))}
              </div>
              {(order.shippingCost > 0 || order.discount > 0 || surcharge > 0) && (
                <div className="mt-4 flex flex-col gap-[7px] border-t border-ink/10 pt-4 font-sans text-[13.5px] text-ink/65">
                  <Row label={co.subtotal} value={formatARS(order.subtotal)} />
                  {order.shippingCost > 0 && (
                    <Row label={co.shipping} value={formatARS(order.shippingCost)} />
                  )}
                  {order.discount > 0 && (
                    <Row
                      label={co.transferLine(runtime.transferDiscount)}
                      value={`−${formatARS(order.discount)}`}
                      accent
                    />
                  )}
                  {surcharge > 0 && (
                    <Row
                      label={co.surchargeLine(
                        order.installments,
                        Math.round(
                          (surcharge / (order.total - surcharge)) * 100,
                        ),
                      )}
                      value={`+${formatARS(surcharge)}`}
                    />
                  )}
                </div>
              )}
              <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-ink/10 pt-4">
                <span className="font-sans text-[11px] font-bold tracking-[.22em] text-ink/50">
                  {lexicon.commerce.checkout.total.toUpperCase()}
                </span>
                <span className="font-display text-[28px] font-extrabold tracking-normal">
                  {formatARS(order.total)}
                </span>
              </div>
            </Section>
          </div>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <a
              href={whatsappLink(
                runtime.whatsapp,
                isTransfer && !paid ? t.waProofMsg(order.number) : t.waMsg(order.number),
              )}
              target="_blank"
              rel="noreferrer"
              className="min-w-[200px] flex-1 rounded-full bg-brand px-[26px] py-[15px] text-center font-sans text-[15px] font-bold text-night hover:bg-brand-hover min-[560px]:flex-none"
            >
              {isTransfer && !paid ? t.waProof : t.waWrite}
            </a>
            <Link
              href={trackingHref}
              className="box-border min-w-[200px] flex-1 rounded-full border-[1.5px] border-cream/30 px-[26px] py-[15px] text-center font-sans text-[15px] font-bold text-cream hover:border-brand hover:text-brand min-[560px]:flex-none"
            >
              {t.track}
            </Link>
          </div>
        </div>
      </section>
    </StoreShell>
  );
}

function Section({
  kicker,
  last,
  children,
}: {
  kicker: string;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={last ? "" : "mb-6 border-b border-ink/10 pb-6"}>
      <div className="mb-3 font-sans text-[11px] font-bold tracking-[.26em] text-ink/50">
        {kicker}
      </div>
      {children}
    </div>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex justify-between gap-3 ${accent ? "font-semibold text-brand-deep" : ""}`}
    >
      <span>{label}</span>
      <span className={accent ? "" : "font-semibold text-ink"}>{value}</span>
    </div>
  );
}
