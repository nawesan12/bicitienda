"use client";

import { useEffect } from "react";
import { cx as cn } from "@/components/admin/cx";

/**
 * Modal grande del panel (editor de producto y de nota): header oscuro con
 * grilla y sticky, pestañas con scroll horizontal, cuerpo y botonera. Como
 * el prototipo: máximo 96vw × 88vh con scroll interno.
 */
export function ModalShell({
  header,
  tabs,
  activeTab,
  onTab,
  footer,
  footerAlign = "between",
  onClose,
  width = 740,
  children,
}: {
  /** Contenido del header oscuro (foto/kicker/título). */
  header: React.ReactNode;
  tabs: { id: string; label: string }[];
  activeTab: string;
  onTab: (id: string) => void;
  footer: React.ReactNode;
  footerAlign?: "between" | "end";
  onClose: () => void;
  width?: number;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    // El fondo no scrollea mientras el modal está abierto.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-5 max-[859px]:p-2">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="animate-fade-in absolute inset-0 cursor-default bg-night/72 backdrop-blur-[4px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="animate-admin-pop relative max-h-[88vh] max-w-[96vw] overflow-y-auto rounded-3xl bg-cream shadow-[0_40px_90px_rgba(0,0,0,.5)]"
        style={{ width }}
      >
        <div
          className="bg-grid-dark sticky top-0 z-[2] flex items-center gap-4 rounded-t-3xl bg-night px-[26px] py-[22px] text-cream max-[859px]:px-4 max-[859px]:py-4"
          style={{ "--grid-size": "36px" } as React.CSSProperties}
        >
          {header}
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="inline-flex flex-none items-center justify-center px-[10px] py-[6px] font-sans text-[15px] font-bold text-cream/60 transition-colors hover:text-cream max-[859px]:min-h-11 max-[859px]:min-w-11"
          >
            ✕
          </button>
        </div>
        <div className="no-scrollbar flex gap-[6px] overflow-x-auto border-b border-ink/10 px-[26px] pt-4 max-[859px]:px-4">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onTab(t.id)}
              className={cn(
                "flex-none whitespace-nowrap rounded-t-xl border-b-[2.5px] px-4 py-[11px] font-sans text-[13px] font-bold transition-colors hover:text-ink max-[859px]:min-h-11",
                activeTab === t.id
                  ? "border-brand bg-white text-ink"
                  : "border-transparent text-ink/45",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="px-[26px] pb-7 pt-6 max-[859px]:px-4">{children}</div>
        <div
          className={cn(
            "flex flex-wrap gap-[10px] px-[26px] pb-6 max-[859px]:px-4",
            footerAlign === "end" ? "justify-end" : "justify-between",
          )}
        >
          {footer}
        </div>
      </div>
    </div>
  );
}
