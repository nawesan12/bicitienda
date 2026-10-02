import { Section } from "@react-email/components";
import { formatARS } from "@/lib/format";
import {
  Button,
  EmailShell,
  Kicker,
  P,
  PriceBlocks,
  Title,
} from "./components";

/** "Volvió el stock": aviso breve a quien lo pidió desde la ficha agotada. */
export interface BackInStockData {
  brandName: string;
  productName: string;
  /** null = precio a consultar. */
  price: number | null;
  productUrl: string;
  whatsapp: string;
  footer: string;
}

export function BackInStockEmail(data: BackInStockData) {
  return (
    <EmailShell
      preview={`¡Volvió ${data.productName}!`}
      footer={data.footer}
    >
      <Kicker>DISPONIBLE AHORA</Kicker>
      <Title>¡Volvió {data.productName}!</Title>
      <P>
        Nos pediste que te avisemos: ya hay stock de nuevo en{" "}
        {data.brandName}. Las unidades vuelan — si lo querés, no lo dejes
        pasar.
      </P>
      <PriceBlocks
        blocks={[
          {
            tone: "night",
            label: data.productName,
            value: data.price != null ? formatARS(data.price) : "Consultar",
          },
        ]}
      />
      <Section style={{ marginTop: "24px" }}>
        <Button href={data.productUrl}>Ver el producto →</Button>
        <Button
          variant="brand"
          href={`https://wa.me/${data.whatsapp}?text=${encodeURIComponent(
            `Hola! Me avisaron que volvió ${data.productName} y lo quiero`,
          )}`}
        >
          Reservarlo por WhatsApp
        </Button>
      </Section>
    </EmailShell>
  );
}
