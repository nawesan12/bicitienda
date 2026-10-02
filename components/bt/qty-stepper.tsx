"use client";

import { useState } from "react";
import { cx } from "./cx";
import { FONT, TRANSITION } from "./styles";

/**
 * Selector de cantidad "− 1 +". Borde 1 #3a362f, radio 6, Archivo 800.
 * El "−" queda apagado (#8d867a) cuando está en el mínimo.
 *
 * Tamaños:
 * - lg: producto desktop (celda de 140 px, 18 px, alto del botón vecino).
 * - md: carrito desktop (12×16, 17 px).
 * - sm: carrito mobile (min-h 44, 15 px, gap 14).
 * - admin: stock de variantes (8×12, 15 px; rojo si llega a 0).
 *
 * Controlado (`value` + `onChange`) o no (`defaultValue`). Con `name`
 * agrega un input hidden para formularios.
 */
export function QtyStepper({
  value,
  defaultValue = 1,
  min = 1,
  max,
  onChange,
  name,
  size = "md",
  highlightZero,
  label = "Cantidad",
  className,
  disabled,
}: {
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
  onChange?: (value: number) => void;
  name?: string;
  size?: "lg" | "md" | "sm" | "admin";
  /** Muestra el número en #ff6a5c cuando vale 0 (stock). */
  highlightZero?: boolean;
  label?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [inner, setInner] = useState(defaultValue);
  const current = value ?? inner;

  const set = (next: number) => {
    const clamped = Math.max(min, max !== undefined ? Math.min(max, next) : next);
    if (clamped === current) return;
    if (value === undefined) setInner(clamped);
    onChange?.(clamped);
  };

  const atMin = current <= min;
  const atMax = max !== undefined && current >= max;

  const btn = cx(
    "flex items-center justify-center rounded-tag disabled:cursor-default",
    "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-yellow",
    size === "sm" ? "h-[44px] min-w-[28px]" : "h-full min-h-[28px] min-w-[24px]",
    TRANSITION,
  );

  return (
    <div
      role="group"
      aria-label={label}
      className={cx(
        "flex items-center justify-between rounded-btn border border-line-strong font-extrabold text-paper",
        FONT,
        size === "lg" && "min-h-[58px] px-4 text-[18px]",
        size === "md" && "px-4 py-[9px] text-[17px]",
        size === "sm" && "min-h-[44px] gap-[14px] px-3 text-[15px]",
        size === "admin" && "px-3 py-[5px] text-[15px]",
        disabled && "opacity-50",
        className,
      )}
    >
      <button
        type="button"
        aria-label="Restar uno"
        disabled={disabled || atMin}
        onClick={() => set(current - 1)}
        className={cx(btn, atMin ? "text-text-3" : "text-paper hover:text-yellow")}
      >
        −
      </button>
      <span
        aria-live="polite"
        className={cx("tabular-nums", highlightZero && current === 0 && "text-red-light")}
      >
        {current}
      </span>
      <button
        type="button"
        aria-label="Sumar uno"
        disabled={disabled || atMax}
        onClick={() => set(current + 1)}
        className={cx(btn, atMax ? "text-text-3" : "text-paper hover:text-yellow")}
      >
        +
      </button>
      {name && <input type="hidden" name={name} value={current} />}
    </div>
  );
}
