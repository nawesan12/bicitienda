import { z } from "zod";
import { getDb, schema } from "@/lib/server/db";
import type { LeadType } from "@/lib/types";

/**
 * Alta de consultas (tabla leads). La usan la action pública logLead, el
 * endpoint de sendBeacon y el checkout (un lead "pedido" por compra).
 * Recorta los textos a un tope fijo: es input público.
 */

export const LEAD_TYPES = [
  "producto",
  "reparacion",
  "financiacion",
  "prueba",
  "comunidad",
  "general",
  "nota",
  "pedido",
] as const satisfies readonly LeadType[];

export const LEAD_LABEL_MAX = 160;
export const LEAD_DETAIL_MAX = 500;

/** Sin caracteres de control y sin espacios de más. */
function clean(text: string, max: number): string {
  return text
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export async function insertLead(input: {
  type: LeadType;
  label: string;
  detail?: string;
}): Promise<void> {
  const db = await getDb();
  await db.insert(schema.leads).values({
    type: input.type,
    label: clean(input.label, LEAD_LABEL_MAX) || "Consulta",
    detail: clean(input.detail ?? "", LEAD_DETAIL_MAX),
  });
}

/**
 * Consulta que llega desde la web (action logLead o sendBeacon a
 * /api/leads). "pedido" lo registra solo el checkout, nunca el cliente.
 */
export const publicLeadSchema = z.object({
  type: z.enum(LEAD_TYPES).exclude(["pedido"]),
  label: z.string().trim().min(1).max(LEAD_LABEL_MAX),
  detail: z.string().max(LEAD_DETAIL_MAX).optional().default(""),
});

/** Tope de consultas por IP y minuto (un visitante toca varios botones). */
export const LEADS_PER_MINUTE = 20;
