import { Section } from "@react-email/components";
import { lexicon } from "@/lib/data/content";
import {
  Button,
  colors,
  EmailShell,
  Kicker,
  P,
  PriceBlocks,
  Title,
} from "./components";

const t = lexicon.commerce.tracking;

/** "Tu pedido está listo para retirar" / "va en camino". */
export interface StatusEmailData {
  brandName: string;
  number: string;
  customerName: string;
  headline: string;
  body: string;
  pickupCode: string | null;
  address: string;
  hours: string;
  whatsapp: string;
  trackingUrl: string;
  footer: string;
  isPickup: boolean;
}

export function OrderStatusEmail(data: StatusEmailData) {
  const first = data.customerName.split(" ")[0];
  return (
    <EmailShell
      preview={`Pedido ${data.number}: ${data.headline}`}
      footer={data.footer}
    >
      <Kicker>{t.orderTitle(data.number)}</Kicker>
      <Title>
        {first}, {data.headline}
      </Title>
      <P>{data.body}</P>

      {data.isPickup && (
        <Section style={{ marginTop: "22px" }}>
          <Kicker color={colors.muted}>{t.pickupKicker}</Kicker>
          <PriceBlocks
            blocks={[
              ...(data.pickupCode
                ? [
                    {
                      tone: "night" as const,
                      label: t.code,
                      value: data.pickupCode,
                    },
                  ]
                : []),
              {
                tone: "pastel" as const,
                label: data.hours,
                value: data.address,
              },
            ]}
          />
        </Section>
      )}

      <Section style={{ marginTop: "24px" }}>
        <Button href={data.trackingUrl}>Ver el seguimiento →</Button>
        <Button
          variant="brand"
          href={`https://wa.me/${data.whatsapp}?text=${encodeURIComponent(
            t.waMsg(data.number),
          )}`}
        >
          WhatsApp
        </Button>
      </Section>
    </EmailShell>
  );
}
