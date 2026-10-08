import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "@/components/bt/cx";
import { FOCUS, FONT, MONO, TRANSITION } from "@/components/bt/styles";

/* ── WeekNav (3b "‹ 5 – 10 oct 2026 ›") ───────────────────────
   Archivo 800 16 px uppercase .04em. Flechas con área táctil de 44 px.
   ──────────────────────────────────────────────────────────── */

export function WeekNav({
  label,
  prevHref,
  nextHref,
  prevLabel = "Semana anterior",
  nextLabel = "Semana siguiente",
  className,
}: {
  label: ReactNode;
  prevHref: string;
  nextHref: string;
  prevLabel?: string;
  nextLabel?: string;
  className?: string;
}) {
  const arrow = cx(
    "flex h-11 w-7 items-center justify-center rounded-btn text-[18px] font-extrabold text-paper hover:text-yellow lg:h-8 lg:w-5",
    TRANSITION,
    FOCUS,
  );
  return (
    <div className={cx("flex items-center gap-1 text-[16px] font-extrabold uppercase tracking-[.04em]", FONT, className)}>
      <Link href={prevHref} scroll={false} aria-label={prevLabel} className={arrow}>
        ‹
      </Link>
      <span className="whitespace-nowrap">{label}</span>
      <Link href={nextHref} scroll={false} aria-label={nextLabel} className={arrow}>
        ›
      </Link>
    </div>
  );
}

/* ── Legend (3b) ──────────────────────────────────────────────
   flex gap 20, Archivo 600 13 px #cfc8bb. Swatch 14×14 radio 3:
   amarillo con llave (taller / reparación: lo que más deja, protagonista),
   paper (asesoramiento), borde 2 rojo (sin confirmar).
   `note` a la derecha en #8d867a.
   ──────────────────────────────────────────────────────────── */

export type LegendSwatch = "yellow" | "repair" | "paper" | "red-outline" | "blocked" | "selected";

const SWATCH: Record<LegendSwatch, string> = {
  yellow: "bg-yellow",
  repair: "bg-yellow",
  paper: "bg-paper",
  "red-outline": "border-2 border-red",
  blocked: "border border-dashed border-line-strong bg-surface-2",
  selected: "outline-2 outline-offset-1 outline-yellow bg-line-strong",
};

export function Legend({
  items,
  note,
  className,
}: {
  items: { label: ReactNode; swatch: LegendSwatch }[];
  note?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] font-semibold text-text-2", FONT, className)}>
      {items.map((it, i) => (
        <span key={i} className="inline-flex items-center gap-2">
          {it.swatch === "repair" ? (
            <span aria-hidden className="box-border inline-flex size-[18px] items-center justify-center rounded-[3px] bg-yellow text-ink">
              <WrenchIcon className="size-3" />
            </span>
          ) : (
            <span aria-hidden className={cx("box-border inline-block size-[14px] rounded-[3px]", SWATCH[it.swatch])} />
          )}
          {it.label}
        </span>
      ))}
      {note && <span className="ml-auto text-text-3">{note}</span>}
    </div>
  );
}

/** Llave (taller): marca los turnos de reparación en la agenda y el Resumen. */
export function WrenchIcon({ className, ...rest }: { className?: string; "aria-hidden"?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" className={className} {...rest}>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

/* ── AgendaCell (3b) ──────────────────────────────────────────
   Alto 56, radio 6, padding 6×8, borde 1.5, columna centrada gap 1.
   Nombre 800 13/1.15 ellipsis; sub 600 11/1.15 opacidad .8 ellipsis.
   - vacía: borde line/60 (el #221f1c del prototipo); `href` = crear acá.
   - cerrada: borde transparente.
   - bloqueada (nuevo): fondo #1a1816, borde punteado, "Bloqueado".
   - reparación (taller): amarillo con llave y nombre en negro; asesoramiento: paper; otro servicio: #26231f.
   - sin confirmar: borde rojo #d7261e (solo eso).
   - seleccionada: anillo amarillo de 2 px separado 2 px (no el borde
     rojo: así no se confunde con "sin confirmar").
   - pasada (vino / no vino): opacidad .55.
   ──────────────────────────────────────────────────────────── */

export type AgendaCellKind = "empty" | "closed" | "blocked" | "reparacion" | "asesoramiento" | "otro";

export interface AgendaCellProps {
  kind: AgendaCellKind;
  title?: string;
  sub?: string;
  unconfirmed?: boolean;
  selected?: boolean;
  dim?: boolean;
  /** "+1" cuando hay más de un turno en el slot. */
  extra?: number;
  href?: string;
  label?: string;
  size?: "week" | "day";
  className?: string;
}

const KIND: Record<AgendaCellKind, string> = {
  empty: "border-line/60",
  closed: "border-transparent",
  blocked: "border-dashed border-line-strong bg-surface-2 text-text-3",
  reparacion: "border-yellow bg-yellow text-ink",
  asesoramiento: "border-paper bg-paper text-ink",
  otro: "border-surface-3 bg-surface-3 text-paper",
};

export function AgendaCell({
  kind,
  title,
  sub,
  unconfirmed,
  selected,
  dim,
  extra,
  href,
  label,
  size = "week",
  className,
}: AgendaCellProps) {
  const filled = kind === "reparacion" || kind === "asesoramiento" || kind === "otro";
  const cls = cx(
    "relative box-border flex min-w-0 flex-col justify-center gap-px overflow-hidden rounded-btn border-[1.5px] px-2 py-[6px]",
    size === "week" ? "h-14" : "min-h-14",
    KIND[kind],
    unconfirmed && filled && "border-red",
    selected && "outline-2 outline-offset-2 outline-yellow",
    dim && "opacity-55",
    href && TRANSITION,
    href && FOCUS,
    href && kind === "empty" && "group hover:border-line-strong",
    href && filled && !selected && "hover:brightness-95",
    FONT,
    className,
  );
  const content = (
    <>
      {title && (
        <span className={cx("truncate text-[13px] font-extrabold leading-[1.15]", kind === "reparacion" && "flex items-center gap-1")}>
          {kind === "reparacion" && <WrenchIcon aria-hidden className="size-3 shrink-0" />}
          <span className="truncate">{title}</span>
        </span>
      )}
      {sub && <span className="truncate text-[11px] font-semibold leading-[1.15] opacity-80">{sub}</span>}
      {kind === "empty" && href && (
        <span aria-hidden className="text-center text-[16px] font-bold text-text-3 opacity-0 group-hover:opacity-100">
          +
        </span>
      )}
      {!!extra && (
        <span className={cx("absolute right-1 top-1 rounded-tag bg-ink px-1 text-[10px] font-semibold text-paper", MONO)}>+{extra}</span>
      )}
    </>
  );
  if (href)
    return (
      <Link href={href} scroll={false} aria-label={label} aria-current={selected ? "true" : undefined} className={cls}>
        {content}
      </Link>
    );
  return (
    <div className={cls} aria-label={label}>
      {content}
    </div>
  );
}

/* ── WeekAgenda (3b) ──────────────────────────────────────────
   Todas las filas: grilla 56 | repeat(n, 1fr), gap 6. Cabecera: "Lun"
   700 12 uppercase .08em #8d867a + número 900 26/1 @72, borde inferior 2
   (hoy: número y borde amarillos). Hora mono 600 12 #8d867a. Separador
   ("Tarde") 700 12 uppercase .08em #8d867a, padding 10×0×4.
   ──────────────────────────────────────────────────────────── */

export interface WeekAgendaDay {
  key: string;
  short: string;
  num: number;
  isToday?: boolean;
  href?: string;
}

export interface WeekAgendaGroup {
  label: string | null;
  rows: { time: string; cells: (AgendaCellProps & { key: string })[] }[];
}

export function WeekAgenda({
  days,
  groups,
  size = "week",
  className,
}: {
  days: WeekAgendaDay[];
  groups: WeekAgendaGroup[];
  size?: "week" | "day";
  className?: string;
}) {
  const grid = { gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))` };
  return (
    <div role="grid" className={cx("flex min-w-0 flex-col gap-[6px]", FONT, className)}>
      <div role="row" style={grid} className="grid gap-[6px] pb-[6px]">
        <span />
        {days.map((d) => {
          const inner = (
            <>
              <span className="text-[12px] font-bold uppercase tracking-[.08em] text-text-3">{d.short}</span>
              <span className={cx("text-[26px] font-black leading-none stretch-72", d.isToday ? "text-yellow" : "text-paper")}>{d.num}</span>
            </>
          );
          const cls = cx(
            "flex items-baseline gap-[6px] border-b-2 px-2 py-[6px]",
            d.isToday ? "border-yellow" : "border-line",
          );
          return d.href ? (
            <Link
              key={d.key}
              role="columnheader"
              href={d.href}
              scroll={false}
              aria-current={d.isToday ? "date" : undefined}
              className={cx(cls, "hover:border-text-4", TRANSITION, FOCUS)}
            >
              {inner}
            </Link>
          ) : (
            <span key={d.key} role="columnheader" aria-current={d.isToday ? "date" : undefined} className={cls}>
              {inner}
            </span>
          );
        })}
      </div>
      {groups.map((g, gi) => (
        <div key={gi} role="rowgroup" className="flex flex-col gap-[6px]">
          {g.label !== null && (
            <span className="pb-1 pt-[10px] text-[12px] font-bold uppercase tracking-[.08em] text-text-3">{g.label}</span>
          )}
          {g.rows.map((r) => (
            <div key={r.time} role="row" style={grid} className="grid items-stretch gap-[6px]">
              <span className={cx("self-center text-[12px] font-semibold text-text-3", MONO)}>{r.time}</span>
              {r.cells.map(({ key, ...c }) => (
                <AgendaCell key={key} size={size} {...c} />
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
