import { store } from "@/lib/config";
import { formatArPhone } from "@/lib/phone";
import { hasAdminSession } from "@/lib/server/admin-auth";
import { getOrdersExport, ORDER_FILTERS, stamp, type OrderFilter, type OrderRange } from "@/lib/server/screens/admin-d1";
import { ORDER_PILL } from "@/components/bt/pill";

/**
 * "Exportar" de 3a: CSV de los pedidos con el mismo filtro, rango y
 * búsqueda que la pantalla (comillas dobles, BOM UTF-8 para Excel).
 * Protegido por el proxy y, de nuevo, por sesión (es un endpoint propio).
 */

export const dynamic = "force-dynamic";

function csv(rows: (string | number | null | undefined)[][]): string {
  return rows.map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
}

export async function GET(request: Request) {
  if (!(await hasAdminSession())) return new Response("Sesión requerida", { status: 401 });
  const url = new URL(request.url);
  const f = url.searchParams.get("f") ?? "todos";
  const r = url.searchParams.get("rango") ?? "7";
  const filter = (ORDER_FILTERS.some((x) => x.key === f) ? f : "todos") as OrderFilter;
  const range = (["7", "30", "todo"].includes(r) ? r : "7") as OrderRange;
  const q = (url.searchParams.get("q") ?? "").slice(0, 80);
  const rows = await getOrdersExport({ filter, range, q });
  const body = csv([
    ["Pedido", "Fecha", "Cliente", "WhatsApp", "Productos", "Estado", "Total"],
    ...rows.map((o) => [
      o.number,
      stamp(o.createdAt),
      o.customerName,
      formatArPhone(o.phone),
      o.itemsLabel,
      ORDER_PILL[o.pill].label,
      o.total,
    ]),
  ]);
  return new Response("﻿" + body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${store.slug}-pedidos.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
