import { Section } from "@react-email/components";
import { lexicon } from "@/lib/data/content";
import { formatARS } from "@/lib/format";
import type { PaymentMethodId } from "@/lib/types";
import {
  Button,
  Callout,
  colors,
  EmailShell,
  Kicker,
  P,
  PriceBlocks,
  Row,
  Title,
  type PriceBlock,
} from "./components";

const c = lexicon.commerce.confirm;

/**
 * Confirmación de pedido, con la variante de instrucciones según el medio
 * de pago: tarjeta acreditada (con el plan de cuotas y su recargo) /
 * seña / transferencia (alias + monto + vencimiento) / efectivo (código
 * de retiro + vencimiento).
 */
export interface OrderEmailData {
  brandName: string;
  number: string;
  customerName: string;
  items: { name: string; quantity: number; unitPrice: number }[];
  subtotal: number;
  discount: number;
  /** Cuotas con tarjeta (1 = un pago) y su recargo, ya sumado al total. */
  installments?: number;
  financingSurcharge?: number;
  /** Descuento por transferencia en % (para el label). */
  transferDiscount?: number;
  shippingCost: number;
  shippingPending: boolean;
  total: number;
  paymentMethod: PaymentMethodId;
  paid: boolean;
  /** Pedido señado: cuánto se pagó de seña y cuánto falta. */
  señado: boolean;
  paidAmount: number;
  balanceDue: number;
  deliveryLabel: string;
  pickupCode: string | null;
  transferAlias: string;
  expiresLabel: string | null;
  whatsapp: string;
  trackingUrl: string;
  footer: string;
}

export function OrderConfirmationEmail(data: OrderEmailData) {
  const first = data.customerName.split(" ")[0];
  const n = data.installments ?? 1;
  const surcharge = data.financingSurcharge ?? 0;
  // % de recargo sobre la base sin financiar (r3/r6 del pedido).
  const surchargePct =
    surcharge > 0
      ? Math.round((surcharge / (data.total - surcharge)) * 1000) / 10
      : 0;
  const isCard =
    data.paymentMethod === "payway" || data.paymentMethod === "mercadopago";

  const planBlocks: PriceBlock[] = [];
  if (isCard && !data.señado) {
    planBlocks.push({
      tone: "night",
      label: n > 1 ? `${n} cuotas MiPyME` : c.planOne,
      value: formatARS(n > 1 ? Math.round(data.total / n) : data.total),
      sub: n > 1 ? `Total ${formatARS(data.total)}` : undefined,
    });
    if (surcharge > 0) {
      planBlocks.push({
        tone: "chip",
        label: `Recargo +${surchargePct}%`,
        value: formatARS(surcharge),
      });
    }
  }

  return (
    <EmailShell
      preview={`Pedido ${data.number} confirmado`}
      footer={data.footer}
    >
      <Kicker>{c.kicker}</Kicker>
      <Title>
        ¡Gracias, {first}! Pedido {data.number}
      </Title>
      <P>
        {data.paid
          ? "Tu pago ya está acreditado. Te escribimos por WhatsApp para coordinar la entrega."
          : data.señado
            ? "Tu seña ya está acreditada y las unidades quedaron reservadas a tu nombre."
            : "Recibimos tu pedido y te reservamos las unidades."}
      </P>

      {planBlocks.length > 0 && (
        <Section style={{ marginTop: "22px" }}>
          <Kicker color={colors.muted}>{c.planKicker}</Kicker>
          <PriceBlocks blocks={planBlocks} />
        </Section>
      )}

      {data.señado && (
        <Section style={{ marginTop: "22px" }}>
          <Kicker color={colors.muted}>{c.depositKicker}</Kicker>
          <PriceBlocks
            blocks={[
              { tone: "pastel", label: c.depositPaid, value: formatARS(data.paidAmount) },
              { tone: "night", label: c.balance, value: formatARS(data.balanceDue) },
              { tone: "chip", label: c.alias, value: data.transferAlias },
            ]}
          />
          <P>
            El saldo de <strong>{formatARS(data.balanceDue)}</strong> se abona
            por transferencia al alias <strong>{data.transferAlias}</strong> o
            al retirar/recibir el pedido. Te avisamos por email cuando quede
            saldado.
          </P>
        </Section>
      )}

      {data.paymentMethod === "transferencia" && !data.paid && (
        <Section style={{ marginTop: "22px" }}>
          <Kicker color={colors.muted}>{c.transferKicker}</Kicker>
          <PriceBlocks
            blocks={[
              { tone: "night", label: c.alias, value: data.transferAlias },
              {
                tone: "pastel",
                label: c.amount(data.transferDiscount ?? 0),
                value: formatARS(data.total),
                sub: data.expiresLabel
                  ? `${c.reservedUntil} ${data.expiresLabel}`
                  : undefined,
              },
            ]}
          />
          <P>Transferí y mandanos el comprobante por WhatsApp.</P>
        </Section>
      )}

      {data.paymentMethod === "efectivo" && !data.paid && (
        <Section style={{ marginTop: "22px" }}>
          <Kicker color={colors.muted}>{c.cashKicker}</Kicker>
          <PriceBlocks
            blocks={[
              { tone: "night", label: c.pickupCode, value: data.pickupCode ?? "—" },
              {
                tone: "chip",
                label: "Total",
                value: formatARS(data.total),
                sub: data.expiresLabel
                  ? `${c.reservedUntil} ${data.expiresLabel}`
                  : undefined,
              },
            ]}
          />
        </Section>
      )}

      {data.pickupCode && data.paymentMethod !== "efectivo" && (
        <Callout label={c.pickupKicker}>
          <P>
            Tu código de retiro es <strong>{data.pickupCode}</strong>.
          </P>
        </Callout>
      )}

      <Callout label={c.summaryKicker}>
        {data.items.map((it) => (
          <Row
            key={it.name}
            left={`${it.quantity}× ${it.name}`}
            right={formatARS(it.unitPrice * it.quantity)}
          />
        ))}
        <Row left="Subtotal" right={formatARS(data.subtotal)} />
        {data.discount > 0 && (
          <Row
            left={
              data.transferDiscount
                ? `Transferencia −${data.transferDiscount}%`
                : "Descuento"
            }
            right={`−${formatARS(data.discount)}`}
            accent
          />
        )}
        <Row
          left="Envío"
          right={
            data.shippingPending
              ? "A cotizar"
              : data.shippingCost > 0
                ? formatARS(data.shippingCost)
                : "Gratis"
          }
        />
        {surcharge > 0 && (
          <Row
            left={`Recargo ${n} cuotas MiPyME (+${surchargePct}%)`}
            right={`+${formatARS(surcharge)}`}
          />
        )}
        <Row left="Total" right={formatARS(data.total)} strong />
      </Callout>

      <Callout label="ENTREGA">
        <P>{data.deliveryLabel}</P>
      </Callout>

      <Section style={{ marginTop: "24px" }}>
        <Button href={data.trackingUrl}>Seguí tu pedido →</Button>
        <Button
          variant="brand"
          href={`https://wa.me/${data.whatsapp}?text=${encodeURIComponent(
            c.waMsg(data.number),
          )}`}
        >
          Escribinos por WhatsApp
        </Button>
      </Section>
    </EmailShell>
  );
}
