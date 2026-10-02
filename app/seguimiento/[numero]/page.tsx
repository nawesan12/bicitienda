import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { statusPill } from "@/components/store/order-status";
import { StoreShell } from "@/components/store/store-shell";
import { whatsappLink } from "@/lib/config";
import { lexicon } from "@/lib/data/content";
import { formatARS } from "@/lib/format";
import { img } from "@/lib/images";
import {
  getOrderForCustomer,
  publicTimeline,
  STATUS_LABELS,
} from "@/lib/server/order-queries";
import { getStore } from "@/lib/server/queries";
import { withinRateLimit } from "@/lib/server/rate-limit";

const t = lexicon.commerce.tracking;

export const metadata: Metadata = {
  title: t.metaTitle,
  robots: { index: false },
};

export const dynamic = "force-dynamic";

const kicker = "font-sans text-[11px] font-bold tracking-[.26em] text-ink/50";

export default async function TrackingPage({
  params,
  searchParams,
}: {
  params: Promise<{ numero: string }>;
  searchParams: Promise<{ e?: string }>;
}) {
  const [{ numero }, { e }] = await Promise.all([params, searchParams]);
  if (!e) notFound();
  // Anti-enumeración: el par número+email se prueba de a pocos por minuto.
  if (!(await withinRateLimit("tracking", 20))) notFound();
  const [full, runtime] = await Promise.all([
    getOrderForCustomer(numero, e),
    getStore(),
  ]);
  if (!full) notFound();

  const { order, items } = full;
  // Sucursal del pedido: la elegida al retirar, o la principal.
  const pickupLocal =
    runtime.locations.find((l) => l.id === order.pickupLocationId) ??
    runtime.locations[0];
  const closed = order.status === "CANCELADO" || order.status === "VENCIDO";
  const steps = publicTimeline(order);
  const isPickup = order.deliveryMethod === "retiro";

  return (
    <StoreShell>
      <section className="animate-fade-in box-content min-h-screen bg-cream px-[clamp(16px,4vw,40px)] pb-[90px] pt-[34px]">
        <div className="mx-auto max-w-[880px]">
          <Link
            href="/seguimiento"
            className="hit relative font-sans text-[13px] font-bold text-ink/55 hover:text-ink"
          >
            {t.back}
          </Link>
          <div className="mt-6 font-sans text-[11px] font-bold tracking-[.26em] text-brand-deep">
            {t.orderKicker}
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <h1 className="font-display m-0 text-[clamp(32px,4.4vw,52px)] leading-[1.02] text-ink">
              {t.orderTitle(order.number)}
            </h1>
            <span className={statusPill(order.status)}>
              {STATUS_LABELS[order.status]}
            </span>
          </div>

          {closed ? (
            <div className="mt-7 rounded-[24px] border border-danger/25 bg-white p-[clamp(20px,3vw,28px)] font-sans text-[14.5px] leading-[1.65] text-ink/70">
              {order.status === "VENCIDO" ? t.expired : t.cancelled}
            </div>
          ) : (
            <div className="mt-7 rounded-[24px] border border-ink/10 bg-white p-[clamp(20px,3vw,28px)]">
              <div className={kicker}>{t.progressKicker}</div>
              <ol className="m-0 mt-5 list-none p-0">
                {steps.map((step, i) => (
                  <li key={step.key} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`font-display flex h-9 w-9 flex-none items-center justify-center rounded-full text-[14px] tracking-normal ${
                          step.state === "done"
                            ? "bg-brand text-night"
                            : step.state === "current"
                              ? "bg-night text-brand"
                              : "border-[1.5px] border-ink/15 bg-white text-ink/30"
                        }`}
                      >
                        {step.state === "done" ? "✓" : i + 1}
                      </div>
                      {i < steps.length - 1 && (
                        <div
                          className={`w-[2px] flex-1 ${
                            step.state === "done" ? "bg-brand" : "bg-ink/10"
                          }`}
                        />
                      )}
                    </div>
                    <div className={`pt-[7px] ${i < steps.length - 1 ? "pb-7" : ""}`}>
                      <div
                        className={`font-display text-[16px] leading-[1.2] ${
                          step.state === "pending" ? "text-ink/35" : "text-ink"
                        }`}
                      >
                        {step.label}
                      </div>
                      {step.at && (
                        <div className="mt-1 font-sans text-[12px] text-ink/45">
                          {step.at}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] gap-5">
            <div className="rounded-[24px] border border-ink/10 bg-white p-[clamp(20px,3vw,28px)]">
              <div className={kicker}>{t.itemsKicker}</div>
              <div className="mt-4 flex flex-col gap-3">
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
                    <div className="font-display min-w-0 flex-1 text-[14px] leading-[1.2] text-ink">
                      {it.quantity}× {it.name}
                    </div>
                    <div className="whitespace-nowrap font-sans text-[13.5px] font-bold text-ink">
                      {formatARS(it.unitPrice * it.quantity)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-ink/10 pt-4">
                <span className="font-sans text-[11px] font-bold tracking-[.22em] text-ink/50">
                  {t.total.toUpperCase()}
                </span>
                <span className="font-display text-[26px] font-extrabold tracking-normal text-ink">
                  {formatARS(order.total)}
                </span>
              </div>
              {order.installments > 1 && (
                <div className="mt-2 rounded-xl bg-night px-[14px] py-[10px] font-sans text-[10px] font-bold tracking-[.14em] text-cream/60">
                  {t
                    .plan(order.installments, formatARS(Math.round(order.total / order.installments)))
                    .toUpperCase()}
                </div>
              )}
              {order.balanceDue > 0 && !closed && (
                <div className="mt-2 flex justify-between gap-3 rounded-xl bg-danger-bg px-[14px] py-[10px] font-sans text-[13px] font-bold text-danger">
                  <span>{t.balance}</span>
                  <span>{formatARS(order.balanceDue)}</span>
                </div>
              )}
            </div>

            <div className="bg-grid-dark flex flex-col rounded-[24px] bg-night p-[clamp(20px,3vw,28px)] text-cream [--grid-size:36px]">
              <div className="font-sans text-[11px] font-bold tracking-[.26em] text-brand">
                {isPickup ? t.pickupKicker : t.deliveryKicker}
              </div>
              <div className="mt-4 font-sans text-[14px] leading-[1.65] text-cream/75">
                {isPickup ? (
                  <>
                    <div className="font-display text-[18px] leading-[1.25] text-cream">
                      {pickupLocal.address}
                    </div>
                    <div className="mt-1">{pickupLocal.hours}</div>
                  </>
                ) : (
                  <>
                    <div className="font-display text-[18px] leading-[1.25] text-cream">
                      {order.deliveryAddress || t.deliveryFallback}
                    </div>
                    <div className="mt-1">{t.deliveryNote}</div>
                  </>
                )}
              </div>
              {isPickup && order.pickupCode && (
                <div className="mt-4 rounded-xl border border-[rgba(94,184,56,.4)] bg-[rgba(94,184,56,.12)] px-4 py-3">
                  <div className="font-sans text-[10px] font-bold tracking-[.14em] text-cream/60">
                    {t.code.toUpperCase()}
                  </div>
                  <div className="font-display mt-[2px] text-[22px] font-extrabold tracking-[.08em] text-brand">
                    {order.pickupCode}
                  </div>
                </div>
              )}
              <div className="mt-auto pt-5">
                <a
                  href={whatsappLink(runtime.whatsapp, t.waMsg(order.number))}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-full bg-brand p-[14px] text-center font-sans text-[14px] font-bold text-night hover:bg-brand-hover"
                >
                  {t.waCta}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </StoreShell>
  );
}
