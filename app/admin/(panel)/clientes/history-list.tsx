import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "@/components/bt/cx";
import { FOCUS, FONT, TRANSITION } from "@/components/bt/styles";

/**
 * Historial de la ficha de cliente (3e): filas `72px 1fr`, gap 12,
 * padding 10×0, borde superior #2b2824, 14 px. El tipo va en 800 11 px
 * uppercase .06em con color propio: Pedido amarillo, Turno paper,
 * Presupuesto #ff6a5c (no está en el prototipo). Vacío: texto #8d867a.
 */
export type HistoryTone = "pedido" | "turno" | "presupuesto";

const TONE: Record<HistoryTone, { label: string; cls: string }> = {
  pedido: { label: "Pedido", cls: "text-yellow" },
  turno: { label: "Turno", cls: "text-paper" },
  presupuesto: { label: "Presup.", cls: "text-red-light" },
};

export function HistoryList({
  title = "Historial",
  items,
  empty = "Sin movimientos todavía.",
  className,
}: {
  title?: ReactNode;
  items: { kind: HistoryTone; text: ReactNode; href?: string }[];
  empty?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex flex-col", FONT, className)}>
      <span className="pb-2 text-[12px] font-bold uppercase tracking-[.08em] text-text-3">{title}</span>
      {items.length === 0 ? (
        <p className="m-0 border-t border-line py-[10px] text-[14px] text-text-3">{empty}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {items.map((it, i) => {
            const t = TONE[it.kind];
            const body = <span className="text-[14px] leading-[1.35] text-text-2">{it.text}</span>;
            return (
              <li key={i} className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 border-t border-line py-[10px]">
                <span className={cx("pt-[2px] text-[11px] font-extrabold uppercase tracking-[.06em]", t.cls)}>{t.label}</span>
                {it.href ? (
                  <Link href={it.href} className={cx("rounded-[2px] hover:[&>span]:text-paper", TRANSITION, FOCUS)}>
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/**
 * KPI chico de la ficha (3e): celda #121110, padding 14, label 700 11 px
 * .08em #8d867a; valor 900 30/1 @72 % o, con `small`, 24/1.1 (Gastado).
 */
export function KpiCell({
  label,
  value,
  tone = "paper",
  small,
}: {
  label: ReactNode;
  value: ReactNode;
  tone?: "paper" | "yellow";
  small?: boolean;
}) {
  return (
    <div className={cx("flex min-w-0 flex-col gap-[2px] bg-ink p-[14px]", FONT)}>
      <span className="text-[11px] font-bold uppercase tracking-[.08em] text-text-3">{label}</span>
      <span
        className={cx(
          "font-black stretch-72",
          small ? "text-[24px] leading-[1.1]" : "text-[30px] leading-none",
          tone === "yellow" ? "text-yellow" : "text-paper",
        )}
      >
        {value}
      </span>
    </div>
  );
}
