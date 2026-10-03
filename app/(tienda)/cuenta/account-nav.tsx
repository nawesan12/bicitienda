import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "@/components/bt/cx";
import { FOCUS, FONT, TRANSITION } from "@/components/bt/styles";

/* ── AccountNav (2g, nav vertical de Mi cuenta) ───────────────
   Ítems 13×16, radio 6, Archivo 15 uppercase .06em: activo amarillo
   800; resto paper 700. `footer` va al final ("Cerrar sesión", 700
   #8d867a). En mobile se usa SegmentedControl.
   ──────────────────────────────────────────────────────────── */

export interface AccountNavItem {
  label: ReactNode;
  href: string;
  active?: boolean;
}

/** Clases de un ítem (para el botón "Cerrar sesión" del footer). */
export const ACCOUNT_NAV_ITEM =
  "block w-full rounded-btn px-4 py-[13px] text-left text-[15px] uppercase tracking-[.06em]";

export function AccountNav({
  items,
  footer,
  className,
}: {
  items: AccountNavItem[];
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <nav aria-label="Mi cuenta" className={cx("flex flex-col gap-1", FONT, className)}>
      {items.map((it, i) => (
        <Link
          key={i}
          href={it.href}
          aria-current={it.active ? "page" : undefined}
          className={cx(
            ACCOUNT_NAV_ITEM,
            TRANSITION,
            FOCUS,
            it.active ? "bg-yellow font-extrabold text-ink" : "font-bold text-paper hover:bg-paper/4",
          )}
        >
          {it.label}
        </Link>
      ))}
      {footer}
    </nav>
  );
}
