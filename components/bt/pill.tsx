import type { ReactNode } from "react";
import { cx } from "./cx";
import { FONT } from "./styles";

/**
 * Pill de estado. Archivo 800 uppercase .06em, padding 5×10, radio 999,
 * borde 1 px del mismo color que el fondo (salvo los contorneados).
 */

export type PillTone =
  | "red"
  | "red-outline"
  | "yellow"
  | "yellow-outline"
  | "dark"
  | "paper"
  | "line"
  | "muted"
  | "muted-strong";

const TONE: Record<PillTone, string> = {
  red: "bg-red text-white border-red",
  "red-outline": "bg-transparent text-red-light border-red",
  yellow: "bg-yellow text-ink border-yellow",
  "yellow-outline": "bg-transparent text-yellow border-yellow",
  dark: "bg-line-strong text-paper border-line-strong",
  paper: "bg-paper text-ink border-paper",
  line: "bg-line text-paper border-line",
  muted: "bg-transparent text-text-3 border-line-strong",
  "muted-strong": "bg-transparent text-text-3 border-line-muted",
};

const SIZE = {
  /** Mobile (4i, 4f): 10 px, 4–5×8–9. */
  sm: "px-[9px] py-[5px] text-[10px]",
  /** Admin (tablas y detalle): 11 px, 5×10. */
  md: "px-[10px] py-[5px] text-[11px]",
  /** Mi cuenta desktop: 12 px, 5×10. */
  lg: "px-[10px] py-[5px] text-[12px]",
} as const;

export type PillSize = keyof typeof SIZE;

export function Pill({
  tone,
  size = "md",
  className,
  children,
}: {
  tone: PillTone;
  size?: PillSize;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cx(
        "inline-block whitespace-nowrap rounded-pill border font-extrabold uppercase leading-[1.15] tracking-[.06em]",
        FONT,
        TONE[tone],
        SIZE[size],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ── Pedidos ──────────────────────────────────────────────────
   Claves de UI (no del core): B2/B3 mapean OrderStatus + medio de pago:
   PENDIENTE_PAGO + transferencia → transf_pendiente
   PENDIENTE_PAGO + efectivo      → paga_local
   PAGADO → pagado · EN_PREPARACION → armando · LISTO_RETIRO → listo
   RETIRADO → retirado · CANCELADO / VENCIDO → cancelado
   ──────────────────────────────────────────────────────────── */

export type OrderPillStatus =
  | "transf_pendiente"
  | "paga_local"
  | "pagado"
  | "armando"
  | "listo"
  | "retirado"
  | "cancelado";

export const ORDER_PILL: Record<OrderPillStatus, { label: string; tone: PillTone }> = {
  transf_pendiente: { label: "Transf. pendiente", tone: "red" },
  paga_local: { label: "Paga en local", tone: "yellow-outline" },
  pagado: { label: "Pagado", tone: "yellow" },
  armando: { label: "Armando", tone: "dark" },
  listo: { label: "Listo para retirar", tone: "paper" },
  retirado: { label: "Retirado", tone: "muted" },
  // Nueva (no está en el handoff): mismo lenguaje que "Rechazado".
  cancelado: { label: "Cancelado", tone: "muted-strong" },
};

export function OrderPill({
  status,
  size,
  className,
}: {
  status: OrderPillStatus;
  size?: PillSize;
  className?: string;
}) {
  const p = ORDER_PILL[status];
  return (
    <Pill tone={p.tone} size={size} className={className}>
      {p.label}
    </Pill>
  );
}

/* ── Presupuestos (= QuoteStatus del core) ─────────────────── */

export type QuotePillStatus = "nuevo" | "cotizado" | "aceptado" | "pedido_creado" | "rechazado";

export const QUOTE_PILL: Record<QuotePillStatus, { label: string; tone: PillTone }> = {
  nuevo: { label: "Nuevo", tone: "red" },
  cotizado: { label: "Cotizado", tone: "dark" },
  aceptado: { label: "Aceptado", tone: "yellow" },
  pedido_creado: { label: "Pedido creado", tone: "paper" },
  rechazado: { label: "Rechazado", tone: "muted-strong" },
};

export function QuotePill({
  status,
  size,
  className,
}: {
  status: QuotePillStatus;
  size?: PillSize;
  className?: string;
}) {
  const p = QUOTE_PILL[status];
  return (
    <Pill tone={p.tone} size={size} className={className}>
      {p.label}
    </Pill>
  );
}

/* ── Productos (3c) ───────────────────────────────────────── */

export type ProductPillStatus = "publicado" | "sin_stock" | "borrador";

export const PRODUCT_PILL: Record<ProductPillStatus, { label: string; tone: PillTone }> = {
  publicado: { label: "Publicado", tone: "line" },
  sin_stock: { label: "Sin stock", tone: "red" },
  borrador: { label: "Borrador", tone: "muted-strong" },
};

export function ProductPill({
  status,
  size,
  className,
}: {
  status: ProductPillStatus;
  size?: PillSize;
  className?: string;
}) {
  const p = PRODUCT_PILL[status];
  return (
    <Pill tone={p.tone} size={size} className={className}>
      {p.label}
    </Pill>
  );
}

/* ── Turnos (= AppointmentStatus del core) ────────────────────
   El handoff muestra "Sin confirmar" con borde rojo (agenda) y los
   pasados contorneados apagados (Mi cuenta: "Asistió", "Reprogramado").
   ──────────────────────────────────────────────────────────── */

export type AppointmentPillStatus =
  | "pendiente"
  | "confirmado"
  | "asistio"
  | "no_asistio"
  | "cancelado"
  | "reprogramado";

export const APPOINTMENT_PILL: Record<AppointmentPillStatus, { label: string; tone: PillTone }> = {
  pendiente: { label: "Sin confirmar", tone: "red-outline" },
  confirmado: { label: "Confirmado", tone: "yellow-outline" },
  asistio: { label: "Asistió", tone: "muted" },
  no_asistio: { label: "No vino", tone: "muted-strong" },
  cancelado: { label: "Cancelado", tone: "muted-strong" },
  reprogramado: { label: "Reprogramado", tone: "muted" },
};

export function AppointmentPill({
  status,
  size,
  className,
}: {
  status: AppointmentPillStatus;
  size?: PillSize;
  className?: string;
}) {
  const p = APPOINTMENT_PILL[status];
  return (
    <Pill tone={p.tone} size={size} className={className}>
      {p.label}
    </Pill>
  );
}
