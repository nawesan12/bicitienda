"use server";

import { z } from "zod";
import { adminPatchService, adminSaveAgendaSettings, adminSaveScheduleRules } from "@/lib/server/actions/admin-appointments";
import { adminSaveRepairsContent } from "@/lib/server/actions/content";
import { requireAdmin } from "@/lib/server/actions/guard";
import { patchSettings } from "@/lib/server/actions/settings";
import { adminSaveWhatsAppTemplate } from "@/lib/server/actions/whatsapp";
import type { RepairsContent } from "@/lib/types";

/**
 * "Guardar cambios" de Ajustes (3f) en UNA sola action: antes el editor
 * disparaba una por bloque (local y pagos, horario, agenda, cada servicio,
 * cada plantilla, taller) y cada una re-renderizaba el panel. Acá se
 * aplican en orden, cada bloque con su validación de siempre (las
 * actions de cada uno), y Next re-renderiza una sola vez al final. Solo
 * llega lo que cambió; si un bloque falla, se corta y devuelve ese error
 * (los anteriores quedan guardados, como antes).
 */

type Result = { ok: true } | { ok: false; error: string };

const inputSchema = z.object({
  settings: z.record(z.string(), z.unknown()).optional(),
  scheduleRules: z.array(z.unknown()).max(30).optional(),
  agenda: z.record(z.string(), z.unknown()).optional(),
  services: z.array(z.object({ id: z.string().max(40), active: z.boolean() })).max(20).optional(),
  templates: z.array(z.object({ id: z.string().max(40), body: z.string().max(1000) })).max(10).optional(),
  repairs: z.unknown().optional(),
});

export type SettingsScreenSave = {
  settings?: Record<string, unknown>;
  scheduleRules?: { weekday: number; startTime: string; endTime: string }[];
  agenda?: { slotCapacity?: number; minNoticeMin?: number; maxDaysAhead?: number };
  services?: { id: string; active: boolean }[];
  templates?: { id: string; body: string }[];
  repairs?: RepairsContent;
};

export async function saveSettingsScreen(input: SettingsScreenSave): Promise<Result> {
  await requireAdmin();
  const p = inputSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "Revisá los datos." };
  const d = p.data;
  const steps: (() => Promise<Result>)[] = [];
  if (d.settings) steps.push(() => patchSettings(d.settings));
  if (d.scheduleRules) steps.push(() => adminSaveScheduleRules(d.scheduleRules));
  if (d.agenda) steps.push(() => adminSaveAgendaSettings(d.agenda));
  for (const sv of d.services ?? []) steps.push(() => adminPatchService(sv.id, { active: sv.active }));
  for (const t of d.templates ?? []) steps.push(() => adminSaveWhatsAppTemplate(t.id, t.body));
  if (d.repairs !== undefined) steps.push(() => adminSaveRepairsContent(d.repairs as RepairsContent));
  for (const step of steps) {
    const r = await step();
    if (!r.ok) return r;
  }
  return { ok: true };
}
