import { cn } from "@/lib/cn";

/**
 * Material Symbols Outlined. El design system no usa emojis en ningún caso.
 * `filled` cambia el eje FILL de la fuente variable (equivale a `.msf`).
 */
export function Icon({
  name,
  size = 18,
  filled = false,
  color,
  className,
}: {
  name: string;
  size?: number;
  filled?: boolean;
  /** Color literal, para cuando sale de una paleta dinámica y no de una clase. */
  color?: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("ms", filled && "msf", className)}
      style={{ fontSize: size, color }}
    >
      {name}
    </span>
  );
}
