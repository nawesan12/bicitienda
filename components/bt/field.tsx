import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cx } from "./cx";
import { FOCUS, FONT, TRANSITION } from "./styles";

/* ── Field ────────────────────────────────────────────────────
   Label eyebrow (Archivo 700 12 px uppercase .08em #8d867a; 13 px en
   login) que envuelve al control, gap 8. Error en #ff6a5c.
   ──────────────────────────────────────────────────────────── */

export interface FieldProps {
  label: ReactNode;
  /** Agrega " (opcional)" al label, como en el handoff. */
  optional?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  size?: "sm" | "md";
  className?: string;
  children: ReactNode;
}

export function Field({ label, optional, hint, error, size = "sm", className, children }: FieldProps) {
  return (
    <label className={cx("flex min-w-0 flex-col gap-2", FONT, className)}>
      <span
        className={cx(
          "font-bold uppercase tracking-[.08em] text-text-3",
          size === "sm" ? "text-[12px]" : "text-[13px]",
        )}
      >
        {label}
        {optional && " (opcional)"}
      </span>
      {children}
      {error ? (
        <span className="text-[13px] font-semibold text-red-light">{error}</span>
      ) : hint ? (
        <span className="text-[13px] text-text-3">{hint}</span>
      ) : null}
    </label>
  );
}

/* ── Controles ────────────────────────────────────────────────
   surface:
   - "panel": fondo #121110 (inputs dentro de un panel #1f1d1a).
   - "page": fondo #1f1d1a (inputs directo sobre la página: login, turno).
   size:
   - "sm": 10×12, 14 px (inputs chicos del admin).
   - "md": 13×14, 15 px (formularios en panel).
   - "lg": 15×16, 15 px (login, datos del turno).
   En mobile la letra sube a 16 px para que iOS no haga zoom.
   ──────────────────────────────────────────────────────────── */

type Surface = "panel" | "page";
type ControlSize = "sm" | "md" | "lg";

const SURFACE: Record<Surface, string> = {
  panel: "bg-ink",
  page: "bg-surface",
};

const CONTROL_SIZE: Record<ControlSize, string> = {
  sm: "px-3 py-[10px] text-[14px] max-md:text-[16px]",
  md: "px-[14px] py-[13px] text-[15px] max-md:text-[16px]",
  lg: "px-4 py-[15px] text-[15px] max-md:px-[14px] max-md:text-[16px]",
};

function controlClasses(surface: Surface, size: ControlSize, invalid?: boolean, className?: string) {
  return cx(
    "block w-full min-w-0 rounded-btn border font-normal normal-case tracking-normal text-paper outline-none placeholder:text-text-3",
    invalid ? "border-red-light" : "border-line-strong focus:border-yellow",
    "disabled:cursor-default disabled:opacity-60",
    FONT,
    TRANSITION,
    SURFACE[surface],
    CONTROL_SIZE[size],
    className,
  );
}

interface ControlStyleProps {
  surface?: Surface;
  size?: ControlSize;
  invalid?: boolean;
  className?: string;
}

export type InputProps = ControlStyleProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "className">;

export function Input({ surface = "panel", size = "md", invalid, className, ...rest }: InputProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={controlClasses(surface, size, invalid, className)}
      {...rest}
    />
  );
}

export type TextareaProps = ControlStyleProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className">;

export function Textarea({ surface = "panel", size = "md", invalid, className, rows = 4, ...rest }: TextareaProps) {
  return (
    <textarea
      rows={rows}
      aria-invalid={invalid || undefined}
      className={controlClasses(surface, size, invalid, cx("min-h-[120px] resize-y leading-[1.5]", className))}
      {...rest}
    />
  );
}

export type SelectProps = ControlStyleProps &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, "size" | "className"> & { children: ReactNode };

/** Select nativo con el "▾" del handoff a la derecha. */
export function Select({ surface = "panel", size = "md", invalid, className, children, ...rest }: SelectProps) {
  return (
    <span className="relative block min-w-0">
      <select
        aria-invalid={invalid || undefined}
        className={controlClasses(surface, size, invalid, cx("cursor-pointer appearance-none pr-9", className))}
        {...rest}
      >
        {children}
      </select>
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-[14px] -translate-y-1/2 text-[13px] text-paper"
      >
        ▾
      </span>
    </span>
  );
}

/* ── SearchInput ──────────────────────────────────────────────
   Buscador del header (360 px, 11×16, 14 px) y de la barra del admin
   (280 px). Es un <form method="get"> con un input `q`.
   ──────────────────────────────────────────────────────────── */

export function SearchInput({
  action,
  name = "q",
  placeholder,
  defaultValue,
  label = "Buscar",
  size = "md",
  className,
}: {
  action: string;
  name?: string;
  placeholder: string;
  defaultValue?: string;
  label?: string;
  /** md = 11×16 14 px (desktop) · lg = 12×14 16 px (mobile). */
  size?: "md" | "lg";
  className?: string;
}) {
  return (
    <form role="search" action={action} method="get" className={cx("min-w-0", className)}>
      <input
        type="search"
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-label={label}
        className={cx(
          "block w-full min-w-0 rounded-btn border border-line-strong bg-surface text-paper outline-none placeholder:text-text-3 focus:border-yellow",
          "[&::-webkit-search-cancel-button]:appearance-none",
          size === "md" ? "px-4 py-[11px] text-[14px]" : "px-[14px] py-3 text-[16px]",
          FONT,
          TRANSITION,
        )}
      />
    </form>
  );
}

/**
 * Campo calculado de solo lectura (3d "Con transferencia (auto)"): mismo
 * alto que un `Input` md, fondo transparente, borde punteado #3a362f y
 * el valor en #ff6a5c 800 17 px. `tone="muted"` lo deja en text-2 (para
 * datos que vienen de Ajustes, como las cuotas).
 */
export function ComputedField({
  children,
  tone = "red",
  className,
  ...rest
}: {
  children: ReactNode;
  tone?: "red" | "muted";
  className?: string;
  "aria-live"?: "polite" | "off";
  id?: string;
}) {
  return (
    <output
      className={cx(
        "block min-w-0 truncate rounded-btn border border-dashed border-line-strong bg-transparent px-[14px] py-[12px] leading-[1.25]",
        tone === "red" ? "text-[17px] font-extrabold text-red-light" : "text-[15px] font-normal text-text-2",
        FONT,
        className,
      )}
      {...rest}
    >
      {children}
    </output>
  );
}

/**
 * Acción de peligro en texto (3d "Eliminar producto"): Archivo 800 13 px
 * uppercase .06em, #ff6a5c, padding 8, centrada. Es un `<button>`.
 */
export function DangerTextButton({
  children,
  className,
  type = "button",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      type={type}
      className={cx(
        "rounded-btn p-2 text-center text-[13px] font-extrabold uppercase tracking-[.06em] text-red-light hover:bg-red-light/6 disabled:cursor-default disabled:opacity-50 max-md:min-h-11",
        FONT,
        TRANSITION,
        FOCUS,
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Input compacto (3f horarios): 8×10, 13 px, fondo ink, borde #3a362f. */
export const COMPACT_INPUT = cx(
  "block w-full min-w-0 rounded-btn border border-line-strong bg-ink px-[10px] py-2 text-[13px] text-paper outline-none placeholder:text-text-3 focus:border-yellow disabled:text-text-3 max-md:text-[16px]",
  FONT,
  TRANSITION,
);
