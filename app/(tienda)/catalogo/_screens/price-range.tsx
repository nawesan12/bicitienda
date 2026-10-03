"use client";

import { useState } from "react";
import { cx } from "@/components/bt/cx";
import { formatMoney } from "@/components/bt/format";
import { FONT } from "@/components/bt/styles";

/**
 * Filtro de precio del catálogo (2b): dos montos (caja #1f1d1a, borde
 * #3a362f, radio 6, padding 12, 14 px #cfc8bb) y la barra de 4 px #3a362f
 * con el tramo elegido en amarillo y dos thumbs de 16 px. Los thumbs son
 * dos `<input type="range">` superpuestos (teclado y lector de pantalla
 * nativos); los montos se escriben y se aplican al salir del campo.
 */
export function PriceRangeSlider({
  min,
  max,
  step = 10000,
  value,
  onChange,
  idPrefix = "precio",
}: {
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  idPrefix?: string;
}) {
  const [lo, hi] = value;
  const span = Math.max(1, max - min);
  const left = ((lo - min) / span) * 100;
  const right = 100 - ((hi - min) / span) * 100;

  const thumb = cx(
    "pointer-events-none absolute inset-x-0 top-1/2 m-0 h-4 w-full -translate-y-1/2 appearance-none bg-transparent",
    "[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-yellow",
    "[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-yellow",
    "[&::-webkit-slider-runnable-track]:bg-transparent [&::-moz-range-track]:bg-transparent",
    "focus-visible:outline-none focus-visible:[&::-webkit-slider-thumb]:outline-2 focus-visible:[&::-webkit-slider-thumb]:outline-offset-2 focus-visible:[&::-webkit-slider-thumb]:outline-paper",
  );

  return (
    <div className={cx("flex flex-col gap-3", FONT)}>
      <div className="grid grid-cols-2 gap-2">
        <MoneyInput
          id={`${idPrefix}-min`}
          label="Precio mínimo"
          value={lo}
          onCommit={(n) => onChange([Math.min(Math.max(min, n), hi), hi])}
        />
        <MoneyInput
          id={`${idPrefix}-max`}
          label="Precio máximo"
          value={hi}
          onCommit={(n) => onChange([lo, Math.max(Math.min(max, n), lo)])}
        />
      </div>
      <div className="relative mx-1 my-2 h-1 rounded-[2px] bg-line-strong">
        <div
          aria-hidden
          className="absolute inset-y-0 rounded-[2px] bg-yellow"
          style={{ left: `${left}%`, right: `${right}%` }}
        />
        <input
          type="range"
          aria-label="Precio mínimo"
          min={min}
          max={max}
          step={step}
          value={lo}
          onChange={(e) => onChange([Math.min(Number(e.target.value), hi), hi])}
          className={thumb}
        />
        <input
          type="range"
          aria-label="Precio máximo"
          min={min}
          max={max}
          step={step}
          value={hi}
          onChange={(e) => onChange([lo, Math.max(Number(e.target.value), lo)])}
          className={thumb}
        />
      </div>
    </div>
  );
}

function MoneyInput({
  id,
  label,
  value,
  onCommit,
}: {
  id: string;
  label: string;
  value: number;
  onCommit: (n: number) => void;
}) {
  // Borrador mientras se escribe; fuera de foco muestra el valor vigente.
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? formatMoney(value);
  const commit = () => {
    const digits = text.replace(/\D/g, "");
    if (digits) onCommit(Number(digits));
    setDraft(null);
  };
  return (
    <input
      id={id}
      aria-label={label}
      inputMode="numeric"
      value={text}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        }
      }}
      className={cx(
        "block w-full min-w-0 rounded-btn border border-line-strong bg-surface p-3 text-[14px] text-text-2 outline-none focus:border-yellow max-md:text-[16px]",
        FONT,
      )}
    />
  );
}
