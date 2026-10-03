"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ADMIN_NAV,
  AdminMobileHeader,
  AdminSidebar,
  type AdminSection,
} from "@/components/bt/admin";
import { cx } from "@/components/bt/cx";
import { FOCUS, TRANSITION } from "@/components/bt/styles";
import { logout } from "@/lib/server/actions/session";

/** Secciones del sidebar → ruta del panel. */
export const ADMIN_HREFS: Record<AdminSection, string> = {
  resumen: "/admin",
  pedidos: "/admin/pedidos",
  turnos: "/admin/turnos",
  presupuestos: "/admin/presupuestos",
  productos: "/admin/productos",
  clientes: "/admin/clientes",
  ajustes: "/admin/ajustes",
};

/** Sección activa por la URL (/admin exacto = Resumen). */
function activeSection(pathname: string): AdminSection {
  const hit = ADMIN_NAV.filter((n) => n.key !== "resumen").find(
    (n) => pathname === ADMIN_HREFS[n.key] || pathname.startsWith(`${ADMIN_HREFS[n.key]}/`),
  );
  return hit?.key ?? "resumen";
}

/** "Salir": cierra la sesión del PIN (server action) y vuelve al login. */
function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className={cx(
          "w-full rounded-btn border-t border-line p-3 text-left text-[13px] font-bold uppercase tracking-[.06em] text-text-3 hover:text-red-light",
          TRANSITION,
          FOCUS,
        )}
      >
        Salir
      </button>
    </form>
  );
}

export interface AdminNavProps {
  counts: Partial<Record<AdminSection, number | string>>;
  storeHref: string;
}

/** Sidebar desktop (≥ lg): isla cliente solo para marcar la sección activa. */
export function AdminDesktopNav({ counts, storeHref }: AdminNavProps) {
  const pathname = usePathname() ?? "/admin";
  return (
    <AdminSidebar
      className="sticky top-0 max-lg:hidden lg:h-dvh"
      active={activeSection(pathname)}
      hrefs={ADMIN_HREFS}
      counts={counts}
      storeHref={storeHref}
      footer={<LogoutButton />}
    />
  );
}

/** Header mobile (< lg, 4h/4i) con el sidebar desplegable. */
export function AdminMobileNav({ counts, storeHref }: AdminNavProps) {
  const pathname = usePathname() ?? "/admin";
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <AdminMobileHeader
        homeHref={ADMIN_HREFS.resumen}
        menu={
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className={cx(
              "flex h-11 flex-none items-center rounded-btn border border-line-strong px-[14px] text-[13px] font-extrabold uppercase hover:border-text-4",
              TRANSITION,
              FOCUS,
            )}
          >
            {open ? "Cerrar" : "Menú"}
          </button>
        }
      />
      {open && (
        <div
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("a")) setOpen(false);
          }}
        >
          <AdminSidebar
            className="border-b max-lg:h-auto max-lg:w-full"
            active={activeSection(pathname)}
            hrefs={ADMIN_HREFS}
            counts={counts}
            storeHref={storeHref}
            footer={<LogoutButton />}
          />
        </div>
      )}
    </div>
  );
}
