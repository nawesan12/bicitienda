import type { ReactNode } from "react";
import { cx } from "@/components/bt/cx";
import { FONT, MONO } from "@/components/bt/styles";

/* ── SelectedProductRow ("Bici a probar" de 2f) ───────────────
   Panel #1f1d1a borde #2b2824 radio 10, padding 14, gap 14: foto
   72×54 radio 6 + eyebrow mono 12 #8d867a + nombre 800 16 + acción
   ("Cambiar", 700 14 amarillo subrayado).
   ──────────────────────────────────────────────────────────── */

export function SelectedProductRow({
  eyebrow,
  title,
  image,
  action,
  className,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  image?: string | null;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "flex items-center gap-[14px] rounded-card border border-line bg-surface p-[14px] text-paper",
        FONT,
        className,
      )}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element -- miniatura ya transformada (Cloudinary)
        <img src={image} alt="" className="h-[54px] w-[72px] flex-none rounded-btn bg-card-photo object-cover" />
      ) : (
        <span aria-hidden className="h-[54px] w-[72px] flex-none rounded-btn bg-surface-3" />
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
        <span className={cx(MONO, "text-[12px] font-semibold uppercase text-text-3")}>{eyebrow}</span>
        <span className="truncate text-[15px] font-extrabold md:text-[16px]">{title}</span>
      </span>
      {action && <span className="flex-none pr-2">{action}</span>}
    </div>
  );
}
