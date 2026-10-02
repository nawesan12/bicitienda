import type { InputHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";
import { FONT, MONO, TRANSITION } from "./styles";

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "className">;

/** Clases del switch 40×22 (input nativo con appearance:none + ::before). */
const SWITCH = cx(
  "relative m-0 h-[22px] w-[40px] flex-none cursor-pointer appearance-none rounded-full bg-line-strong",
  "before:absolute before:top-[3px] before:left-[3px] before:size-4 before:rounded-full before:bg-text-3 before:content-[''] before:transition-transform before:duration-150",
  "checked:bg-yellow checked:before:translate-x-[18px] checked:before:bg-ink",
  "disabled:cursor-default disabled:opacity-50",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow",
  TRANSITION,
);

/* ── Toggle ───────────────────────────────────────────────────
   Pista 40×22 radio 999, perilla 16 px, padding 3.
   Encendido: pista amarilla + perilla tinta a la derecha.
   Apagado: pista #3a362f + perilla #8d867a a la izquierda.
   Con `label` se arma la fila "Publicado en la tienda ……… [o ]"
   (700 15 px; apagado el texto pasa a #cfc8bb).
   ──────────────────────────────────────────────────────────── */

export interface ToggleProps extends InputProps {
  label?: ReactNode;
  /** Bajada bajo el label ("30 min · se paga en el local"). */
  description?: ReactNode;
  /** Sin label visible, para tablas: hace falta un aria-label. */
  "aria-label"?: string;
  className?: string;
}

export function Toggle({ label, description, className, ...input }: ToggleProps) {
  if (!label) {
    return <input type="checkbox" role="switch" className={cx(SWITCH, className)} {...input} />;
  }
  return (
    <label
      className={cx(
        "group/tg flex cursor-pointer items-center justify-between gap-4 text-text-2 has-checked:text-paper has-disabled:cursor-default",
        FONT,
        className,
      )}
    >
      <span className="flex min-w-0 flex-col gap-[2px]">
        <span className={cx("font-bold", description ? "text-[15px] font-extrabold" : "text-[15px]")}>
          {label}
        </span>
        {description && <span className="text-[13px] font-normal text-text-3">{description}</span>}
      </span>
      <input type="checkbox" role="switch" className={SWITCH} {...input} />
    </label>
  );
}

/* ── Checkbox ─────────────────────────────────────────────────
   Filtro "Tipo" del catálogo: caja 20 radio 4, borde 1.5 #5a554c;
   tildada amarilla con ✓ tinta 900 13 px. Label 500 16 px y conteo
   mono 12 a la derecha.
   ──────────────────────────────────────────────────────────── */

export interface CheckboxProps extends InputProps {
  label: ReactNode;
  count?: number | string;
  className?: string;
}

export function Checkbox({ label, count, className, ...input }: CheckboxProps) {
  return (
    <label
      className={cx(
        "flex min-h-[28px] cursor-pointer items-center gap-3 text-[16px] font-medium text-paper has-disabled:cursor-default has-disabled:opacity-50",
        FONT,
        className,
      )}
    >
      <input
        type="checkbox"
        className={cx(
          "relative m-0 size-5 flex-none cursor-pointer appearance-none rounded-tag border-[1.5px] border-line-muted bg-transparent",
          "before:absolute before:inset-0 before:flex before:items-center before:justify-center before:text-[13px] before:leading-[17px] before:font-black before:text-ink before:content-['']",
          "checked:border-yellow checked:bg-yellow checked:before:content-['✓']",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow",
          TRANSITION,
        )}
        {...input}
      />
      <span className="min-w-0">{label}</span>
      {count !== undefined && (
        <span className={cx(MONO, "ml-auto text-[12px] font-normal text-text-3")}>{count}</span>
      )}
    </label>
  );
}
