import type { InputHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";
import { FONT, MONO, TRANSITION } from "./styles";

/**
 * Zona de subida con input file nativo.
 *
 * - "bar" (5a / 5d): min-h 64 (mobile 52), borde 1.5 dashed #4a453e,
 *   radio 8, 700 14 px #cfc8bb: "+ Subí una foto o captura (opcional)".
 * - "tile" (3d Fotos): cuadrado, borde 1.5 dashed #5a554c, "+" amarillo
 *   24 px y "Subir fotos" 700 13 px #8d867a.
 *
 * `selected` muestra el nombre del archivo elegido (lo pasa un padre
 * cliente; sin JS el navegador no lo expone).
 */
export function UploadDropzone({
  label = "Subí una foto o captura",
  hint = "(opcional)",
  variant = "bar",
  selected,
  className,
  ...input
}: {
  label?: ReactNode;
  hint?: ReactNode;
  variant?: "bar" | "tile";
  selected?: string;
  className?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "className">) {
  if (variant === "tile") {
    return (
      <label
        className={cx(
          "flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-box border-[1.5px] border-dashed border-line-muted text-center text-[13px] font-bold text-text-3",
          "hover:border-text-3 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-yellow",
          FONT,
          TRANSITION,
          className,
        )}
      >
        <input type="file" className="sr-only" {...input} />
        <span aria-hidden className="text-[24px] leading-none text-yellow">
          +
        </span>
        {label}
      </label>
    );
  }
  return (
    <label
      className={cx(
        "flex min-h-[52px] cursor-pointer flex-wrap items-center justify-center gap-x-[10px] gap-y-1 rounded-box border-[1.5px] border-dashed border-line-btn px-4 py-3 text-center text-[14px] font-bold text-text-2 md:min-h-[64px]",
        "hover:border-text-3 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-yellow",
        FONT,
        TRANSITION,
        className,
      )}
    >
      <input type="file" className="sr-only" {...input} />
      {selected ? (
        <>
          <span className={cx(MONO, "text-[12px] font-semibold text-paper")}>{selected}</span>
          <span className="font-normal text-text-3">· Cambiar</span>
        </>
      ) : (
        <>
          <span>+ {label}</span>
          {hint && <span className="font-normal text-text-3">{hint}</span>}
        </>
      )}
    </label>
  );
}
