/**
 * El rayo de la marca, tal cual el path del handoff. Se usa como separador
 * del marquee y como marca de agua gigante en fondos verdes/oscuros.
 */
export function Bolt({
  width = 11,
  height = 15,
  stroke = "#0c0e0b",
  strokeWidth = 1.4,
  className,
}: {
  width?: number;
  height?: number;
  stroke?: string;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 12 16"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M7 1 2 9.2h3.2L4 15l6-8.2H6.8L8 1z"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Círculo negro con el rayo verde de la lista de servicios. */
export function BoltDot() {
  return (
    <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full bg-night">
      <svg width="10" height="14" viewBox="0 0 12 16" fill="none" aria-hidden="true">
        <path d="M7 1 2 9.2h3.2L4 15l6-8.2H6.8L8 1z" fill="#5eb838" />
      </svg>
    </span>
  );
}
