import type { ReactNode } from "react";
import { cx } from "./cx";
import { formatMoney } from "./format";
import { DASHED_DARK, FONT } from "./styles";
import { Price } from "./typography";

/* ── SummaryRows / SummaryRow / SummaryTotal ──────────────────
   Un solo resumen etiqueta/valor (+ total) con cuatro tonos:
   - dark:  totales del carrito 2d/4d. Borde superior dashed #3a362f,
            etiquetas #cfc8bb, total amarillo 44 (mobile 40). Desktop
            pt 18 / gap 10 / 16 px; mobile 14 / 8 / 15.
   - paper: pie del resumen de 2e / seguimiento. Dashed #c9c0ae,
            etiquetas #4c463d, valores 700, total ink 40 (14 / 8 / 15).
   - yellow: resumen del turno sobre amarillo (2f). Borde superior 1.5
            tinta; filas 14×0 16 px con divisor ink/25 (la última sin).
   - panel: paneles del admin (3a / 4i / 5b). Dashed #3a362f, pt 16
            (12 en `size="sm"`), gap 8 (6), etiquetas #8d867a, valor 700;
            total 800 14 uppercase + monto 900 34/1 @72 amarillo (32).
   Se usa con `rows` (+ `total`) o componiendo `SummaryRow` /
   `SummaryTotal` como hijos (pasales el mismo `tone`). Es un `<dl>`.
   ──────────────────────────────────────────────────────────── */

export type SummaryTone = "dark" | "paper" | "yellow" | "panel";
export type SummarySize = "md" | "sm";

export interface SummaryRowItem {
  label: ReactNode;
  value: ReactNode;
  variant?: "default" | "discount";
}

const CONTAINER: Record<SummaryTone, string> = {
  dark: "flex flex-col border-t border-dashed gap-2 border-line-strong pt-[14px] text-[15px] md:gap-[10px] md:pt-[18px] md:text-[16px]",
  paper: "flex flex-col border-t border-dashed gap-2 border-card-dash pt-[14px] text-[15px]",
  yellow: "border-t-[1.5px] border-ink",
  panel: `flex flex-col text-[14px] ${DASHED_DARK}`,
};

export function SummaryRows({
  tone = "dark",
  size = "md",
  rows,
  total,
  children,
  className,
}: {
  tone?: SummaryTone;
  /** Solo `panel`: md = panel desktop · sm = 4i mobile. */
  size?: SummarySize;
  rows?: SummaryRowItem[];
  total?: { label?: ReactNode; amount: number; note?: ReactNode };
  children?: ReactNode;
  className?: string;
}) {
  return (
    <dl
      className={cx(
        "m-0",
        CONTAINER[tone],
        tone === "panel" && (size === "md" ? "gap-2 pt-4" : "gap-[6px] pt-3"),
        FONT,
        className,
      )}
    >
      {rows?.map((r, i) => (
        <SummaryRow key={i} tone={tone} label={r.label} value={r.value} variant={r.variant} />
      ))}
      {children}
      {total && <SummaryTotal tone={tone} size={size} label={total.label ?? "Total"} amount={total.amount} note={total.note} />}
    </dl>
  );
}

export function SummaryRow({
  label,
  value,
  tone = "dark",
  variant = "default",
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  tone?: SummaryTone;
  /** discount = rojo 700 (descuento de transferencia): #ff6a5c / #b81d16 en paper. */
  variant?: "default" | "discount";
  className?: string;
}) {
  if (tone === "yellow") {
    return (
      <div
        className={cx(
          "flex items-baseline justify-between gap-4 border-b border-ink/25 py-[14px] text-[16px] last:border-b-0",
          className,
        )}
      >
        <dt>{label}</dt>
        <dd className="m-0 text-right font-bold">{value}</dd>
      </div>
    );
  }
  if (tone === "panel") {
    return (
      <div className={cx("flex items-baseline justify-between gap-3", className)}>
        <dt className="text-text-3">{label}</dt>
        <dd className="m-0 text-right font-bold">{value}</dd>
      </div>
    );
  }
  const discount = variant === "discount";
  const dark = tone === "dark";
  return (
    <div className={cx("flex items-baseline justify-between gap-4", className)}>
      <dt
        className={cx(
          discount
            ? cx("font-bold", dark ? "text-red-light" : "text-card-transfer")
            : dark
              ? "text-text-2"
              : "text-card-cuotas",
        )}
      >
        {label}
      </dt>
      <dd
        className={cx(
          "m-0 text-right",
          discount
            ? cx("font-bold", dark ? "text-red-light" : "text-card-transfer")
            : dark
              ? "text-paper"
              : "font-bold text-ink",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

export function SummaryTotal({
  label,
  amount,
  tone = "dark",
  size = "md",
  note,
  className,
}: {
  label: ReactNode;
  amount: number;
  tone?: SummaryTone;
  /** Solo `panel`: monto 34 (md) o 32 (sm). */
  size?: SummarySize;
  /** Línea chica bajo el total, alineada a la derecha ("Ahorrás $ 54.480"). */
  note?: ReactNode;
  className?: string;
}) {
  if (tone === "panel") {
    return (
      <div className={cx("flex items-baseline justify-between gap-3 pt-1", className)}>
        <dt className="text-[14px] font-extrabold uppercase tracking-[.06em]">{label}</dt>
        <dd
          className={cx(
            "m-0 whitespace-nowrap font-black leading-none text-yellow stretch-72",
            size === "md" ? "text-[34px]" : "text-[32px]",
          )}
        >
          {formatMoney(amount)}
        </dd>
      </div>
    );
  }
  const dark = tone !== "paper";
  return (
    <div className={cx("flex flex-col gap-[6px]", dark && "mt-[6px]", className)}>
      <div className="flex items-center justify-between gap-4">
        <dt
          className={cx(
            "font-extrabold uppercase tracking-[.06em]",
            dark ? "text-[15px] md:text-[16px]" : "text-[15px] text-ink",
          )}
        >
          {label}
        </dt>
        <dd className="m-0">
          <Price amount={amount} size="total" tone={dark ? "yellow" : "ink"} className={dark ? undefined : "md:text-[40px]"} />
        </dd>
      </div>
      {note && (
        <p className={cx("m-0 text-right text-[13px] md:text-[14px]", dark ? "text-text-2" : "text-card-cuotas")}>{note}</p>
      )}
    </div>
  );
}

/* ── KeyValueList ─────────────────────────────────────────────
   Filas etiqueta / valor con divisor #2b2824 y borde superior.
   - inline (admin 3a / 3b / 5b): 14 px, fila 12×0 (la última sin
     borde), clave #8d867a a la izquierda, valor <strong> a la derecha
     con `tone`.
   - stacked (datos bancarios, pago en el local, sandbox): etiqueta 700
     12 uppercase .08em #8d867a arriba del valor 800 17 (mono 600 15 para
     CBU / alias); `action` va a la derecha (Copiar).
   ──────────────────────────────────────────────────────────── */

export interface KeyValueItem {
  label: ReactNode;
  value: ReactNode;
  /** inline: color del valor. */
  tone?: "paper" | "red-light" | "yellow" | "muted";
  /** stacked: valor en mono (CBU, alias, número). */
  mono?: boolean;
  /** stacked: control a la derecha. */
  action?: ReactNode;
}

const KV_TONE = {
  paper: "text-paper",
  "red-light": "text-red-light",
  yellow: "text-yellow",
  muted: "text-text-3",
} as const;

export function KeyValueList({
  items,
  layout = "inline",
  className,
}: {
  items: KeyValueItem[];
  layout?: "inline" | "stacked";
  className?: string;
}) {
  if (layout === "stacked") {
    return (
      <dl className={cx("m-0 flex flex-col border-t border-line", FONT, className)}>
        {items.map((it, i) => (
          <div key={i} className="flex items-center justify-between gap-4 border-b border-line py-3">
            <div className="flex min-w-0 flex-col gap-1">
              <dt className="text-[12px] font-bold uppercase tracking-[.08em] text-text-3">{it.label}</dt>
              <dd
                className={cx(
                  "m-0 text-paper",
                  it.mono ? "break-all font-mono text-[15px] font-semibold" : "break-normal text-[17px] font-extrabold",
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
  return (
    <dl className={cx("m-0 flex flex-col border-t border-line text-[14px]", FONT, className)}>
      {items.map((it, i) => (
        <div key={i} className="flex items-baseline justify-between gap-4 border-b border-line py-3 last:border-b-0">
          <dt className="flex-none text-text-3">{it.label}</dt>
          <dd className={cx("m-0 min-w-0 text-right font-bold", KV_TONE[it.tone ?? "paper"])}>{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}
