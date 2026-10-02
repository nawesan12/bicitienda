"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { BrandLockup } from "./brand";
import { cx } from "./cx";
import { SearchInput } from "./field";
import type { StoreHrefs, StoreNavKey } from "./header";
import { MobileMenu } from "./mobile-menu";
import { FOCUS, FONT } from "./styles";

export interface MobileHeaderProps {
  hrefs: StoreHrefs;
  cart?: number;
  active?: StoreNavKey | "";
  /** Fila de búsqueda debajo (se oculta con el menú abierto). */
  showSearch?: boolean;
  searchPlaceholder?: string;
  /** Controlado. */
  open?: boolean;
  /** No controlado. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Para el menú: "Mi cuenta" o el nombre del cliente. */
  accountLabel?: string;
  /** Línea de WhatsApp/horarios del pie del menú. */
  menuInfo?: string;
  /**
   * "overlay" (default): el menú cubre el resto de la pantalla debajo del
   * header. "inline": se renderiza en el flujo (vistas de muestra).
   */
  menuMode?: "overlay" | "inline";
  /** Bloquea el scroll del body con el menú abierto (default true). */
  lockScroll?: boolean;
  className?: string;
}

/**
 * Header mobile (MobileHeader.dc.html). Fila 12×16 gap 10: logo 36 +
 * wordmark 19 @68 % → "Carrito · N" amarillo (44 alto, 800 12 px .04em)
 * → hamburguesa 44×44 con borde #3a362f. Abierto: el botón pasa a ✕
 * sobre paper, se oculta la búsqueda y aparece <MobileMenu> (5c) debajo,
 * ocupando el resto de la pantalla.
 */
export function MobileHeader({
  hrefs,
  cart = 0,
  active = "",
  showSearch = true,
  searchPlaceholder = "Buscar bici, casco, repuesto…",
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  accountLabel,
  menuInfo,
  menuMode = "overlay",
  lockScroll = true,
  className,
}: MobileHeaderProps) {
  const [inner, setInner] = useState(defaultOpen);
  const open = openProp ?? inner;
  const menuId = useId();

  const setOpen = (next: boolean) => {
    if (openProp === undefined) setInner(next);
    onOpenChange?.(next);
  };

  // Con el menú abierto: Escape cierra y el fondo no scrollea.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (openProp === undefined) setInner(false);
        onOpenChange?.(false);
      }
    };
    const prev = document.body.style.overflow;
    if (lockScroll) document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      if (lockScroll) document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, openProp, onOpenChange, lockScroll]);

  return (
    <header
      className={cx("relative flex flex-col border-b border-line bg-ink text-paper", FONT, className)}
    >
      <div className="flex items-center gap-[10px] px-4 py-3">
        <BrandLockup
          href={hrefs.home}
          logoSize={36}
          wordmarkSize="mobile"
          gap="gap-2"
          className="min-w-0 flex-1"
        />
        <Link
          href={hrefs.cart}
          aria-label={`Carrito, ${cart} ${cart === 1 ? "producto" : "productos"}`}
          className={cx(
            "flex h-11 flex-none items-center whitespace-nowrap rounded-btn bg-yellow px-3 text-[12px] font-extrabold uppercase tracking-[.04em] text-ink",
            FOCUS,
          )}
        >
          Carrito · {cart}
        </Link>
        <button
          type="button"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen(!open)}
          className={cx(
            "box-border flex size-11 flex-none items-center justify-center rounded-btn",
            open
              ? "bg-paper text-[22px] font-bold leading-none text-ink"
              : "flex-col gap-1 border border-line-strong",
            FOCUS,
          )}
        >
          {open ? (
            "✕"
          ) : (
            <>
              <span className="h-[2px] w-[18px] bg-paper" />
              <span className="h-[2px] w-[18px] bg-paper" />
              <span className="h-[2px] w-[18px] bg-paper" />
            </>
          )}
        </button>
      </div>

      {showSearch && !open && (
        <div className="px-4 pb-3">
          <SearchInput action={hrefs.search} placeholder={searchPlaceholder} size="lg" label="Buscar en la tienda" />
        </div>
      )}

      {open && (
        <div
          className={
            menuMode === "overlay"
              ? "absolute inset-x-0 top-full z-50 h-[calc(100dvh-69px)] overflow-y-auto bg-ink"
              : "border-t border-line"
          }
          onClick={(e) => {
            // Cierra al navegar desde un link del menú.
            if ((e.target as HTMLElement).closest("a")) setOpen(false);
          }}
        >
          <MobileMenu id={menuId} hrefs={hrefs} active={active} accountLabel={accountLabel} info={menuInfo} />
        </div>
      )}
    </header>
  );
}
