import type { Metadata } from "next";
import { getAdminOrders } from "@/lib/server/admin-queries";
import { STATUS_LABELS } from "@/lib/server/order-queries";
import { OrdersList } from "./orders-list";

export const metadata: Metadata = { title: "Pedidos" };

/** "vence en 5 h" / "vencida" para reservas a punto de caer (server: sin desfase). */
function expiryNote(status: string, expiresAt: Date | null, now: number): string | null {
  if (status !== "PENDIENTE_PAGO" || !expiresAt) return null;
  const hours = (expiresAt.getTime() - now) / 3600_000;
  if (hours <= 0) return "vencida";
  if (hours <= 12) return `vence en ${Math.max(1, Math.round(hours))} h`;
  return null;
}

export default async function AdminOrdersPage() {
  const orders = await getAdminOrders();
  // eslint-disable-next-line react-hooks/purity -- render del server, por request
  const now = Date.now();
  return (
    <OrdersList
      orders={orders.map((o) => ({
        ...o,
        statusLabel: STATUS_LABELS[o.status],
        createdAt: o.createdAt.toISOString(),
        expiry: expiryNote(o.status, o.expiresAt, now),
      }))}
    />
  );
}
