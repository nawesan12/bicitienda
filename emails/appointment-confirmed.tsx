import {
  Actions,
  B,
  Button,
  DataRows,
  EmailShell,
  Eyebrow,
  firstName,
  Notice,
  P,
  Panel,
  Pill,
  Steps,
  Title,
  waLink,
} from "./components";

/**
 * "Tu turno está confirmado" (y, con `rescheduledFrom`, "reprogramado"):
 * servicio, día y hora, dónde, y cómo gestionarlo. La firma la usa
 * lib/server/mail.ts: los campos nuevos son opcionales.
 */
export interface AppointmentConfirmedData {
  brandName: string;
  number: string;
  customerName: string;
  serviceName: string;
  /** "jueves 8 de octubre". */
  dayLabel: string;
  /** "17:30". */
  time: string;
  /** Turno del taller (reparación / service): suma el paso "Traé la bici". */
  repair?: boolean;
  priceNote: string;
  address: string;
  hours: string;
  manageUrl: string;
  whatsapp: string;
  footer: string;
  /** Duración del servicio (default 30). */
  durationMin?: number;
  /** Turno reprogramado: día y hora anteriores ("martes 6 de octubre 10:30"). */
  rescheduledFrom?: string | null;
  mapsUrl?: string | null;
}

export function AppointmentConfirmedEmail(data: AppointmentConfirmedData) {
  const first = firstName(data.customerName);
  const moved = Boolean(data.rescheduledFrom);
  const duration = data.durationMin ?? 30;
  return (
    <EmailShell
      preview={`${moved ? "Turno reprogramado" : "Turno confirmado"}: ${data.dayLabel} a las ${data.time} hs · ${data.serviceName}`}
      footer={data.footer}
      whatsapp={data.whatsapp}
    >
      <Eyebrow>
        {moved ? "Turno reprogramado" : "Turno confirmado"} · {data.number}
      </Eyebrow>
      <Title accent={<>el {data.dayLabel} a las {data.time}.</>}>{first}, te esperamos</Title>
      <Pill tone="yellow">{moved ? "Reprogramado" : "Confirmado"}</Pill>
      {moved && (
        <P>
          Movimos tu turno. El anterior (<span style={{ textDecoration: "line-through" }}>{data.rescheduledFrom}</span>)
          quedó liberado.
        </P>
      )}

      <Panel label={data.serviceName} accent="yellow">
        <DataRows
          rows={[
            {
              label: "Día y hora",
              value: `${data.time} hs`,
              big: true,
              tone: "yellow",
              sub: `${data.dayLabel.charAt(0).toUpperCase()}${data.dayLabel.slice(1)} · ${duration} min`,
            },
            {
              label: "Dónde",
              value: data.mapsUrl ? (
                <a href={data.mapsUrl} style={{ color: "inherit", textDecoration: "underline" }}>
                  {data.address}
                </a>
              ) : (
                data.address
              ),
              sub: data.hours,
            },
          ]}
        />
      </Panel>

      <Notice tone="yellow">
        {data.priceNote ? `${data.priceNote}: ` : ""}no cobramos nada online.
      </Notice>

      <Steps
        title="Para tu turno"
        steps={[
          { title: "Llegá 5 minutos antes", body: `Así aprovechás los ${duration} minutos completos.` },
          ...(data.repair
            ? [
                {
                  title: "Traé la bici",
                  body: "La revisamos y te pasamos el presupuesto por WhatsApp antes de tocar nada.",
                },
              ]
            : []),
          { title: "¿No podés venir?", body: <>Reprogramalo o cancelalo desde el link, o avisanos por WhatsApp.</> },
        ]}
      />

      <Actions>
        <Button href={data.manageUrl}>Reprogramar o cancelar</Button>
        <Button
          variant="secondary"
          href={waLink(data.whatsapp, `Hola, tengo el turno ${data.number} (${data.dayLabel} ${data.time}).`)}
        >
          WhatsApp
        </Button>
      </Actions>
      <P muted>
        Turno <B>{data.number}</B> en {data.brandName}.
      </P>
    </EmailShell>
  );
}
