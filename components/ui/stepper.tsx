"use client";

import { cn } from "@/lib/cn";

/**
 * Control de cantidad. Usa el signo menos U+2212 (−), no el guion ASCII,
 * igual que el prototipo.
 */
export function Stepper({
  value,
  min = 1,
  max,
  onChange,
  className,
}: {
  value: number;
  min?: number;
  max: number;
  onChange: (next: number) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-[5px] border-[1.5px] border-line-3",
        className,
      )}
    >
      <button
        type="button"
        aria-label="Quitar una unidad"
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        className="px-[9px] py-[4px] text-[13px] font-bold leading-none text-text-3 disabled:opacity-35"
      >
        −
      </button>
      <span className="min-w-[18px] px-1 text-center text-[12px] font-bold leading-none tabular-nums">
        {value}
      </span>
      <button
        type="button"
        aria-label="Agregar una unidad"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        className="px-[9px] py-[4px] text-[13px] font-bold leading-none disabled:opacity-35"
      >
        +
      </button>
    </div>
  );
}
