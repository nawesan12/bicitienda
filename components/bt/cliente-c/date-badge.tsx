import { cx } from "../cx";
import { FONT } from "../styles";

/* ── DateBadge (próximo turno 2g / 4f) ────────────────────────
   Bloque tinta con texto amarillo:
   - lg (2g): radio 8, padding 18, gap 2; día de semana / caption
     700 14 uppercase .08em; número 900 72/.9 @70.
   - sm (4f): radio 6, padding 10×14; textos 700 11; número 900 40/.9.
   ──────────────────────────────────────────────────────────── */

export function DateBadge({
  weekday,
  day,
  caption,
  size = "lg",
  className,
}: {
  weekday: string;
  day: string;
  caption: string;
  size?: "lg" | "sm";
  className?: string;
}) {
  const lg = size === "lg";
  return (
    <div
      className={cx(
        "flex flex-none flex-col items-center justify-center gap-[2px] bg-ink text-center text-yellow",
        lg ? "rounded-box p-[18px]" : "rounded-btn px-[14px] py-[10px]",
        FONT,
        className,
      )}
    >
      <span className={cx("font-bold uppercase", lg ? "text-[14px] tracking-[.08em]" : "text-[11px]")}>{weekday}</span>
      <span className={cx("font-black leading-[.9] stretch-70", lg ? "text-[72px]" : "text-[40px]")}>{day}</span>
      <span className={cx("font-bold uppercase", lg ? "text-[14px] tracking-[.08em]" : "text-[11px]")}>{caption}</span>
    </div>
  );
}
