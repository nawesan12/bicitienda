import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isOnlinePayment } from "@/lib/config";
import { lexicon } from "@/lib/data/content";
import { NOINDEX } from "@/lib/seo";
import { formatMoney } from "@/components/bt/format";
import { Field, Input } from "@/components/bt/field";
import { Panel } from "@/components/bt/panel";
import { Display, Eyebrow, Mono, Price } from "@/components/bt/typography";
import { KeyValueList } from "@/components/bt";
import { chargeAmount, isGatewayLive } from "@/lib/server/online-payment";
import { getOrderById } from "@/lib/server/order-queries";
import { isPaymentSandboxAllowed } from "@/lib/server/payment-availability";
import { getStore } from "@/lib/server/queries";
import { SimulatedPayButtons } from "./simulated-buttons";

const t = lexicon.commerce.sandbox;

export const metadata: Metadata = { title: t.metaTitle, robots: NOINDEX };

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
 * Vive dentro del shell de la tienda (layout del grupo), con el sistema
 * bt y la cinta rayada de entorno de prueba bien visible. Muestra el plan elegido en el checkout (1, 3 o 6
 * cuotas, con el recargo ya incluido en el total): en Payway real el
 * formulario se crea con esas cuotas fijas.
 */
export default async function SimulatedPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  if (!isPaymentSandboxAllowed()) notFound();
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

  const amount = formatMoney(charge);

  return (
    <div className="pb-14 md:pb-20">
      {/* Cinta de entorno de prueba */}
      <div className="bg-[repeating-linear-gradient(-45deg,var(--color-yellow)_0_14px,var(--color-ink)_14px_28px)] px-3 py-[6px]">
        <Mono size={11} tone="inherit" className="mx-auto block w-fit rounded-pill bg-ink px-4 py-[5px] text-center tracking-[.12em] text-yellow">
          {t.ribbon}
        </Mono>
      </div>

      <div className="grid items-start gap-6 px-4 pt-6 md:px-14 md:pt-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-10">
        <Panel as="section" padding="lg" gap="xl" className="max-lg:order-2">
          <div className="flex flex-col gap-3">
            <Eyebrow tone="yellow" size="md">
              Pago simulado
            </Eyebrow>
            <Display size="h2" as="h1">
              {t.title(gateway)}
            </Display>
            <p className="m-0 max-w-[560px] text-[15px] leading-[1.5] text-text-2">{t.sub(gateway)}</p>
          </div>

          <fieldset className="m-0 grid grid-cols-2 gap-3 border-0 p-0">
            <Eyebrow as="legend" size="md" className="mb-3">
              {t.cardLabel}
            </Eyebrow>
            {[
              { label: t.cardNumber, value: "4507 9900 0000 4905", span: true },
              { label: t.cardHolder, value: customer.name.toUpperCase(), span: true },
              { label: t.cardExpiry, value: "12/30", span: false },
              { label: t.cardCvv, value: "123", span: false },
            ].map((f) => (
              <Field key={f.label} label={f.label} className={f.span ? "col-span-2" : ""}>
                <Input readOnly value={f.value} className="font-mono" />
              </Field>
            ))}
            <p className="col-span-2 m-0 text-[13px] text-text-3">{t.testCard}</p>
          </fieldset>

          <SimulatedPayButtons
            orderId={order.id}
            gateway={gateway}
            amountLabel={amount}
            confirmUrl={`/checkout/confirmacion/${order.number}?e=${encodeURIComponent(customer.email ?? customer.phone)}`}
          />
        </Panel>

        <Panel as="aside" padding="lg" gap="lg" className="max-lg:order-1">
          <div className="flex flex-col gap-1">
            <Eyebrow size="md">{t.merchant}</Eyebrow>
            <span className="text-[20px] font-extrabold">{runtime.brandName}</span>
          </div>
          <KeyValueList
            layout="stacked"
            items={[
              { label: t.order, value: order.number, mono: true },
              { label: t.customer, value: customer.name },
              {
                label: t.plan,
                value:
                  installments > 1
                    ? t.planN(installments, formatMoney(Math.round(charge / installments)))
                    : t.plan1,
              },
              ...(isDeposit
                ? [{ label: t.balance, value: formatMoney(order.total - order.depositAmount) }]
                : []),
            ]}
          />
          <div className="flex items-center justify-between gap-4">
            <Eyebrow size="md">{isDeposit ? t.deposit : t.amount}</Eyebrow>
            <Price amount={charge} size="total" tone="yellow" />
          </div>
        </Panel>
      </div>
      <p className="m-0 mt-8 px-4 text-center text-[13px] text-text-3">{t.footer}</p>
    </div>
  );
}
