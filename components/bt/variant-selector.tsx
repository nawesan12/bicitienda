import type { ChangeEvent, ReactNode } from "react";
import Link from "next/link";
import { cx } from "./cx";
import { FONT, TRANSITION } from "./styles";

/**
 * Selectores de talle y color (2c / 4c) con radios nativos: funcionan en
 * un <form> sin JS y también controlados (`value` + `onChange`).
 *
 * Opción: radio 6, borde 1 #3a362f, 700 16 px.
 * - seleccionada: fondo amarillo, tinta, 800.
 * - sin stock: borde dashed, #5a554c, tachada, no se puede elegir.
 * Talle con altura sugerida: 400 13 px #8d867a al lado (desktop) o
 * debajo (mobile, para que entren 4 por fila).
 */

export interface VariantOption {
  value: string;
  label: string;
  /** Altura sugerida del talle, ej: "1,65–1,75". */
  height?: string;
  /** Color de muestra (hex) para el selector de color. */
  swatch?: string;
  /** false = sin stock (tachada y deshabilitada). */
  available?: boolean;
}

interface SelectorProps {
  name: string;
  options: VariantOption[];
  /** Controlado. */
  value?: string;
  /** No controlado. */
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Texto del encabezado ("Talle", "Color"). */
  label?: string;
  /** Detalle tras el label: "Color · Negro / amarillo". */
  selectedLabel?: string;
  /** Link de ayuda a la derecha del label ("¿Cuál es mi talle?"). */
  help?: { href: string; label: ReactNode };
  className?: string;
}

function SelectorHeader({ label, selectedLabel, help }: Pick<SelectorProps, "label" | "selectedLabel" | "help">) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[12px] font-bold uppercase tracking-[.08em] text-text-3 md:text-[13px]">
        {label}
        {selectedLabel && <> · {selectedLabel}</>}
      </span>
      {help && (
        <Link
          href={help.href}
          className="rounded-[2px] text-[13px] font-semibold text-yellow underline underline-offset-2 hover:text-brand-hover md:text-[14px]"
        >
          {help.label}
        </Link>
      )}
    </div>
  );
}

function OptionButton({
  name,
  option,
  checked,
  defaultChecked,
  onChange,
  children,
}: {
  name: string;
  option: VariantOption;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  children: ReactNode;
}) {
  const out = option.available === false;
  return (
    <label
      className={cx(
        "group/var flex min-h-[48px] items-center justify-center rounded-btn border px-2 text-center text-[16px] font-bold md:min-h-0 md:py-[14px]",
        out
          ? "cursor-default border-dashed border-line-strong text-line-muted line-through"
          : "cursor-pointer border-line-strong text-paper hover:border-text-4 has-checked:border-yellow has-checked:bg-yellow has-checked:font-extrabold has-checked:text-ink",
        "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-yellow",
        TRANSITION,
      )}
    >
      <input
        type="radio"
        name={name}
        value={option.value}
        disabled={out}
        checked={checked}
        defaultChecked={defaultChecked}
        onChange={onChange}
        className="sr-only"
        aria-label={out ? `${option.label} (sin stock)` : undefined}
      />
      {children}
    </label>
  );
}

function radioState(opt: VariantOption, value?: string, defaultValue?: string) {
  return value !== undefined
    ? { checked: value === opt.value }
    : { defaultChecked: defaultValue === opt.value };
}

/* ── SizeSelector ─────────────────────────────────────────── */

export function SizeSelector({
  name,
  options,
  value,
  defaultValue,
  onChange,
  label = "Talle",
  selectedLabel,
  help,
  className,
}: SelectorProps) {
  const handle = onChange ? (e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value) : undefined;
  return (
    <fieldset className={cx("m-0 flex min-w-0 flex-col gap-[10px] border-0 p-0 md:gap-3", FONT, className)}>
      <legend className="sr-only">{label}</legend>
      <SelectorHeader label={label} selectedLabel={selectedLabel} help={help} />
      <div className="grid grid-cols-4 gap-[6px] md:gap-2">
        {options.map((opt) => (
          <OptionButton
            key={opt.value}
            name={name}
            option={opt}
            onChange={handle}
            {...radioState(opt, value, defaultValue)}
          >
            <span className="flex flex-col items-center leading-[1.15] md:flex-row md:gap-1">
              <span>{opt.label}</span>
              {opt.height && opt.available !== false && (
                <span className="text-[11px] font-normal text-text-3 no-underline group-has-checked/var:font-medium group-has-checked/var:text-ink md:text-[13px]">
                  {opt.height}
                </span>
              )}
            </span>
          </OptionButton>
        ))}
      </div>
    </fieldset>
  );
}

/* ── ColorSelector ────────────────────────────────────────────
   Mismo estilo que los talles. Solo se muestra si hay más de un color.
   ──────────────────────────────────────────────────────────── */

export function ColorSelector({
  name,
  options,
  value,
  defaultValue,
  onChange,
  label = "Color",
  selectedLabel,
  help,
  className,
}: SelectorProps) {
  if (options.length < 2) return null;
  const handle = onChange ? (e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value) : undefined;
  return (
    <fieldset className={cx("m-0 flex min-w-0 flex-col gap-[10px] border-0 p-0 md:gap-3", FONT, className)}>
      <legend className="sr-only">{label}</legend>
      <SelectorHeader label={label} selectedLabel={selectedLabel} help={help} />
      <div className="grid grid-cols-2 gap-[6px] md:grid-cols-3 md:gap-2">
        {options.map((opt) => (
          <OptionButton
            key={opt.value}
            name={name}
            option={opt}
            onChange={handle}
            {...radioState(opt, value, defaultValue)}
          >
            <span className="flex items-center gap-2 text-[15px] leading-[1.15]">
              {opt.swatch && (
                <span
                  aria-hidden
                  className="size-[14px] flex-none rounded-full border border-line-strong"
                  style={{ background: opt.swatch }}
                />
              )}
              {opt.label}
            </span>
          </OptionButton>
        ))}
      </div>
    </fieldset>
  );
}
