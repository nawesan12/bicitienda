import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminTopBar } from "@/components/bt";
import { BackLink } from "@/components/bt/admin-d1/common";
import { getOrderDetail } from "@/lib/server/screens/admin-d1";
import { OrderDetailPanel } from "../order-detail";

export const metadata: Metadata = { title: "Pedido" };

/**
 * 4i · Detalle del pedido (mobile). En desktop muestra el mismo panel de
 * 3a con su barra y "← Pedidos" (el listado con `?sel=` es la vista
 * principal).
 */
export default async function AdminOrderPage({ params }: { params: Promise<{ numero: string }> }) {
  const { numero } = await params;
  const order = await getOrderDetail(decodeURIComponent(numero));
  if (!order) notFound();

  return (
    <>
      <AdminTopBar
        className="max-lg:hidden"
        title={`Pedido #${order.number}`}
        back={{ href: `/admin/pedidos?sel=${order.number}`, label: "Pedidos" }}
      />
      <div className="flex flex-col gap-4 px-4 pb-7 pt-[18px] lg:max-w-[520px] lg:px-10 lg:pb-10 lg:pt-7">
        <BackLink href="/admin/pedidos" className="lg:hidden">
          Pedidos
        </BackLink>
        <OrderDetailPanel order={order} variant="page" />
      </div>
    </>
  );
}
