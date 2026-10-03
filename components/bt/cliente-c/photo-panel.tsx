import type { ReactNode } from "react";
import { cx } from "../cx";
import { FONT } from "../styles";

/* ── PhotoPanel (2h / 4g) ─────────────────────────────────────
   Foto cover + gradiente + contenido abajo.
   - Desktop: padding 56, gradiente 180° rgba(18,17,16,.15) 30% →
     rgba(18,17,16,.92).
   - Mobile: alto 220, padding 16, gradiente .1 → .92.
   ──────────────────────────────────────────────────────────── */

export function PhotoPanel({
  src,
  alt,
  children,
  className,
}: {
  src: string;
  alt: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "relative flex flex-col justify-end gap-4 overflow-hidden p-4 text-paper max-md:h-[220px] md:p-14",
        FONT,
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- foto ya transformada (Cloudinary/Pexels) */}
      <img src={src} alt={alt} className="absolute inset-0 size-full object-cover" />
      <span
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,17,16,.1),rgba(18,17,16,.92))] md:bg-[linear-gradient(180deg,rgba(18,17,16,.15)_30%,rgba(18,17,16,.92))]"
      />
      <div className="relative flex flex-col gap-4">{children}</div>
    </div>
  );
}
