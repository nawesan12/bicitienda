import Link from "next/link";
import type { InputHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";
import { FOCUS, FONT, TRANSITION } from "./styles";

/* ── Chip de categoría ────────────────────────────────────────
   Scroll horizontal en mobile (4a): min-h 44, px 16, borde #3a362f,
   radio 999, Archivo 800 14 @85 % uppercase.
   ──────────────────────────────────────────────────────────── */

export function Chip({
  href,
  active,
  children,
  className,
}: {
  href?: string;
  active?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const cls = cx(
    "flex min-h-[44px] flex-none items-center whitespace-nowrap rounded-pill border px-4 text-[14px] font-extrabold uppercase stretch-85",
    active
      ? "border-yellow bg-yellow text-ink"
      : "border-line-strong text-paper hover:border-text-4",
    FONT,
    TRANSITION,
    FOCUS,
    className,
  );
  if (!href) return <span className={cls}>{children}</span>;
  return (
    <Link href={href} className={cls} aria-current={active ? "page" : undefined}>
      {children}
    </Link>
  );
}

/** Fila de chips con scroll horizontal (mobile). */
export function ChipScroller({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cx(
        "flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ── FilterChip ───────────────────────────────────────────────
   Filtros del admin ("Todos · 7", "Transf. pendiente · 1"): padding
   7×14, radio 999, 700 13 px. Activo = fondo paper + tinta.
   `size="sm"` = 6×12 (Resumen).
   ──────────────────────────────────────────────────────────── */

export function FilterChip({
  href,
  active,
  count,
  size = "md",
  children,
  className,
  onClick,
}: {
  href?: string;
  active?: boolean;
  count?: number | string;
  size?: "sm" | "md";
  children: ReactNode;
  className?: string;
  /** Solo desde componentes cliente. */
  onClick?: () => void;
}) {
  const cls = cx(
    "inline-flex items-center whitespace-nowrap rounded-pill border text-[13px] font-bold leading-[1.15]",
    size === "md" ? "px-[14px] py-[7px]" : "px-[12px] py-[6px]",
    active
      ? "border-paper bg-paper text-ink"
      : "border-line-strong text-paper hover:border-text-4",
    FONT,
    TRANSITION,
    FOCUS,
    className,
  );
  const label = (
    <>
      {children}
      {count !== undefined && <> · {count}</>}
    </>
  );
  if (href) {
    return (
      <Link href={href} className={cls} aria-current={active ? "true" : undefined}>
        {label}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" className={cls} onClick={onClick} aria-pressed={!!active}>
        {label}
      </button>
    );
  }
  return <span className={cls}>{label}</span>;
}

/* ── RemovableChip ────────────────────────────────────────────
   Filtro activo del catálogo ("MTB ×"). Desktop amarillo 7×12; mobile
   paper con min-h 36 (4b). El link lleva a la URL sin ese filtro.
   ──────────────────────────────────────────────────────────── */

export function RemovableChip({
  href,
  children,
  tone = "yellow",
  className,
}: {
  href: string;
  children: ReactNode;
  tone?: "yellow" | "paper";
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={`Quitar filtro ${typeof children === "string" ? children : ""}`.trim()}
      className={cx(
        "inline-flex flex-none items-center gap-2 whitespace-nowrap rounded-pill text-[13px] font-bold text-ink",
        tone === "yellow"
          ? "bg-yellow px-3 py-[7px] hover:bg-brand-hover"
          : "min-h-[36px] bg-paper px-3",
        FONT,
        TRANSITION,
        FOCUS,
        className,
      )}
    >
      {children}
      <span aria-hidden>×</span>
    </Link>
  );
}

/* ── OptionChip ───────────────────────────────────────────────
   Opción seleccionable de filtro (Rodado 12–29, Talle S–XL del
   catálogo): radio 6, borde #3a362f, 700 14 px; seleccionada amarilla.
   Input nativo (checkbox o radio) → funciona en un <form> GET sin JS.
   ──────────────────────────────────────────────────────────── */

export function OptionChip({
  label,
  type = "checkbox",
  wide,
  className,
  ...input
}: {
  label: ReactNode;
  type?: "checkbox" | "radio";
  /** Padding 8×14 (talles) en vez de 8×12 (rodados). */
  wide?: boolean;
  className?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "className">) {
  return (
    <label
      className={cx(
        "inline-flex cursor-pointer items-center rounded-btn border border-line-strong py-2 text-[14px] font-bold text-paper",
        wide ? "px-[14px]" : "px-3",
        "hover:border-text-4 has-checked:border-yellow has-checked:bg-yellow has-checked:text-ink",
        "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-yellow",
        "has-disabled:cursor-default has-disabled:opacity-50",
        FONT,
        TRANSITION,
        className,
      )}
    >
      <input type={type} className="sr-only" {...input} />
      {label}
    </label>
  );
}
