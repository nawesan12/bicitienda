import type { Metadata } from "next";
import { AdminShell } from "@/components/bt/admin";
import { ConfirmProvider } from "@/components/admin/confirm";
import {
  AdminDesktopNav,
  AdminMobileNav,
  type AdminNavCounts,
  type PanelSection,
} from "@/components/admin/bt-admin-nav";
import { ToastProvider } from "@/components/admin/toast";
import { features } from "@/lib/features";
import { getAdminNavCounts } from "@/lib/server/admin-queries";
import { appointmentsThisWeek } from "@/lib/server/screens/admin-d2";

export const metadata: Metadata = {
  title: {
    default: "Panel",
    template: "%s · Panel",
  },
  robots: { index: false, follow: false },
};

/**
 * El panel es SIEMPRE dinámico: lee la base en cada request. Sin esto,
 * Next lo prerendearía en el build y el dueño vería datos congelados del
 * momento del deploy.
 */
export const dynamic = "force-dynamic";

/** Contador vacío en 0 (el sidebar no muestra "0"). */
const nz = (n: number) => (n > 0 ? n : undefined);

/**
 * Shell del admin de BiciTienda (sistema bt, AdminSidebar.dc.html):
 * sidebar 240 px con Resumen · Pedidos · Turnos · Presupuestos ·
 * Productos · Clientes · Consultas · Ajustes (sin Usuarios: se entra con
 * PIN) y "Salir"; en mobile, AdminMobileHeader con el menú del admin.
 * Cada página arma su AdminTopBar. /admin/ingresar queda afuera del
 * route group, por eso este layout nunca lo envuelve.
 *
 * Contadores: Pedidos = para accionar (cobrar, armar, entregar) · Turnos
 * = activos de la semana · Presupuestos = nuevos · Productos = total ·
 * Consultas = sin atender.
 */
export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const [c, week] = await Promise.all([
    getAdminNavCounts(),
    features.appointments ? appointmentsThisWeek() : Promise.resolve(0),
  ]);
  const counts: AdminNavCounts = {
    pedidos: nz(c.ordersToAct),
    turnos: nz(week),
    presupuestos: features.quotes ? nz(c.quotesNew) : undefined,
    productos: nz(c.products),
    consultas: nz(c.leads),
  };
  const hidden: PanelSection[] = [
    ...(features.appointments ? [] : (["turnos"] as const)),
    ...(features.quotes ? [] : (["presupuestos"] as const)),
  ];

  return (
    <ConfirmProvider>
      <ToastProvider>
        <AdminMobileNav counts={counts} storeHref="/" hidden={hidden} />
        <AdminShell
          className="max-lg:block max-lg:min-h-0"
          sidebar={<AdminDesktopNav counts={counts} storeHref="/" hidden={hidden} />}
        >
          <main className="flex min-w-0 flex-1 flex-col">{children}</main>
        </AdminShell>
      </ToastProvider>
    </ConfirmProvider>
  );
}
