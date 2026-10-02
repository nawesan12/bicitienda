import type { DemoQuote, DemoQuoteKind, QuoteKind, QuoteStatus } from "./types";

/**
 * Presupuestos demo (`Q` y `KINDS` de `quoteVals()`: 5a/5d tienda, 5b admin).
 *
 * Inconsistencias del handoff resueltas:
 *  - Fechas relativas: "Hoy" = 2026-10-01 (DEMO_TODAY), "Ayer" = 30 sep;
 *    "28 sep" / "27 sep" no tienen hora → 12:00.
 *  - "Válido: Hasta el 8 oct" es igual para todos → validUntil 2026-10-08.
 *  - Presupuesto "Sin indicar" → `budget: null`.
 *  - #P-0213 (Lucía Benítez) tiene el mismo WhatsApp que Lucía Gómez
 *    (0144) y #P-0211 (Carla Méndez) uno distinto al de su ficha (0187 vs
 *    0111): se guardan como vienen (son contactos del formulario).
 *  - #P-0209 está en "Pedido creado" pero no hay pedido que lo respalde en
 *    3a: `orderNumber: null`.
 *  - Tipo: las claves del prototipo `bici|rep|imp|otro` pasan a
 *    `bici|repuesto|importado|otro` (modelo del README).
 *
 * Numeración: `P-` desde 0213 (el próximo será P-0214).
 */

export const QUOTE_KINDS: DemoQuoteKind[] = [
  {
    key: "bici",
    label: "Bicicleta",
    description: "Te recomendamos modelo y talle.",
    placeholder: "Ej: bici urbana para ir al trabajo. Mido 1,65 m y la quiero con canasto y luces.",
  },
  {
    key: "repuesto",
    label: "Repuesto",
    description: "Para tu bici, nuevo u original.",
    placeholder: "Ej: cadena y cassette 11-42 para Shimano Deore 11v. Si podés, sumá una foto de la pieza.",
  },
  {
    key: "importado",
    label: "Producto importado",
    description: "Lo traemos aunque no esté en la tienda.",
    placeholder: "Ej: rodillo smart compatible con Zwift, para eje pasante 12 mm. Si lo viste en otra web, pegá el link.",
  },
  {
    key: "otro",
    label: "Otra consulta",
    description: "Contanos y lo vemos.",
    placeholder: "Contanos qué necesitás y te respondemos.",
  },
];

/** Tipo elegido por defecto en 5a/5d. */
export const DEFAULT_QUOTE_KIND: QuoteKind = "importado";

/** Rótulo corto del tipo (columna "Tipo" de 5b). */
export const QUOTE_KIND_SHORT: Record<QuoteKind, string> = {
  bici: "Bicicleta",
  repuesto: "Repuesto",
  importado: "Importado",
  otro: "Otra consulta",
};

export const QUOTE_STATUS_LABEL: Record<QuoteStatus, string> = {
  nuevo: "Nuevo",
  cotizado: "Cotizado",
  aceptado: "Aceptado",
  pedido_creado: "Pedido creado",
  rechazado: "Rechazado",
};

/** Pills de 5b (`QST`): bg, fg, borde. */
export const QUOTE_STATUS_PILL: Record<QuoteStatus, { bg: string; fg: string; bd: string }> = {
  nuevo: { bg: "#d7261e", fg: "#ffffff", bd: "#d7261e" },
  cotizado: { bg: "#3a362f", fg: "#f4efe4", bd: "#3a362f" },
  aceptado: { bg: "#ffd21f", fg: "#121110", bd: "#ffd21f" },
  pedido_creado: { bg: "#f4efe4", fg: "#121110", bd: "#f4efe4" },
  rechazado: { bg: "transparent", fg: "#8d867a", bd: "#5a554c" },
};

/** Botón amarillo de 5b (`QNEXT`). "Rechazar" está disponible mientras siga abierto. */
export const QUOTE_NEXT: Partial<Record<QuoteStatus, { label: string; to: QuoteStatus }>> = {
  nuevo: { label: "Enviar presupuesto por WhatsApp", to: "cotizado" },
  cotizado: { label: "Marcar como aceptado", to: "aceptado" },
  aceptado: { label: "Crear pedido", to: "pedido_creado" },
};

/** Notas de los estados cerrados (en lugar de botones). */
export const QUOTE_CLOSED_NOTE: Partial<Record<QuoteStatus, string>> = {
  pedido_creado: "Ya se creó el pedido: seguilo desde Pedidos.",
  rechazado: "Presupuesto cerrado sin compra.",
};

/** Chips de filtro de 5b, con los estados que cuentan. */
export const QUOTE_FILTERS: { label: string; statuses: QuoteStatus[] | null }[] = [
  { label: "Todos", statuses: null },
  { label: "Nuevos", statuses: ["nuevo"] },
  { label: "Cotizados", statuses: ["cotizado"] },
  { label: "Aceptados", statuses: ["aceptado"] },
  { label: "Cerrados", statuses: ["pedido_creado", "rechazado"] },
];

const VALID = "2026-10-08";

export const QUOTES: DemoQuote[] = [
  {
    number: "P-0213",
    customer: { name: "Lucía Benítez", phone: "223 555-0144" },
    kind: "importado",
    createdAt: "2026-10-01T10:12:00-03:00",
    status: "nuevo",
    title: "Rodillo smart para Zwift",
    detail: "Busco un rodillo smart compatible con Zwift, para bici de ruta con eje pasante 12 mm. ¿Lo pueden traer? ¿Cuánto demora?",
    forBike: "Ruta · eje 12 mm",
    budget: "Hasta $ 900.000",
    lines: [
      { name: "Rodillo smart (importado)", price: 849000 },
      { name: "Adaptador eje pasante 12 mm", price: 38000 },
    ],
    eta: "30 a 45 días",
    validUntil: VALID,
    orderNumber: null,
  },
  {
    number: "P-0212",
    customer: { name: "Martín Sosa", phone: "223 555-0161" },
    kind: "repuesto",
    createdAt: "2026-10-01T09:40:00-03:00",
    status: "nuevo",
    title: "Cadena y cassette 11v",
    detail: "Necesito cadena y cassette 11-42 para Shimano Deore 11v.",
    forBike: "MTB rodado 29",
    budget: null,
    lines: [
      { name: "Cassette 11-42 · 11v", price: 96500 },
      { name: "Cadena 11v", price: 41200 },
    ],
    eta: "En stock",
    validUntil: VALID,
    orderNumber: null,
  },
  {
    number: "P-0211",
    customer: { name: "Carla Méndez", phone: "223 555-0187" },
    kind: "bici",
    createdAt: "2026-09-30T18:05:00-03:00",
    status: "cotizado",
    title: "Urbana para ir al trabajo",
    detail: "Quiero una urbana con canasto y luces para ir todos los días al trabajo. Mido 1,65 m.",
    forBike: "Mide 1,65 m",
    budget: "Hasta $ 400.000",
    lines: [
      { name: "Urbana rodado 28 · canasto", price: 359900 },
      { name: "Kit de luces USB", price: 24500 },
    ],
    eta: "En stock",
    validUntil: VALID,
    orderNumber: null,
  },
  {
    number: "P-0210",
    customer: { name: "Diego Paz", phone: "223 555-0102" },
    kind: "importado",
    createdAt: "2026-09-30T11:30:00-03:00",
    status: "aceptado",
    title: "Casco de ruta MIPS · L",
    detail: "Busco un casco de ruta con MIPS, talle L, en negro.",
    forBike: "Ruta",
    budget: "Hasta $ 150.000",
    lines: [{ name: "Casco ruta MIPS · L · negro", price: 138000 }],
    eta: "20 a 30 días",
    validUntil: VALID,
    orderNumber: null,
  },
  {
    number: "P-0209",
    customer: { name: "Sofía Luna", phone: "223 555-0133" },
    kind: "repuesto",
    createdAt: "2026-09-28T12:00:00-03:00",
    status: "pedido_creado",
    title: "Frenos hidráulicos",
    detail: "Quiero pasar de freno mecánico a hidráulico, delantero y trasero.",
    forBike: "MTB rodado 27.5",
    budget: null,
    lines: [{ name: "Juego de frenos hidráulicos", price: 189000 }],
    eta: "En stock",
    validUntil: VALID,
    orderNumber: null,
  },
  {
    number: "P-0208",
    customer: { name: "Ramiro Gil", phone: "223 555-0119" },
    kind: "bici",
    createdAt: "2026-09-27T12:00:00-03:00",
    status: "rechazado",
    title: "Plegable eléctrica",
    detail: "Busco una plegable eléctrica para moverme por la costa.",
    forBike: "Plegable",
    budget: "Hasta $ 600.000",
    lines: [{ name: "Plegable eléctrica (importada)", price: 1450000 }],
    eta: "45 a 60 días",
    validUntil: VALID,
    orderNumber: null,
  },
];

/** Próximo número de presupuesto después de la demo. */
export const NEXT_QUOTE_NUMBER = 214;

export const quoteTotal = (q: DemoQuote) => q.lines.reduce((a, l) => a + l.price, 0);
