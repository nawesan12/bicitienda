import type { ReactNode } from "react";
import { cx } from "../cx";
import { FONT } from "../styles";
import { Price } from "../typography";

/* ── SummaryRows / SummaryRow / SummaryTotal ──────────────────
   Totales del carrito (2d/4d) y pie del resumen de la confirmación (2e).
   - tone "dark": borde superior dashed #3a362f, etiquetas #cfc8bb,
     total amarillo 44 (mobile 40).
   - tone "paper": borde dashed #c9c0ae, etiquetas #4c463d, valores 700,
     total ink 40.
   Desktop: padding-top 18, gap 10, 16 px. Mobile: 14 / 8 / 15 px.
   (paper siempre 14 / 8 / 15, como el inline de 2e.)
   ──────────────────────────────────────────────────────────── */

export type SummaryTone = "dark" | "paper";

export function SummaryRows({
  tone = "dark",
  children,
  className,
}: {
  tone?: SummaryTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <dl
      className={cx(
        "m-0 flex flex-col border-t border-dashed",
        tone === "dark"
          ? "gap-2 border-line-strong pt-[14px] text-[15px] md:gap-[10px] md:pt-[18px] md:text-[16px]"
          : "gap-2 border-card-dash pt-[14px] text-[15px]",
        FONT,
        className,
      )}
    >
      {children}
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
  const discount = variant === "discount";
  return (
    <div className={cx("flex items-baseline justify-between gap-4", className)}>
      <dt
        className={cx(
          discount
            ? cx("font-bold", tone === "dark" ? "text-red-light" : "text-card-transfer")
            : tone === "dark"
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
            ? cx("font-bold", tone === "dark" ? "text-red-light" : "text-card-transfer")
            : tone === "dark"
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
  note,
  className,
}: {
  label: ReactNode;
  amount: number;
  tone?: SummaryTone;
  /** Línea chica bajo el total, alineada a la derecha ("Ahorrás $ 54.480"). */
  note?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex flex-col gap-[6px]", tone === "dark" && "mt-[6px]", className)}>
      <div className="flex items-center justify-between gap-4">
        <dt
          className={cx(
            "font-extrabold uppercase tracking-[.06em]",
            tone === "dark" ? "text-[15px] md:text-[16px]" : "text-[15px] text-ink",
          )}
        >
          {label}
        </dt>
        <dd className="m-0">
          <Price
            amount={amount}
            size="total"
            tone={tone === "dark" ? "yellow" : "ink"}
            className={tone === "paper" ? "md:text-[40px]" : undefined}
          />
        </dd>
      </div>
      {note && (
        <p
          className={cx(
            "m-0 text-right text-[13px] md:text-[14px]",
            tone === "dark" ? "text-text-2" : "text-card-cuotas",
          )}
        >
          {note}
        </p>
      )}
    </div>
  );
}
