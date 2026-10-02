import type { WhatsAppTemplateId } from "@/lib/types";

/**
 * ── CAPA POR TIENDA ──────────────────────────────────────────
 * Seed de la operación del local: servicios con turno, horario semanal de
 * turnos, ajustes de la agenda y plantillas de WhatsApp. Todo se edita
 * después desde el admin (Ajustes → Turnos / Notificaciones); esto es lo
 * que carga `pnpm db:seed` la primera vez.
 */

export const appointmentServices = [
  {
    id: "prueba",
    name: "Prueba de bici",
    description: "Elegís el modelo y salís a dar una vuelta con ella.",
    durationMin: 30,
    priceNote: "Se paga en el local",
    allowsProduct: true,
    active: true,
    order: 0,
  },
  {
    id: "asesoramiento",
    name: "Asesoramiento",
    description: "Te ayudamos con talle, rodado, uso y presupuesto.",
    durationMin: 30,
    priceNote: "Se paga en el local",
    allowsProduct: false,
    active: true,
    order: 1,
  },
];

/**
 * Horario de turnos (0 = domingo): mañana de lunes a sábado 10–13, tarde
 * de lunes a viernes 16–19. Domingo cerrado (y el sábado a la tarde
 * también: el prototipo lo ofrecía por error).
 */
export const scheduleRules: { weekday: number; startTime: string; endTime: string }[] = [
  ...[1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, startTime: "10:00", endTime: "13:00" })),
  ...[1, 2, 3, 4, 5].map((weekday) => ({ weekday, startTime: "16:00", endTime: "19:00" })),
];

/** Ajustes de la agenda y de pagos que no viven en lib/config.ts. */
export const operationSettings = {
  slotMinutes: 30,
  slotCapacity: 1,
  minNoticeMin: 120,
  maxDaysAhead: 30,
  autoConfirmAppointments: true,
  maxInstallments: 6,
  /** null = la reserva en efectivo no vence. */
  cashReservationHours: null as number | null,
  cashEnabled: true,
};

/** Plantillas de WhatsApp (links wa.me, sin envío automático). */
export const whatsappTemplates: {
  id: WhatsAppTemplateId;
  name: string;
  trigger: string;
  body: string;
}[] = [
  {
    id: "turno_confirmado",
    name: "Turno confirmado",
    trigger: "Al reservar",
    body: "¡Hola {nombre}! Te esperamos el {día} a las {hora} para tu {servicio} en BiciTienda MDQ. Si no podés venir, reprogramá acá: {link}",
  },
  {
    id: "pedido_listo",
    name: "Pedido listo",
    trigger: "Al marcarlo listo",
    body: "¡{nombre}, tu {producto} ya está armada y lista! Pasá a buscarla con tu DNI y el pedido {número}.",
  },
];
