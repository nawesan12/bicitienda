import { store } from "@/lib/config";
import { hasAdminSession } from "@/lib/server/admin-auth";
import { getAdminCustomers } from "@/lib/server/admin-queries";
import { customerRows } from "@/lib/server/screens/admin-d2";
import { toLocalParts } from "@/lib/zoned-time";

/**
 * "Exportar" de Clientes (3e): CSV con ";" y BOM (Excel en español lo abre
 * en columnas). Respeta la búsqueda (?q=). Protegido dos veces: el proxy
 * corta /admin/* y acá se valida la sesión.
 */
export const dynamic = "force-dynamic";

const cell = (v: string | number | null | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const day = (d: Date | null) => (d ? toLocalParts(d, store.timeZone).date : "");

export async function GET(req: Request) {
  if (!(await hasAdminSession())) return new Response("Not found", { status: 404 });
  const q = new URL(req.url).searchParams.get("q") ?? undefined;
  const rows = customerRows(await getAdminCustomers(), q);
  const lines = [
    ["Nombre", "Email", "WhatsApp", "Cuenta", "Pedidos", "Turnos", "Presupuestos", "Gastado", "Último contacto", "Cliente desde"],
    ...rows.map((c) => [
      c.name,
      c.email,
      c.phoneLabel,
      c.hasAccount ? "Sí" : "No",
      c.ordersCount,
      c.appointmentsCount,
      c.quotesCount,
      c.totalSpent,
      day(c.lastContactAt),
      day(c.createdAt),
    ]),
  ];
  return new Response("﻿" + lines.map((r) => r.map(cell).join(";")).join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="clientes-${day(new Date())}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
