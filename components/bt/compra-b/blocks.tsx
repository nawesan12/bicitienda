import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "../cx";
import { FONT, FOCUS, TRANSITION } from "../styles";

/* ── CalloutLink ──────────────────────────────────────────────
   Banner-link horizontal del carrito ("¿Querés probar la MTB antes de
   pagar?" → Reservar prueba). bg #1f1d1a, borde #2b2824, r10, 22×24.
   Título 800 18, texto 15 #cfc8bb, CTA 800 14 uppercase .06em amarillo.
   ──────────────────────────────────────────────────────────── */

export function CalloutLink({
  href,
  title,
  text,
  cta,
  className,
}: {
  href: string;
  title: ReactNode;
  text?: ReactNode;
  cta: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cx(
        "group flex items-center justify-between gap-6 rounded-card border border-line bg-surface px-6 py-[22px] text-paper hover:border-line-strong",
        FONT,
        TRANSITION,
        FOCUS,
        className,
      )}
    >
      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-[18px] font-extrabold">{title}</span>
        {text && <span className="text-[15px] text-text-2">{text}</span>}
      </span>
      <span
        className={cx(
          "flex-none text-[14px] font-extrabold uppercase tracking-[.06em] text-yellow group-hover:text-brand-hover",
          TRANSITION,
        )}
      >
        {cta}
      </span>
    </Link>
  );
}

/* ── InfoBox ──────────────────────────────────────────────────
   Caja informativa con borde #3a362f r8 (retiro del carrito 2d/4d).
   Padding 16 (mobile 14). Título 800 16 (15), líneas 14 (13) #cfc8bb.
   ──────────────────────────────────────────────────────────── */

export function InfoBox({
  title,
  children,
  className,
}: {
  title: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "flex flex-col gap-[2px] rounded-box border border-line-strong p-[14px] text-paper md:gap-1 md:p-4",
        FONT,
        className,
      )}
    >
      <span className="text-[15px] font-extrabold md:text-[16px]">{title}</span>
      {children && <div className="flex flex-col gap-[2px] text-[13px] text-text-2 md:gap-1 md:text-[14px]">{children}</div>}
    </div>
  );
}

/* ── SuccessMark ──────────────────────────────────────────────
   Círculo 88 (mobile 72) de la confirmación 2e. "done" = amarillo con ✓
   ink 44 px; "waiting" = borde 2 amarillo con el símbolo amarillo (pago
   pendiente); "muted" = borde #3a362f, símbolo #8d867a (rechazado).
   ──────────────────────────────────────────────────────────── */

export function SuccessMark({
  tone = "done",
  symbol,
  className,
}: {
  tone?: "done" | "waiting" | "muted";
  symbol?: ReactNode;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cx(
        "flex size-[72px] flex-none items-center justify-center rounded-full text-[36px] leading-none font-black md:size-[88px] md:text-[44px]",
        tone === "done" && "bg-yellow text-ink",
        tone === "waiting" && "border-2 border-yellow text-yellow",
        tone === "muted" && "border-2 border-line-strong text-text-3",
        FONT,
        className,
      )}
    >
      {symbol ?? "✓"}
    </span>
  );
}

/* ── OrderSummaryItem ─────────────────────────────────────────
   Ítem del resumen sobre paper (2e): grilla 72 | 1fr | auto, gap 14.
   Foto 72×56 r6, nombre 700 15/1.2, meta 13 #4c463d, precio 800 17.
   ──────────────────────────────────────────────────────────── */

export function OrderSummaryItem({
  image,
  name,
  meta,
  price,
  className,
}: {
  image: string | null;
  name: ReactNode;
  /** "Talle M · Negro · x1". */
  meta?: ReactNode;
  /** Precio ya formateado. */
  price: ReactNode;
  className?: string;
}) {
  return (
    <li className={cx("grid grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-[14px] text-ink", FONT, className)}>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element -- Cloudinary transforma (img())
        <img src={image} alt="" className="block h-14 w-[72px] rounded-btn bg-card-photo object-cover" />
      ) : (
        <span aria-hidden className="block h-14 w-[72px] rounded-btn bg-card-photo" />
      )}
      <span className="flex min-w-0 flex-col gap-[2px]">
        <span className="text-[15px] leading-[1.2] font-bold">{name}</span>
        {meta && <span className="text-[13px] text-card-cuotas">{meta}</span>}
      </span>
      <span className="text-[17px] font-extrabold whitespace-nowrap">{price}</span>
    </li>
  );
}

/* ── KeyValueList ─────────────────────────────────────────────
   Filas etiqueta / valor con divisor #2b2824 (datos bancarios, pago en
   el local). Etiqueta 700 12 uppercase .08em #8d867a; valor 800 17
   (mono 600 15 para CBU / alias). `action` va a la derecha (Copiar).
   ──────────────────────────────────────────────────────────── */

export interface KeyValueItem {
  label: ReactNode;
  value: ReactNode;
  mono?: boolean;
  action?: ReactNode;
}

export function KeyValueList({ items, className }: { items: KeyValueItem[]; className?: string }) {
  return (
    <dl className={cx("m-0 flex flex-col border-t border-line", FONT, className)}>
      {items.map((it, i) => (
        <div key={i} className="flex items-center justify-between gap-4 border-b border-line py-3">
          <div className="flex min-w-0 flex-col gap-1">
            <dt className="text-[12px] font-bold uppercase tracking-[.08em] text-text-3">{it.label}</dt>
            <dd
              className={cx(
                "m-0 break-all text-paper",
                it.mono ? "font-mono text-[15px] font-semibold" : "text-[17px] font-extrabold break-normal",
              )}
            >
              {it.value}
            </dd>
          </div>
          {it.action}
        </div>
      ))}
    </dl>
  );
}
