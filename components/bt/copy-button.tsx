"use client";

import { useState } from "react";
import { cx } from "./cx";
import { FONT, FOCUS, TRANSITION } from "./styles";

/**
 * Botón chico "Copiar" (CBU, alias, número de pedido). Borde #3a362f r6,
 * 700 12 uppercase .08em; tras copiar dice "Copiado" en amarillo 2 s.
 */
export function CopyButton({
  value,
  label = "Copiar",
  doneLabel = "Copiado",
  className,
}: {
  value: string;
  label?: string;
  doneLabel?: string;
  className?: string;
}) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {
          /* sin permiso de portapapeles: no pasa nada */
        }
      }}
      className={cx(
        "min-h-[44px] flex-none rounded-btn border border-line-strong px-3 text-[12px] font-bold uppercase tracking-[.08em] hover:border-text-4 md:min-h-[36px]",
        done ? "text-yellow" : "text-paper",
        FONT,
        TRANSITION,
        FOCUS,
        className,
      )}
    >
      <span aria-live="polite">{done ? doneLabel : label}</span>
    </button>
  );
}
