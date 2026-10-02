import type { ReactNode } from "react";
import { cx } from "./cx";
import { FONT } from "./styles";

/** Los 5 pasos del pedido (3a / 4i). */
export const ORDER_STEPS = [
  "Pedido recibido",
  "Pago confirmado",
  "Armado y ajuste",
  "Listo para retirar",
  "Retirado",
] as const;

/**
 * Cuántos pasos están hechos según el estado de UI del pedido (como el
 * prototipo: DONE). Se usa con `done` de <Timeline>.
 */
export const ORDER_STEPS_DONE = {
  transf_pendiente: 1,
  paga_local: 1,
  pagado: 2,
  armando: 2,
  listo: 4,
  retirado: 5,
  cancelado: 0,
} as const;

/* ── Timeline (compacto, admin) ───────────────────────────────
   Grilla 28 px | 1fr, padding 7 (mobile 6). Marca 20 px redonda, borde 2.
   - hecho (i < done): fondo y borde amarillo, ✓ tinta, label paper.
   - actual (i === done): borde amarillo, label amarillo.
   - pendiente: borde #3a362f, label #8d867a.
   `cancelled`: agrega el paso "Cancelado" con ✕ (rojo claro) y apaga el
   paso actual.
   ──────────────────────────────────────────────────────────── */

export function Timeline({
  steps = ORDER_STEPS,
  done,
  cancelled,
  cancelledLabel = "Cancelado",
  className,
}: {
  steps?: readonly string[];
  /** Cantidad de pasos completos (0–steps.length). */
  done: number;
  cancelled?: boolean;
  cancelledLabel?: string;
  className?: string;
}) {
  return (
    <ol className={cx("m-0 flex list-none flex-col p-0", FONT, className)}>
      {steps.map((label, i) => {
        const isDone = i < done;
        const isNow = i === done && !cancelled;
        return (
          <li
            key={label}
            aria-current={isNow ? "step" : undefined}
            className="grid grid-cols-[28px_1fr] items-center gap-[10px] py-[6px] md:py-[7px]"
          >
            <span
              aria-hidden
              className={cx(
                "box-border flex size-5 items-center justify-center rounded-full border-2 text-[11px] font-black text-ink",
                isDone ? "border-yellow bg-yellow" : isNow ? "border-yellow" : "border-line-strong",
              )}
            >
              {isDone ? "✓" : ""}
            </span>
            <span
              className={cx(
                "text-[14px] font-bold",
                isDone ? "text-paper" : isNow ? "text-yellow" : "text-text-3",
              )}
            >
              {label}
              {isDone && <span className="sr-only"> (hecho)</span>}
            </span>
          </li>
        );
      })}
      {cancelled && (
        <li aria-current="step" className="grid grid-cols-[28px_1fr] items-center gap-[10px] py-[6px] md:py-[7px]">
          <span
            aria-hidden
            className="box-border flex size-5 items-center justify-center rounded-full border-2 border-red-light text-[11px] font-black text-red-light"
          >
            ✕
          </span>
          <span className="text-[14px] font-bold text-red-light">{cancelledLabel}</span>
        </li>
      )}
    </ol>
  );
}

/* ── StepList (detallado, confirmación 2e) ────────────────────
   Filas con borde inferior, padding 18, grilla 56 | 1fr. Círculo 40 px,
   borde 1.5: hecho amarillo con ✓, actual borde amarillo y número
   amarillo, pendiente borde #3a362f y número #8d867a. Título 800 18 px
   (paper si hecho/actual), bajada 14 px #8d867a.
   ──────────────────────────────────────────────────────────── */

export function StepList({
  steps,
  done,
  className,
}: {
  steps: { title: ReactNode; description?: ReactNode }[];
  done: number;
  className?: string;
}) {
  return (
    <ol className={cx("m-0 flex list-none flex-col border-t border-line p-0", FONT, className)}>
      {steps.map((s, i) => {
        const isDone = i < done;
        const isNow = i === done;
        return (
          <li
            key={i}
            aria-current={isNow ? "step" : undefined}
            className="grid grid-cols-[48px_1fr] items-center gap-3 border-b border-line py-4 md:grid-cols-[56px_1fr] md:gap-4 md:py-[18px]"
          >
            <span
              aria-hidden
              className={cx(
                "flex size-10 items-center justify-center rounded-full border-[1.5px] text-[16px] font-black",
                isDone && "border-yellow bg-yellow text-ink",
                isNow && "border-yellow text-yellow",
                !isDone && !isNow && "border-line-strong text-text-3",
              )}
            >
              {isDone ? "✓" : i + 1}
            </span>
            <span className="flex flex-col gap-[2px]">
              <span
                className={cx(
                  "text-[16px] font-extrabold md:text-[18px]",
                  isDone || isNow ? "text-paper" : "text-text-3",
                )}
              >
                {s.title}
              </span>
              {s.description && <span className="text-[14px] text-text-3">{s.description}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
