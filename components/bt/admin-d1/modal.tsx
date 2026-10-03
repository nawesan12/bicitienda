"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cx } from "../cx";
import { FOCUS, FONT, TRANSITION } from "../styles";

/* ── Modal (sin diseño en el handoff) ─────────────────────────
   <dialog> nativo (foco atrapado, Esc cierra): panel #1f1d1a con borde
   #2b2824, radio 10, padding 24, título 900 30/1 @70 uppercase; fondo
   ink al 75 %. En mobile ocupa el ancho con 16 px de margen.
   ──────────────────────────────────────────────────────────── */

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 480,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: 420 | 480 | 560;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cx(
        "m-auto max-h-[calc(100dvh-32px)] w-[calc(100vw-32px)] overflow-visible bg-transparent p-0 text-paper backdrop:bg-ink/75",
        width === 420 ? "max-w-[420px]" : width === 480 ? "max-w-[480px]" : "max-w-[560px]",
        FONT,
      )}
    >
      {open && (
        <div className={cx("flex max-h-[calc(100dvh-32px)] flex-col gap-5 overflow-y-auto rounded-card border border-line bg-surface p-6", className)}>
          <div className="flex items-start justify-between gap-4">
            <h2 className="m-0 text-[30px] font-black uppercase leading-none stretch-70">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className={cx(
                "-mr-2 -mt-2 flex size-11 flex-none items-center justify-center rounded-btn text-[20px] font-bold text-text-3 hover:text-paper",
                TRANSITION,
                FOCUS,
              )}
            >
              ✕
            </button>
          </div>
          {children}
          {footer && <div className="flex flex-wrap justify-end gap-[10px]">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

/** Mensaje de error de un formulario del admin (rojo claro 13 px). */
export function FormError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="m-0 text-[13px] font-semibold text-red-light">
      {children}
    </p>
  );
}
