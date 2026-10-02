import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { store } from "@/lib/config";
import { runtimeSiteUrl } from "@/lib/site";

/**
 * Piezas compartidas de los emails transaccionales, con la paleta del
 * handoff: fondo crema, header negro con logo y filete verde, tarjeta
 * blanca de 24px de radio, títulos en Archivo 900 (con fallback, muchos
 * clientes no cargan webfonts), kickers en mayúsculas con tracking y la
 * caja de precio de la ficha en bloques (negro / crema / pastel).
 *
 * Las URLs de imágenes tienen que ser absolutas — los clientes de correo
 * no resuelven rutas relativas.
 */
export const SITE_URL = runtimeSiteUrl();

const brandColors = store.emailColors;

/**
 * Paleta de los mails: la de la marca (`store.emailColors`, capa por
 * tienda) o la neutra del core. Con marca: header y bloques fuertes en
 * `ink`, acento (filete, botón de WhatsApp, cifra destacada) en `accent`,
 * kickers en `offer` y la caja pastel en el acento con texto `ink`.
 */
export const colors = brandColors
  ? {
      night: brandColors.ink,
      ink: brandColors.ink,
      brand: brandColors.accent,
      brandDeep: brandColors.offer,
      brandDeeper: brandColors.onAccent,
      body: "#4c463d",
      muted: "#8d867a",
      line: "#e8e1d3",
      cream: brandColors.paper,
      soft: "#faf7f0",
      chip: "#e8e1d3",
      pastel: brandColors.accent,
    }
  : {
      night: "#0c0e0b",
      ink: "#15170f",
      brand: "#5eb838",
      brandDeep: "#3f9c22",
      brandDeeper: "#2f7a17",
      body: "#4c4f45",
      muted: "#9a9d92",
      line: "#e8e6df",
      cream: "#f4f3ee",
      soft: "#fafaf6",
      chip: "#f1f0e9",
      pastel: "#dff0d4",
    };

/** Con fallbacks: muchos clientes de correo no cargan webfonts. */
export const fontStack = brandColors
  ? "'Archivo', 'Helvetica Neue', Helvetica, Arial, sans-serif"
  : "'Space Grotesk', 'Helvetica Neue', Helvetica, Arial, sans-serif";
export const displayStack =
  "'Archivo', 'Arial Black', 'Helvetica Neue', Helvetica, Arial, sans-serif";

export function EmailShell({
  preview,
  footer,
  children,
}: {
  preview: string;
  footer: string;
  children: React.ReactNode;
}) {
  return (
    <Html lang="es-AR">
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          margin: 0,
          padding: "28px 12px",
          backgroundColor: colors.cream,
          fontFamily: fontStack,
        }}
      >
        <Container
          style={{
            margin: "0 auto",
            maxWidth: "600px",
            backgroundColor: "#ffffff",
            borderRadius: "24px",
            border: "1px solid rgba(21,23,15,.1)",
            overflow: "hidden",
          }}
        >
          <Section
            style={{
              backgroundColor: colors.night,
              padding: "26px 24px 22px",
              textAlign: "center" as const,
              borderBottom: `4px solid ${colors.brand}`,
            }}
          >
            <Img
              src={`${SITE_URL}/brand/logo-white.png`}
              alt="Logo"
              width="150"
              style={{ margin: "0 auto" }}
            />
          </Section>
          <Section style={{ padding: "32px 32px 34px" }}>{children}</Section>
          <Section
            style={{
              backgroundColor: colors.soft,
              borderTop: `1px solid ${colors.line}`,
              padding: "18px 32px",
            }}
          >
            <Text
              style={{
                margin: 0,
                fontSize: "12px",
                lineHeight: "1.6",
                color: colors.muted,
              }}
            >
              {footer}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

/** Label en mayúsculas con tracking ancho (los kickers del handoff). */
export function Kicker({
  children,
  color = colors.brandDeep,
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <Text
      style={{
        margin: 0,
        fontFamily: fontStack,
        fontSize: "10.5px",
        fontWeight: 700,
        letterSpacing: "0.22em",
        textTransform: "uppercase" as const,
        color,
      }}
    >
      {children}
    </Text>
  );
}

export function Title({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        margin: "8px 0 0",
        fontFamily: displayStack,
        fontSize: "28px",
        lineHeight: "1.08",
        fontWeight: 900,
        letterSpacing: "-0.02em",
        color: colors.ink,
      }}
    >
      {children}
    </Text>
  );
}

export function P({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        margin: "12px 0 0",
        fontSize: "14px",
        lineHeight: "1.65",
        color: colors.body,
      }}
    >
      {children}
    </Text>
  );
}

/** Tarjeta destacada (instrucciones de pago, código de retiro). */
export function Callout({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Section
      style={{
        marginTop: "20px",
        backgroundColor: colors.soft,
        border: `1px solid ${colors.line}`,
        borderRadius: "16px",
        padding: "16px 20px",
      }}
    >
      <Kicker>{label}</Kicker>
      {children}
    </Section>
  );
}

export interface PriceBlock {
  label: string;
  value: string;
  /** Línea chica debajo del valor (recargo, vencimiento…). */
  sub?: string;
  tone: "night" | "chip" | "pastel";
}

/**
 * La caja de precio de la ficha en email: bloques lado a lado (tabla, que
 * es lo único que respetan todos los clientes) en negro con la cifra
 * verde, crema y pastel.
 */
export function PriceBlocks({ blocks }: { blocks: PriceBlock[] }) {
  const tone = {
    night: { bg: colors.night, label: "rgba(244,243,238,.6)", value: colors.brand, sub: "rgba(244,243,238,.55)" },
    chip: { bg: colors.chip, label: "rgba(21,23,15,.55)", value: colors.ink, sub: "rgba(21,23,15,.55)" },
    pastel: { bg: colors.pastel, label: colors.brandDeeper, value: colors.brandDeeper, sub: colors.brandDeeper },
  };
  // "Fluid hybrid": bloques inline-block con ancho mínimo. En desktop van
  // en fila; en un mail angosto (390px) los que no entran bajan a la
  // línea siguiente en vez de partir los montos o desbordar.
  const w = Math.floor(100 / blocks.length) - 2;
  return (
    <div style={{ marginTop: "14px", fontSize: 0, lineHeight: 0 }}>
      {blocks.map((b, i) => {
        const c = tone[b.tone];
        return (
          <div
            key={b.label}
            style={{
              display: "inline-block",
              verticalAlign: "top",
              boxSizing: "border-box",
              width: `${w}%`,
              minWidth: "140px",
              marginRight: i < blocks.length - 1 ? "2%" : 0,
              marginBottom: "6px",
              backgroundColor: c.bg,
              borderRadius: "12px",
              padding: "11px 14px",
              lineHeight: 1.3,
            }}
          >
            <div
              style={{
                fontFamily: fontStack,
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: c.label,
              }}
            >
              {b.label}
            </div>
            <div
              style={{
                marginTop: "3px",
                fontFamily: displayStack,
                fontSize: "18px",
                fontWeight: 800,
                color: c.value,
                // Montos, alias y códigos (sin espacios) no se parten;
                // un texto (p. ej. la dirección) sí puede bajar de línea.
                whiteSpace: /\s/.test(b.value.trim()) ? "normal" : "nowrap",
              }}
            >
              {b.value}
            </div>
            {b.sub && (
              <div
                style={{
                  marginTop: "2px",
                  fontFamily: fontStack,
                  fontSize: "11.5px",
                  color: c.sub,
                }}
              >
                {b.sub}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function Row({
  left,
  right,
  strong,
  accent,
}: {
  left: string;
  right: string;
  strong?: boolean;
  /** Fila en verde (descuentos). */
  accent?: boolean;
}) {
  const color = accent ? colors.brandDeep : strong ? colors.ink : colors.body;
  return (
    <table width="100%" style={{ marginTop: strong ? "10px" : "6px" }}>
      <tbody>
        <tr>
          <td
            style={{
              fontFamily: strong ? displayStack : fontStack,
              fontSize: strong ? "17px" : "13.5px",
              fontWeight: strong ? 900 : 400,
              color,
            }}
          >
            {left}
          </td>
          <td
            align="right"
            style={{
              fontFamily: strong ? displayStack : fontStack,
              fontSize: strong ? "20px" : "13.5px",
              fontWeight: strong ? 800 : 700,
              color,
            }}
          >
            {right}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/** Botón pill: negro con texto crema (primario) o verde (WhatsApp). */
export function Button({
  href,
  children,
  variant = "ink",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "ink" | "brand";
}) {
  return (
    <a
      href={href}
      style={{
        display: "inline-block",
        margin: "0 8px 8px 0",
        padding: "13px 24px",
        borderRadius: "999px",
        backgroundColor: variant === "brand" ? colors.brand : colors.ink,
        color: variant === "brand" ? colors.night : colors.cream,
        fontFamily: fontStack,
        fontSize: "14px",
        fontWeight: 700,
        textDecoration: "none",
      }}
    >
      {children}
    </a>
  );
}
