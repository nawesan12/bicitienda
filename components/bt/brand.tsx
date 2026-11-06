import Link from "next/link";
import { cx } from "./cx";
import { FONT } from "./styles";

/** Logo del cliente (badge circular, 320 px webp en public/brand). */
export const LOGO_SRC = "/brand/logo-bicitiendamdq-320.webp";
/** Versión 600 px (del png original) para el logo grande del hero: la de 320 se ve blanda a 2x. */
export const LOGO_SRC_LG = "/brand/logo-bicitiendamdq-600.webp";

/* ── Wordmark ─────────────────────────────────────────────────
   "Bici" paper + "Tienda" rojo + "MDQ" paper. Archivo 900 @72 %.
   header-lg 40 · header 30 · footer 26 · sidebar 22 · mobile-footer 22
   · mobile 19 @68 % · mobile-lg fluido 16–24 @68 % · hero fluido @72 %.
   mobile-lg: "BICITIENDAMDQ" mide 6.54 em @68; en el header mobile le
   quedan ~100vw − 251 px (gutter, carrito, menú y logo 44), de ahí
   15.3vw − 40px: 16 px a 360, ~20 a 390, 24 desde 420.
   hero: pensado apilado (`stacked`, 3 líneas a .86 ≈ 2.58 em de alto),
   así acompaña al logo: font ≈ lado del logo / 2.58 (ver HomeHero).
   ──────────────────────────────────────────────────────────── */

export type WordmarkSize =
  | "header-lg"
  | "header"
  | "footer"
  | "sidebar"
  | "mobile-footer"
  | "mobile-lg"
  | "mobile"
  | "hero";

const WORDMARK_SIZE: Record<WordmarkSize, string> = {
  "header-lg": "text-[40px] stretch-72 tracking-[.01em]",
  header: "text-[30px] stretch-72 tracking-[.01em]",
  footer: "text-[26px] stretch-72",
  sidebar: "text-[22px] stretch-72",
  "mobile-footer": "text-[22px] stretch-72",
  "mobile-lg": "text-[length:clamp(16px,15.3vw_-_40px,24px)] stretch-68",
  mobile: "text-[19px] stretch-68",
  hero: "text-[length:clamp(40px,14.7vw,85px)] lg:text-[length:min(6.6vw,93px)] leading-[.86] stretch-72",
};

export function Wordmark({
  size = "header",
  stacked,
  className,
}: {
  size?: WordmarkSize;
  /** Una palabra por línea (Bici / Tienda / MDQ), para el hero. */
  stacked?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "whitespace-nowrap font-black uppercase leading-none text-paper",
        FONT,
        WORDMARK_SIZE[size],
        stacked && "flex flex-col",
        className,
      )}
    >
      <span>Bici</span>
      <span className="text-red">Tienda</span>
      <span>MDQ</span>
    </span>
  );
}

/* ── Logo ─────────────────────────────────────────────────────
   Badge circular del cliente. 72 header · 88 libre · 56 footer
   · 52 · 44 header mobile / footer mobile · 40 sidebar · 36 admin mobile.
   `size="fluid"`: el tamaño lo pone `className` (ej. `size-[min(34vw,220px)]`)
   y usa el webp de 600 px, para el logo grande del hero.
   ──────────────────────────────────────────────────────────── */

export type LogoSize = 36 | 40 | 44 | 52 | 56 | 72 | 88;

export function Logo({
  size = 52,
  className,
  decorative,
}: {
  size?: LogoSize | "fluid";
  className?: string;
  /** Si va junto al wordmark, el alt sobra (lo lee el texto). */
  decorative?: boolean;
}) {
  const fluid = size === "fluid";
  return (
    // eslint-disable-next-line @next/next/no-img-element -- imágenes sin optimizar (next.config); webp local chico
    <img
      src={fluid ? LOGO_SRC_LG : LOGO_SRC}
      alt={decorative ? "" : "Logo BiciTiendaMDQ"}
      width={fluid ? 600 : size}
      height={fluid ? 600 : size}
      className={cx("block flex-none", className)}
      style={fluid ? undefined : { width: size, height: size }}
    />
  );
}

/** Logo + wordmark como link a la home (header, sidebar, footer). */
export function BrandLockup({
  href,
  logoSize = 52,
  wordmarkSize = "header",
  gap = "gap-3",
  className,
}: {
  href?: string;
  logoSize?: LogoSize;
  wordmarkSize?: WordmarkSize;
  /** Clase de gap (12 px header/footer, 10 sidebar, 8 mobile). */
  gap?: "gap-2" | "gap-[10px]" | "gap-3";
  className?: string;
}) {
  const inner = (
    <>
      <Logo size={logoSize} decorative />
      <Wordmark size={wordmarkSize} />
    </>
  );
  const cls = cx("flex items-center text-paper", gap, className ?? "flex-none");
  if (!href) return <span className={cls}>{inner}</span>;
  return (
    <Link href={href} className={cls} aria-label="BiciTiendaMDQ, ir al inicio">
      {inner}
    </Link>
  );
}
