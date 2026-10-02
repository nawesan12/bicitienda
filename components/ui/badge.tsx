import { cn } from "@/lib/cn";

export type BadgeTone = "brand" | "neutral" | "success" | "warning" | "info" | "dark";

const TONES: Record<BadgeTone, string> = {
  brand: "bg-brand text-white",
  neutral: "bg-muted text-body",
  success: "bg-success-bg text-success",
  warning: "bg-warning-chip text-warning",
  info: "bg-info-bg text-info",
  dark: "bg-ink text-white",
};

/**
 * Etiqueta corta: "MÁS VENDIDO" sobre la foto, estados de pedido, tags de
 * cliente. Radio 3px, mayúsculas, tracking amplio.
 */
export function Badge({
  tone = "brand",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[3px] px-[9px] py-[4px]",
        "text-[10px] font-bold uppercase leading-none tracking-[.08em]",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Variante pastilla (radius 10px) usada en los chips de estado de Mi cuenta. */
export function StatusPill({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[10px] px-[10px] py-[4px]",
        "text-[10px] font-bold uppercase leading-none",
        className,
      )}
    >
      {children}
    </span>
  );
}
