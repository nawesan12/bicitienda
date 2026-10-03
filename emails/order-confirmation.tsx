import type { PaymentMethodId } from "@/lib/types";
import {
  Actions,
  B,
  Button,
  colors,
  DataRows,
  EmailShell,
  Eyebrow,
  firstName,
  money,
  Nb,
  Notice,
  P,
  Panel,
  Pill,
  splitVariant,
  Steps,
  Summary,
  Title,
  waLink,
  type SummaryLine,
} from "./components";

/**
 * Confirmación de pedido. Variante según el medio de pago:
 *  - Mercado Pago / tarjeta acreditada (con plan de cuotas y recargo);
 *  - transferencia: monto con descuento, alias/CBU, vencimiento de la
 *    reserva y aviso de subir el comprobante;
 *  - efectivo: código de retiro + total a pagar en el local + reserva;
 *  - seña (core, apagada en BiciTienda): seña pagada y saldo.
 *
 * La firma la usa lib/server/mail.ts: los campos nuevos son opcionales.
 */
export interface OrderEmailData {
  brandName: string;
  number: string;
  customerName: string;
  items: {
    /** "Nombre · Talle M" (mail.ts) o el nombre solo con `variant` aparte. */
    name: string;
    variant?: string | null;
    quantity: number;
    unitPrice: number;
  }[];
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
  /** Datos bancarios completos (opcionales: hoy settings solo tiene alias). */
  transferCbu?: string | null;
  transferHolder?: string | null;
  transferBank?: string | null;
  /** Dónde se sube el comprobante (por defecto, el seguimiento). */
  receiptUrl?: string;
  expiresLabel: string | null;
  whatsapp: string;
  trackingUrl: string;
  footer: string;
}

export function OrderConfirmationEmail(data: OrderEmailData) {
  const first = firstName(data.customerName);
  const n = data.installments ?? 1;
  const surcharge = data.financingSurcharge ?? 0;
  const surchargePct =
    surcharge > 0 ? Math.round((surcharge / (data.total - surcharge)) * 1000) / 10 : 0;
  const isCard = data.paymentMethod === "payway" || data.paymentMethod === "mercadopago";
  const isTransfer = data.paymentMethod === "transferencia" && !data.paid && !data.señado;
  const isCash = data.paymentMethod === "efectivo" && !data.paid && !data.señado;
  const isPickup = /^retiro/i.test(data.deliveryLabel);
  const pickupText = data.deliveryLabel.replace(/^Retiro en\s+/i, "");
  const waMsg = `Hola! Hice el pedido ${data.number}`;

  const lines: SummaryLine[] = [{ label: "Subtotal", value: money(data.subtotal) }];
  if (data.discount > 0)
    lines.push({
      label: data.transferDiscount ? `Transferencia −${data.transferDiscount}%` : "Descuento",
      value: `− ${money(data.discount)}`,
      offer: true,
    });
  lines.push(
    isPickup
      ? { label: "Retiro en el local", value: "Sin cargo" }
      : {
          label: "Envío",
          value: data.shippingPending
            ? "A cotizar"
            : data.shippingCost > 0
              ? money(data.shippingCost)
              : "Sin cargo",
        },
  );
  if (surcharge > 0)
    lines.push({ label: `Recargo ${n} cuotas (+${surchargePct}%)`, value: `+ ${money(surcharge)}` });

  const items = data.items.map((it) => ({
    ...splitVariant(it.name, it.variant),
    quantity: it.quantity,
    amount: it.unitPrice * it.quantity,
  }));

  const planNote =
    isCard && n > 1 && !data.señado
      ? `${n} cuotas de ${money(Math.round(data.total / n))}${surcharge > 0 ? "" : " sin interés"}`
      : null;

  // Encabezado según el estado del pago.
  const head = data.paid
    ? {
        eyebrow: "Pago acreditado",
        title: <>¡Gracias, {first}!</>,
        accent: <>Pedido <Nb>{data.number}</Nb> pagado.</>,
        pill: <Pill tone="yellow">Pagado</Pill>,
        body: "Tu pago ya está acreditado. Ahora lo preparamos y te avisamos por mail y WhatsApp cuando esté listo para retirar.",
      }
    : data.señado
      ? {
          eyebrow: "Seña recibida",
          title: <>¡Gracias, {first}!</>,
          accent: <>Pedido <Nb>{data.number}</Nb> señado.</>,
          pill: <Pill tone="yellow">Señado</Pill>,
          body: "Tu seña ya está acreditada y las unidades quedaron reservadas a tu nombre.",
        }
      : isTransfer
        ? {
            eyebrow: "Falta la transferencia",
            title: <>{first}, te reservamos</>,
            accent: <>el pedido <Nb>{data.number}</Nb>.</>,
            pill: <Pill tone="red">Transf. pendiente</Pill>,
            body: "Te guardamos las unidades. Transferí el monto exacto y subí el comprobante: apenas lo validamos, lo empezamos a preparar.",
          }
        : isCash
          ? {
              eyebrow: "Reserva confirmada",
              title: <>{first}, te lo guardamos:</>,
              accent: <>pedido <Nb>{data.number}</Nb>.</>,
              pill: <Pill tone="outline">Paga en el local</Pill>,
              body: "Pagás en efectivo cuando pasás a retirarlo. Te avisamos cuando esté listo.",
            }
          : {
              eyebrow: "Pedido recibido",
              title: <>¡Gracias, {first}!</>,
              accent: <>Pedido <Nb>{data.number}</Nb>.</>,
              pill: <Pill tone="neutral">Pago en proceso</Pill>,
              body: "Recibimos tu pedido. Mercado Pago todavía está procesando el pago: apenas se acredite te avisamos, no hace falta que hagas nada.",
            };

  return (
    <EmailShell
      preview={
        isTransfer
          ? `Transferí ${money(data.total)} al alias ${data.transferAlias} y subí el comprobante.`
          : isCash
            ? `Tu código de retiro es ${data.pickupCode ?? data.number}. Pagás en el local.`
            : `Pedido ${data.number} confirmado en ${data.brandName}.`
      }
      footer={data.footer}
      whatsapp={data.whatsapp}
    >
      <Eyebrow tone={isTransfer ? "red" : "yellow"}>{head.eyebrow}</Eyebrow>
      <Title accent={head.accent}>{head.title}</Title>
      {head.pill}
      <P>{head.body}</P>

      {isTransfer && (
        <>
          {data.expiresLabel && (
            <Notice>
              Reserva hasta el {data.expiresLabel}. Si no se acredita, las unidades se liberan.
            </Notice>
          )}
          <Panel label="Datos para transferir" accent="yellow">
            <DataRows
              rows={[
                {
                  label: "Monto a transferir",
                  value: money(data.total),
                  big: true,
                  tone: "yellow",
                  sub: data.transferDiscount
                    ? `Ya tiene el ${data.transferDiscount}% off por transferencia.`
                    : undefined,
                },
                { label: "Alias", value: data.transferAlias, mono: true },
                ...(data.transferCbu ? [{ label: "CBU", value: data.transferCbu, mono: true }] : []),
                ...(data.transferHolder ? [{ label: "Titular", value: data.transferHolder }] : []),
                ...(data.transferBank ? [{ label: "Banco", value: data.transferBank }] : []),
                { label: "Referencia", value: data.number, mono: true },
              ]}
            />
          </Panel>
          <Actions>
            <Button href={data.receiptUrl ?? data.trackingUrl}>Subir comprobante →</Button>
            <Button
              variant="secondary"
              href={waLink(
                data.whatsapp,
                `Hola! Hice el pedido ${data.number} y les mando el comprobante de la transferencia`,
              )}
            >
              Mandarlo por WhatsApp
            </Button>
          </Actions>
          <Steps
            steps={[
              { title: `Transferí ${money(data.total)}`, body: `Al alias ${data.transferAlias}, desde cualquier banco o billetera.` },
              { title: "Subí el comprobante", body: "Desde el seguimiento del pedido, o mandalo por WhatsApp." },
              { title: "Lo validamos y lo preparamos", body: "Te avisamos por mail y WhatsApp cuando esté listo para retirar." },
            ]}
          />
        </>
      )}

      {isCash && (
        <>
          <Panel label="Pago en el local" accent="yellow">
            <DataRows
              rows={[
                ...(data.pickupCode
                  ? [{ label: "Código de retiro", value: data.pickupCode, mono: true, big: true, tone: "yellow" as const }]
                  : []),
                { label: "Total a pagar en efectivo", value: money(data.total), big: true },
              ]}
            />
          </Panel>
          {data.expiresLabel && (
            <Notice>Te lo guardamos hasta el {data.expiresLabel}. Después las unidades se liberan.</Notice>
          )}
          <Steps
            steps={[
              { title: "Lo preparamos", body: "Lo armamos y lo revisamos en el taller." },
              { title: "Te avisamos cuando esté listo", body: "Por mail y WhatsApp." },
              { title: "Pasás, pagás y te lo llevás", body: "Mostrá el código de retiro en el mostrador." },
            ]}
          />
        </>
      )}

      {data.señado && (
        <Panel label="Seña" accent="yellow">
          <DataRows
            rows={[
              { label: "Seña pagada", value: money(data.paidAmount) },
              { label: "Saldo pendiente", value: money(data.balanceDue), big: true, tone: "yellow" },
              { label: "Alias para el saldo", value: data.transferAlias, mono: true },
            ]}
          />
          <P style={{ fontSize: "14px" }}>
            El saldo se abona por transferencia o al retirar. Te avisamos por mail cuando quede saldado.
          </P>
        </Panel>
      )}

      {!isTransfer && !isCash && (
        <>
          {isPickup && (
            <Panel label="Retiro en el local">
              <DataRows
                rows={[
                  ...(data.pickupCode
                    ? [{ label: "Código de retiro", value: data.pickupCode, mono: true, big: true, tone: "yellow" as const }]
                    : []),
                  { label: "Dónde", value: pickupText },
                ]}
              />
            </Panel>
          )}
          {data.paid && (
            <Steps
              steps={[
                { title: "Lo preparamos", body: "Lo armamos y lo revisamos en el taller." },
                { title: "Te avisamos cuando esté listo", body: "Por mail y WhatsApp." },
                { title: "La retirás armada", body: data.pickupCode ? "Con tu código de retiro." : undefined },
              ]}
            />
          )}
        </>
      )}

      {!isPickup && data.deliveryLabel && (
        <Panel label="Entrega">
          <P style={{ margin: 0 }}>{data.deliveryLabel}</P>
        </Panel>
      )}

      <Summary
        items={items}
        lines={lines}
        total={money(data.total)}
        totalLabel={isTransfer ? "Total a transferir" : isCash ? "Total a pagar" : "Total"}
        note={planNote ? <>Plan de pago: {planNote}.</> : undefined}
      />

      {isTransfer && isPickup && (
        <P muted>
          Retirás en <B>{pickupText}</B>.
        </P>
      )}

      {!isTransfer && (
        <Actions>
          <Button href={data.trackingUrl}>Seguí tu pedido →</Button>
          <Button variant="secondary" href={waLink(data.whatsapp, waMsg)}>
            Escribinos por WhatsApp
          </Button>
        </Actions>
      )}
      {isTransfer && (
        <P muted>
          ¿Dudas?{" "}
          <a href={waLink(data.whatsapp, waMsg)} style={{ color: colors.yellow, fontWeight: 700 }}>
            Escribinos por WhatsApp
          </a>
          .
        </P>
      )}
    </EmailShell>
  );
}
