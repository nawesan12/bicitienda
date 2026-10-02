import type { ReactNode } from "react";
import { cx } from "./cx";
import { FONT } from "./styles";

/**
 * Estado vacío (no está en el handoff; armado con su lenguaje): caja con
 * borde punteado 1.5 #3a362f radio 10, eyebrow amarillo opcional, título
 * Archivo 900 @66 % uppercase y texto #cfc8bb. La acción va debajo.
 */
export function EmptyState({
  title,
  description,
  eyebrow,
  action,
  size = "md",
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  action?: ReactNode;
  /** sm = dentro de un panel (sin borde, 28 px) · md = sección (40 px). */
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div
      className={cx(
        "flex flex-col items-center gap-3 text-center text-paper",
        size === "md" && "rounded-card border-[1.5px] border-dashed border-line-strong px-6 py-12 md:px-10 md:py-16",
        size === "sm" && "px-4 py-8",
        FONT,
        className,
      )}
    >
      {eyebrow && (
        <span className="text-[12px] font-bold uppercase tracking-[.08em] text-yellow">{eyebrow}</span>
      )}
      <p
        className={cx(
          "m-0 font-black uppercase stretch-66",
          size === "md" ? "text-[40px] leading-[.9]" : "text-[28px] leading-[.95]",
        )}
      >
        {title}
      </p>
      {description && (
        <p className="m-0 max-w-[480px] text-[15px] leading-[1.5] text-text-2 md:text-[16px]">{description}</p>
      )}
      {action && <div className="mt-2 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );
}
