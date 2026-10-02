import Link from "next/link";
import { cn } from "@/lib/cn";

export type ButtonVariant =
  | "primary"
  | "dark"
  | "outline"
  | "tertiary"
  | "success"
  | "danger"
  | "ghost";

export type ButtonSize = "sm" | "md" | "lg";

/** Los cuatro botones del prototipo, más las variantes semánticas. */
const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white",
  dark: "bg-ink text-white",
  outline: "border-[1.5px] border-ink text-ink",
  tertiary: "border border-line-3 text-body bg-white",
  success: "border-[1.5px] border-success text-success",
  danger: "border-[1.5px] border-danger-line text-danger",
  ghost: "text-ink",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "px-[13px] py-[7px] text-[10.5px] tracking-[.04em] rounded-[5px]",
  md: "px-[16px] py-[13px] text-[12px] tracking-[.05em] rounded-[6px]",
  lg: "px-[26px] py-[16px] text-[14px] tracking-[.08em] rounded-[6px]",
};

interface BaseProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: React.ReactNode;
}

type ButtonProps = BaseProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;

type LinkProps = BaseProps & { href: string; prefetch?: boolean };

function classesFor(
  variant: ButtonVariant,
  size: ButtonSize,
  className?: string,
) {
  return cn(
    "inline-flex items-center justify-center gap-2 font-bold uppercase leading-none",
    "transition-[filter,background-color,border-color] duration-150",
    "disabled:opacity-40 disabled:pointer-events-none",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button className={classesFor(variant, size, className)} {...rest}>
      {children}
    </button>
  );
}

/** Misma apariencia que Button pero navega. Para CTAs que son links. */
export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  href,
  children,
  ...rest
}: LinkProps) {
  return (
    <Link href={href} className={classesFor(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}
