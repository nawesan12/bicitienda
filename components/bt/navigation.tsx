import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "./cx";
import { FOCUS, FONT, TRANSITION } from "./styles";

/* ── Breadcrumb ───────────────────────────────────────────────
   "Inicio / Bicicletas / MTB / <actual en paper>". 500 14 px #8d867a
   (mobile 13 px). El último ítem es la página actual.
   ──────────────────────────────────────────────────────────── */

export function Breadcrumb({
  items,
  className,
}: {
  items: { label: ReactNode; href?: string }[];
  className?: string;
}) {
  return (
    <nav aria-label="Ruta de navegación" className={cx(FONT, className)}>
      <ol className="m-0 flex list-none flex-wrap items-center gap-x-[0.3em] p-0 text-[13px] font-medium text-text-3 md:text-[14px]">
        {items.map((it, i) => {
          const last = i === items.length - 1;
          return (
            <li key={i} className="flex items-center gap-x-[0.3em]">
              {last ? (
                <span aria-current="page" className="text-paper">
                  {it.label}
                </span>
              ) : it.href ? (
                <Link href={it.href} className={cx("rounded-[2px] hover:text-paper", TRANSITION, FOCUS)}>
                  {it.label}
                </Link>
              ) : (
                <span>{it.label}</span>
              )}
              {!last && <span aria-hidden>/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* ── Pagination ───────────────────────────────────────────────
   Cuadros 44×44 radio 6: actual amarillo 800, resto borde #3a362f 700
   15 px; "Siguiente →" 700 14 px uppercase .06em. Con muchas páginas
   recorta con "…".
   ──────────────────────────────────────────────────────────── */

function pageWindow(page: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set([1, total, page - 1, page, page + 1]);
  const pages = [...set].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  pages.forEach((p, i) => {
    if (i > 0 && p - pages[i - 1] > 1) out.push("…");
    out.push(p);
  });
  return out;
}

export function Pagination({
  page,
  totalPages,
  hrefFor,
  nextLabel = "Siguiente →",
  prevLabel = "← Anterior",
  className,
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
  nextLabel?: string;
  prevLabel?: string;
  className?: string;
}) {
  if (totalPages <= 1) return null;
  const box = cx(
    "flex h-11 min-w-11 items-center justify-center rounded-btn text-[15px]",
    FONT,
    TRANSITION,
    FOCUS,
  );
  const wide = cx(
    "flex h-11 items-center rounded-btn border border-line-strong px-4 text-[14px] font-bold uppercase tracking-[.06em] text-paper hover:border-text-4",
    FONT,
    TRANSITION,
    FOCUS,
  );
  return (
    <nav aria-label="Paginación" className={cx("flex flex-wrap justify-center gap-2", className)}>
      {page > 1 && (
        <Link href={hrefFor(page - 1)} className={wide} rel="prev">
          {prevLabel}
        </Link>
      )}
      {pageWindow(page, totalPages).map((p, i) =>
        p === "…" ? (
          <span key={`e${i}`} className={cx(box, "text-text-3")} aria-hidden>
            …
          </span>
        ) : p === page ? (
          <span key={p} aria-current="page" className={cx(box, "bg-yellow font-extrabold text-ink")}>
            {p}
          </span>
        ) : (
          <Link
            key={p}
            href={hrefFor(p)}
            aria-label={`Página ${p}`}
            className={cx(box, "border border-line-strong font-bold text-paper hover:border-text-4")}
          >
            {p}
          </Link>
        ),
      )}
      {page < totalPages && (
        <Link href={hrefFor(page + 1)} className={wide} rel="next">
          {nextLabel}
        </Link>
      )}
    </nav>
  );
}

/* ── SegmentedControl ─────────────────────────────────────────
   Pestañas del login (Ingresar / Crear cuenta), Mi cuenta mobile y
   Semana / Día del admin.
   - tone "yellow": contenedor #1f1d1a radio 8 padding 4, ítem 800 15 px
     uppercase .06em (mobile min-h 44), activo amarillo.
   - tone "paper": contenedor radio 6 padding 3, ítem 8×14 800 13 px,
     activo paper (admin).
   ──────────────────────────────────────────────────────────── */

export interface SegmentItem {
  label: ReactNode;
  href?: string;
  active?: boolean;
  /** Solo desde componentes cliente. */
  onClick?: () => void;
}

export function SegmentedControl({
  items,
  tone = "yellow",
  ariaLabel,
  className,
}: {
  items: SegmentItem[];
  tone?: "yellow" | "paper";
  ariaLabel?: string;
  className?: string;
}) {
  const yellow = tone === "yellow";
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cx(
        "bg-surface",
        yellow ? "grid rounded-box p-1" : "inline-flex rounded-btn p-[3px]",
        FONT,
        className,
      )}
      style={yellow ? { gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` } : undefined}
    >
      {items.map((it, i) => {
        const cls = cx(
          "flex items-center justify-center text-center font-extrabold uppercase",
          yellow
            ? "min-h-[44px] rounded-btn text-[13px] tracking-[.04em] md:min-h-0 md:py-[13px] md:text-[15px] md:tracking-[.06em]"
            : "rounded-tag px-[14px] py-2 text-[13px]",
          it.active
            ? yellow
              ? "bg-yellow text-ink"
              : "bg-paper text-ink"
            : "text-text-2 hover:text-paper",
          TRANSITION,
          FOCUS,
        );
        if (it.href) {
          return (
            <Link key={i} href={it.href} role="tab" aria-selected={!!it.active} className={cls}>
              {it.label}
            </Link>
          );
        }
        return (
          <button key={i} type="button" role="tab" aria-selected={!!it.active} onClick={it.onClick} className={cls}>
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
