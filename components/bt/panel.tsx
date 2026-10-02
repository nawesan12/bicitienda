import type { ReactNode } from "react";
import { cx } from "./cx";
import { FONT } from "./styles";

/* ── Panel / Card ─────────────────────────────────────────────
   surface:
   - "surface": #1f1d1a + borde #2b2824 (paneles, form card, detalle).
   - "outline": sin fondo, solo borde #2b2824 ("¿Preferís hablarlo directo?").
   - "paper": #f4efe4 con tinta (resumen de la confirmación 2e).
   - "yellow": amarillo con tinta (resumen del turno 2f, próximo turno).
   radius 10 (paneles) u 8 (cajas internas / mobile).
   padding: sm 16 · md 24 · lg 28 · xl 32 (mobile baja a 16–20).
   ──────────────────────────────────────────────────────────── */

export type PanelSurface = "surface" | "outline" | "paper" | "yellow";

const SURFACE: Record<PanelSurface, string> = {
  surface: "bg-surface border border-line text-paper",
  outline: "border border-line text-paper",
  paper: "bg-paper text-ink",
  yellow: "bg-yellow text-ink",
};

const PADDING = {
  none: "",
  sm: "p-4",
  md: "p-4 md:p-6",
  lg: "p-[18px] md:p-7",
  xl: "p-5 md:p-8",
} as const;

const GAP = {
  none: "",
  sm: "gap-[10px]",
  md: "gap-[14px]",
  lg: "gap-[18px]",
  xl: "gap-[22px]",
  "2xl": "gap-[30px]",
} as const;

export interface PanelProps {
  surface?: PanelSurface;
  padding?: keyof typeof PADDING;
  /** Gap vertical entre hijos (flex-col). */
  gap?: keyof typeof GAP;
  radius?: 8 | 10;
  as?: "div" | "section" | "aside" | "article" | "form";
  className?: string;
  children: ReactNode;
}

export function Panel({
  surface = "surface",
  padding = "md",
  gap = "lg",
  radius = 10,
  as: Tag = "div",
  className,
  children,
}: PanelProps) {
  return (
    <Tag
      className={cx(
        "flex min-w-0 flex-col",
        radius === 10 ? "rounded-card" : "rounded-box",
        SURFACE[surface],
        PADDING[padding],
        GAP[gap],
        FONT,
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/** Card = Panel solo con borde. */
export function Card(props: Omit<PanelProps, "surface">) {
  return <Panel surface="outline" {...props} />;
}

/** Título de panel: Archivo 900 26/1 @70 % uppercase (lg = 30, "Cómo sigue"). */
export function PanelTitle({
  children,
  size = "md",
  as: Tag = "h2",
  action,
  className,
}: {
  children: ReactNode;
  size?: "md" | "lg";
  as?: "h2" | "h3" | "span";
  /** Acción a la derecha ("+ Agregar variante", "EJEMPLO"). */
  action?: ReactNode;
  className?: string;
}) {
  const title = (
    <Tag
      className={cx(
        "m-0 font-black uppercase leading-none stretch-70",
        size === "md" ? "text-[26px]" : "text-[30px]",
        FONT,
        !action && className,
      )}
    >
      {children}
    </Tag>
  );
  if (!action) return title;
  return (
    <div className={cx("flex items-baseline justify-between gap-4", className)}>
      {title}
      {action}
    </div>
  );
}

/* ── TileGrid ─────────────────────────────────────────────────
   Grilla con divisores de 1 px (gap 1 sobre fondo #2b2824): tira de
   categorías, KPIs, pasos del home, retiro/stock del producto.
   Los hijos llevan su fondo (#121110 por defecto con <Tile>).
   ──────────────────────────────────────────────────────────── */

const COLS = {
  2: "grid-cols-2",
  3: "grid-cols-1 md:grid-cols-3",
  4: "grid-cols-2 md:grid-cols-4",
  7: "grid-cols-2 sm:grid-cols-4 lg:grid-cols-7",
} as const;

export function TileGrid({
  columns = 2,
  radius = 10,
  className,
  children,
}: {
  columns?: keyof typeof COLS;
  radius?: 8 | 10;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cx(
        "grid gap-px overflow-hidden border border-line bg-line",
        radius === 10 ? "rounded-card" : "rounded-box",
        COLS[columns],
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Tile({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cx("flex min-w-0 flex-col gap-1 bg-ink px-[18px] py-4 text-paper", FONT, className)}>
      {children}
    </div>
  );
}

/* ── Kpi ──────────────────────────────────────────────────────
   Label 700 12 px uppercase .08em #8d867a + valor Archivo 900 @70 %.
   lg 48 px (Resumen 2i, 22×28) · md 40 px (admin mobile 4h, 14) ·
   sm 30 px @72 % (ficha de cliente 3e, 14).
   tone: paper · yellow ("Para retirar", "Gastado") · red ("Transf. a validar").
   ──────────────────────────────────────────────────────────── */

const KPI_SIZE = {
  lg: { box: "px-7 py-[22px] gap-1", label: "text-[12px] tracking-[.08em]", value: "text-[48px] stretch-70" },
  md: { box: "p-[14px] gap-[2px]", label: "text-[11px] tracking-[.06em]", value: "text-[40px] stretch-70" },
  sm: { box: "p-[14px] gap-[2px]", label: "text-[11px] tracking-[.08em]", value: "text-[30px] stretch-72" },
} as const;

const KPI_TONE = {
  paper: "text-paper",
  yellow: "text-yellow",
  red: "text-red-light",
} as const;

export function Kpi({
  label,
  value,
  tone = "paper",
  size = "lg",
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  tone?: keyof typeof KPI_TONE;
  size?: keyof typeof KPI_SIZE;
  className?: string;
}) {
  const s = KPI_SIZE[size];
  return (
    <div className={cx("flex min-w-0 flex-col bg-ink", s.box, FONT, className)}>
      <span className={cx("font-bold uppercase text-text-3", s.label)}>{label}</span>
      <span className={cx("font-black leading-none", s.value, KPI_TONE[tone])}>{value}</span>
    </div>
  );
}

/** Fila de KPIs con divisores de 1 px. `flush` = sin borde ni radio (barra del Resumen). */
export function KpiGrid({
  columns = 4,
  flush,
  className,
  children,
}: {
  columns?: 2 | 3 | 4;
  flush?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cx(
        "grid gap-px overflow-hidden bg-line",
        flush ? "border-b border-line" : "rounded-box border border-line",
        columns === 2 && "grid-cols-2",
        columns === 3 && "grid-cols-3",
        columns === 4 && "grid-cols-2 md:grid-cols-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ── Divider ──────────────────────────────────────────────────
   Sólido #2b2824 o punteado (#3a362f sobre oscuro, #c9c0ae sobre paper).
   ──────────────────────────────────────────────────────────── */

export function Divider({
  variant = "solid",
  className,
}: {
  variant?: "solid" | "dashed" | "dashed-paper";
  className?: string;
}) {
  return (
    <hr
      className={cx(
        "m-0 h-0 border-0 border-t",
        variant === "solid" && "border-line",
        variant === "dashed" && "border-dashed border-line-strong",
        variant === "dashed-paper" && "border-dashed border-card-dash",
        className,
      )}
    />
  );
}
