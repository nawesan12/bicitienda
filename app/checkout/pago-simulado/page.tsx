import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isOnlinePayment } from "@/lib/config";
import { lexicon } from "@/lib/data/content";
import { formatARS } from "@/lib/format";
import { chargeAmount, isGatewayLive } from "@/lib/server/online-payment";
import { getOrderById } from "@/lib/server/order-queries";
import { getStore } from "@/lib/server/queries";
import { SimulatedPayButtons } from "./simulated-buttons";

const t = lexicon.commerce.sandbox;

export const metadata: Metadata = {
  title: t.metaTitle,
  robots: { index: false },
};

export const dynamic = "force-dynamic";

const GATEWAY_NAME: Record<string, string> = {
  payway: "Payway",
  mercadopago: "Mercado Pago",
};

/**
 * SANDBOX LOCAL: reemplaza al formulario hosteado de la pasarela (Payway;
 * MP si la tienda lo usa) mientras no hay credenciales. Con credenciales
 * reales esta página deja de existir (404) y el cliente va al formulario
 * real.
 *
 * A propósito NO usa el shell ni la identidad de la tienda: tiene que
 * leerse como "saliste a la pasarela", con la cinta rayada de entorno de
 * prueba bien visible. Muestra el plan elegido en el checkout (1, 3 o 6
 * cuotas, con el recargo ya incluido en el total): en Payway real el
 * formulario se crea con esas cuotas fijas.
 */
export default async function SimulatedPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: orderId } = await searchParams;
  if (!orderId || !/^[0-9a-f-]{36}$/i.test(orderId)) notFound();
  const [full, runtime] = await Promise.all([getOrderById(orderId), getStore()]);
  if (!full) notFound();

  const { order, customer } = full;
  const method = order.paymentMethod;
  if (!isOnlinePayment(method) || isGatewayLive(method)) notFound();

  const gateway = GATEWAY_NAME[method];
  const isDeposit =
    order.paymentMode === "sena" && order.status === "PENDIENTE_PAGO";
  const charge = chargeAmount(order);
  const installments = isDeposit ? 1 : order.installments;

  const row = "flex justify-between gap-4 py-[9px] font-sans text-[13.5px]";

  return (
    <div className="min-h-screen bg-[#e9ecf1] font-sans text-[#1d2433]">
      {/* Cinta de entorno de prueba */}
      <div className="bg-[repeating-linear-gradient(-45deg,#f5c518_0_14px,#1d2433_14px_28px)] px-3 py-[6px]">
        <div className="mx-auto w-fit rounded-full bg-[#1d2433] px-4 py-[5px] text-center text-[10.5px] font-bold tracking-[.18em] text-[#f5c518]">
          {t.ribbon}
        </div>
      </div>

      <header className="border-b border-[#d5dae3] bg-white">
        <div className="mx-auto flex max-w-[880px] items-center justify-between gap-4 px-[clamp(16px,4vw,32px)] py-4">
          <div className="flex items-center gap-[10px]">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1d2433] text-[15px] font-bold text-white">
              {gateway[0]}
            </span>
            <span className="text-[17px] font-bold tracking-[-.01em]">
              {gateway}
            </span>
          </div>
          <span className="rounded-full border border-[#d5dae3] px-3 py-[5px] text-[11px] font-bold tracking-[.14em] text-[#5b6578]">
            SANDBOX
          </span>
        </div>
      </header>

      <main className="mx-auto grid max-w-[880px] items-start gap-5 px-[clamp(16px,4vw,32px)] py-8 min-[760px]:grid-cols-[minmax(0,1fr)_300px]">
        <section className="animate-pop-in order-2 rounded-2xl border border-[#d5dae3] bg-white p-[clamp(18px,3vw,28px)] min-[760px]:order-1">
          <h1 className="m-0 text-[22px] font-bold tracking-[-.01em]">
            {t.title(gateway)}
          </h1>
          <p className="mb-0 mt-2 text-[13.5px] leading-[1.6] text-[#5b6578]">
            {t.sub(gateway)}
          </p>

          <div className="mt-6 text-[10.5px] font-bold tracking-[.18em] text-[#5b6578]">
            {t.cardLabel}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {[
              { label: t.cardNumber, value: "4507 9900 0000 4905", span: true },
              { label: t.cardHolder, value: customer.name.toUpperCase(), span: true },
              { label: t.cardExpiry, value: "12/30", span: false },
              { label: t.cardCvv, value: "123", span: false },
            ].map((f) => (
              <label key={f.label} className={f.span ? "col-span-2" : ""}>
                <span className="block text-[12px] font-semibold text-[#5b6578]">
                  {f.label}
                </span>
                <input
                  readOnly
                  value={f.value}
                  className="mt-[6px] box-border block w-full rounded-[10px] border border-[#cfd5df] bg-[#f6f7f9] px-[14px] py-3 font-mono text-[14px] text-[#1d2433] outline-none"
                />
              </label>
            ))}
          </div>
          <div className="mt-2 text-[11.5px] text-[#8a93a5]">{t.testCard}</div>

          <SimulatedPayButtons
            orderId={order.id}
            gateway={gateway}
            amountLabel={formatARS(charge)}
            confirmUrl={`/checkout/confirmacion/${order.number}?e=${encodeURIComponent(customer.email)}`}
          />
        </section>

        <aside className="order-1 rounded-2xl border border-[#d5dae3] bg-white p-[clamp(18px,3vw,24px)] min-[760px]:order-2">
          <div className="text-[10.5px] font-bold tracking-[.18em] text-[#5b6578]">
            {t.merchant}
          </div>
          <div className="mt-1 text-[16px] font-bold">{runtime.brandName}</div>
          <div className="mt-4 divide-y divide-[#e6e9ef] border-t border-[#e6e9ef]">
            <div className={row}>
              <span className="text-[#5b6578]">{t.order}</span>
              <strong>{order.number}</strong>
            </div>
            <div className={row}>
              <span className="text-[#5b6578]">{t.customer}</span>
              <strong className="min-w-0 truncate">{customer.name}</strong>
            </div>
            <div className={row}>
              <span className="text-[#5b6578]">{t.plan}</span>
              <strong className="text-right">
                {installments > 1
                  ? t.planN(installments, formatARS(Math.round(charge / installments)))
                  : t.plan1}
              </strong>
            </div>
            {isDeposit && (
              <div className={row}>
                <span className="text-[#5b6578]">{t.balance}</span>
                <strong>{formatARS(order.total - order.depositAmount)}</strong>
              </div>
            )}
          </div>
          <div className="mt-3 rounded-xl bg-[#1d2433] px-4 py-3 text-white">
            <div className="text-[10.5px] font-bold tracking-[.18em] text-white/60">
              {(isDeposit ? t.deposit : t.amount).toUpperCase()}
            </div>
            <div className="mt-[2px] text-[26px] font-bold tracking-[-.01em]">
              {formatARS(charge)}
            </div>
          </div>
        </aside>
      </main>

      <footer className="pb-8 text-center text-[11.5px] text-[#8a93a5]">
        {t.footer}
      </footer>
    </div>
  );
}
