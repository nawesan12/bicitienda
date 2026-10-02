import Link from "next/link";
import { Button } from "./button";
import { cx } from "./cx";
import { STORE_NAV, type StoreHrefs, type StoreNavKey } from "./header";
import { FOCUS, FONT, TRANSITION } from "./styles";

export interface MobileMenuProps {
  hrefs: StoreHrefs;
  active?: StoreNavKey | "";
  /** "Mi cuenta" o el nombre del cliente. */
  accountLabel?: string;
  /** Línea de contacto: "WhatsApp … · Horarios …". */
  info?: string;
  className?: string;
  id?: string;
}

/**
 * Menú mobile abierto (5c). Lista de categorías: filas min-h 64, Archivo
 * 900 30 @70 % uppercase, "→" 700 18 #8d867a, divisor #2b2824. Debajo,
 * "Sacar turno" amarillo y "Pedir presupuesto" con borde paper (min-h 52).
 * Pie: "Mi cuenta" (min-h 44) + línea de WhatsApp/horarios.
 */
export function MobileMenu({
  hrefs,
  active = "",
  accountLabel = "Mi cuenta",
  info,
  className,
  id,
}: MobileMenuProps) {
  const categories = STORE_NAV.slice(0, 4);
  return (
    <div id={id} className={cx("flex flex-col bg-ink text-paper", FONT, className)}>
      <nav aria-label="Categorías" className="flex flex-col px-4 pt-2">
        {categories.map((n) => (
          <Link
            key={n.key}
            href={hrefs.nav[n.key]}
            aria-current={active === n.key ? "page" : undefined}
            className={cx(
              "flex min-h-16 items-center justify-between border-b border-line text-[30px] font-black uppercase leading-none stretch-70",
              active === n.key ? "text-yellow" : "text-paper hover:text-yellow",
              TRANSITION,
              "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-yellow",
            )}
          >
            {n.label}
            <span aria-hidden className="text-[18px] font-bold text-text-3 stretch-100">
              →
            </span>
          </Link>
        ))}
      </nav>
      <div className="flex flex-col gap-[10px] px-4 py-5">
        <Button href={hrefs.nav.turnos} variant="primary" size="full" className="min-h-[52px]">
          Sacar turno
        </Button>
        <Button href={hrefs.nav.presupuesto} variant="outline-paper" size="full" className="min-h-[52px]">
          Pedir presupuesto
        </Button>
      </div>
      <div className="flex flex-col gap-[6px] border-t border-line px-4 pt-3 pb-7">
        <Link
          href={hrefs.account}
          className={cx(
            "flex min-h-11 items-center self-start rounded-[2px] text-[15px] font-bold uppercase tracking-[.06em] hover:text-yellow",
            TRANSITION,
            FOCUS,
          )}
        >
          {accountLabel}
        </Link>
        {info && <span className="text-[14px] leading-[1.5] text-text-3">{info}</span>}
      </div>
    </div>
  );
}
