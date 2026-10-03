import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "../cx";
import { formatMoney } from "../format";
import { DASHED_DARK, FOCUS, FONT, TRANSITION } from "../styles";

/* ── KeyValueList (3b, 3a, 5b) ────────────────────────────────
   Borde superior #2b2824, 14 px. Fila padding 12×0 con borde inferior
   (la última sin). Clave #8d867a, valor <strong> a la derecha.
   ──────────────────────────────────────────────────────────── */

export function KeyValueList({
  items,
  className,
}: {
  items: { label: ReactNode; value: ReactNode; tone?: "paper" | "red-light" | "yellow" | "muted" }[];
  className?: string;
}) {
  return (
    <dl className={cx("m-0 flex flex-col border-t border-line text-[14px]", FONT, className)}>
      {items.map((it, i) => (
        <div key={i} className="flex items-baseline justify-between gap-4 border-b border-line py-3 last:border-b-0">
          <dt className="flex-none text-text-3">{it.label}</dt>
          <dd
            className={cx(
              "m-0 min-w-0 text-right font-bold",
              it.tone === "red-light" ? "text-red-light" : it.tone === "yellow" ? "text-yellow" : it.tone === "muted" ? "text-text-3" : "text-paper",
            )}
          >
            {it.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/* ── SummaryRows (3a / 4i / 5b) ───────────────────────────────
   Borde superior punteado #3a362f, padding-top 16 (12 mobile), gap 8.
   Filas etiqueta #8d867a / valor 700; "Total" 800 14 uppercase con el
   monto 900 34/1 @72 amarillo (32 en mobile).
   ──────────────────────────────────────────────────────────── */

export function SummaryRows({
  rows,
  total,
  dashed = true,
  size = "md",
  className,
}: {
  rows: { label: ReactNode; value: ReactNode }[];
  total?: { label?: ReactNode; amount: number };
  dashed?: boolean;
  /** md = panel desktop (34 px) · sm = 4i mobile (32 px, gap 6). */
  size?: "md" | "sm";
  className?: string;
}) {
  return (
    <div
      className={cx(
        "flex flex-col text-[14px]",
        dashed && DASHED_DARK,
        size === "md" ? "gap-2 pt-4" : "gap-[6px] pt-3",
        FONT,
        className,
      )}
    >
      {rows.map((r, i) => (
        <div key={i} className="flex items-baseline justify-between gap-3">
          <span className="text-text-3">{r.label}</span>
          <span className="text-right font-bold">{r.value}</span>
        </div>
      ))}
      {total && (
        <div className="flex items-baseline justify-between gap-3 pt-1">
          <span className="text-[14px] font-extrabold uppercase tracking-[.06em]">{total.label ?? "Total"}</span>
          <span
            className={cx(
              "whitespace-nowrap font-black leading-none text-yellow stretch-72",
              size === "md" ? "text-[34px]" : "text-[32px]",
            )}
          >
            {formatMoney(total.amount)}
          </span>
        </div>
      )}
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

/* ── BackLink (4i "← Pedidos") ────────────────────────────────
   Archivo 600 14 px #8d867a, padding 4×0, alto táctil 44 en mobile.
   ──────────────────────────────────────────────────────────── */

export function BackLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={cx(
        "inline-flex min-h-11 items-center self-start rounded-[2px] text-[14px] font-semibold text-text-3 hover:text-paper md:min-h-0 md:py-1",
        FONT,
        TRANSITION,
        FOCUS,
        className,
      )}
    >
      ← {children}
    </Link>
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
