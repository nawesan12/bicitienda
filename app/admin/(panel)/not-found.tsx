import { AdminTopBar } from "@/components/bt/admin";
import { Button } from "@/components/bt/button";
import { EmptyState } from "@/components/bt/empty-state";

/**
 * 404 dentro del panel (sin diseño en el handoff): un pedido o producto
 * que no existe, una sección apagada por flag o un path desconocido bajo
 * /admin (ver [...falta]). Mantiene el sidebar y lleva al Resumen.
 */
export default function AdminNotFound() {
  return (
    <>
      <AdminTopBar className="max-lg:hidden" title="No encontrado" />
      <div className="px-4 py-8 md:px-10 md:py-10">
        <EmptyState
          eyebrow="Error 404"
          title="Esto no está en el panel."
          description="El pedido, producto o sección que buscás no existe o cambió de lugar."
          action={
            <Button href="/admin" size="md">
              Ir al Resumen
            </Button>
          }
        />
      </div>
    </>
  );
}
