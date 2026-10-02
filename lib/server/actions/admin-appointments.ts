"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { isValidArPhone } from "@/lib/phone";
import { requireAdmin } from "@/lib/server/actions/guard";
import {
  AppointmentError,
  blockSchedule,
  cancelAppointment,
  confirmAppointment,
  createAppointment,
  deleteBlock,
  markAttendance,
  replaceScheduleRules,
  rescheduleAppointment,
  setInternalNote,
  type AppointmentRow,
} from "@/lib/server/appointments";
import { getDb, schema } from "@/lib/server/db";
import { invalidateAdmin } from "@/lib/server/revalidate";

/**
 * Turnos del lado del admin (3b y Ajustes → Turnos): confirmar, Vino /
 * No vino, reprogramar, cancelar, turno manual, bloquear horarios, nota
 * interna, horario semanal, ajustes de la agenda y servicios.
 */

export type AdminAppointmentResult =
  | { ok: true; appointment?: AppointmentRow }
  | { ok: false; error: string };

const idSchema = z.string().uuid();

async function run(fn: () => Promise<AppointmentRow | void>): Promise<AdminAppointmentResult> {
  try {
    const appointment = (await fn()) ?? undefined;
    invalidateAdmin();
    return { ok: true, appointment };
  } catch (err) {
    if (err instanceof AppointmentError) return { ok: false, error: err.message };
    throw err;
  }
}

export async function adminConfirmAppointment(id: unknown): Promise<AdminAppointmentResult> {
  await requireAdmin();
  const p = idSchema.safeParse(id);
  if (!p.success) return { ok: false, error: "Turno inválido." };
  return run(() => confirmAppointment(p.data));
}

/** "Vino" (true) / "No vino" (false). */
export async function adminMarkAttendance(id: unknown, attended: unknown): Promise<AdminAppointmentResult> {
  await requireAdmin();
  const p = z.object({ id: idSchema, attended: z.boolean() }).safeParse({ id, attended });
  if (!p.success) return { ok: false, error: "Turno inválido." };
  return run(() => markAttendance(p.data.id, p.data.attended));
}

export async function adminCancelAppointment(id: unknown): Promise<AdminAppointmentResult> {
  await requireAdmin();
  const p = idSchema.safeParse(id);
  if (!p.success) return { ok: false, error: "Turno inválido." };
  return run(() => cancelAppointment(p.data, "admin"));
}

const slotSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
});

/** Reprogramar (el admin puede salir de la agenda; la capacidad se respeta). */
export async function adminRescheduleAppointment(id: unknown, slot: unknown): Promise<AdminAppointmentResult> {
  await requireAdmin();
  const p = idSchema.safeParse(id);
  const s = slotSchema.safeParse(slot);
  if (!p.success || !s.success) return { ok: false, error: "Elegí día y horario." };
  return run(() => rescheduleAppointment(p.data, s.data, "admin"));
}

const manualSchema = slotSchema.extend({
  serviceId: z.string().trim().min(1).max(40),
  name: z.string().trim().min(2, "Completá el nombre.").max(120),
  phone: z.string().trim().max(30).refine(isValidArPhone, "Revisá el WhatsApp."),
  email: z.union([z.literal(""), z.string().trim().toLowerCase().email()]).optional(),
  note: z.string().trim().max(500).optional(),
  internalNote: z.string().trim().max(1000).optional(),
  productSlug: z.string().trim().max(80).optional(),
  variantId: z.string().trim().max(80).optional(),
});

/** "+ Turno manual" (cliente que llamó o vino al local). */
export async function adminCreateAppointment(input: unknown): Promise<AdminAppointmentResult> {
  await requireAdmin();
  const p = manualSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Revisá los datos." };
  return run(() => createAppointment({ ...p.data, email: p.data.email || null, source: "manual" }));
}

export async function adminSetAppointmentNote(id: unknown, note: unknown): Promise<AdminAppointmentResult> {
  await requireAdmin();
  const p = z.object({ id: idSchema, note: z.string().max(1000) }).safeParse({ id, note });
  if (!p.success) return { ok: false, error: "Nota inválida." };
  return run(() => setInternalNote(p.data.id, p.data.note));
}

/** Bloquear un horario (sin horas: el día entero). */
export async function adminBlockSchedule(input: unknown): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  await requireAdmin();
  const p = z
    .object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      from: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
      to: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
      reason: z.string().trim().max(200).optional(),
    })
    .safeParse(input);
  if (!p.success) return { ok: false, error: "Revisá fecha y horario." };
  try {
    const row = await blockSchedule(p.data);
    invalidateAdmin();
    return { ok: true, id: row.id };
  } catch (err) {
    if (err instanceof AppointmentError) return { ok: false, error: err.message };
    throw err;
  }
}

export async function adminDeleteBlock(id: unknown): Promise<{ ok: boolean }> {
  await requireAdmin();
  const p = z.number().int().positive().safeParse(id);
  if (!p.success) return { ok: false };
  await deleteBlock(p.data);
  invalidateAdmin();
  return { ok: true };
}

/** Ajustes → Turnos: horario semanal (franjas por día). */
export async function adminSaveScheduleRules(rules: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const p = z
    .array(
      z.object({
        weekday: z.number().int().min(0).max(6),
        startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
        endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
        active: z.boolean().optional(),
      }),
    )
    .max(30)
    .safeParse(rules);
  if (!p.success) return { ok: false, error: "Revisá los horarios." };
  try {
    await replaceScheduleRules(p.data);
    invalidateAdmin();
    return { ok: true };
  } catch (err) {
    if (err instanceof AppointmentError) return { ok: false, error: err.message };
    throw err;
  }
}

/** Ajustes → Turnos: duración del slot, turnos por slot, anticipación, horizonte. */
export async function adminSaveAgendaSettings(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const p = z
    .object({
      slotMinutes: z.number().int().min(10).max(240),
      slotCapacity: z.number().int().min(1).max(20),
      minNoticeMin: z.number().int().min(0).max(7 * 24 * 60),
      maxDaysAhead: z.number().int().min(1).max(180),
      autoConfirmAppointments: z.boolean(),
    })
    .partial()
    .safeParse(input);
  if (!p.success) return { ok: false, error: "Revisá los valores." };
  if (!Object.keys(p.data).length) return { ok: true };
  const db = await getDb();
  await db.update(schema.settings).set(p.data).where(eq(schema.settings.id, "main"));
  invalidateAdmin();
  return { ok: true };
}

/** Ajustes → Turnos: servicios (nombre, descripción, duración, activo). */
export async function adminPatchService(id: unknown, patch: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const i = z.string().trim().min(1).max(40).safeParse(id);
  const p = z
    .object({
      name: z.string().trim().min(2).max(60),
      description: z.string().trim().max(300),
      durationMin: z.number().int().min(10).max(240),
      priceNote: z.string().trim().max(80),
      active: z.boolean(),
    })
    .partial()
    .safeParse(patch);
  if (!i.success || !p.success) return { ok: false, error: "Revisá los datos del servicio." };
  if (!Object.keys(p.data).length) return { ok: true };
  const db = await getDb();
  await db.update(schema.appointmentServices).set(p.data).where(eq(schema.appointmentServices.id, i.data));
  invalidateAdmin();
  return { ok: true };
}
