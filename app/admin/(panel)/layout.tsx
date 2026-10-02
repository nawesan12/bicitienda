import type { Metadata } from "next";
import { ConfirmProvider } from "@/components/admin/confirm";
import { AdminHeader, AdminNav } from "@/components/admin/sidebar";
import { ToastProvider } from "@/components/admin/toast";
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
 * Next lo prerendearía en el build (ninguna página toca cookies() en el
 * render) y el dueño vería datos congelados del momento del deploy.
 */
export const dynamic = "force-dynamic";

/**
 * Shell del panel, fiel al prototipo del admin: navegación night (sidebar
 * o topbar), main sobre crema con el rayado diagonal sutil y el encabezado
 * de la sección con "Guardado automático activo". /admin/ingresar queda
 * afuera del route group, por eso este layout nunca lo envuelve.
 */
export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const counts = await getAdminNavCounts();

  return (
    <ConfirmProvider>
      <ToastProvider>
        <div
          className="flex min-h-screen flex-wrap bg-cream-2 text-ink"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-45deg, rgba(21,23,15,.022) 0 14px, transparent 14px 28px)",
          }}
        >
          <AdminNav counts={counts} />
          <main className="box-border min-w-[min(560px,100%)] flex-1 p-[clamp(20px,3.5vw,44px)]">
            <AdminHeader />
            {children}
          </main>
        </div>
      </ToastProvider>
    </ConfirmProvider>
  );
}
