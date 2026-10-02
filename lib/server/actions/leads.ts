"use server";

import { eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { sampleLeads, sampleSubscribers } from "@/lib/data/content";
import { requireAdmin } from "@/lib/server/actions/guard";
import { getDb, schema } from "@/lib/server/db";
import {
  insertLead,
  LEADS_PER_MINUTE,
  publicLeadSchema,
} from "@/lib/server/leads";
import { withinRateLimit } from "@/lib/server/rate-limit";
import { invalidateAdmin } from "@/lib/server/revalidate";

/**
 * Consultas: cada botón de WhatsApp de la web registra una (logLead) antes
 * de abrir el chat. El resto son las acciones de /admin/consultas.
 */

/* ── Pública ────────────────────────────────────────────────── */

export async function logLead(
  type: unknown,
  label: unknown,
  detail?: unknown,
): Promise<{ ok: boolean }> {
  if (!(await withinRateLimit("leads", LEADS_PER_MINUTE))) return { ok: false };
  const parsed = publicLeadSchema.safeParse({ type, label, detail: detail ?? "" });
  if (!parsed.success) return { ok: false };
  try {
    await insertLead(parsed.data);
    return { ok: true };
  } catch (err) {
    console.error("[leads] error registrando consulta:", err);
    return { ok: false };
  }
}

/* ── Admin ──────────────────────────────────────────────────── */

const idSchema = z.string().uuid();

export async function setLeadStatus(
  id: unknown,
  status: unknown,
): Promise<{ ok: boolean }> {
  await requireAdmin();
  const parsed = z
    .object({ id: idSchema, status: z.enum(["nueva", "atendida"]) })
    .safeParse({ id, status });
  if (!parsed.success) return { ok: false };
  const db = await getDb();
  await db
    .update(schema.leads)
    .set({ status: parsed.data.status })
    .where(eq(schema.leads.id, parsed.data.id));
  invalidateAdmin();
  return { ok: true };
}

export async function deleteLead(id: unknown): Promise<{ ok: boolean }> {
  await requireAdmin();
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { ok: false };
  const db = await getDb();
  await db.delete(schema.leads).where(eq(schema.leads.id, parsed.data));
  invalidateAdmin();
  return { ok: true };
}

/** "Vaciar consultas": borra todas; los suscriptos se mantienen. */
export async function clearLeads(): Promise<{ ok: boolean }> {
  await requireAdmin();
  const db = await getDb();
  await db.delete(schema.leads);
  invalidateAdmin();
  return { ok: true };
}

/**
 * "Ver con datos de ejemplo": las 9 consultas del prototipo con su
 * antigüedad (las de más de 24 h, atendidas) y, si la newsletter está
 * vacía, sus 2 suscriptos.
 */
export async function loadSampleLeads(): Promise<{ ok: boolean }> {
  await requireAdmin();
  const db = await getDb();
  const now = Date.now();
  const H = 3600_000;
  await db.insert(schema.leads).values(
    sampleLeads.map(([type, label, detail, hours]) => ({
      ts: new Date(now - hours * H),
      type,
      label,
      detail,
      status: hours > 24 ? ("atendida" as const) : ("nueva" as const),
    })),
  );
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.newsletterSubscribers);
  if (!n) {
    await db
      .insert(schema.newsletterSubscribers)
      .values(
        sampleSubscribers.map(([email, hours]) => ({
          email,
          createdAt: new Date(now - hours * H),
        })),
      )
      .onConflictDoNothing({ target: schema.newsletterSubscribers.email });
  }
  invalidateAdmin();
  return { ok: true };
}

/** Marca varias de una (p. ej. "todas las del filtro" en Fase 4). */
export async function markLeadsAttended(ids: unknown): Promise<{ ok: boolean }> {
  await requireAdmin();
  const parsed = z.array(idSchema).max(500).safeParse(ids);
  if (!parsed.success || !parsed.data.length) return { ok: false };
  const db = await getDb();
  await db
    .update(schema.leads)
    .set({ status: "atendida" })
    .where(inArray(schema.leads.id, parsed.data));
  invalidateAdmin();
  return { ok: true };
}
