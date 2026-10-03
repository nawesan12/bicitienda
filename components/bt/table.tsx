import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { cx } from "./cx";
import { FONT, MONO, SELECTED_ROW, TRANSITION } from "./styles";

/**
 * Tabla del admin (3a, 3c, 3e, 5b, 2i). Grilla CSS por fila:
 * - header: fondo #1a1816, JetBrains Mono 600 11 px uppercase #8d867a,
 *   padding 14×22.
 * - filas: padding 18×22, 14 px, borde superior #2b2824.
 * - seleccionada: amarillo 6 % + barra inset 3 px amarilla.
 * - contenedor: borde #2b2824, radio 10.
 * `density="compact"` = tabla interna de variantes (3d): header #121110,
 * padding 12×18 / 10×18, gap 12, radio 8.
 *
 * Fila clickeable: `rowHref` (link que cubre la fila; ideal desde un
 * server component con ?sel=) u `onRowClick` (solo desde cliente). Los
 * controles dentro de una celda clickeable necesitan `relative z-10`.
 */

export interface TableColumn<T> {
  key: string;
  header: ReactNode;
  /** Pista de la grilla: "96px", "minmax(0,1fr)", "168px"… */
  width: string;
  align?: "left" | "right";
  cell: (row: T) => ReactNode;
  className?: string;
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  selectedKey?: string;
  rowHref?: (row: T) => string;
  /** Texto accesible del link de la fila (por defecto la clave). */
  rowLabel?: (row: T) => string;
  onRowClick?: (row: T) => void;
  /** Gap entre columnas: 24 (pedidos/productos) o 20 (clientes/presupuestos). */
  gap?: 12 | 20 | 24;
  density?: "default" | "compact";
  /** Contenido cuando no hay filas. */
  empty?: ReactNode;
  caption?: string;
  className?: string;
}

const GAP = { 12: "gap-x-3", 20: "gap-x-5", 24: "gap-x-6" } as const;

export function Table<T>({
  columns,
  rows,
  getRowKey,
  selectedKey,
  rowHref,
  rowLabel,
  onRowClick,
  gap = 24,
  density = "default",
  empty,
  caption,
  className,
}: TableProps<T>) {
  const compact = density === "compact";
  const grid: CSSProperties = { gridTemplateColumns: columns.map((c) => c.width).join(" ") };
  const align = (c: TableColumn<T>) => (c.align === "right" ? "text-right justify-self-end" : "");

  return (
    <div
      role="table"
      aria-label={caption}
      className={cx(
        "min-w-0 overflow-hidden border border-line text-paper",
        compact ? "rounded-box" : "rounded-card",
        FONT,
        className,
      )}
    >
      <div
        role="row"
        style={grid}
        className={cx(
          "grid text-[11px] font-semibold uppercase text-text-3",
          MONO,
          compact ? "bg-ink px-[18px] py-3" : "bg-surface-2 px-[22px] py-[14px]",
          compact ? GAP[12] : GAP[gap],
        )}
      >
        {columns.map((c) => (
          <span key={c.key} role="columnheader" className={align(c)}>
            {c.header}
          </span>
        ))}
      </div>

      {rows.length === 0 && empty && (
        <div className="border-t border-line px-[22px] py-[18px] text-[14px] text-text-3">{empty}</div>
      )}

      {rows.map((row) => {
        const key = getRowKey(row);
        const selected = key === selectedKey;
        const href = rowHref?.(row);
        return (
          <div
            key={key}
            role="row"
            aria-selected={selectedKey !== undefined ? selected : undefined}
            style={grid}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={cx(
              "relative grid items-center border-t border-line text-[14px]",
              compact ? "px-[18px] py-[10px]" : "px-[22px] py-[18px]",
              compact ? GAP[12] : GAP[gap],
              (href || onRowClick) && "cursor-pointer hover:bg-paper/4",
              selected && SELECTED_ROW,
              TRANSITION,
            )}
          >
            {href && (
              <Link
                href={href}
                scroll={false}
                aria-label={rowLabel?.(row) ?? key}
                aria-current={selected ? "true" : undefined}
                className="absolute inset-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-yellow"
              />
            )}
            {columns.map((c) => (
              <div key={c.key} role="cell" className={cx("min-w-0", align(c), c.className)}>
                {c.cell(row)}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

/* ── Celdas de uso común ───────────────────────────────────── */

/** Dos líneas: principal 700 + secundaria 12–13 px #8d867a, ambas con ellipsis. */
export function CellStack({
  primary,
  secondary,
  secondarySize = 13,
}: {
  primary: ReactNode;
  secondary?: ReactNode;
  secondarySize?: 12 | 13;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-[3px]">
      <span className="truncate font-bold">{primary}</span>
      {secondary && (
        <span
          className={cx(
            "truncate text-text-3",
            secondarySize === 12 ? "text-[12px]" : "text-[13px]",
          )}
        >
          {secondary}
        </span>
      )}
    </div>
  );
}

/** Dato mono (número de pedido, SKU, WhatsApp): 600 12–13 px. */
export function CellMono({
  children,
  size = 13,
  tone = "paper",
}: {
  children: ReactNode;
  size?: 12 | 13;
  tone?: "paper" | "muted" | "soft";
}) {
  return (
    <span
      className={cx(
        "block truncate font-semibold",
        MONO,
        size === 12 ? "text-[12px]" : "text-[13px]",
        tone === "muted" && "text-text-3",
        tone === "soft" && "text-text-2",
      )}
    >
      {children}
    </span>
  );
}

/** Miniatura 64×48 radio 6 (productos, ítems del pedido). */
export function CellThumb({ src, alt = "", size = "md" }: { src: string; alt?: string; size?: "sm" | "md" }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- URLs de Cloudinary ya transformadas
    <img
      src={src}
      alt={alt}
      className={cx(
        "block rounded-btn object-cover",
        size === "md" ? "h-[48px] w-[64px]" : "h-[46px] w-[60px]",
      )}
    />
  );
}
