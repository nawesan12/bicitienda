"use server";

import { requireAdmin } from "@/lib/server/actions/guard";
import { getAdminProductMovements } from "@/lib/server/admin-queries";

/**
 * Lectura bajo demanda para la tab "Movimientos" del editor de producto —
 * se carga recién al abrirla, no con la página.
 */
export interface MovementView {
  id: number;
  /** ISO, se formatea en el cliente. */
  at: string;
  location: string;
  delta: number;
  qtyAfter: number;
  reason: string;
  orderNumber: string | null;
  actor: string | null;
}

export async function fetchProductMovements(
  productSlug: string,
): Promise<MovementView[]> {
  await requireAdmin();
  if (typeof productSlug !== "string" || productSlug.length > 80) return [];
  const rows = await getAdminProductMovements(productSlug);
  return rows.map((m) => ({
    id: m.id,
    at: m.createdAt.toISOString(),
    location: m.location,
    delta: m.delta,
    qtyAfter: m.qtyAfter,
    reason: m.reason,
    orderNumber: m.orderNumber,
    actor: m.actor,
  }));
}
