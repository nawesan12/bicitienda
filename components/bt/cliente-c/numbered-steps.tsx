import type { ReactNode } from "react";
import { cx } from "../cx";
import { FONT } from "../styles";

/* ── NumberedSteps ("Cómo sigue" de 5a) ───────────────────────
   Filas 44 | 1fr gap 12, padding 14×0, borde superior #2b2824:
   número 900 30/1 @70 amarillo; título 800 15; texto 14/1.4 #8d867a.
   ──────────────────────────────────────────────────────────── */

export function NumberedSteps({
  items,
  className,
}: {
  items: { n: string; title: ReactNode; text?: ReactNode }[];
  className?: string;
}) {
  return (
    <ol className={cx("m-0 flex list-none flex-col p-0", FONT, className)}>
      {items.map((it) => (
        <li key={it.n} className="grid grid-cols-[44px_1fr] gap-3 border-t border-line py-[14px]">
          <span aria-hidden className="text-[30px] leading-none font-black text-yellow stretch-70">
            {it.n}
          </span>
          <span className="flex flex-col gap-[2px]">
            <span className="text-[15px] font-extrabold">{it.title}</span>
            {it.text && <span className="text-[14px] leading-[1.4] text-text-3">{it.text}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}
