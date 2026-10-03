import {
  Actions,
  Button,
  DataRows,
  EmailShell,
  Eyebrow,
  firstName,
  money,
  Notice,
  P,
  Panel,
  Pill,
  splitVariant,
  Summary,
  Title,
  waLink,
} from "./components";

/**
 * "Tu pedido está listo para retirar" / "va en camino". La firma la usa
 * lib/server/mail.ts: los campos nuevos son opcionales.
 */
export interface StatusEmailData {
  brandName: string;
  number: string;
  customerName: string;
  /** "tu pedido está listo" / "tu pedido va en camino". */
  headline: string;
  body: string;
  pickupCode: string | null;
  address: string;
  hours: string;
  whatsapp: string;
  trackingUrl: string;
  footer: string;
  isPickup: boolean;
  /** Lo que falta pagar al retirar (efectivo / saldo). 0 o ausente = pagado. */
  amountDue?: number;
  /** Ítems del pedido, para el resumen (opcional). */
  items?: { name: string; variant?: string | null; quantity: number; unitPrice: number }[];
  total?: number;
  mapsUrl?: string | null;
}

export function OrderStatusEmail(data: StatusEmailData) {
  const first = firstName(data.customerName);
  const due = data.amountDue ?? 0;
  // "tu pedido está listo" → "Tu pedido" + "está listo." en amarillo.
  const m = /^(tu pedido)\s+(.*)$/i.exec(data.headline);
  return (
    <EmailShell
      preview={
        data.isPickup
          ? `Pedido ${data.number} listo. ${data.pickupCode ? `Código de retiro ${data.pickupCode}.` : ""}`
          : `Pedido ${data.number}: ${data.headline}.`
      }
      footer={data.footer}
      whatsapp={data.whatsapp}
    >
      <Eyebrow>Pedido {data.number}</Eyebrow>
      {m ? (
        <Title accent={<>{m[2]}.</>}>
          {first}, {m[1].toLowerCase()}
        </Title>
      ) : (
        <Title>
          {first}, {data.headline}
        </Title>
      )}
      <Pill tone="paper">{data.isPickup ? "Listo para retirar" : "En camino"}</Pill>
      <P>{data.body}</P>

      {data.isPickup && (
        <Panel label="Retiro en el local" accent="yellow">
          <DataRows
            rows={[
              ...(data.pickupCode
                ? [
                    {
                      label: "Código de retiro",
                      value: data.pickupCode,
                      mono: true,
                      big: true,
                      tone: "yellow" as const,
                      sub: "Mostralo en el mostrador.",
                    },
                  ]
                : []),
              {
                label: "Dónde",
                value: data.mapsUrl ? (
                  <a href={data.mapsUrl} style={{ color: "inherit", textDecoration: "underline" }}>
                    {data.address}
                  </a>
                ) : (
                  data.address
                ),
              },
              { label: "Horario", value: data.hours },
              ...(due > 0 ? [{ label: "A pagar al retirar", value: money(due), big: true }] : []),
            ]}
          />
        </Panel>
      )}

      {data.isPickup && due > 0 && <Notice tone="yellow">Lo pagás en el local, en efectivo, al retirarlo.</Notice>}

      {data.items && data.items.length > 0 && data.total != null && (
        <Summary
          items={data.items.map((it) => ({
            ...splitVariant(it.name, it.variant),
            quantity: it.quantity,
            amount: it.unitPrice * it.quantity,
          }))}
          total={money(data.total)}
        />
      )}

      <Actions>
        <Button href={data.trackingUrl}>Ver el pedido →</Button>
        <Button
          variant="secondary"
          href={waLink(data.whatsapp, `Hola! Consulta por el pedido ${data.number}`)}
        >
          WhatsApp
        </Button>
      </Actions>
    </EmailShell>
  );
}
