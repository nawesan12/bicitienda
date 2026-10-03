"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminMobileHeader, ADMIN_NAV, type AdminSection } from "@/components/bt/admin";
import { BrandLockup } from "@/components/bt/brand";
import { cx } from "@/components/bt/cx";
import { FOCUS, FONT, MONO, TRANSITION } from "@/components/bt/styles";
import { logout } from "@/lib/server/actions/session";

/**
 * Navegación del panel (AdminSidebar.dc.html + menú mobile propio).
 *
 * Suma "Consultas" a las secciones del bt (ahí caen los leads de los
 * botones de WhatsApp y el aviso de pago tardío), entre Clientes y
 * Ajustes. Las secciones heredadas del starter (comunidad, contenido,
 * nosotros, novedades, sucursales, test, stock) siguen existiendo como
 * rutas pero no se enlazan.
 *
 * El sidebar replica los estilos de `AdminSidebar` (bt) porque ese
 * componente tiene la lista de secciones fija.
 */

export type PanelSection = AdminSection | "consultas";

/** Secciones del panel → ruta. */
export const ADMIN_HREFS: Record<PanelSection, string> = {
  resumen: "/admin",
  pedidos: "/admin/pedidos",
  turnos: "/admin/turnos",
  presupuestos: "/admin/presupuestos",
  productos: "/admin/productos",
  clientes: "/admin/clientes",
  consultas: "/admin/consultas",
  ajustes: "/admin/ajustes",
};

const label = (k: AdminSection) => ADMIN_NAV.find((n) => n.key === k)?.label ?? k;

const PANEL_NAV: { key: PanelSection; label: string }[] = [
  ...(["resumen", "pedidos", "turnos", "presupuestos", "productos", "clientes"] as const).map((k) => ({
    key: k,
    label: label(k),
  })),
  { key: "consultas", label: "Consultas" },
  { key: "ajustes", label: label("ajustes") },
];

export type AdminNavCounts = Partial<Record<PanelSection, number | string>>;

export interface AdminNavProps {
  counts: AdminNavCounts;
  storeHref: string;
  /** Secciones apagadas por feature flag (no se muestran). */
  hidden?: PanelSection[];
}

/** Sección activa por la URL (/admin exacto = Resumen). */
function activeSection(pathname: string): PanelSection {
  const hit = PANEL_NAV.filter((n) => n.key !== "resumen").find(
    (n) => pathname === ADMIN_HREFS[n.key] || pathname.startsWith(`${ADMIN_HREFS[n.key]}/`),
  );
  return hit?.key ?? "resumen";
}

function visible(hidden: PanelSection[] = []) {
  return PANEL_NAV.filter((n) => !hidden.includes(n.key));
}

const hasCount = (c: number | string | undefined) => c !== undefined && c !== "" && c !== 0;

/** "Salir": cierra la sesión del PIN (server action) y vuelve al login. */
function LogoutButton({ className }: { className?: string }) {
  return (
    <form action={logout}>
      <button
        type="submit"
        className={cx(
          "w-full rounded-btn p-3 text-left text-[13px] font-bold uppercase tracking-[.06em] text-text-3 hover:text-red-light",
          TRANSITION,
          FOCUS,
          className,
        )}
      >
        Salir
      </button>
    </form>
  );
}

/** Sidebar desktop (≥ lg), 240 px: mismo lenguaje que `AdminSidebar`. */
export function AdminDesktopNav({ counts, storeHref, hidden }: AdminNavProps) {
  const active = activeSection(usePathname() ?? "/admin");
  return (
    <div className="border-r border-line bg-ink-deep max-lg:hidden">
    <aside
      className={cx(
        "sticky top-0 box-border flex h-dvh w-[239px] flex-none flex-col gap-1 overflow-y-auto px-[18px] py-7 text-paper",
        FONT,
      )}
    >
      <BrandLockup
        href={ADMIN_HREFS.resumen}
        logoSize={40}
        wordmarkSize="sidebar"
        gap="gap-[10px]"
        className="flex-none px-2 pb-7"
      />
      <nav aria-label="Admin" className="flex flex-col gap-1">
        {visible(hidden).map((n) => {
          const on = n.key === active;
          const count = counts[n.key];
          return (
            <Link
              key={n.key}
              href={ADMIN_HREFS[n.key]}
              aria-current={on ? "page" : undefined}
              className={cx(
                "flex items-center justify-between rounded-btn p-3 text-[14px] font-bold uppercase tracking-[.06em]",
                on ? "bg-yellow text-ink" : "text-text-2 hover:bg-paper/4 hover:text-paper",
                TRANSITION,
                FOCUS,
              )}
            >
              {n.label}
              {hasCount(count) && (
                <span className={cx("text-[12px] font-semibold tracking-normal", MONO)}>{count}</span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="flex-1" />
      <a
        href={storeHref}
        target="_blank"
        rel="noopener noreferrer"
        className={cx(
          "rounded-btn p-3 text-[13px] font-bold uppercase tracking-[.06em] text-text-3 hover:text-yellow",
          TRANSITION,
          FOCUS,
        )}
      >
        Ver tienda ↗
      </a>
      <div className="border-t border-line pt-1">
        <LogoutButton />
      </div>
    </aside>
    </div>
  );
}

/**
 * Header mobile (< lg, 4h/4i) + menú del admin. El prototipo no lo dibuja:
 * se arma con el lenguaje del menú de la tienda (5c). Filas de 60 px con
 * la sección en Archivo 900 28 @70 % uppercase y el contador en una pill
 * mono; la activa va en amarillo con la barra inset de la fila
 * seleccionada. Abajo, "Ver tienda ↗" y "Salir".
 */
export function AdminMobileNav({ counts, storeHref, hidden }: AdminNavProps) {
  const pathname = usePathname() ?? "/admin";
  const active = activeSection(pathname);
  // El menú queda abierto solo en la ruta donde se abrió: al navegar se cierra.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname;
  const setOpen = (v: boolean) => setOpenAt(v ? pathname : null);

  // Bloquear el scroll de la página con el menú abierto (Esc cierra).
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenAt(null);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="sticky top-0 z-40 lg:hidden">
      <AdminMobileHeader
        homeHref={ADMIN_HREFS.resumen}
        label={open ? "Menú" : (PANEL_NAV.find((n) => n.key === active)?.label ?? "Mostrador")}
        menu={
          <button
            type="button"
            aria-expanded={open}
            aria-controls="admin-mobile-menu"
            onClick={() => setOpen(!open)}
            className={cx(
              "flex h-11 flex-none items-center rounded-btn px-[14px] text-[13px] font-extrabold uppercase",
              open ? "bg-paper text-ink" : "border border-line-strong hover:border-text-4",
              TRANSITION,
              FOCUS,
            )}
          >
            {open ? "Cerrar ✕" : "Menú"}
          </button>
        }
      />
      {open && (
        <div
          id="admin-mobile-menu"
          className={cx(
            "fixed inset-x-0 top-[69px] bottom-0 flex flex-col overflow-y-auto bg-ink-deep text-paper",
            FONT,
          )}
        >
          <nav aria-label="Admin" className="flex flex-col px-4 pt-2">
            {visible(hidden).map((n) => {
              const on = n.key === active;
              const count = counts[n.key];
              return (
                <Link
                  key={n.key}
                  href={ADMIN_HREFS[n.key]}
                  aria-current={on ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className={cx(
                    "flex min-h-[60px] items-center justify-between gap-3 border-b border-line text-[28px] font-black uppercase leading-none stretch-70",
                    on ? "text-yellow" : "text-paper hover:text-yellow",
                    TRANSITION,
                    FOCUS,
                  )}
                >
                  <span className="flex items-center gap-3">
                    {on && <span aria-hidden className="h-6 w-[3px] rounded-full bg-yellow" />}
                    {n.label}
                  </span>
                  {hasCount(count) ? (
                    <span
                      className={cx(
                        "rounded-pill px-[10px] py-1 text-[13px] font-semibold leading-none tracking-normal",
                        on ? "bg-yellow text-ink" : "border border-line-strong text-text-2",
                        MONO,
                      )}
                    >
                      {count}
                    </span>
                  ) : (
                    <span aria-hidden className="text-[18px] font-bold text-text-3">
                      →
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto flex flex-col gap-1 border-t border-line px-4 pt-3 pb-7">
            <a
              href={storeHref}
              target="_blank"
              rel="noopener noreferrer"
              className={cx(
                "flex min-h-11 items-center rounded-btn px-3 text-[15px] font-bold uppercase tracking-[.06em] text-text-2 hover:text-yellow",
                TRANSITION,
                FOCUS,
              )}
            >
              Ver tienda ↗
            </a>
            <LogoutButton className="min-h-11 text-[15px]" />
          </div>
        </div>
      )}
    </div>
  );
}
