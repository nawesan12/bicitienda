import type { InputHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";
import { FONT, MONO, TRANSITION } from "./styles";

/**
 * Tarjetas seleccionables con input nativo (radio por defecto). El estilo
 * de seleccionado sale de `:has(:checked)`, así que funcionan dentro de un
 * <form> sin JS y también controladas (`checked` + `onChange`).
 */

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "className" | "title">;

/* ── OptionCard ───────────────────────────────────────────────
   selectedStyle:
   - "tint": amarillo 8 % + borde #ffd21f (selección de opción).
   - "fill": fondo amarillo + tinta (servicio del turno 2f, tipo de
     presupuesto 5a).
   titleStyle:
   - "display": Archivo 900 26/.95 @70 % (5a). "display-lg" 36 (2f).
   - "text": 800 16 px.
   ──────────────────────────────────────────────────────────── */

export interface OptionCardProps extends InputProps {
  title: ReactNode;
  description?: ReactNode;
  /** Dato mono a la derecha del título ("30 MIN"). */
  meta?: ReactNode;
  type?: "radio" | "checkbox";
  selectedStyle?: "tint" | "fill";
  titleStyle?: "display" | "display-lg" | "display-sm" | "text";
  /** Fondo sin seleccionar: transparente (5a) o surface #1f1d1a (2f). */
  surface?: "transparent" | "surface";
  /** Padding: 14 (mobile) · 18 (5a) · 24 (2f). Responsive por defecto. */
  padding?: "sm" | "md" | "lg";
  /** Radio 8 (default) o 10 (servicios 2f). */
  radius?: 8 | 10;
  className?: string;
  children?: ReactNode;
}

const TITLE: Record<NonNullable<OptionCardProps["titleStyle"]>, string> = {
  "display-sm": "text-[22px] leading-[.95] font-black uppercase stretch-70",
  display: "text-[22px] md:text-[26px] leading-[.95] font-black uppercase stretch-70",
  "display-lg": "text-[28px] md:text-[36px] leading-[.95] font-black uppercase stretch-70",
  text: "text-[15px] md:text-[16px] font-extrabold",
};

const PADDING = {
  sm: "p-[14px]",
  md: "p-[14px] md:p-[18px]",
  lg: "p-4 md:p-6",
} as const;

export function OptionCard({
  title,
  description,
  meta,
  type = "radio",
  selectedStyle = "tint",
  titleStyle = "display",
  surface = "transparent",
  padding = "md",
  radius = 8,
  className,
  children,
  ...input
}: OptionCardProps) {
  const fill = selectedStyle === "fill";
  return (
    <label
      className={cx(
        "group/opt flex cursor-pointer flex-col gap-2 border-[1.5px] border-line-strong text-paper",
        radius === 8 ? "rounded-box" : "rounded-card",
        surface === "surface" ? "bg-surface" : "bg-transparent",
        fill
          ? "has-checked:border-yellow has-checked:bg-yellow has-checked:text-ink"
          : "has-checked:selected-option",
        "hover:border-text-4 has-checked:hover:border-yellow",
        "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-yellow",
        "has-disabled:cursor-default has-disabled:opacity-50",
        PADDING[padding],
        FONT,
        TRANSITION,
        className,
      )}
    >
      <input type={type} className="sr-only" {...input} />
      <span className="flex items-baseline justify-between gap-3">
        <span className={TITLE[titleStyle]}>{title}</span>
        {meta && <span className={cx(MONO, "flex-none text-[11px] font-semibold md:text-[12px]")}>{meta}</span>}
      </span>
      {description && (
        <span
          className={cx(
            "text-[13px] leading-[1.4] md:text-[14px]",
            surface === "surface" ? "text-text-2" : "text-text-3",
            fill && "group-has-checked/opt:text-line-strong",
          )}
        >
          {description}
        </span>
      )}
      {children}
    </label>
  );
}

/* ── RadioCard ────────────────────────────────────────────────
   Medio de pago del carrito (2d / 4d): grilla 22 px | 1fr, punto de
   radio 22 px con borde 2, centro 10 px amarillo; seleccionada con
   amarillo 8 % + borde amarillo.
   ──────────────────────────────────────────────────────────── */

export interface RadioCardProps extends InputProps {
  title: ReactNode;
  description?: ReactNode;
  className?: string;
  children?: ReactNode;
}

export function RadioCard({ title, description, className, children, ...input }: RadioCardProps) {
  return (
    <label
      className={cx(
        "grid cursor-pointer grid-cols-[22px_1fr] items-start gap-3 rounded-box border-[1.5px] border-line-strong p-[14px] text-paper md:gap-[14px] md:p-4",
        "hover:border-text-4 has-checked:selected-option has-checked:hover:border-yellow",
        "has-disabled:cursor-default has-disabled:opacity-50",
        FONT,
        TRANSITION,
        className,
      )}
    >
      <input
        type="radio"
        className={cx(
          "relative m-0 size-[22px] flex-none cursor-pointer appearance-none rounded-full border-2 border-line-strong",
          "before:absolute before:top-1/2 before:left-1/2 before:size-[10px] before:-translate-x-1/2 before:-translate-y-1/2 before:rounded-full before:bg-transparent before:content-['']",
          "checked:border-yellow checked:before:bg-yellow",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow",
          TRANSITION,
        )}
        {...input}
      />
      <span className="flex flex-col gap-[2px] md:gap-[3px]">
        <span className="text-[15px] font-extrabold md:text-[16px]">{title}</span>
        {description && (
          <span className="text-[13px] leading-[1.4] text-text-2 md:text-[14px] md:leading-normal">
            {description}
          </span>
        )}
        {children}
      </span>
    </label>
  );
}
