import type { Metadata } from "next";
import { AdminShell } from "@/components/bt/admin";
import { ConfirmProvider } from "@/components/admin/confirm";
import { AdminDesktopNav, AdminMobileNav } from "@/components/admin/bt-admin-nav";
import { ToastProvider } from "@/components/admin/toast";
import { features } from "@/lib/features";
import { getAdminNavCounts } from "@/lib/server/admin-queries";

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
 * Productos · Clientes · Ajustes (sin Usuarios: se entra con PIN) y
 * "Salir"; en mobile, AdminMobileHeader con el menú desplegable. Cada
 * página arma su AdminTopBar. /admin/ingresar queda afuera del route
 * group, por eso este layout nunca lo envuelve.
 */
export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const c = await getAdminNavCounts();
  const counts = {
    pedidos: nz(c.ordersToAct),
    turnos: features.appointments ? nz(c.appointmentsToday) : undefined,
    presupuestos: features.quotes ? nz(c.quotesNew) : undefined,
    productos: nz(c.products),
  };

  return (
    <ConfirmProvider>
      <ToastProvider>
        <AdminMobileNav counts={counts} storeHref="/" />
        <AdminShell
          className="max-lg:block max-lg:min-h-0"
          sidebar={<AdminDesktopNav counts={counts} storeHref="/" />}
        >
          <main className="flex min-w-0 flex-1 flex-col">{children}</main>
        </AdminShell>
      </ToastProvider>
    </ConfirmProvider>
  );
}
