import type { ReactNode } from "react";
import { cx } from "./cx";
import { formatMoney } from "./format";
import { FONT, MONO } from "./styles";

/* ── Display ──────────────────────────────────────────────────
   Archivo 900 uppercase condensada. Tamaños del handoff:
   hero 120/.86 @66 (mobile 76) · page H1 96/.86 @66 (mobile 56)
   section 64/.9 @66 (mobile 40) · h2 48/.9 @66 (mobile 40)
   confirm 112/.85 @66 (mobile 64) · admin H1 44/1 @66
   panel 26/1 @70 · card 30/1 @70 · detail 36/.95 @70 (mobile 40)
   ──────────────────────────────────────────────────────────── */

export type DisplaySize =
  | "hero"
  | "confirm"
  | "page"
  | "section"
  | "h2"
  | "admin"
  | "detail"
  | "card"
  | "panel";

const DISPLAY_SIZE: Record<DisplaySize, string> = {
  hero: "text-[76px] lg:text-[120px] leading-[.86] stretch-66 lg:tracking-[-.01em]",
  confirm: "text-[64px] lg:text-[112px] leading-[.85] stretch-66",
  page: "text-[56px] md:text-[96px] leading-[.88] md:leading-[.86] stretch-66",
  section: "text-[40px] md:text-[64px] leading-[.9] stretch-66",
  h2: "text-[40px] md:text-[48px] leading-[.9] stretch-66",
  admin: "text-[44px] leading-none stretch-66",
  detail: "text-[40px] md:text-[36px] leading-[.95] stretch-70",
  card: "text-[30px] leading-none stretch-70",
  panel: "text-[26px] leading-none stretch-70",
};

const DISPLAY_TAG: Record<DisplaySize, "h1" | "h2" | "h3"> = {
  hero: "h1",
  confirm: "h1",
  page: "h1",
  section: "h2",
  h2: "h2",
  admin: "h1",
  detail: "h2",
  card: "h3",
  panel: "h3",
};

export interface DisplayProps {
  size?: DisplaySize;
  /** Etiqueta HTML; por defecto depende del tamaño (hero/page → h1…). */
  as?: "h1" | "h2" | "h3" | "h4" | "span" | "p" | "div";
  className?: string;
  children: ReactNode;
  id?: string;
}

export function Display({ size = "page", as, className, children, id }: DisplayProps) {
  const Tag = as ?? DISPLAY_TAG[size];
  return (
    <Tag id={id} className={cx("m-0 font-black uppercase", FONT, DISPLAY_SIZE[size], className)}>
      {children}
    </Tag>
  );
}

/** Resaltado amarillo dentro de un título ("Salí a rodar por <Hl>La Feliz.</Hl>"). */
export function Highlight({ children }: { children: ReactNode }) {
  return <span className="text-yellow">{children}</span>;
}

/* ── Eyebrow ──────────────────────────────────────────────────
   Archivo 700 12–14 px uppercase .08em. Muted #8d867a (labels) o
   amarillo (eyebrow de sección). `ink` = #6f675a sobre paper.
   ──────────────────────────────────────────────────────────── */

export type EyebrowTone = "muted" | "yellow" | "ink" | "inherit";

const EYEBROW_TONE: Record<EyebrowTone, string> = {
  muted: "text-text-3",
  yellow: "text-yellow",
  ink: "text-text-4",
  inherit: "",
};

const EYEBROW_SIZE = { sm: "text-[12px]", md: "text-[13px]", lg: "text-[14px]" } as const;

export interface EyebrowProps {
  tone?: EyebrowTone;
  size?: keyof typeof EYEBROW_SIZE;
  as?: "span" | "p" | "div" | "h2" | "h3" | "legend" | "label";
  className?: string;
  children: ReactNode;
  htmlFor?: string;
}

export function Eyebrow({
  tone = "muted",
  size = "sm",
  as: Tag = "span",
  className,
  children,
  htmlFor,
}: EyebrowProps) {
  return (
    <Tag
      {...(Tag === "label" ? { htmlFor } : {})}
      className={cx(
        "m-0 font-bold uppercase tracking-[.08em]",
        FONT,
        EYEBROW_SIZE[size],
        EYEBROW_TONE[tone],
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/* ── Mono ─────────────────────────────────────────────────────
   JetBrains Mono 600 10–14 px. SKU, #pedido, fechas, headers.
   ──────────────────────────────────────────────────────────── */

export type MonoTone = "muted" | "paper" | "soft" | "ink" | "inherit";

const MONO_TONE: Record<MonoTone, string> = {
  muted: "text-text-3",
  paper: "text-paper",
  soft: "text-text-2",
  ink: "text-text-4",
  inherit: "",
};

const MONO_SIZE = {
  10: "text-[10px]",
  11: "text-[11px]",
  12: "text-[12px]",
  13: "text-[13px]",
  14: "text-[14px]",
} as const;

export interface MonoProps {
  size?: keyof typeof MONO_SIZE;
  tone?: MonoTone;
  uppercase?: boolean;
  as?: "span" | "p" | "div" | "time" | "code";
  className?: string;
  children: ReactNode;
  dateTime?: string;
}

export function Mono({
  size = 12,
  tone = "muted",
  uppercase,
  as: Tag = "span",
  className,
  children,
  dateTime,
}: MonoProps) {
  return (
    <Tag
      {...(Tag === "time" ? { dateTime } : {})}
      className={cx(
        "font-semibold",
        MONO,
        MONO_SIZE[size],
        MONO_TONE[tone],
        uppercase && "uppercase",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/* ── Price ────────────────────────────────────────────────────
   Archivo 900 condensada. Formato `$ 489.900`.
   card 30/1 @75 · card-sm 22/1 @75 · related 26/1 @75
   panel 34/1 @72 · total 44/1 @72 (mobile 40) · product 56/1 @72
   (mobile 44) · inline 800 15 px (tablas).
   ──────────────────────────────────────────────────────────── */

export type PriceSize =
  | "inline"
  | "card-sm"
  | "card"
  | "related"
  | "panel"
  | "total"
  | "product";

const PRICE_SIZE: Record<PriceSize, string> = {
  inline: "text-[15px] font-extrabold",
  "card-sm": "text-[22px] leading-none font-black stretch-75",
  card: "text-[30px] leading-none font-black stretch-75",
  related: "text-[26px] leading-none font-black stretch-75",
  panel: "text-[34px] leading-none font-black stretch-72",
  total: "text-[40px] md:text-[44px] leading-none font-black stretch-72",
  product: "text-[44px] md:text-[56px] leading-none font-black stretch-72",
};

const PRICE_TONE = {
  inherit: "",
  paper: "text-paper",
  ink: "text-ink",
  yellow: "text-yellow",
  "red-light": "text-red-light",
  red: "text-card-transfer",
} as const;

export interface PriceProps {
  amount: number;
  size?: PriceSize;
  tone?: keyof typeof PRICE_TONE;
  /** Prefijo, ej: "− " para descuentos. */
  prefix?: string;
  className?: string;
}

export function Price({ amount, size = "card", tone = "inherit", prefix, className }: PriceProps) {
  return (
    <span className={cx(FONT, PRICE_SIZE[size], PRICE_TONE[tone], "whitespace-nowrap", className)}>
      {prefix}
      {formatMoney(amount)}
    </span>
  );
}
