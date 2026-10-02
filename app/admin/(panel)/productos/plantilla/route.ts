import { hasAdminSession } from "@/lib/server/admin-auth";
import { importTemplateCsv } from "@/lib/server/product-import";

/**
 * Plantilla de importación de productos (CSV con ";" y BOM: Excel en
 * español la abre en columnas). Una fila por variante (talle × color).
 * Protegida dos veces: el proxy corta /admin/* y acá se valida la sesión.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasAdminSession())) return new Response("Not found", { status: 404 });
  return new Response("﻿" + importTemplateCsv(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="plantilla-productos.csv"',
      "Cache-Control": "no-store",
    },
  });
}
