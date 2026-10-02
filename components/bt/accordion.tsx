import type { ReactNode } from "react";
import { cx } from "./cx";
import { FONT, MONO } from "./styles";

/**
 * Acordeón con <details> nativo (4c "Especificaciones" / "Para quién es"):
 * fila min-h 56 con borde inferior #2b2824, título Archivo 900 22 px @72 %
 * uppercase, "+" / "−" amarillo 800 20 px. Sin JS.
 * Envolver en <AccordionGroup> para el borde superior.
 */
export function Accordion({
  title,
  defaultOpen,
  name,
  children,
  className,
}: {
  title: ReactNode;
  defaultOpen?: boolean;
  /** Mismo `name` en varios = solo uno abierto a la vez (exclusivo). */
  name?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <details
      name={name}
      open={defaultOpen}
      className={cx("group/acc border-b border-line text-paper", FONT, className)}
    >
      <summary
        className={cx(
          "flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden",
          "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-yellow",
        )}
      >
        <span className="text-[22px] font-black uppercase stretch-72">{title}</span>
        <span aria-hidden className="text-[20px] font-extrabold text-yellow">
          <span className="group-open/acc:hidden">+</span>
          <span className="hidden group-open/acc:inline">−</span>
        </span>
      </summary>
      <div className="pb-4">{children}</div>
    </details>
  );
}

export function AccordionGroup({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("flex flex-col border-t border-line", className)}>{children}</div>;
}

/**
 * Lista clave/valor de specs. `variant="mobile"`: filas 11 px de padding,
 * clave #8d867a 14 px (4c). `variant="desktop"`: clave mono 12 px
 * uppercase en columna de 200 px, valor 15 px (2c).
 */
export function SpecList({
  items,
  variant = "desktop",
  className,
}: {
  items: { label: ReactNode; value: ReactNode }[];
  variant?: "desktop" | "mobile";
  className?: string;
}) {
  return (
    <dl
      className={cx(
        "m-0 flex flex-col",
        variant === "desktop" && "border-t border-line",
        FONT,
        className,
      )}
    >
      {items.map((it, i) =>
        variant === "desktop" ? (
          <div
            key={i}
            className="grid grid-cols-[140px_1fr] gap-3 border-b border-line py-[14px] text-[15px] md:grid-cols-[200px_1fr] md:gap-0"
          >
            <dt className={cx("pt-[2px] text-[12px] font-semibold uppercase text-text-3", MONO)}>
              {it.label}
            </dt>
            <dd className="m-0">{it.value}</dd>
          </div>
        ) : (
          <div
            key={i}
            className="flex justify-between gap-3 border-b border-line py-[11px] text-[14px]"
          >
            <dt className="text-text-3">{it.label}</dt>
            <dd className="m-0 text-right">{it.value}</dd>
          </div>
        ),
      )}
    </dl>
  );
}
