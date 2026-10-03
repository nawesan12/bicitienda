import { Body, Head, Html, Preview } from "@react-email/components";
import { store } from "@/lib/config";
import { runtimeSiteUrl } from "@/lib/site";

/**
 * Piezas compartidas de los mails de BiciTienda MDQ, con el lenguaje del
 * handoff (design_handoff_bicitienda_mdq/README.md): fondo negro, amarillo
 * para acciones, rojo para urgencia/ofertas, papel para el resumen (como
 * el cuerpo claro de la card de producto), display condensada en
 * mayúsculas y datos en mono.
 *
 * Reglas de mail (no de web):
 *  - Todo es tabla con `bgcolor` + estilos inline: Outlook (Word) no
 *    entiende divs con ancho ni flex, Gmail tira las clases.
 *  - Las fuentes web no son confiables (Gmail no carga Archivo, Outlook
 *    cae a Times si ve un @font-face): stacks con condensadas de sistema
 *    y la de Google Fonts solo como primer intento (Apple Mail la carga).
 *  - Diseño oscuro declarado (`color-scheme`) para que Apple Mail no lo
 *    toque; si un cliente igual invierte colores (Gmail iOS, Outlook.com),
 *    todo sigue siendo "texto claro sobre oscuro" o al revés, nunca gris
 *    sobre gris: no hay textos de bajo contraste ni info en imágenes.
 *  - Las URLs de imágenes son absolutas (runtimeSiteUrl()).
 */
export const SITE_URL = runtimeSiteUrl();

/** Logo del cliente (badge amarillo redondo, se lee sobre negro y sobre blanco). */
export const LOGO_URL = `${SITE_URL}/brand/logo-bicitiendamdq-320.png`;

const brand = store.emailColors;

/** Tokens del handoff (README · Design Tokens). */
export const colors = {
  ink: brand?.ink ?? "#121110",
  inkDeep: "#0b0a09",
  surface: "#1f1d1a",
  surface2: "#1a1816",
  line: "#2b2824",
  lineStrong: "#3a362f",
  lineBtn: "#4a453e",
  paper: brand?.paper ?? "#f4efe4",
  text2: "#cfc8bb",
  text3: "#8d867a",
  text4: "#6f675a",
  yellow: brand?.accent ?? "#ffd21f",
  onYellow: brand?.onAccent ?? "#121110",
  red: brand?.offer ?? "#d7261e",
  redLight: "#ff6a5c",
  /** Rojo de oferta para texto chico sobre papel: el #d7261e da 4.4:1, este 5.3:1 (AA). */
  redOnPaper: "#c21f18",
  white: "#ffffff",
};

/**
 * Display condensada: Archivo (si el cliente carga webfonts) → la
 * condensada negra de Apple → Avenir condensada (iOS) → Arial Narrow
 * (Windows/Office) → Roboto Condensed (Android) → Helvetica/Arial.
 */
export const fonts = {
  display:
    "'Archivo', 'Archivo Narrow', 'HelveticaNeue-CondensedBlack', 'Avenir Next Condensed', 'Arial Narrow', 'Roboto Condensed', 'Helvetica Neue', Helvetica, Arial, sans-serif",
  body: "'Archivo', 'Helvetica Neue', Helvetica, Arial, sans-serif",
  mono: "'JetBrains Mono', 'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', 'Courier New', monospace",
};

/** `$ 489.900` como en el handoff (es-AR, sin decimales, con espacio). */
export function money(n: number): string {
  return `$ ${Math.round(n).toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

export function waLink(whatsapp: string, message: string): string {
  return `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`;
}

/** "5492230000000" → "+54 9 223 000-0000" (Mar del Plata, área de 3). */
export function waDisplay(whatsapp: string): string {
  const d = whatsapp.replace(/\D/g, "");
  const m = /^549(\d{3})(\d{3})(\d{4})$/.exec(d);
  return m ? `+54 9 ${m[1]} ${m[2]}-${m[3]}` : `+${d}`;
}

/** Primer nombre para el saludo ("Lucía Gómez" → "Lucía"). */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || "Hola";
}

const RESPONSIVE_CSS = `
  body { margin:0 !important; padding:0 !important; }
  a { color: ${colors.yellow}; }
  @media only screen and (max-width: 480px) {
    .bt-pad { padding-left: 18px !important; padding-right: 18px !important; }
    .bt-h1 { font-size: 34px !important; }
    .bt-big { font-size: 30px !important; }
    .bt-btn { display: table !important; width: 100% !important; margin-right: 0 !important; }
    .bt-btn a { display: block !important; text-align: center !important; }
    .bt-col { display: block !important; width: 100% !important; }
  }
`;

/**
 * Esqueleto: header (logo + wordmark), cuerpo y footer con local,
 * horarios y WhatsApp. `footer` es la línea que arma lib/server/mail.ts
 * ("Marca · dirección · horarios"); `whatsapp` suma el contacto.
 */
export function EmailShell({
  preview,
  footer,
  whatsapp,
  children,
}: {
  preview: string;
  footer: string;
  whatsapp?: string;
  children: React.ReactNode;
}) {
  const wa = whatsapp ?? store.whatsapp;
  return (
    <Html lang="es-AR" dir="ltr">
      <Head>
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- mail, no página de Next */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&family=JetBrains+Mono:wght@400;600&display=swap"
        />
        <style>{RESPONSIVE_CSS}</style>
      </Head>
      <Preview>{preview}</Preview>
      <Body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: colors.ink,
          color: colors.paper,
          fontFamily: fonts.body,
        }}
      >
        <table
          role="presentation"
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          border={0}
          bgcolor={colors.ink}
          style={{ backgroundColor: colors.ink }}
        >
          <tbody>
            <tr>
              <td align="center" style={{ padding: "0 8px" }}>
                <table
                  role="presentation"
                  width="100%"
                  cellPadding={0}
                  cellSpacing={0}
                  border={0}
                  style={{ maxWidth: "600px", margin: "0 auto" }}
                >
                  <tbody>
                    <tr>
                      <td>
                        <Header />
                      </td>
                    </tr>
                    <tr>
                      <td className="bt-pad" style={{ padding: "36px 32px 8px" }}>
                        {children}
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <Footer line={footer} whatsapp={wa} />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </Body>
    </Html>
  );
}

function Header() {
  return (
    <table
      role="presentation"
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      border={0}
      style={{ borderBottom: `1px solid ${colors.line}` }}
    >
      <tbody>
        <tr>
          <td className="bt-pad" style={{ padding: "22px 32px 18px" }}>
            <a href={SITE_URL} style={{ textDecoration: "none", color: colors.paper }}>
              <table role="presentation" cellPadding={0} cellSpacing={0} border={0}>
                <tbody>
                  <tr>
                    <td valign="middle" style={{ paddingRight: "12px" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- mail, no next/image */}
                      <img
                        src={LOGO_URL}
                        width={52}
                        height={52}
                        alt="BiciTienda MDQ"
                        style={{ display: "block", border: 0, width: "52px", height: "52px" }}
                      />
                    </td>
                    <td valign="middle">
                      <Wordmark />
                    </td>
                  </tr>
                </tbody>
              </table>
            </a>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/** "Bici" papel + "Tienda" rojo + "MDQ" papel, Archivo 900 condensada. */
export function Wordmark({ size = 26 }: { size?: number }) {
  const base: React.CSSProperties = {
    fontFamily: fonts.display,
    fontSize: `${size}px`,
    lineHeight: 1,
    fontWeight: 900,
    fontStretch: "condensed",
    textTransform: "uppercase",
    letterSpacing: "0.01em",
  };
  return (
    <span style={{ ...base, color: colors.paper }}>
      BICI<span style={{ ...base, color: colors.red }}>TIENDA</span>MDQ
    </span>
  );
}

function Footer({ line, whatsapp }: { line: string; whatsapp: string }) {
  // La línea llega como "Marca · dirección · horarios": la marca va en el
  // wordmark, así que se saca del texto.
  const parts = line.split(" · ");
  const rest = parts.length >= 3 ? parts.slice(1) : parts;
  const hours = rest.length > 1 ? rest[rest.length - 1] : null;
  const address = (hours ? rest.slice(0, -1) : rest).join(" · ");
  const cell = (label: string, value: React.ReactNode) => (
    <tr>
      <td
        width={96}
        valign="top"
        style={{
          padding: "5px 12px 5px 0",
          fontFamily: fonts.mono,
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: colors.text3,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </td>
      <td
        valign="top"
        style={{ padding: "4px 0", fontFamily: fonts.body, fontSize: "14px", lineHeight: 1.45, color: colors.text2 }}
      >
        {value}
      </td>
    </tr>
  );
  return (
    <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} border={0} style={{ marginTop: "28px" }}>
      <tbody>
        <tr>
          <td className="bt-pad" style={{ padding: "0 32px" }}>
            <StripCells />
          </td>
        </tr>
        <tr>
          <td className="bt-pad" style={{ padding: "22px 32px 8px" }}>
            <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} border={0}>
              <tbody>
                {address && cell("Local", address)}
                {hours && cell("Horarios", hours)}
                {cell(
                  "WhatsApp",
                  <a href={`https://wa.me/${whatsapp}`} style={{ color: colors.yellow, textDecoration: "none", fontWeight: 700 }}>
                    {waDisplay(whatsapp)}
                  </a>,
                )}
                {store.instagram &&
                  cell(
                    "Instagram",
                    <a
                      href={`https://instagram.com/${store.instagram}`}
                      style={{ color: colors.text2, textDecoration: "none" }}
                    >
                      @{store.instagram}
                    </a>,
                  )}
              </tbody>
            </table>
          </td>
        </tr>
        <tr>
          <td
            className="bt-pad"
            style={{
              padding: "18px 32px 36px",
              fontFamily: fonts.body,
              fontSize: "12px",
              lineHeight: 1.6,
              color: colors.text3,
            }}
          >
            {store.brandName} · {store.city.replace(/, Argentina$/, "")}. Te escribimos por una compra, turno
            o consulta que hiciste en{" "}
            <a href={SITE_URL} style={{ color: colors.text2, textDecoration: "underline" }}>
              {SITE_URL.replace(/^https?:\/\//, "")}
            </a>
            .
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/** Tira del footer del sitio (Footer.dc.html), en una línea mono. */
function StripCells() {
  const items = [
    { text: "Mercado Pago", hl: false },
    { text: `${store.transferDiscount}% off transferencia`, hl: true },
    { text: "Retiro en el local", hl: false },
  ];
  return (
    <table
      role="presentation"
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      border={0}
      style={{ borderTop: `1px solid ${colors.line}`, borderBottom: `1px solid ${colors.line}` }}
    >
      <tbody>
        <tr>
          <td
            style={{
              padding: "12px 0",
              fontFamily: fonts.mono,
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: colors.text3,
            }}
          >
            {items.map((it, i) => (
              <span key={it.text}>
                {i > 0 && <span style={{ color: colors.lineBtn }}>{"  /  "}</span>}
                <span style={{ color: it.hl ? colors.yellow : colors.text3 }}>{it.text}</span>
              </span>
            ))}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/** Eyebrow: Archivo 700 mayúsculas con tracking (amarillo = sección). */
export function Eyebrow({
  children,
  tone = "yellow",
}: {
  children: React.ReactNode;
  tone?: "yellow" | "muted" | "red";
}) {
  const color = tone === "yellow" ? colors.yellow : tone === "red" ? colors.redLight : colors.text3;
  return (
    <p
      style={{
        margin: 0,
        fontFamily: fonts.body,
        fontSize: "12px",
        lineHeight: 1.4,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color,
      }}
    >
      {children}
    </p>
  );
}

/** H1 display: condensada 900 en mayúsculas; `accent` va en amarillo. */
export function Title({ children, accent }: { children: React.ReactNode; accent?: React.ReactNode }) {
  return (
    <h1
      className="bt-h1"
      style={{
        margin: "10px 0 0",
        fontFamily: fonts.display,
        fontSize: "44px",
        lineHeight: 0.95,
        fontWeight: 900,
        fontStretch: "condensed",
        textTransform: "uppercase",
        letterSpacing: "-0.005em",
        color: colors.paper,
      }}
    >
      {children}
      {accent && (
        <>
          {" "}
          <span style={{ color: colors.yellow }}>{accent}</span>
        </>
      )}
    </h1>
  );
}

export function P({
  children,
  muted,
  style,
}: {
  children: React.ReactNode;
  muted?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <p
      style={{
        margin: "14px 0 0",
        fontFamily: fonts.body,
        fontSize: muted ? "14px" : "16px",
        lineHeight: 1.5,
        color: muted ? colors.text3 : colors.text2,
        ...style,
      }}
    >
      {children}
    </p>
  );
}

/** Sin cortes de línea (números de pedido "BT-10483" en títulos). */
export function Nb({ children }: { children: React.ReactNode }) {
  return <span style={{ whiteSpace: "nowrap" }}>{children}</span>;
}

/** Texto fuerte dentro de un P (papel sobre negro). */
export function B({ children }: { children: React.ReactNode }) {
  return <strong style={{ color: colors.paper, fontWeight: 700 }}>{children}</strong>;
}

export type PillTone = "red" | "yellow" | "outline" | "paper" | "neutral" | "muted";

/** Pills de estado del admin (README · Status pills). */
export function Pill({ children, tone }: { children: React.ReactNode; tone: PillTone }) {
  const t = {
    red: { bg: colors.red, fg: colors.white, bd: colors.red },
    yellow: { bg: colors.yellow, fg: colors.onYellow, bd: colors.yellow },
    outline: { bg: colors.ink, fg: colors.yellow, bd: colors.yellow },
    paper: { bg: colors.paper, fg: colors.ink, bd: colors.paper },
    neutral: { bg: colors.lineStrong, fg: colors.paper, bd: colors.lineStrong },
    muted: { bg: colors.ink, fg: colors.text3, bd: "#5a554c" },
  }[tone];
  return (
    <table role="presentation" cellPadding={0} cellSpacing={0} border={0} style={{ marginTop: "18px" }}>
      <tbody>
        <tr>
          <td
            style={{
              backgroundColor: t.bg,
              border: `1px solid ${t.bd}`,
              borderRadius: "999px",
              padding: "5px 12px",
              fontFamily: fonts.body,
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: t.fg,
              whiteSpace: "nowrap",
            }}
          >
            {children}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/**
 * Panel: superficie oscura con borde (cards del handoff) o papel (el
 * resumen, como el cuerpo claro de la card de producto).
 */
export function Panel({
  label,
  children,
  tone = "surface",
  accent,
}: {
  label?: React.ReactNode;
  children: React.ReactNode;
  tone?: "surface" | "paper";
  /** Barra izquierda (selección/urgencia del handoff). */
  accent?: "yellow" | "red";
}) {
  const bg = tone === "paper" ? colors.paper : colors.surface;
  const bd = tone === "paper" ? colors.paper : colors.line;
  const bar = accent === "yellow" ? colors.yellow : accent === "red" ? colors.red : null;
  return (
    <table
      role="presentation"
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      border={0}
      bgcolor={bg}
      style={{
        marginTop: "20px",
        backgroundColor: bg,
        border: `1px solid ${bd}`,
        borderLeft: bar ? `3px solid ${bar}` : `1px solid ${bd}`,
        borderRadius: "10px",
        borderCollapse: "separate",
      }}
    >
      <tbody>
        <tr>
          <td className="bt-pad" style={{ padding: "20px 24px", color: tone === "paper" ? colors.ink : colors.paper }}>
            {label && (
              <p
                style={{
                  margin: "0 0 10px",
                  fontFamily: fonts.mono,
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: tone === "paper" ? colors.text4 : colors.text3,
                }}
              >
                {label}
              </p>
            )}
            {children}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/**
 * Filas dato/valor (datos bancarios, turno, retiro). Los valores con
 * `mono` (alias, CBU, códigos) van en mono para copiarlos sin errores;
 * `big` agranda el valor (monto, código de retiro).
 */
export function DataRows({
  rows,
}: {
  rows: {
    label: string;
    value: React.ReactNode;
    mono?: boolean;
    big?: boolean;
    tone?: "yellow" | "red" | "paper";
    sub?: string;
  }[];
}) {
  return (
    <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} border={0}>
      <tbody>
        {rows.map((r, i) => {
          const color =
            r.tone === "yellow" ? colors.yellow : r.tone === "red" ? colors.redLight : colors.paper;
          return (
            <tr key={r.label}>
              <td
                style={{
                  padding: i === 0 ? "0 0 12px" : "12px 0",
                  borderTop: i === 0 ? "none" : `1px solid ${colors.line}`,
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontFamily: fonts.body,
                    fontSize: "12px",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: colors.text3,
                  }}
                >
                  {r.label}
                </p>
                <p
                  className={r.big ? "bt-big" : undefined}
                  style={{
                    margin: "4px 0 0",
                    fontFamily: r.mono ? fonts.mono : r.big ? fonts.display : fonts.body,
                    fontSize: r.big ? "34px" : r.mono ? "17px" : "16px",
                    lineHeight: r.big ? 1 : 1.35,
                    fontWeight: r.big ? 900 : r.mono ? 600 : 700,
                    fontStretch: r.big && !r.mono ? "condensed" : undefined,
                    letterSpacing: r.mono ? "0.02em" : undefined,
                    color,
                    wordBreak: "break-word",
                  }}
                >
                  {r.value}
                </p>
                {r.sub && (
                  <p style={{ margin: "4px 0 0", fontFamily: fonts.body, fontSize: "13px", color: colors.text2 }}>
                    {r.sub}
                  </p>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** Aviso con barra: rojo = urgencia (vencimiento), amarillo = info clave. */
export function Notice({ children, tone = "red" }: { children: React.ReactNode; tone?: "red" | "yellow" }) {
  const bar = tone === "red" ? colors.red : colors.yellow;
  return (
    <table
      role="presentation"
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      border={0}
      style={{ marginTop: "20px" }}
    >
      <tbody>
        <tr>
          <td
            style={{
              borderLeft: `3px solid ${bar}`,
              padding: "4px 0 4px 14px",
              fontFamily: fonts.body,
              fontSize: "15px",
              lineHeight: 1.45,
              fontWeight: 700,
              color: tone === "red" ? colors.redLight : colors.paper,
            }}
          >
            {children}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/** "Cómo sigue": pasos 01/02/03 con el número en mono amarillo. */
export function Steps({ title = "Cómo sigue", steps }: { title?: string; steps: { title: string; body?: React.ReactNode }[] }) {
  return (
    <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} border={0} style={{ marginTop: "30px" }}>
      <tbody>
        <tr>
          <td colSpan={2} style={{ paddingBottom: "6px" }}>
            <Eyebrow tone="muted">{title}</Eyebrow>
          </td>
        </tr>
        {steps.map((s, i) => (
          <tr key={s.title}>
            <td
              width={44}
              valign="top"
              style={{
                padding: "12px 0",
                borderTop: `1px solid ${colors.line}`,
                fontFamily: fonts.mono,
                fontSize: "13px",
                fontWeight: 600,
                color: colors.yellow,
              }}
            >
              {String(i + 1).padStart(2, "0")}
            </td>
            <td valign="top" style={{ padding: "11px 0", borderTop: `1px solid ${colors.line}` }}>
              <p
                style={{
                  margin: 0,
                  fontFamily: fonts.body,
                  fontSize: "15px",
                  lineHeight: 1.4,
                  fontWeight: 700,
                  color: colors.paper,
                }}
              >
                {s.title}
              </p>
              {s.body && (
                <p style={{ margin: "3px 0 0", fontFamily: fonts.body, fontSize: "14px", lineHeight: 1.45, color: colors.text2 }}>
                  {s.body}
                </p>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export interface SummaryItem {
  name: string;
  /** "Talle M · Negro": va en mono debajo del nombre. */
  variant?: string | null;
  quantity: number;
  /** Importe de la línea (precio × cantidad). */
  amount: number;
}

/**
 * Separa "Nombre · Talle M · Negro" (como arma los ítems lib/server/mail.ts
 * con variantLabel) en nombre y variante, para la línea de dos renglones.
 * Los nombres de producto también llevan " · " ("MTB rodado 29 · 21 vel."),
 * así que se corta en " · Talle "; una variante solo de color queda en el
 * nombre. Si el core pasa `variant` aparte, se usa esa.
 */
export function splitVariant(name: string, variant?: string | null): { name: string; variant: string | null } {
  if (variant) return { name, variant };
  const i = name.lastIndexOf(" · Talle ");
  return i > 0 ? { name: name.slice(0, i), variant: name.slice(i + 3) } : { name, variant: null };
}

/** Línea de ítem: nombre, variante talle/color en mono y el importe. */
export function ItemLine({ item, first }: { item: SummaryItem; first?: boolean }) {
  return (
    <tr>
      <td
        valign="top"
        style={{ padding: "12px 12px 12px 0", borderTop: first ? "none" : `1px dashed #cfc6b4` }}
      >
        <p style={{ margin: 0, fontFamily: fonts.body, fontSize: "15px", lineHeight: 1.35, fontWeight: 700, color: colors.ink }}>
          {item.name}
        </p>
        <p
          style={{
            margin: "4px 0 0",
            fontFamily: fonts.mono,
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: colors.text4,
          }}
        >
          {[item.variant, `Cant. ${item.quantity}`].filter(Boolean).join(" · ")}
        </p>
      </td>
      <td
        valign="top"
        align="right"
        style={{
          padding: "12px 0",
          borderTop: first ? "none" : `1px dashed #cfc6b4`,
          fontFamily: fonts.body,
          fontSize: "15px",
          fontWeight: 800,
          color: colors.ink,
          whiteSpace: "nowrap",
        }}
      >
        {money(item.amount)}
      </td>
    </tr>
  );
}

export interface SummaryLine {
  label: string;
  value: string;
  /** Descuentos en rojo (ofertas del handoff). */
  offer?: boolean;
}

/** Resumen en papel: ítems, subtotales y total en display grande. */
export function Summary({
  label = "Tu pedido",
  items,
  lines = [],
  totalLabel = "Total",
  total,
  note,
}: {
  label?: string;
  items: SummaryItem[];
  lines?: SummaryLine[];
  totalLabel?: string;
  total: string;
  note?: React.ReactNode;
}) {
  const sm = (offer?: boolean): React.CSSProperties => ({
    padding: "3px 0",
    fontFamily: fonts.body,
    fontSize: "14px",
    color: offer ? colors.redOnPaper : "#4a453e",
    fontWeight: offer ? 700 : 400,
  });
  return (
    <Panel tone="paper" label={label}>
      <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} border={0}>
        <tbody>
          {items.map((it, i) => (
            <ItemLine key={`${it.name}-${it.variant ?? ""}-${i}`} item={it} first={i === 0} />
          ))}
        </tbody>
      </table>
      <table
        role="presentation"
        width="100%"
        cellPadding={0}
        cellSpacing={0}
        border={0}
        style={{ marginTop: "6px", borderTop: `1.5px solid ${colors.ink}` }}
      >
        <tbody>
          {lines.map((l) => (
            <tr key={l.label}>
              <td style={{ ...sm(l.offer), paddingTop: "10px" }}>{l.label}</td>
              <td align="right" style={{ ...sm(l.offer), paddingTop: "10px", whiteSpace: "nowrap" }}>
                {l.value}
              </td>
            </tr>
          ))}
          <tr>
            <td
              valign="bottom"
              style={{
                paddingTop: "12px",
                fontFamily: fonts.body,
                fontSize: "13px",
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: colors.ink,
              }}
            >
              {totalLabel}
            </td>
            <td
              align="right"
              valign="bottom"
              className="bt-big"
              style={{
                paddingTop: "10px",
                fontFamily: fonts.display,
                fontSize: "34px",
                lineHeight: 1,
                fontWeight: 900,
                fontStretch: "condensed",
                color: colors.ink,
                whiteSpace: "nowrap",
              }}
            >
              {total}
            </td>
          </tr>
        </tbody>
      </table>
      {note && (
        <p style={{ margin: "10px 0 0", fontFamily: fonts.body, fontSize: "13px", lineHeight: 1.45, color: "#4a453e" }}>
          {note}
        </p>
      )}
    </Panel>
  );
}

/**
 * Botón "a prueba de balas" (tabla + link con padding): primario amarillo
 * con texto negro, secundario delineado. Radio 6px, mayúsculas 800.
 */
export function Button({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  const primary = variant === "primary";
  return (
    <table
      role="presentation"
      cellPadding={0}
      cellSpacing={0}
      border={0}
      className="bt-btn"
      style={{ display: "inline-table", margin: "0 10px 10px 0", borderCollapse: "separate" }}
    >
      <tbody>
        <tr>
          <td
            align="center"
            style={{
              backgroundColor: primary ? colors.yellow : colors.ink,
              border: primary ? `1.5px solid ${colors.yellow}` : `1.5px solid ${colors.lineBtn}`,
              borderRadius: "6px",
            }}
          >
            <a
              href={href}
              target="_blank"
              rel="noopener"
              style={{
                display: "inline-block",
                padding: "16px 26px",
                fontFamily: fonts.body,
                fontSize: "14px",
                lineHeight: 1.1,
                fontWeight: 800,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                textDecoration: "none",
                color: primary ? colors.onYellow : colors.paper,
              }}
            >
              {children}
            </a>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/** Fila de botones (bajan a full-width en mobile). */
export function Actions({ children }: { children: React.ReactNode }) {
  return <div style={{ marginTop: "28px" }}>{children}</div>;
}
