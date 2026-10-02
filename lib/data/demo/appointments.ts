import { customerByName } from "./customers";
import type {
  DemoAppointment,
  DemoAppointmentStatus,
  DemoCustomerRef,
  ServiceKey,
  Talle,
} from "./types";

/**
 * Turnos demo: la agenda semanal de 3b (`APPTS` sobre `WD` = lun 5 – sáb
 * 10 oct 2026), los "Turnos de hoy" de 2i/4h (jue 1 oct) y los turnos
 * anteriores de Juan en 2g.
 *
 * Inconsistencias del handoff resueltas:
 *  - Hay dos "hoy" en el prototipo: 2i/4h y los pedidos dicen "Hoy ·
 *    jueves 1 oct", pero la agenda 3b resalta el jue 8 y la reserva (2f)
 *    arranca en el 8. `DEMO_TODAY` = 2026-10-01; la agenda semanal queda
 *    como la semana siguiente. Los turnos de hoy repiten personas de la
 *    semana (Ana Torres, Marta Ríos, Nicolás Vera, Tomás Gil, Laura Paz):
 *    se cargan igual, como turnos distintos.
 *  - Teléfono de los turnos: el prototipo lo inventa con
 *    '223 555-0' + (100 + n*7) y no coincide con 3e (Juan Pérez sale
 *    0163, que en 3e es de Sofía Díaz). Si la persona está en `CUSTOMERS`
 *    se usa su teléfono; si no, el inventado.
 *  - Estados: "Confirmado" → confirmado; "Sin confirmar" → pendiente; en
 *    2i "Hecho" → asistio y "Ahora" → confirmado (es el que está en curso).
 *  - `TAKEN` (horarios ocupados de la reserva 2f, días 8 y 9) no cierra con
 *    la agenda; no se exporta: la disponibilidad real sale de estos turnos
 *    + capacidad por horario.
 *  - La reserva 2f ofrecía horarios de tarde el sábado aunque Ajustes lo
 *    tiene cerrado: manda Ajustes (settings.ts).
 */

/** Hoy de la demo: el seed puede correr todas las fechas relativas a esto. */
export const DEMO_TODAY = "2026-10-01";

/** Semana de la agenda 3b (`WD`): lun 5 – sáb 10 oct 2026. */
export const AGENDA_WEEK = [
  { label: "Lun", day: 5, date: "2026-10-05" },
  { label: "Mar", day: 6, date: "2026-10-06" },
  { label: "Mié", day: 7, date: "2026-10-07" },
  { label: "Jue", day: 8, date: "2026-10-08" },
  { label: "Vie", day: 9, date: "2026-10-09" },
  { label: "Sáb", day: 10, date: "2026-10-10" },
] as const;

/** Horarios de la grilla (cada 30 min): mañana y tarde. */
export const SLOTS_AM = ["10:00", "10:30", "11:00", "11:30", "12:00", "12:30"] as const;
export const SLOTS_PM = ["16:00", "16:30", "17:00", "17:30", "18:00", "18:30"] as const;

export const SERVICE_LABEL: Record<ServiceKey, string> = {
  prueba: "Prueba de bici",
  asesoramiento: "Asesoramiento",
};

export const APPOINTMENT_STATUS_LABEL: Record<DemoAppointmentStatus, string> = {
  pendiente: "Sin confirmar",
  confirmado: "Confirmado",
  asistio: "Asistió",
  no_asistio: "No vino",
  cancelado: "Cancelado",
  reprogramado: "Reprogramado",
};


type Row = [
  id: string,
  dayIdx: number,
  time: string,
  name: string,
  svc: ServiceKey,
  detail: string,
  status: DemoAppointmentStatus,
  productSlug: string | null,
  size: Talle | null,
];

/** `APPTS` de 3b. dayIdx = índice en `AGENDA_WEEK`. */
const WEEK: Row[] = [
  ["a1", 0, "10:00", "Ana Torres", "asesoramiento", "Primera bici urbana", "confirmado", null, null],
  ["a2", 0, "17:00", "Ramiro Luna", "prueba", "MTB R29 · talle L", "confirmado", "mtb-rodado-29-21-vel-aluminio", "L"],
  ["a3", 1, "11:30", "Gustavo Peralta", "prueba", "MTB R27.5 juvenil · para su hijo", "confirmado", "mtb-rodado-27-5-juvenil", null],
  ["a4", 1, "16:30", "Marta Ríos", "asesoramiento", "Bici para su hijo de 7 años", "confirmado", null, null],
  ["a5", 2, "10:30", "Nicolás Vera", "prueba", "Gravel 700c · talle L", "confirmado", "gravel-700c-2x9-vel", "L"],
  ["a6", 2, "18:00", "Laura Paz", "asesoramiento", "Ruta, presupuesto $800k", "pendiente", null, null],
  ["a7", 3, "11:00", "Tomás Gil", "prueba", "MTB R27.5 juvenil", "confirmado", "mtb-rodado-27-5-juvenil", null],
  ["a8", 3, "16:00", "Sofía Díaz", "asesoramiento", "Casco para su hija", "confirmado", null, null],
  ["a9", 3, "17:30", "Juan Pérez", "prueba", "MTB R29 21v · talle M", "confirmado", "mtb-rodado-29-21-vel-aluminio", "M"],
  ["a10", 3, "18:00", "Valentina Ortiz", "asesoramiento", "Urbana para ir al trabajo", "confirmado", null, null],
  ["a11", 4, "10:00", "Federico Paz", "prueba", "Ruta aluminio · talle M", "confirmado", "ruta-aluminio-2x8-vel", "M"],
  ["a12", 4, "17:00", "Camila Rey", "asesoramiento", "Consulta por bici plegable", "pendiente", null, null],
  ["a13", 5, "10:30", "Hernán Costa", "prueba", "MTB doble suspensión · talle L", "confirmado", "mtb-rodado-29-doble-suspension", "L"],
  ["a14", 5, "11:30", "Julia Sanz", "prueba", "Paseo R26 · talle S", "confirmado", "paseo-rodado-26-guardabarros", "S"],
];

/** Teléfono: el de 3e si la persona es cliente; si no, el inventado del
 *  prototipo para su turno de la semana. */
function who(name: string): DemoCustomerRef {
  const c = customerByName(name);
  if (c) return { name, phone: c.phone, email: c.email };
  const row = WEEK.find((r) => r[3] === name);
  const n = row ? Number(row[0].slice(1)) : 0;
  return { name, phone: "223 555-0" + (100 + n * 7) };
}

/** "Turnos de hoy" de 2i/4h (jue 1 oct). Son todas personas que también
 *  tienen turno en la semana: usan el mismo teléfono (`phoneFor`). */
const TODAY_ROWS: [string, string, string, ServiceKey, string, DemoAppointmentStatus, string | null, Talle | null][] = [
  ["t1", "10:00", "Ana Torres", "asesoramiento", "Primera bici urbana", "asistio", null, null],
  ["t2", "11:30", "Juan Pérez", "prueba", "MTB R29 · talle M", "asistio", "mtb-rodado-29-21-vel-aluminio", "M"],
  ["t3", "16:00", "Nicolás Vera", "prueba", "Gravel 700c · talle L", "confirmado", "gravel-700c-2x9-vel", "L"],
  ["t4", "16:30", "Marta Ríos", "asesoramiento", "Bici para su hijo, 7 años", "confirmado", null, null],
  ["t5", "17:30", "Tomás Gil", "prueba", "MTB R27.5 juvenil", "confirmado", "mtb-rodado-27-5-juvenil", null],
  ["t6", "18:30", "Laura Paz", "asesoramiento", "Ruta, presupuesto $800k", "pendiente", null, null],
];

/** Turnos anteriores de Juan (2g · "Turnos anteriores"). */
const PAST: DemoAppointment[] = [
  {
    id: "p1",
    date: "2026-09-12",
    time: "11:00",
    customer: who("Juan Pérez"),
    service: "asesoramiento",
    detail: "Elegimos rodado y talle",
    productSlug: null,
    size: null,
    status: "asistio",
    note: null,
  },
  {
    id: "p2",
    date: "2026-08-28",
    time: "17:00",
    customer: who("Juan Pérez"),
    service: "prueba",
    detail: "Urbana R28",
    productSlug: "urbana-rodado-28-canasto",
    size: null,
    status: "reprogramado",
    note: null,
  },
];

export const APPOINTMENTS: DemoAppointment[] = [
  ...PAST,
  ...TODAY_ROWS.map(([id, time, name, service, detail, status, productSlug, size]) => ({
    id,
    date: DEMO_TODAY,
    time,
    customer: who(name),
    service,
    detail,
    productSlug,
    size,
    status,
    note: null,
  })),
  ...WEEK.map(([id, dayIdx, time, name, service, detail, status, productSlug, size]) => ({
    id,
    date: AGENDA_WEEK[dayIdx].date,
    time,
    customer: who(name),
    service,
    detail,
    productSlug,
    size,
    status,
    // Nota interna que muestra el detalle de 3b (turno seleccionado a9).
    note: id === "a9" ? "Preparar la bici en el talle indicado 10 min antes." : null,
  })),
];

/** El "Próximo turno" de 2g/4f (Juan, jue 8 oct 17:30). */
export const DEMO_ACCOUNT_NEXT_APPOINTMENT = "a9";
