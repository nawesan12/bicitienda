import Link from "next/link";
import { cx } from "./cx";
import { FONT } from "./styles";

/** Logo del cliente (badge circular, 320 px webp en public/brand). */
export const LOGO_SRC = "/brand/logo-bicitiendamdq-320.webp";

/* ── Wordmark ─────────────────────────────────────────────────
   "Bici" paper + "Tienda" rojo + "MDQ" paper. Archivo 900 @72 %.
   header 30 · footer 26 · sidebar 22 · mobile-footer 22 · mobile 19 @68 %
   ──────────────────────────────────────────────────────────── */

export type WordmarkSize = "header" | "footer" | "sidebar" | "mobile-footer" | "mobile";

const WORDMARK_SIZE: Record<WordmarkSize, string> = {
  header: "text-[30px] stretch-72 tracking-[.01em]",
  footer: "text-[26px] stretch-72",
  sidebar: "text-[22px] stretch-72",
  "mobile-footer": "text-[22px] stretch-72",
  mobile: "text-[19px] stretch-68",
};

export function Wordmark({
  size = "header",
  className,
}: {
  size?: WordmarkSize;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "whitespace-nowrap font-black uppercase leading-none text-paper",
        FONT,
        WORDMARK_SIZE[size],
        className,
      )}
    >
      Bici<span className="text-red">Tienda</span>MDQ
    </span>
  );
}

/* ── Logo ─────────────────────────────────────────────────────
   Badge circular del cliente. 52 header · 56 footer · 44 footer mobile
   · 40 sidebar · 36 header mobile / admin mobile.
   ──────────────────────────────────────────────────────────── */

export function Logo({
  size = 52,
  className,
  decorative,
}: {
  size?: 36 | 40 | 44 | 52 | 56;
  className?: string;
  /** Si va junto al wordmark, el alt sobra (lo lee el texto). */
  decorative?: boolean;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- imágenes sin optimizar (next.config); webp local chico
    <img
      src={LOGO_SRC}
      alt={decorative ? "" : "Logo BiciTiendaMDQ"}
      width={size}
      height={size}
      className={cx("block flex-none", className)}
      style={{ width: size, height: size }}
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
  logoSize?: 36 | 40 | 44 | 52 | 56;
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
