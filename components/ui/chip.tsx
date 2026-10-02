import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Pastilla de filtro / categoría. Activo = negro sólido; inactivo = borde.
 * radius 16px según el prototipo.
 */
export function Chip({
  active = false,
  href,
  onClick,
  className,
  children,
}: {
  active?: boolean;
  href?: string;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  const classes = cn(
    "inline-flex shrink-0 items-center gap-[6px] rounded-[16px] px-[14px] py-[7px]",
    "text-[11.5px] font-semibold leading-none whitespace-nowrap transition-colors",
    active
      ? "bg-ink text-white"
      : "border border-line-3 bg-white text-text-2 hover:border-ink hover:text-ink",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={classes}>
      {children}
    </button>
  );
}
