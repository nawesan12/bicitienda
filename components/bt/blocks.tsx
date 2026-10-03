import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "./cx";
import { FOCUS, FONT, TRANSITION } from "./styles";

/* ── CalloutLink ──────────────────────────────────────────────
   Banner-link horizontal del carrito ("¿Tu bici necesita un service?"
   → Sacar turno en el taller). bg #1f1d1a, borde #2b2824, r10, 22×24.
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

/* ── NumberedSteps ("Cómo sigue" de 5a) ───────────────────────
   Filas 44 | 1fr gap 12, padding 14×0, borde superior #2b2824:
   número 900 30/1 @70 amarillo; título 800 15; texto 14/1.4 #8d867a.
   ──────────────────────────────────────────────────────────── */

export function NumberedSteps({
  items,
  className,
}: {
  items: { n: string; title: ReactNode; text?: ReactNode }[];
  className?: string;
}) {
  return (
    <ol className={cx("m-0 flex list-none flex-col p-0", FONT, className)}>
      {items.map((it) => (
        <li key={it.n} className="grid grid-cols-[44px_1fr] gap-3 border-t border-line py-[14px]">
          <span aria-hidden className="text-[30px] leading-none font-black text-yellow stretch-70">
            {it.n}
          </span>
          <span className="flex flex-col gap-[2px]">
            <span className="text-[15px] font-extrabold">{it.title}</span>
            {it.text && <span className="text-[14px] leading-[1.4] text-text-3">{it.text}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}

/* ── PhotoPanel (2h / 4g) ─────────────────────────────────────
   Foto cover + gradiente + contenido abajo.
   - Desktop: padding 56, gradiente 180° rgba(18,17,16,.15) 30% →
     rgba(18,17,16,.92).
   - Mobile: alto 220, padding 16, gradiente .1 → .92.
   ──────────────────────────────────────────────────────────── */

export function PhotoPanel({
  src,
  alt,
  children,
  className,
}: {
  src: string;
  alt: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "relative flex flex-col justify-end gap-4 overflow-hidden p-4 text-paper max-md:h-[220px] md:p-14",
        FONT,
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- foto ya transformada (Cloudinary/Pexels) */}
      <img src={src} alt={alt} className="absolute inset-0 size-full object-cover" />
      <span
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,17,16,.1),rgba(18,17,16,.92))] md:bg-[linear-gradient(180deg,rgba(18,17,16,.15)_30%,rgba(18,17,16,.92))]"
      />
      <div className="relative flex flex-col gap-4">{children}</div>
    </div>
  );
}

/* ── MessageBox (5b) ──────────────────────────────────────────
   Lo que escribió el cliente: fondo #121110, borde #2b2824, radio 8,
   padding 14, 14/1.5 #cfc8bb. Debajo, meta 13 px #8d867a con gap 16.
   ──────────────────────────────────────────────────────────── */

export function MessageBox({ children, meta, className }: { children: ReactNode; meta?: ReactNode[]; className?: string }) {
  const parts = (meta ?? []).filter(Boolean);
  return (
    <div className={cx("flex flex-col gap-2", FONT, className)}>
      <div className="whitespace-pre-line rounded-box border border-line bg-ink p-[14px] text-[14px] leading-[1.5] text-text-2">
        {children}
      </div>
      {parts.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-text-3">
          {parts.map((m, i) => (
            <span key={i}>{m}</span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── ClosedNote (5b) ──────────────────────────────────────────
   Reemplaza los botones de un estado cerrado: 14 px #8d867a, padding
   12×14, borde #2b2824, radio 8. `action` = link opcional al final.
   ──────────────────────────────────────────────────────────── */

export function ClosedNote({ children, action, className }: { children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cx("flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 rounded-box border border-line px-[14px] py-3 text-[14px] text-text-3", FONT, className)}>
      <span>{children}</span>
      {action}
    </div>
  );
}

/* ── SectionHeading (2i "Turnos de hoy · 6 TURNOS") ───────────
   Archivo 900 28/1 @70 uppercase (26 en mobile) + aside mono 12 #8d867a.
   ──────────────────────────────────────────────────────────── */

export function SectionHeading({ children, aside, className }: { children: ReactNode; aside?: ReactNode; className?: string }) {
  return (
    <div className={cx("flex items-baseline justify-between gap-5", FONT, className)}>
      <h2 className="m-0 text-[26px] font-black uppercase leading-none stretch-70 lg:text-[28px]">{children}</h2>
      {aside}
    </div>
  );
}
