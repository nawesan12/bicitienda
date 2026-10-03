import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";
import { FOCUS, FONT, TRANSITION } from "./styles";

/**
 * Botón del handoff. Archivo 800 uppercase .06em, radio 6.
 *
 * Variantes:
 * - primary: amarillo #ffd21f / tinta #121110.
 * - secondary: transparente, borde 1.5 #4a453e, texto paper.
 * - outline-paper: como secondary con borde #f4efe4 (CTA mobile del hero,
 *   "Reservar una prueba", "Pedir presupuesto" del menú).
 * - danger: secondary con texto #ff6a5c ("Rechazar", "Cancelar pedido").
 * - ink: tinta sobre paneles amarillos ("Confirmar turno", "Reprogramar").
 * - ink-outline: borde tinta sobre paneles amarillos ("Cancelar").
 *
 * Tamaños:
 * - lg: 17×28 · 16 px (hero, confirmación).
 * - md: 12×18 · 14 px (acciones de la barra del admin).
 * - header: 11×16 · 14 px ("Carrito · N").
 * - sm: 12×16 · 13 px (secundarios chicos de paneles: WhatsApp, Vino ✓).
 * - full: ancho completo, 15 px vertical · 14 px (paneles del admin).
 * - full-lg: ancho completo, 19 px vertical · 16 px (carrito, producto).
 *
 * En mobile (< md) el alto mínimo es 52 (primary/ink) o 50 (bordeados) y
 * la letra pasa a 15 px en lg/full/full-lg. Ningún tamaño baja de 44 px de
 * alto táctil en mobile.
 */

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline-paper"
  | "danger"
  | "ink"
  | "ink-outline";

export type ButtonSize = "lg" | "md" | "header" | "sm" | "full" | "full-lg";

const OUTLINED: Record<ButtonVariant, boolean> = {
  primary: false,
  secondary: true,
  "outline-paper": true,
  danger: true,
  ink: false,
  "ink-outline": true,
};

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-yellow text-ink hover:bg-brand-hover",
  secondary:
    "border-[1.5px] border-line-btn text-paper hover:border-text-4 hover:bg-paper/4",
  "outline-paper":
    "border-[1.5px] border-paper text-paper hover:bg-paper/6",
  danger:
    "border-[1.5px] border-line-btn text-red-light hover:border-text-4 hover:bg-red-light/6",
  ink: "bg-ink text-yellow hover:bg-surface-3",
  "ink-outline":
    "border-[1.5px] border-ink text-ink hover:bg-ink/6",
};

/** [relleno, bordeado] — el bordeado descuenta el 1.5 px del borde. */
const SIZE: Record<ButtonSize, [string, string]> = {
  lg: [
    "px-[28px] py-[17px] text-[16px] max-md:text-[15px]",
    "px-[26.5px] py-[15.5px] text-[16px] max-md:text-[15px]",
  ],
  md: ["px-[18px] py-[12px] text-[14px]", "px-[18px] py-[11px] text-[14px]"],
  header: ["px-[16px] py-[11px] text-[14px]", "px-[14.5px] py-[9.5px] text-[14px]"],
  sm: ["px-[16px] py-[12px] text-[13px]", "px-[16px] py-[10.5px] text-[13px]"],
  full: [
    "w-full px-4 py-[15px] text-[14px] max-md:text-[15px]",
    "w-full px-4 py-[13.5px] text-[14px] max-md:text-[15px]",
  ],
  "full-lg": [
    "w-full px-4 py-[19px] text-[16px] max-md:text-[15px]",
    "w-full px-4 py-[17px] text-[16px] max-md:text-[15px]",
  ],
};

export function buttonClasses({
  variant = "primary",
  size = "lg",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}): string {
  const outlined = OUTLINED[variant];
  return cx(
    "inline-flex items-center justify-center gap-2 rounded-btn text-center font-extrabold uppercase leading-[1.15] tracking-[.06em] whitespace-nowrap",
    "disabled:cursor-default disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    // header y sm son más bajos a propósito (barra del header, botones de
    // panel), pero en mobile respetan el mínimo táctil de 44 px.
    size === "header" || size === "sm"
      ? "max-md:min-h-[44px]"
      : outlined
        ? "max-md:min-h-[50px]"
        : "max-md:min-h-[52px]",
    FONT,
    TRANSITION,
    FOCUS,
    VARIANT[variant],
    SIZE[size][outlined ? 1 : 0],
    className,
  );
}

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
}

export type ButtonAsLinkProps = CommonProps & {
  href: string;
  /** Abre en otra pestaña con <a> común (WhatsApp, Mercado Pago). */
  external?: boolean;
  prefetch?: boolean;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "className" | "children">;

export type ButtonAsButtonProps = CommonProps & {
  href?: undefined;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;

export type ButtonProps = ButtonAsLinkProps | ButtonAsButtonProps;

/** Renderiza `<Link>` si recibe `href`, si no `<button>`. */
export function Button(props: ButtonProps) {
  if (props.href !== undefined) {
    const { variant, size, className, children, href, external, prefetch, ...rest } = props;
    const cls = buttonClasses({ variant, size, className });
    if (external) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={cls} {...rest}>
          {children}
        </a>
      );
    }
    return (
      <Link href={href} prefetch={prefetch} className={cls} {...rest}>
        {children}
      </Link>
    );
  }
  const { variant, size, className, children, type = "button", ...rest } = props;
  return (
    <button type={type} className={buttonClasses({ variant, size, className })} {...rest}>
      {children}
    </button>
  );
}

/**
 * Link de texto en amarillo, uppercase ("Ver catálogo →", "Escribir →",
 * "+ Agregar ítem"). `underline` para los de texto corrido ("¿Cuál es mi
 * talle?", "Me olvidé la contraseña").
 */
export function TextLink({
  href,
  children,
  tone = "yellow",
  underline,
  className,
  external,
}: {
  href: string;
  children: ReactNode;
  tone?: "yellow" | "muted" | "red-light";
  underline?: boolean;
  className?: string;
  external?: boolean;
}) {
  const cls = cx(
    FONT,
    TRANSITION,
    FOCUS,
    "rounded-[2px]",
    underline
      ? "text-[14px] font-semibold underline underline-offset-2"
      : "text-[14px] font-bold uppercase tracking-[.08em]",
    tone === "yellow" && "text-yellow hover:text-brand-hover",
    tone === "muted" && "text-text-3 hover:text-paper",
    tone === "red-light" && "text-red-light",
    className,
  );
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}
