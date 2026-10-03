import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "../cx";
import { FOCUS, FONT, TRANSITION } from "../styles";

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
