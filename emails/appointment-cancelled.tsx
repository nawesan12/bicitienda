import { Actions, Button, DataRows, EmailShell, Eyebrow, firstName, P, Panel, Pill, Title, waLink } from "./components";

/**
 * Turno cancelado (por el cliente desde el link o por el local). Lo manda
 * sendAppointmentCancelledEmail (lib/server/mail.ts) desde
 * cancelAppointment (lib/server/appointments.ts).
 */
export interface AppointmentCancelledData {
  brandName: string;
  number: string;
  customerName: string;
  serviceName: string;
  dayLabel: string;
  time: string;
  /** Quién canceló: cambia el texto. */
  by: "cliente" | "local";
  /** Motivo opcional (cuando cancela el local: feriado, bloqueo…). */
  reason?: string | null;
  /** Link para sacar otro turno (/turnos). */
  bookUrl: string;
  whatsapp: string;
  footer: string;
}

export function AppointmentCancelledEmail(data: AppointmentCancelledData) {
  const first = firstName(data.customerName);
  const byStore = data.by === "local";
  return (
    <EmailShell
      preview={`Turno ${data.number} cancelado: ${data.dayLabel} ${data.time} hs.`}
      footer={data.footer}
      whatsapp={data.whatsapp}
    >
      <Eyebrow tone="red">Turno {data.number}</Eyebrow>
      <Title accent="quedó cancelado.">{first}, tu turno</Title>
      <Pill tone="muted">Cancelado</Pill>
      <P>
        {byStore
          ? "Tuvimos que cancelar tu turno, perdón por el cambio. Elegí otro día y horario cuando quieras."
          : "Listo, cancelamos tu turno y el horario quedó libre. Cuando quieras, sacá otro."}
      </P>
      {data.reason && <P>Motivo: {data.reason}</P>}
      <Panel label="Turno cancelado">
        <DataRows
          rows={[
            {
              label: data.serviceName,
              value: <span style={{ textDecoration: "line-through" }}>{`${data.dayLabel} · ${data.time} hs`}</span>,
            },
          ]}
        />
      </Panel>
      <Actions>
        <Button href={data.bookUrl}>Sacar otro turno →</Button>
        <Button variant="secondary" href={waLink(data.whatsapp, `Hola, me cancelaron el turno ${data.number}.`)}>
          WhatsApp
        </Button>
      </Actions>
    </EmailShell>
  );
}
