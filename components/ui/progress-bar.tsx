import { cn } from "@/lib/cn";

/** Barra de progreso de 5px. Se usa para el avance hacia el envío gratis. */
export function ProgressBar({
  value,
  tone = "brand",
  className,
}: {
  /** Progreso 0–1. */
  value: number;
  tone?: "brand" | "success";
  className?: string;
}) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);

  return (
    <div
      className={cn("h-[5px] overflow-hidden rounded-[3px] bg-muted", className)}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn(
          "h-full rounded-[3px] transition-[width] duration-500",
          tone === "brand" ? "bg-brand" : "bg-success",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
