import Link from "next/link";
import { BrandLockup } from "./brand";
import { buttonClasses } from "./button";
import { cx } from "./cx";
import { SearchInput } from "./field";
import { FOCUS, FONT, TRANSITION } from "./styles";

/** Ítems de la nav de la tienda, en el orden exacto que pidió el cliente. */
export type StoreNavKey =
  | "bicicletas"
  | "accesorios"
  | "repuestos"
  | "importados"
  | "taller"
  | "presupuesto"
  | "turnos";

export const STORE_NAV: { key: StoreNavKey; label: string }[] = [
  { key: "bicicletas", label: "Bicicletas" },
  { key: "accesorios", label: "Accesorios" },
  { key: "repuestos", label: "Repuestos" },
  { key: "importados", label: "Productos importados" },
  /** El taller (reparaciones): con acento rojo (Tag) en header y menú mobile. */
  { key: "taller", label: "Taller" },
  { key: "presupuesto", label: "Pedir presupuesto" },
  { key: "turnos", label: "Sacar turno" },
];

/** Rutas que conecta B2. Las cuatro primeras van al catálogo filtrado. */
export interface StoreHrefs {
  home: string;
  cart: string;
  account: string;
  /** Acción del buscador (GET con `q`). */
  search: string;
  /** `taller` es opcional: sin él (módulo apagado) no se muestra el ítem. */
  nav: Record<Exclude<StoreNavKey, "taller">, string> & { taller?: string };
}

export interface HeaderProps {
  hrefs: StoreHrefs;
  /** Ítem activo de la nav ("" o undefined = ninguno). */
  active?: StoreNavKey | "";
  /** Cantidad de ítems del carrito. */
  cart?: number;
  /** "Cuenta" o el nombre del cliente logueado. */
  account?: string;
  searchPlaceholder?: string;
  searchDefault?: string;
  className?: string;
}

/**
 * Header desktop de la tienda (Header.dc.html), 2 filas ≈ 135 px.
 * Fila 1 (16×56, gap 28): logo 52 + wordmark 30 → buscador 360 → cuenta →
 * "Carrito · N" amarillo. Fila 2: nav 700 15 @85 % uppercase .06em, gap 36,
 * borde superior #2b2824; activo amarillo con borde inferior 2 px;
 * "Sacar turno" siempre amarillo; "Taller" (sin diseño en el handoff) va
 * como Tag rojo, el acento del taller en toda la tienda.
 *
 * Es solo desktop: B2 lo muestra desde `lg` y usa <MobileHeader> debajo.
 */
export function Header({
  hrefs,
  active = "",
  cart = 0,
  account = "Cuenta",
  searchPlaceholder = "Buscar bici, accesorio, repuesto…",
  searchDefault,
  className,
}: HeaderProps) {
  return (
    <header
      className={cx(
        "flex flex-col whitespace-nowrap border-b border-line bg-ink text-paper",
        FONT,
        className,
      )}
    >
      <div className="flex items-center gap-7 px-14 py-4">
        <BrandLockup href={hrefs.home} logoSize={52} wordmarkSize="header" gap="gap-3" className="flex-none" />
        <div className="flex-1" />
        <SearchInput
          action={hrefs.search}
          placeholder={searchPlaceholder}
          defaultValue={searchDefault}
          label="Buscar en la tienda"
          className="w-[360px] shrink"
        />
        <Link
          href={hrefs.account}
          className={cx(
            "rounded-[2px] text-[14px] font-bold uppercase tracking-[.06em] hover:text-yellow",
            TRANSITION,
            FOCUS,
          )}
        >
          {account}
        </Link>
        <Link
          href={hrefs.cart}
          className={buttonClasses({ variant: "primary", size: "header" })}
          aria-label={`Carrito, ${cart} ${cart === 1 ? "producto" : "productos"}`}
        >
          Carrito · {cart}
        </Link>
      </div>
      <nav
        aria-label="Principal"
        className="flex gap-9 overflow-x-auto border-t border-line px-14 text-[15px] font-bold uppercase tracking-[.06em] stretch-85 [scrollbar-width:none]"
      >
        {STORE_NAV.map((n) => {
          const href = hrefs.nav[n.key];
          if (!href) return null;
          const on = active === n.key;
          const taller = n.key === "taller";
          return (
            <Link
              key={n.key}
              href={href}
              aria-current={on ? "page" : undefined}
              className={cx(
                "border-b-2 pt-[14px] pb-3",
                on ? "border-yellow" : "border-transparent",
                on || n.key === "turnos" ? "text-yellow" : "text-paper hover:text-yellow",
                taller && "group flex items-center",
                TRANSITION,
                "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-yellow",
              )}
            >
              {taller ? (
                <span
                  className={cx(
                    "-my-1 rounded-tag px-2 py-1 text-white",
                    on ? "bg-red" : "bg-red group-hover:bg-card-transfer",
                    TRANSITION,
                  )}
                >
                  {n.label}
                </span>
              ) : (
                n.label
              )}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
