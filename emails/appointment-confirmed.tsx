import { Section } from "@react-email/components";
import {
  Button,
  colors,
  EmailShell,
  Kicker,
  P,
  PriceBlocks,
  Title,
} from "./components";

/** "Tu turno está confirmado": servicio, día y hora, y cómo gestionarlo. */
export interface AppointmentConfirmedData {
  brandName: string;
  number: string;
  customerName: string;
  serviceName: string;
  /** "jueves 8 de octubre". */
  dayLabel: string;
  /** "17:30". */
  time: string;
  /** Producto a probar ("MTB rodado 29 · Talle M"), si aplica. */
  product: string | null;
  priceNote: string;
  address: string;
  hours: string;
  manageUrl: string;
  whatsapp: string;
  footer: string;
}

export function AppointmentConfirmedEmail(data: AppointmentConfirmedData) {
  const first = data.customerName.split(" ")[0];
  return (
    <EmailShell
      preview={`Turno ${data.dayLabel} a las ${data.time}`}
      footer={data.footer}
    >
      <Kicker>TURNO {data.number}</Kicker>
      <Title>
        {first}, te esperamos el {data.dayLabel} a las {data.time}
      </Title>
      <P>
        {data.serviceName}
        {data.product ? ` · ${data.product}` : ""}. Dura 30 minutos.{" "}
        {data.priceNote ? `${data.priceNote}: no cobramos nada online.` : ""}
      </P>
      <Section style={{ marginTop: "18px" }}>
        <PriceBlocks
          blocks={[
            { tone: "night", label: "Día y hora", value: `${data.time} hs`, sub: data.dayLabel },
            { tone: "pastel", label: data.hours, value: data.address },
          ]}
        />
      </Section>
      <Section style={{ marginTop: "24px" }}>
        <Button href={data.manageUrl}>Reprogramar o cancelar</Button>
        <Button
          variant="brand"
          href={`https://wa.me/${data.whatsapp}?text=${encodeURIComponent(
            `Hola, tengo el turno ${data.number} (${data.dayLabel} ${data.time}).`,
          )}`}
        >
          WhatsApp
        </Button>
      </Section>
      <P>
        <span style={{ color: colors.muted }}>
          Si no podés venir, avisanos o reprogramalo desde el link.
        </span>
      </P>
    </EmailShell>
  );
}
