import type { ReactNode } from "react";
import { cx } from "../cx";
import { FOCUS, FONT, MONO, TRANSITION } from "../styles";

/* ── MonthCalendar (2f / 4e) ──────────────────────────────────
   Grilla lunes→domingo. Cabecera JetBrains Mono 600 12 (mobile 10)
   #8d867a. Celda alto 52 (mobile 44), radio 6, Archivo 800 17 (15):
   - available: #1f1d1a / paper.
   - selected: amarillo / tinta.
   - closed (cerrado, pasado, sin turnos): transparente, #4a453e tachado.
   - loading: igual que closed sin tachar (mientras llega la agenda).
   Presentacional: los handlers los pasa una isla cliente.
   ──────────────────────────────────────────────────────────── */

export type CalendarDayState = "available" | "closed" | "loading";

export interface CalendarDay {
  /** "2026-10-08". */
  date: string;
  state: CalendarDayState;
}

const DOWS = ["LU", "MA", "MI", "JU", "VI", "SÁ", "DO"];

function mondayOffset(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

export interface MonthCalendarProps {
  /** "Octubre 2026". */
  monthLabel: string;
  /** Días del mes en orden (1 → fin de mes). */
  days: CalendarDay[];
  selected?: string | null;
  onSelect?: (date: string) => void;
  onPrev?: () => void;
  onNext?: () => void;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
  /** Rótulo del paso a la izquierda de la navegación ("2 · Elegí el día"). */
  label?: ReactNode;
  /** "page" (sobre #121110, celdas #1f1d1a) o "panel" (dentro de un panel #1f1d1a, celdas #121110). */
  surface?: "page" | "panel";
  className?: string;
}

export function MonthCalendar({
  monthLabel,
  days,
  selected,
  onSelect,
  onPrev,
  onNext,
  prevDisabled,
  nextDisabled,
  label,
  surface = "page",
  className,
}: MonthCalendarProps) {
  const offset = days[0] ? mondayOffset(days[0].date) : 0;
  const arrow = cx(
    "inline-flex min-h-11 min-w-8 items-center justify-center rounded-btn disabled:cursor-default disabled:opacity-30 md:min-h-0",
    FOCUS,
  );
  return (
    <div className={cx("flex min-w-0 flex-col gap-[10px] md:gap-[14px]", FONT, className)}>
      <div className="flex items-center justify-between gap-3">
        {label}
        <div className="flex items-center text-[14px] font-extrabold uppercase tracking-[.04em] text-paper md:text-[16px]">
          <button type="button" className={arrow} onClick={onPrev} disabled={prevDisabled} aria-label="Mes anterior">
            ‹
          </button>
          <span aria-live="polite">{monthLabel}</span>
          <button type="button" className={arrow} onClick={onNext} disabled={nextDisabled} aria-label="Mes siguiente">
            ›
          </button>
        </div>
      </div>
      <div role="grid" aria-label={monthLabel} className="grid grid-cols-7 gap-1 md:gap-[6px]">
        {DOWS.map((d) => (
          <span
            key={d}
            role="columnheader"
            className={cx(MONO, "py-[2px] text-center text-[10px] font-semibold text-text-3 md:py-1 md:text-[12px]")}
          >
            {d}
          </span>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={`pad-${i}`} aria-hidden />
        ))}
        {days.map((day) => {
          const n = Number(day.date.slice(8));
          const isSel = selected === day.date && day.state === "available";
          const enabled = day.state === "available";
          return (
            <button
              key={day.date}
              type="button"
              role="gridcell"
              aria-selected={isSel}
              aria-label={`${n}${enabled ? "" : ", sin turnos"}`}
              disabled={!enabled}
              onClick={() => onSelect?.(day.date)}
              className={cx(
                "flex h-11 items-center justify-center rounded-btn text-[15px] font-extrabold md:h-[52px] md:text-[17px]",
                TRANSITION,
                FOCUS,
                isSel
                  ? "bg-yellow text-ink"
                  : enabled
                    ? surface === "page"
                      ? "bg-surface text-paper hover:bg-surface-3"
                      : "bg-ink text-paper hover:bg-surface-3"
                    : "cursor-default bg-transparent text-line-btn",
                day.state === "closed" && "line-through",
              )}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}
