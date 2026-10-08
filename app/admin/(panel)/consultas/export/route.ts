import { desc } from "drizzle-orm";
import { store } from "@/lib/config";
import { leadTypeLabels } from "@/lib/data/content";
import { formatDateTime } from "@/lib/format";
import { hasAdminSession } from "@/lib/server/admin-auth";
import { leadFilterWhere } from "@/lib/server/admin-queries";
import { getDb, schema } from "@/lib/server/db";
import type { Lead } from "@/lib/types";

/**
 * Export CSV de Consultas (o de suscriptos con ?kind=newsletter), como el
 * botón del prototipo: comillas dobles en todo, BOM UTF-8 para que Excel
 * abra bien las tildes; las fechas van en la hora del local (timeZone de
 * lib/config.ts). `?filtro=` replica los filtros de la pantalla
 * (LEAD_FILTERS de ../filters.ts).
 *
 * Protegido dos veces: el proxy corta /admin/* y acá se valida la sesión
 * de nuevo (un route handler es un endpoint propio).
 */

export const dynamic = "force-dynamic";


function csv(rows: (string | number | null | undefined)[][]): string {
  return rows
    .map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

function download(name: string, body: string): Response {
  return new Response("﻿" + body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(request: Request) {
  if (!(await hasAdminSession())) {
    return new Response("Sesión requerida", { status: 401 });
  }
  const url = new URL(request.url);
  const db = await getDb();

  if (url.searchParams.get("kind") === "newsletter") {
    const subs = await db
      .select()
      .from(schema.newsletterSubscribers)
      .orderBy(desc(schema.newsletterSubscribers.createdAt));
    return download(
      `${store.slug}-newsletter.csv`,
      csv([["Email", "Fecha"], ...subs.map((s) => [s.email, formatDateTime(s.createdAt)])]),
    );
  }

  const filtro = url.searchParams.get("filtro") ?? "todas";
  const rows = (await db
    .select()
    .from(schema.leads)
    .where(leadFilterWhere(filtro))
    .orderBy(desc(schema.leads.ts))) as Lead[];
  return download(
    `${store.slug}-consultas.csv`,
    csv([
      ["Fecha", "Tipo", "Consulta", "Detalle", "Estado"],
      ...rows.map((l) => [
        formatDateTime(l.ts),
        leadTypeLabels[l.type] ?? leadTypeLabels.general,
        l.label,
        l.detail,
        l.status === "atendida" ? "Atendida" : "Sin atender",
      ]),
    ]),
  );
}
