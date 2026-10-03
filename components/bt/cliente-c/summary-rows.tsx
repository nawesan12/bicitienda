import type { ReactNode } from "react";
import { cx } from "../cx";
import { FONT } from "../styles";

/* ── SummaryRows (resumen del turno 2f, sobre amarillo) ───────
   Borde superior 1.5 tinta; filas 14×0, 16 px, space-between, valor
   en <strong>, divisor 1 px rgba(18,17,16,.25); la última sin borde.
   ──────────────────────────────────────────────────────────── */

export interface SummaryRow {
  label: ReactNode;
  value: ReactNode;
}

export function SummaryRows({ rows, className }: { rows: SummaryRow[]; className?: string }) {
  return (
    <dl className={cx("m-0 border-t-[1.5px] border-ink", FONT, className)}>
      {rows.map((r, i) => (
        <div
          key={i}
          className="flex items-baseline justify-between gap-4 border-b border-ink/25 py-[14px] text-[16px] last:border-b-0"
        >
          <dt>{r.label}</dt>
          <dd className="m-0 text-right font-bold">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}
