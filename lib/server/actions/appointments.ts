"use server";

import { z } from "zod";
import { store } from "@/lib/config";
import { isValidArPhone } from "@/lib/phone";
import type { AvailabilityDay } from "@/lib/schedule";
import {
  AppointmentError,
  cancelAppointment,
  createAppointment,
  getAppointmentForGuest,
  getAvailability,
  rescheduleAppointment,
  type AppointmentRow,
} from "@/lib/server/appointments";
import { getCurrentAccount } from "@/lib/server/customer-auth";
import { getDb, schema } from "@/lib/server/db";
import { invalidateAdmin } from "@/lib/server/revalidate";
import { withinRateLimit } from "@/lib/server/rate-limit";
import { eq } from "drizzle-orm";

/**
 * Turnos del lado del cliente (pantalla 2f y Mi cuenta): disponibilidad,
 * reservar (con o sin cuenta), reprogramar y cancelar. El cliente
 * identifica su turno con la sesión (si es de su cuenta) o con el link de
 * gestión (número + token) que recibe al reservar.
 */

export type AppointmentActionResult =
  | {
      ok: true;
      appointment: Pick<AppointmentRow, "id" | "number" | "status" | "startsAt" | "manageToken">;
    }
  | { ok: false; error: string; code?: AppointmentError["code"] };

const RATE_MSG = "Demasiados intentos. Esperá un minuto.";

function off(): AppointmentActionResult | null {
  return store.features.appointments === false
    ? { ok: false, error: "Los turnos no están disponibles." }
    : null;
}

function fail(err: unknown): AppointmentActionResult {
  if (err instanceof AppointmentError) return { ok: false, error: err.message, code: err.code };
  console.error("[turnos]", err);
  return { ok: false, error: "No pudimos guardar el turno. Probá de nuevo." };
}

function ok(a: AppointmentRow): AppointmentActionResult {
  return {
    ok: true,
    appointment: {
      id: a.id,
      number: a.number,
      status: a.status,
      startsAt: a.startsAt,
      manageToken: a.manageToken,
    },
  };
}

const slotSchema = z.union([
  z.object({ startsAt: z.string().datetime() }),
  z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  }),
]);

/** Calendario: `days` días desde `from` (fecha local, default hoy). */
export async function fetchAvailability(
  from?: unknown,
  days?: unknown,
): Promise<{ ok: true; days: AvailabilityDay[] } | { ok: false; error: string }> {
  if (store.features.appointments === false) return { ok: false, error: "Los turnos no están disponibles." };
  if (!(await withinRateLimit("appointments-availability", 60))) return { ok: false, error: RATE_MSG };
  const f = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().safeParse(from);
  const d = z.number().int().min(1).max(62).optional().safeParse(days);
  const result = await getAvailability({
    from: f.success ? f.data : undefined,
    days: d.success ? d.data : undefined,
  });
  return { ok: true, days: result.days };
}

const bookSchema = z
  .object({
    serviceId: z.string().trim().min(1).max(40),
    name: z.string().trim().min(2, "Completá tu nombre.").max(120),
    phone: z
      .string()
      .trim()
      .max(30)
      .refine(isValidArPhone, "Revisá el WhatsApp: 10 dígitos con la característica (ej. 223 555-0182)."),
    email: z
      .union([z.literal(""), z.string().trim().toLowerCase().email("Revisá el email.").max(200)])
      .optional(),
    note: z.string().trim().max(500).optional(),
    productSlug: z.string().trim().max(80).optional(),
    variantId: z.string().trim().max(80).optional(),
  })
  .and(slotSchema);

/**
 * Reservar un turno. Con sesión, queda en la cuenta (y nombre/WhatsApp
 * pueden venir de ella); sin cuenta, nombre + WhatsApp + email opcional.
 */
export async function bookAppointment(input: unknown): Promise<AppointmentActionResult> {
  const disabled = off();
  if (disabled) return disabled;
  if (!(await withinRateLimit("appointments-book", 6))) return { ok: false, error: RATE_MSG };
  const account = await getCurrentAccount();
  const raw = (typeof input === "object" && input) || {};
  const parsed = bookSchema.safeParse(
    account
      ? {
          name: account.name,
          phone: account.phone,
          email: account.email,
          ...(raw as Record<string, unknown>),
        }
      : raw,
  );
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisá los datos." };
  try {
    const row = await createAppointment({
      ...parsed.data,
      email: parsed.data.email || null,
      accountId: account?.id ?? null,
      source: "web",
    });
    invalidateAdmin();
    return ok(row);
  } catch (err) {
    return fail(err);
  }
}

const refSchema = z.union([
  z.object({ id: z.string().uuid() }),
  z.object({ number: z.string().trim().min(3).max(20), token: z.string().min(10).max(100) }),
]);

/** Resuelve el turno del cliente por sesión (id) o por link (número + token). */
async function ownedAppointmentId(ref: unknown): Promise<string | null> {
  const parsed = refSchema.safeParse(ref);
  if (!parsed.success) return null;
  if ("id" in parsed.data) {
    const account = await getCurrentAccount();
    if (!account) return null;
    const db = await getDb();
    const [row] = await db
      .select({ id: schema.appointments.id, accountId: schema.appointments.accountId })
      .from(schema.appointments)
      .where(eq(schema.appointments.id, parsed.data.id));
    return row && row.accountId === account.id ? row.id : null;
  }
  const view = await getAppointmentForGuest(parsed.data.number, parsed.data.token);
  return view?.appointment.id ?? null;
}

/** Cancelar mi turno (respetando la anticipación mínima). */
export async function cancelMyAppointment(ref: unknown): Promise<AppointmentActionResult> {
  const disabled = off();
  if (disabled) return disabled;
  if (!(await withinRateLimit("appointments-manage", 10))) return { ok: false, error: RATE_MSG };
  const id = await ownedAppointmentId(ref);
  if (!id) return { ok: false, error: "No encontramos ese turno.", code: "NOT_FOUND" };
  try {
    const row = await cancelAppointment(id, "cliente");
    invalidateAdmin();
    return ok(row);
  } catch (err) {
    return fail(err);
  }
}

/** Reprogramar mi turno a otro slot libre (respetando la anticipación). */
export async function rescheduleMyAppointment(ref: unknown, slot: unknown): Promise<AppointmentActionResult> {
  const disabled = off();
  if (disabled) return disabled;
  if (!(await withinRateLimit("appointments-manage", 10))) return { ok: false, error: RATE_MSG };
  const target = slotSchema.safeParse(slot);
  if (!target.success) return { ok: false, error: "Elegí día y horario." };
  const id = await ownedAppointmentId(ref);
  if (!id) return { ok: false, error: "No encontramos ese turno.", code: "NOT_FOUND" };
  try {
    const row = await rescheduleAppointment(id, target.data, "cliente");
    invalidateAdmin();
    return ok(row);
  } catch (err) {
    return fail(err);
  }
}
