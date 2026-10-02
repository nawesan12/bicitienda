import type { QuoteKind, QuoteStatus } from "@/lib/types";

/**
 * Máquina de estados de los presupuestos, la del prototipo (`QNEXT`):
 *
 *   Nuevo →(Enviar presupuesto por WhatsApp)→ Cotizado
 *   Cotizado →(Marcar como aceptado)→ Aceptado
 *   Aceptado →(Crear pedido)→ Pedido creado
 *
 * "Rechazar" disponible mientras esté abierto → Rechazado. Los cerrados
 * (pedido creado / rechazado) muestran una nota en vez de botones. Puro.
 */

export const QUOTE_KINDS: { id: QuoteKind; name: string; desc: string; placeholder: string }[] = [
  {
    id: "bici",
    name: "Bicicleta",
    desc: "Te recomendamos modelo y talle.",
    placeholder: "Ej: bici urbana para ir al trabajo. Mido 1,65 m y la quiero con canasto y luces.",
  },
  {
    id: "rep",
    name: "Repuesto",
    desc: "Para tu bici, nuevo u original.",
    placeholder: "Ej: cadena y cassette 11-42 para Shimano Deore 11v. Si podés, sumá una foto de la pieza.",
  },
  {
    id: "imp",
    name: "Producto importado",
    desc: "Lo traemos aunque no esté en la tienda.",
    placeholder: "Ej: rodillo smart compatible con Zwift, para eje pasante 12 mm. Si lo viste en otra web, pegá el link.",
  },
  {
    id: "otro",
    name: "Otra consulta",
    desc: "Contanos y lo vemos.",
    placeholder: "Contanos qué necesitás y te respondemos.",
  },
];

/** Etiqueta corta del tipo para la tabla del admin ("Importado"). */
export const QUOTE_KIND_LABELS: Record<QuoteKind, string> = {
  bici: "Bicicleta",
  rep: "Repuesto",
  imp: "Importado",
  otro: "Otra consulta",
};

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  nuevo: "Nuevo",
  cotizado: "Cotizado",
  aceptado: "Aceptado",
  pedido_creado: "Pedido creado",
  rechazado: "Rechazado",
};

export interface QuoteTransition {
  label: string;
  from: QuoteStatus;
  to: QuoteStatus;
}

export function nextQuoteTransition(status: QuoteStatus): QuoteTransition | null {
  switch (status) {
    case "nuevo":
      return { label: "Enviar presupuesto por WhatsApp", from: status, to: "cotizado" };
    case "cotizado":
      return { label: "Marcar como aceptado", from: status, to: "aceptado" };
    case "aceptado":
      return { label: "Crear pedido", from: status, to: "pedido_creado" };
    default:
      return null;
  }
}

export const OPEN_QUOTE_STATUSES: QuoteStatus[] = ["nuevo", "cotizado", "aceptado"];

export function isQuoteOpen(status: QuoteStatus): boolean {
  return OPEN_QUOTE_STATUSES.includes(status);
}

/** Nota de un presupuesto cerrado (en lugar de los botones). */
export function closedQuoteNote(status: QuoteStatus): string | null {
  if (status === "pedido_creado") return "Ya se creó el pedido: seguilo desde Pedidos.";
  if (status === "rechazado") return "Presupuesto cerrado sin compra.";
  return null;
}

/** Filtros del admin con sus estados (Cerrados = pedido creado + rechazado). */
export const QUOTE_FILTERS: { label: string; statuses: QuoteStatus[] | null }[] = [
  { label: "Todos", statuses: null },
  { label: "Nuevos", statuses: ["nuevo"] },
  { label: "Cotizados", statuses: ["cotizado"] },
  { label: "Aceptados", statuses: ["aceptado"] },
  { label: "Cerrados", statuses: ["pedido_creado", "rechazado"] },
];
