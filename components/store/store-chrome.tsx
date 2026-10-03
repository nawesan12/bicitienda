"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Header, type StoreHrefs, type StoreNavKey } from "@/components/bt/header";
import { MobileHeader } from "@/components/bt/mobile-header";
import { useCartCount } from "@/lib/cart-store";
import { getMyAccount } from "@/lib/server/actions/account";

export interface StoreChromeProps {
  hrefs: StoreHrefs;
  /** Path → ítem del nav (categorías y sus tipos → su grupo). */
  activeByPath: Record<string, StoreNavKey>;
  /** Línea de WhatsApp/horarios del menú mobile. */
  menuInfo: string;
  /** features.accounts: si está apagado no se consulta la sesión. */
  accounts: boolean;
  /** Prefijo de las rutas de cuenta (/cuenta): ahí se revalida la sesión. */
  accountPrefix: string;
}

/** Ítem activo del nav según la URL (match exacto o por prefijo). */
function activeFor(pathname: string, hrefs: StoreHrefs, byPath: Record<string, StoreNavKey>): StoreNavKey | "" {
  if (byPath[pathname]) return byPath[pathname];
  for (const [key, href] of Object.entries(hrefs.nav) as [StoreNavKey, string][]) {
    if (pathname === href || pathname.startsWith(`${href}/`)) return key;
  }
  return "";
}

/**
 * Isla cliente del header de la tienda (Header desde `lg`, MobileHeader
 * debajo). Así el layout sigue estático/ISR: el contador del carrito sale
 * del store local (zustand + localStorage) y el nombre de la cuenta de la
 * server action getMyAccount(), pedida al montar y al entrar a /cuenta/*
 * (login, registro, logout cambian la sesión ahí).
 */
export function StoreChrome({ hrefs, activeByPath, menuInfo, accounts, accountPrefix }: StoreChromeProps) {
  const pathname = usePathname() ?? "/";
  const cart = useCartCount();
  const [name, setName] = useState<string | null>(null);
  const inAccount = pathname === accountPrefix || pathname.startsWith(`${accountPrefix}/`);
  // Fuera de /cuenta la clave no cambia: no se vuelve a pedir la sesión.
  const sessionKey = inAccount ? pathname : "";

  useEffect(() => {
    if (!accounts) return;
    let alive = true;
    getMyAccount()
      .then((a) => {
        if (alive) setName(a ? a.name.trim().split(/\s+/)[0] : null);
      })
      .catch(() => {
        /* sin sesión: queda "Cuenta" */
      });
    return () => {
      alive = false;
    };
    // Se revalida al montar y en cada pantalla de /cuenta/*.
  }, [accounts, sessionKey]);

  const active = activeFor(pathname, hrefs, activeByPath);

  return (
    <>
      <Header className="max-lg:hidden" hrefs={hrefs} active={active} cart={cart} account={name ?? "Cuenta"} />
      <MobileHeader
        className="lg:hidden"
        hrefs={hrefs}
        active={active}
        cart={cart}
        accountLabel={name ?? "Mi cuenta"}
        menuInfo={menuInfo}
      />
    </>
  );
}
