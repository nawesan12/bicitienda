import type {
  DaySchedule,
  DemoScheduleBlock,
  DemoService,
  DemoWhatsAppTemplate,
} from "./types";

/**
 * Ajustes demo (3f): local, horarios para turnos, turnos, servicios,
 * pagos y plantillas de WhatsApp. Todo lo que dice "[… a confirmar]" en el
 * prototipo queda como placeholder hasta que el cliente lo pase.
 *
 * Decisiones:
 *  - Sin plantilla "Recordatorio" (24 hs antes): el usuario no quiere
 *    recordatorios automáticos.
 *  - Horarios: los de `sched` (lun–vie 10–13 y 16–19, sáb 10–13, dom
 *    cerrado). Los turnos van cada 30 min, así el último de la mañana es
 *    12:30 y el de la tarde 18:30, como en 2f. El sábado a la tarde está
 *    cerrado (el prototipo 2f lo ofrecía: bug corregido).
 *  - El 12 de octubre aparece tachado en el calendario de 2f (feriado):
 *    se carga como bloqueo de día completo.
 *  - "Usuarios" de Ajustes no va (decisión del usuario): login con PIN.
 */

export const STORE_INFO = {
  name: "BiciTienda MDQ",
  /** Como lo escribe el prototipo en textos corridos. */
  shortName: "BiciTiendaMDQ",
  city: "Mar del Plata",
  address: "[Dirección a confirmar]",
  hours: "[Horarios a confirmar]",
  whatsapp: "[Número a confirmar]",
  email: "[Email a confirmar]",
  instagram: "@bicitiendamdq",
  /** Usuario del bloque del sidebar del admin. */
  adminUser: { name: "Mostrador", email: "admin@bicitiendamdq" },
} as const;

const ranges = { am: { from: "10:00", to: "13:00" }, pm: { from: "16:00", to: "19:00" } };

export const WEEKLY_SCHEDULE: DaySchedule[] = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
].map((label, day) => ({
  day,
  label,
  open: day < 6,
  am: day < 6 ? ranges.am : null,
  pm: day < 5 ? ranges.pm : null,
}));

export const APPOINTMENT_SETTINGS = {
  slotMinutes: 30,
  /** "Por horario: 1 turno". */
  slotCapacity: 1,
  /** "Anticipación: 2 horas". */
  minNoticeMin: 120,
  /** "Reservar hasta: 30 días". */
  maxDaysAhead: 30,
} as const;

export const SERVICES: DemoService[] = [
  {
    key: "reparacion",
    name: "Reparación / service",
    adminName: "Reparación / service",
    description: "Traés la bici, la revisamos y te pasamos el presupuesto por WhatsApp.",
    durationMin: 15,
    active: true,
    note: "15 min para dejarla · presupuesto por WhatsApp",
    priceNote: "Presupuesto por WhatsApp",
  },
  {
    key: "asesoramiento",
    name: "Asesoramiento",
    adminName: "Asesoramiento de compra",
    description: "Te ayudamos con talle, rodado, uso y presupuesto.",
    durationMin: 30,
    active: true,
    note: "30 min · se paga en el local",
    priceNote: "Se paga en el local",
  },
];

export const SCHEDULE_BLOCKS: DemoScheduleBlock[] = [
  { date: "2026-10-12", from: null, to: null, reason: "Feriado" },
];

export const PAYMENT_SETTINGS = {
  mercadoPago: { enabled: true, connected: true },
  /** "Off transferencia: 10 %". */
  transferDiscountPct: 10,
  /** "Cuotas sin interés: Hasta 6". */
  maxInstallments: 6,
  /** "Reservamos el stock 24 hs" (transferencia). */
  transferReservationHours: 24,
  alias: "[Alias a confirmar]",
  /** Datos de la cuenta para transferir (mail del pedido y Ajustes → Pagos). */
  cbu: "[CBU a confirmar]",
  holder: "[Titular a confirmar]",
  bank: "[Banco a confirmar]",
  /** "Efectivo al retirar" prendido. */
  cashEnabled: true,
  /** Reserva en efectivo: el prototipo no dice que venza (null = no vence). */
  cashReservationHours: null as number | null,
  /** Siempre retiro en el local, sin envío ni seña. */
  pickupOnly: true,
} as const;

export const WHATSAPP_TEMPLATES: DemoWhatsAppTemplate[] = [
  {
    key: "turno_confirmado",
    name: "Turno confirmado",
    when: "Al reservar",
    body: "¡Hola {nombre}! Te esperamos el {día} a las {hora} para tu {servicio} en BiciTiendaMDQ. Si no podés venir, reprogramá acá: {link}",
  },
  {
    key: "pedido_listo",
    name: "Pedido listo",
    when: "Al marcarlo listo",
    body: "¡{nombre}, tu pedido #{número} ya está listo para retirar! Pasá a buscarlo con tu DNI.",
  },
];

/** Campos que se completan solos en las plantillas. */
export const TEMPLATE_PLACEHOLDERS = [
  "{nombre}",
  "{día}",
  "{hora}",
  "{servicio}",
  "{producto}",
  "{número}",
  "{link}",
] as const;
