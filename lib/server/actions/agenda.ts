"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/lib/server/actions/guard";
import { getDb, schema } from "@/lib/server/db";
import { invalidatePublic } from "@/lib/server/revalidate";

/**
 * Agenda de la comunidad (/admin/comunidad), editable en la misma fila
 * como en el prototipo: día, mes, título y detalle. La fecha real (que
 * ordena y vence los eventos) se deriva de día + mes; un evento sin título
 * no se publica.
 */

const idSchema = z.string().trim().min(1).max(80);

type Result = { ok: true } | { ok: false; error: string };

const MONTHS = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

/**
 * "26" + "SEP" → "2026-09-26": este año, o el que viene si ya pasó hace
 * más de un mes. null si no se entiende.
 */
function isoFrom(day: string, month: string, now = new Date()): string | null {
  const d = parseInt(day, 10);
  const m = MONTHS.findIndex((x) => month.trim().toUpperCase().startsWith(x));
  if (!(d >= 1 && d <= 31) || m < 0) return null;
  let year = now.getFullYear();
  const candidate = new Date(Date.UTC(year, m, d));
  if (candidate.getTime() < now.getTime() - 31 * 86400_000) year += 1;
  return `${year}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export async function createAgendaEvent(): Promise<
  { ok: true; id: string } | { ok: false; error: string }
> {
  await requireAdmin();
  const db = await getDb();
  const id = `ev-${Date.now().toString(36)}`;
  await db.insert(schema.agendaEvents).values({
    id,
    // Sin fecha todavía: al final de la agenda hasta que se cargue.
    date: "9999-12-31",
    day: "",
    month: "",
    title: "",
    meta: "",
    published: false,
  });
  invalidatePublic("content");
  return { ok: true, id };
}

const patchSchema = z.object({
  day: z.string().trim().max(2),
  month: z.string().trim().max(4),
  title: z.string().trim().max(120),
  meta: z.string().trim().max(200),
});

/** Guarda la fila completa (autosave). */
export async function updateAgendaEvent(id: unknown, patch: unknown): Promise<Result> {
  await requireAdmin();
  const parsedId = idSchema.safeParse(id);
  const parsed = patchSchema.safeParse(patch);
  if (!parsedId.success || !parsed.success) return { ok: false, error: "Revisá los datos." };
  const { day, month, title, meta } = parsed.data;
  const db = await getDb();
  const date = isoFrom(day, month);
  await db
    .update(schema.agendaEvents)
    .set({
      day,
      month: month.toUpperCase(),
      title,
      meta,
      ...(date ? { date } : {}),
      published: title.length > 0 && date !== null,
    })
    .where(eq(schema.agendaEvents.id, parsedId.data));
  invalidatePublic("content");
  return { ok: true };
}

export async function deleteAgendaEvent(id: unknown): Promise<Result> {
  await requireAdmin();
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: "Evento inválido." };
  const db = await getDb();
  await db.delete(schema.agendaEvents).where(eq(schema.agendaEvents.id, parsedId.data));
  invalidatePublic("content");
  return { ok: true };
}
