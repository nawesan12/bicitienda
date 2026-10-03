import {
  Actions,
  Button,
  colors,
  EmailShell,
  Eyebrow,
  fonts,
  money,
  P,
  Panel,
  Pill,
  Title,
  waLink,
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
  /** Opcionales: foto (URL absoluta), "MTB / Venzo" y talle/color pedido. */
  imageUrl?: string | null;
  category?: string | null;
  variant?: string | null;
  /** % off por transferencia, para la línea roja de la card. */
  transferDiscount?: number;
}

export function BackInStockEmail(data: BackInStockData) {
  const transfer =
    data.price != null && data.transferDiscount
      ? Math.round(data.price * (1 - data.transferDiscount / 100))
      : null;
  return (
    <EmailShell preview={`Volvió ${data.productName}. Las unidades vuelan.`} footer={data.footer} whatsapp={data.whatsapp}>
      <Eyebrow>Volvió el stock</Eyebrow>
      <Title accent="ya está de nuevo.">{data.productName}</Title>
      <Pill tone="red">Disponible ahora</Pill>
      <P>
        Nos pediste que te avisemos: ya hay stock en {data.brandName}. Las unidades vuelan, si lo querés no lo
        dejes pasar.
      </P>

      {/* Card de producto del handoff: foto arriba, cuerpo papel. */}
      <Panel tone="paper">
        {data.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- mail, no next/image
          <img
            src={data.imageUrl}
            alt={data.productName}
            width={520}
            style={{ display: "block", width: "100%", maxWidth: "520px", height: "auto", border: 0, borderRadius: "6px", marginBottom: "14px" }}
          />
        )}
        {(data.category || data.variant) && (
          <p
            style={{
              margin: 0,
              fontFamily: fonts.mono,
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: colors.text4,
            }}
          >
            {[data.category, data.variant].filter(Boolean).join(" · ")}
          </p>
        )}
        <p style={{ margin: "6px 0 0", fontFamily: fonts.body, fontSize: "18px", lineHeight: 1.3, fontWeight: 800, color: colors.ink }}>
          {data.productName}
        </p>
        <p
          style={{
            margin: "12px 0 0",
            paddingTop: "12px",
            borderTop: "1px dashed #cfc6b4",
            fontFamily: fonts.display,
            fontSize: "30px",
            lineHeight: 1,
            fontWeight: 900,
            fontStretch: "condensed",
            color: colors.ink,
          }}
        >
          {data.price != null ? money(data.price) : "Precio a consultar"}
        </p>
        {transfer != null && (
          <p style={{ margin: "6px 0 0", fontFamily: fonts.body, fontSize: "14px", fontWeight: 700, color: colors.redOnPaper }}>
            {money(transfer)} por transferencia
          </p>
        )}
      </Panel>

      <Actions>
        <Button href={data.productUrl}>Ver el producto →</Button>
        <Button
          variant="secondary"
          href={waLink(data.whatsapp, `Hola! Me avisaron que volvió ${data.productName} y lo quiero`)}
        >
          Reservarlo por WhatsApp
        </Button>
      </Actions>
    </EmailShell>
  );
}
