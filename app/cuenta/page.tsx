import type { Metadata } from "next";
import Link from "next/link";
import { statusPill } from "@/components/store/order-status";
import { StoreShell } from "@/components/store/store-shell";
import { lexicon } from "@/lib/data/content";
import { formatARS } from "@/lib/format";
import { img } from "@/lib/images";
import {
  getOrdersForEmail,
  STATUS_LABELS,
} from "@/lib/server/order-queries";
import { withinRateLimit } from "@/lib/server/rate-limit";
import { TrackingForm } from "../seguimiento/tracking-form";

const t = lexicon.commerce.account;

export const metadata: Metadata = {
  title: t.metaTitle,
  robots: { index: false },
};

export const dynamic = "force-dynamic";

/**
 * Consulta de pedidos sin cuentas de cliente (v1): email + el número de
 * alguno de sus pedidos como gate. Con ese par se listan todos los pedidos
 * de ese email.
 */
export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; n?: string }>;
}) {
  const { e, n } = await searchParams;
  // Anti-enumeración: mismo límite que el seguimiento.
  const allowed = e && n ? await withinRateLimit("tracking", 20) : false;
  const orders = allowed ? await getOrdersForEmail(e!, n!) : null;

  return (
    <StoreShell>
      <section className="animate-fade-in box-content min-h-[70vh] bg-cream px-[clamp(16px,4vw,40px)] pb-[90px] pt-[clamp(40px,6vw,72px)]">
        {!orders ? (
          <div className="mx-auto grid max-w-content items-center gap-[clamp(28px,5vw,60px)] min-[900px]:grid-cols-[minmax(0,1fr)_440px]">
            <div>
              <div className="font-sans text-[11px] font-bold tracking-[.26em] text-brand-deep">
                {t.kicker}
              </div>
              <h1 className="font-display mb-0 mt-3 text-[clamp(36px,5vw,64px)] leading-[1.02] text-ink">
                {t.title}
              </h1>
              <p className="mb-0 mt-4 max-w-[44ch] font-sans text-[15.5px] leading-[1.65] text-ink/60">
                {t.sub}
              </p>
              {e && n && (
                <div
                  role="alert"
                  className="mt-5 max-w-[44ch] rounded-xl bg-danger-bg px-4 py-3 font-sans text-[13px] font-semibold text-danger"
                >
                  {t.notFound}
                </div>
              )}
            </div>
            <TrackingForm toAccount />
          </div>
        ) : (
          <div className="mx-auto max-w-[880px]">
            <Link
              href="/cuenta"
              className="hit relative font-sans text-[13px] font-bold text-ink/55 hover:text-ink"
            >
              {t.other}
            </Link>
            <div className="mt-6 font-sans text-[11px] font-bold tracking-[.26em] text-brand-deep">
              {t.listKicker(orders.length)}
            </div>
            <h1 className="font-display mb-0 mt-2 text-[clamp(32px,4.4vw,52px)] leading-[1.02] text-ink">
              {t.title}
            </h1>
            <div className="mt-7 flex flex-col gap-4">
              {orders.map(({ order, items, customer }) => (
                <Link
                  key={order.id}
                  href={`/seguimiento/${order.number}?e=${encodeURIComponent(customer.email ?? customer.phone)}`}
                  className="group flex flex-col gap-4 rounded-[24px] border border-ink/10 bg-white p-[clamp(18px,3vw,24px)] transition-[transform,box-shadow] hover:-translate-y-[2px] hover:shadow-[0_16px_40px_rgba(21,23,15,.1)]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="font-display text-[22px] leading-none text-ink">
                      {t.orderTitle(order.number)}
                    </div>
                    <span className={statusPill(order.status)}>
                      {STATUS_LABELS[order.status]}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex -space-x-2">
                      {items.slice(0, 3).map((it) => (
                        <div
                          key={it.id}
                          className="relative aspect-[4/3] w-[56px] overflow-hidden rounded-[10px] border-2 border-white bg-cream-4"
                        >
                          {it.image && (
                            // eslint-disable-next-line @next/next/no-img-element -- Cloudinary transforma (img())
                            <img
                              src={img(it.image, { w: 120 })}
                              alt=""
                              className="absolute inset-1 block h-[calc(100%-8px)] w-[calc(100%-8px)] object-contain mix-blend-multiply"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="min-w-0 flex-1 font-sans text-[13px] leading-[1.5] text-ink/60">
                      {items.map((i) => `${i.quantity}× ${i.name}`).join(" · ")}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-baseline justify-between gap-3 border-t border-ink/10 pt-4">
                    <span className="font-display text-[22px] font-extrabold tracking-normal text-ink">
                      {formatARS(order.total)}
                    </span>
                    <span className="font-sans text-[13px] font-bold text-brand-deep group-hover:text-ink">
                      {t.see}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>
    </StoreShell>
  );
}
