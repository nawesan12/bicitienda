"use client";

import { cx as cn } from "@/components/admin/cx";

/**
 * Piezas visuales del panel, con las medidas literales del prototipo del
 * admin (`Rodar MDQ Admin.dc.html`). Las secciones las componen; ninguna
 * repite estilos a mano.
 *
 * En mobile (<860px) todo lo tocable mide al menos 44px de alto.
 */

/** Alto mínimo táctil en mobile + centrado del contenido. */
export const tap = "inline-flex items-center justify-center max-[859px]:min-h-11";

/* ── Botones ──────────────────────────────────────────────── */

/** Negro → verde: "+ Nuevo vehículo", "Exportar CSV". */
export const btnDark = cn(
  tap,
  "whitespace-nowrap rounded-full bg-ink px-[22px] py-3 font-sans text-[13px] font-bold text-cream transition-colors hover:bg-brand hover:text-night disabled:opacity-50",
);

/** Gris con hover rojo: "↺ Restaurar…", "Vaciar". */
export const btnGhost = cn(
  tap,
  "whitespace-nowrap rounded-full border-[1.5px] border-ink/18 px-[18px] py-[11px] font-sans text-xs font-bold text-ink/50 transition-colors hover:border-danger/40 hover:text-danger disabled:opacity-50",
);

/** Rojo contorneado → relleno: "Eliminar", "Quitar foto". */
export const btnDanger = cn(
  tap,
  "whitespace-nowrap rounded-full border-[1.5px] border-danger/40 px-[18px] py-[11px] font-sans text-[12.5px] font-bold text-danger transition-colors hover:bg-danger hover:text-white disabled:opacity-50",
);

/** Verde contorneado → relleno: "Editar", "Agregar", "Ver con datos de ejemplo". */
export const btnGreen = cn(
  tap,
  "whitespace-nowrap rounded-full border-[1.5px] border-brand/50 px-4 py-2 font-sans text-xs font-bold text-brand-deep transition-colors hover:bg-brand hover:text-night disabled:opacity-50",
);

/** Contorno neutro: "Duplicar", "Pegar ficha completa". */
export const btnOutline = cn(
  tap,
  "whitespace-nowrap rounded-full border-[1.5px] border-ink/20 px-[22px] py-3 font-sans text-[13px] font-bold text-ink transition-colors hover:border-ink disabled:opacity-50",
);

/** Círculo de 34px: ↑ ↓ ✕ de las categorías. */
export function roundBtn(danger = false) {
  return cn(
    "box-border flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full border-[1.5px] font-sans text-[13px] font-bold transition-colors max-[859px]:h-11 max-[859px]:w-11",
    danger
      ? "border-danger/35 text-danger hover:bg-danger hover:text-white"
      : "border-ink/15 text-ink hover:border-brand hover:text-brand-deeper",
  );
}

/** ✕ suelto de las filas (consultas, agenda, specs extra). */
export const btnX = cn(
  tap,
  "px-2 py-[6px] font-sans text-[13px] font-bold text-ink/40 transition-colors hover:text-danger max-[859px]:min-w-11",
);

/* ── Pestañas y pills ─────────────────────────────────────── */

/** Pestaña-pill (Catálogo/Categorías, filtros de Consultas, tabs de Contenido). */
export function tabPill(on: boolean, small = false) {
  return cn(
    tap,
    "whitespace-nowrap rounded-full border-[1.5px] font-sans text-[12.5px] font-bold transition-colors hover:border-ink",
    small ? "px-[15px] py-[9px]" : "px-[18px] py-[10px]",
    on ? "border-ink bg-ink text-brand" : "border-ink/18 bg-white text-ink/65",
  );
}

/**
 * Pill de estado clickeable de las filas (EN STOCK, VISIBLE, NUEVA…). Los
 * colores llegan del caller: cada estado del prototipo tiene los suyos.
 */
export function statePill(className: string) {
  return cn(
    tap,
    "whitespace-nowrap rounded-full border-[1.5px] px-[13px] py-2 font-sans text-[11px] font-bold tracking-[.08em] transition-colors hover:border-ink",
    className,
  );
}

export function Badge({
  children,
  dark = false,
  className,
}: {
  children: React.ReactNode;
  dark?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-[3px] font-sans text-[9px] font-bold tracking-[.12em]",
        dark ? "bg-night text-brand" : "bg-brand-pastel text-brand-deeper",
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ── Tarjetas y formularios ───────────────────────────────── */

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-[18px] border border-ink/10 bg-white p-[26px] max-[859px]:p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("font-display text-[17px] font-extrabold tracking-normal", className)}>
      {children}
    </div>
  );
}

/** Grilla de tarjetas del prototipo: auto-fit con mínimo 340px. */
export function CardGrid({
  children,
  min = 340,
  className,
}: {
  children: React.ReactNode;
  min?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("grid items-start gap-[18px]", className)}
      style={{ gridTemplateColumns: `repeat(auto-fit,minmax(min(${min}px,100%),1fr))` }}
    >
      {children}
    </div>
  );
}

export function Label({
  children,
  className,
  htmlFor,
}: {
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        "font-sans text-[10.5px] font-bold tracking-[.18em] text-ink/50",
        className,
      )}
    >
      {children}
    </label>
  );
}

/** Texto de ayuda gris bajo un bloque. */
export function Hint({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("font-sans text-xs leading-[1.6] text-ink/50", className)}>
      {children}
    </div>
  );
}

/** Bajada de sección (arriba de listados). */
export function Lead({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "max-w-[60ch] font-sans text-[13px] leading-[1.6] text-ink/55",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Input del panel: crema (#fafaf6) en las secciones, blanco en los modales. */
export function inputCls(onWhite = false) {
  return cn(
    "box-border min-w-0 rounded-[10px] border-[1.5px] border-ink/15 px-[14px] py-3 font-sans text-[13.5px] text-ink outline-none transition-colors placeholder:text-ink/50 focus:border-brand",
    onWhite ? "bg-white" : "bg-cream-3",
  );
}

/** Fila-toggle grande (Ajustes, Estado del producto). */
export function ToggleRow({
  label,
  on,
  onLabel = "ACTIVADO",
  offLabel = "APAGADO",
  danger = false,
  onClick,
  disabled,
}: {
  label: string;
  on: boolean;
  onLabel?: string;
  offLabel?: string;
  /** El estado "apagado" es una alerta (rojo), como SIN STOCK u OCULTO. */
  danger?: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  const off = danger
    ? "border-danger/50 bg-danger-bg"
    : "border-ink/15 bg-cream-3";
  const offTxt = danger ? "text-danger" : "text-ink/45";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "box-border flex w-full items-center justify-between gap-3 rounded-[14px] border-[1.5px] px-[18px] py-[15px] text-left text-ink transition-colors hover:border-ink disabled:opacity-60",
        on ? "border-brand bg-brand-pastel" : off,
      )}
    >
      <span className="font-sans text-sm font-semibold">{label}</span>
      <span
        className={cn(
          "font-sans text-xs font-extrabold",
          on ? "text-brand-deeper" : offTxt,
        )}
      >
        {on ? onLabel : offLabel}
      </span>
    </button>
  );
}

/** Contenedor de foto con fondo rayado (galería, local, catálogo). */
export function PhotoBox({
  src,
  alt,
  contain = false,
  placeholder,
  className,
}: {
  src: string | null;
  alt: string;
  contain?: boolean;
  placeholder?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative aspect-[4/3] overflow-hidden rounded-xl border border-ink/10",
        className,
      )}
      style={{
        background:
          "repeating-linear-gradient(-45deg,#f7f6f1 0 10px,#efeee7 10px 20px)",
      }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className={cn(
            "absolute inset-0 h-full w-full",
            contain ? "object-contain mix-blend-multiply" : "object-cover",
          )}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center p-2 text-center font-sans text-[11px] font-medium leading-[1.5] text-ink/45">
          {placeholder}
        </div>
      )}
    </div>
  );
}

/** Estado vacío con borde punteado. */
export function EmptyState({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-[18px] border-[1.5px] border-dashed border-ink/18 bg-white px-6 py-10 text-center">
      <div className="font-display text-lg font-extrabold tracking-normal">{title}</div>
      {children}
    </div>
  );
}
