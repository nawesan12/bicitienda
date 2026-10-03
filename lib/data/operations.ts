import {
  APPOINTMENT_SETTINGS,
  PAYMENT_SETTINGS,
  SERVICES,
  WEEKLY_SCHEDULE,
  WHATSAPP_TEMPLATES,
} from "@/lib/data/demo/settings";
import type { WhatsAppTemplateId } from "@/lib/types";

/**
 * ── CAPA POR TIENDA ──────────────────────────────────────────
 * Seed de la operación del local, traducido de los Ajustes del prototipo
 * (`lib/data/demo/settings.ts`): servicios con turno, horario semanal,
 * ajustes de la agenda y plantillas de WhatsApp. Todo se edita después
 * desde el admin (Ajustes → Turnos / Notificaciones); esto es lo que
 * carga `pnpm db:seed`.
 */

export const appointmentServices = SERVICES.map((s, i) => ({
  id: s.key,
  name: s.name,
  description: s.description,
  durationMin: s.durationMin,
  priceNote: "Se paga en el local",
  // Solo la prueba de bici lleva el modelo a probar.
  allowsProduct: s.key === "prueba",
  active: s.active,
  order: i,
}));

/**
 * Horario de turnos. El prototipo numera 0 = lunes; `schedule_rules` usa
 * 0 = domingo (Date#getDay). Lunes a viernes mañana y tarde, sábado SOLO a
 * la mañana (el prototipo 2f ofrecía la tarde del sábado: bug corregido),
 * domingo cerrado.
 */
export const scheduleRules: { weekday: number; startTime: string; endTime: string }[] =
  WEEKLY_SCHEDULE.filter((d) => d.open).flatMap((d) => {
    const weekday = (d.day + 1) % 7;
    return [d.am, d.pm]
      .filter((r) => r !== null)
      .map((r) => ({ weekday, startTime: r.from, endTime: r.to }));
  });

/** Ajustes de la agenda y de pagos que no viven en lib/config.ts. */
export const operationSettings = {
  ...APPOINTMENT_SETTINGS,
  autoConfirmAppointments: true,
  maxInstallments: PAYMENT_SETTINGS.maxInstallments,
  /** null = la reserva en efectivo no vence. */
  cashReservationHours: PAYMENT_SETTINGS.cashReservationHours,
  cashEnabled: PAYMENT_SETTINGS.cashEnabled,
};

/** Plantillas de WhatsApp (links wa.me, sin envío automático). */
export const whatsappTemplates: {
  id: WhatsAppTemplateId;
  name: string;
  trigger: string;
  body: string;
}[] = WHATSAPP_TEMPLATES.map((t) => ({
  id: t.key,
  name: t.name,
  trigger: t.when,
  body: t.body,
}));
