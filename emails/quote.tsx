import {
  Actions,
  B,
  Button,
  DataRows,
  EmailShell,
  Eyebrow,
  firstName,
  money,
  P,
  Panel,
  Pill,
  Steps,
  Summary,
  Title,
  waLink,
} from "./components";

/**
 * Presupuestos (5a/5b del handoff): "recibimos tu pedido de presupuesto"
 * y "te pasamos el presupuesto" (cotizado). La cotización sale por
 * WhatsApp (quoteWhatsAppUrl en lib/server/quotes.ts) y, si el cliente
 * dejó email, también por mail (sendQuoteReceivedEmail/sendQuoteSentEmail
 * en lib/server/mail.ts).
 */

export interface QuoteReceivedData {
  brandName: string;
  number: string;
  customerName: string;
  /** "Producto importado", "Repuesto"… */
  kindLabel: string;
  detail: string;
  forBike?: string | null;
  budget?: string | null;
  whatsapp: string;
  footer: string;
}

export function QuoteReceivedEmail(data: QuoteReceivedData) {
  const first = firstName(data.customerName);
  return (
    <EmailShell
      preview={`Recibimos tu pedido de presupuesto ${data.number}. Te respondemos por WhatsApp en 24 hs hábiles.`}
      footer={data.footer}
      whatsapp={data.whatsapp}
    >
      <Eyebrow>Presupuesto sin cargo · {data.number}</Eyebrow>
      <Title accent="tu consulta.">{first}, recibimos</Title>
      <Pill tone="red">Nuevo</Pill>
      <P>Lo revisamos en el local y te respondemos por WhatsApp en 24 hs hábiles.</P>
      <Panel label={`Lo que pediste · ${data.kindLabel}`}>
        <P style={{ margin: 0, whiteSpace: "pre-line" }}>{data.detail}</P>
        {(data.forBike || data.budget) && (
          <div style={{ marginTop: "16px" }}>
            <DataRows
              rows={[
                ...(data.forBike ? [{ label: "Para", value: data.forBike }] : []),
                ...(data.budget ? [{ label: "Presupuesto aproximado", value: data.budget }] : []),
              ]}
            />
          </div>
        )}
      </Panel>
      <Steps
        steps={[
          { title: "Lo revisamos en el local", body: "Vemos stock, proveedores y alternativas." },
          { title: "Te escribimos por WhatsApp", body: "Con el precio, la demora y hasta cuándo vale." },
          { title: "Si te sirve, lo encargamos", body: "Y te avisamos cuando lo tengas para retirar." },
        ]}
      />
      <Actions>
        <Button
          variant="secondary"
          href={waLink(data.whatsapp, `Hola! Les escribo por el presupuesto ${data.number}`)}
        >
          Escribinos por WhatsApp
        </Button>
      </Actions>
    </EmailShell>
  );
}

export interface QuoteSentData {
  brandName: string;
  number: string;
  customerName: string;
  /** Título corto ("Rodillo smart Zwift"). */
  title: string;
  lines: { name: string; price: number; quantity: number }[];
  total: number;
  /** "30 a 45 días", "En stock". */
  eta?: string | null;
  /** "8 oct". */
  validLabel?: string | null;
  whatsapp: string;
  footer: string;
}

export function QuoteSentEmail(data: QuoteSentData) {
  const first = firstName(data.customerName);
  return (
    <EmailShell
      preview={`Presupuesto ${data.number}: ${money(data.total)}${data.validLabel ? `, válido hasta el ${data.validLabel}` : ""}.`}
      footer={data.footer}
      whatsapp={data.whatsapp}
    >
      <Eyebrow>Presupuesto {data.number}</Eyebrow>
      <Title accent={<>{data.title}.</>}>{first}, te pasamos el precio:</Title>
      <Pill tone="neutral">Cotizado</Pill>
      <P>
        Esto es lo que te podemos conseguir. Si te sirve, respondenos por WhatsApp y lo encargamos.
      </P>
      <Summary
        label="Cotización"
        items={data.lines.map((l) => ({ name: l.name, quantity: l.quantity, amount: l.price * l.quantity }))}
        total={money(data.total)}
      />
      {(data.eta || data.validLabel) && (
        <Panel>
          <DataRows
            rows={[
              ...(data.eta ? [{ label: "Demora", value: data.eta }] : []),
              ...(data.validLabel ? [{ label: "Válido hasta", value: `El ${data.validLabel}`, tone: "red" as const }] : []),
            ]}
          />
        </Panel>
      )}
      <Actions>
        <Button
          href={waLink(data.whatsapp, `Hola! Quiero avanzar con el presupuesto ${data.number}`)}
        >
          Lo quiero →
        </Button>
        <Button
          variant="secondary"
          href={waLink(data.whatsapp, `Hola! Tengo una consulta por el presupuesto ${data.number}`)}
        >
          Consultar
        </Button>
      </Actions>
      <P muted>
        Precios en pesos, pago y retiro en <B>{data.brandName}</B>.
      </P>
    </EmailShell>
  );
}
