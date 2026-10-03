"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

/**
 * Modal de confirmación del panel con el lenguaje bt (panel #1f1d1a,
 * título Archivo 900 @70 % y botones del handoff; la acción en rojo si
 * es destructiva). Se usa
 * como promesa: `if (await confirm({...})) hacerLo()`.
 */
export interface ConfirmOptions {
  title: string;
  message: string;
  /** Texto del botón de acción, p. ej. "Sí, eliminar". */
  label: string;
  destructive?: boolean;
  /** Ícono del círculo (✕, ↺, !, →). Por defecto "!" si es destructiva, "✓" si no. */
  icon?: string;
}

const ConfirmContext = createContext<
  (opts: ConfirmOptions) => Promise<boolean>
>(() => Promise.resolve(false));

export function useConfirm() {
  return useContext(ConfirmContext);
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<(ok: boolean) => void>(null);

  const confirm = useCallback((o: ConfirmOptions) => {
    setOpts(o);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  function settle(ok: boolean) {
    resolver.current?.(ok);
    resolver.current = null;
    setOpts(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {opts && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 font-sans">
          <button
            type="button"
            aria-label="Cancelar"
            onClick={() => settle(false)}
            className="animate-fade-in absolute inset-0 cursor-default bg-ink-deep/80"
          />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            className="animate-admin-pop relative flex w-[440px] max-w-full flex-col gap-[14px] rounded-card border border-line bg-surface p-6 text-paper shadow-[0_40px_90px_rgba(0,0,0,.5)] md:p-7"
          >
            <span
              aria-hidden
              className={`flex size-11 items-center justify-center rounded-full text-[20px] font-black ${
                opts.destructive ? "bg-red text-paper" : "bg-yellow text-ink"
              }`}
            >
              {opts.icon ?? (opts.destructive ? "!" : "✓")}
            </span>
            <p id="confirm-title" className="m-0 text-[30px] font-black uppercase leading-[.95] stretch-70">
              {opts.title}
            </p>
            <p className="m-0 text-[15px] leading-[1.5] text-text-2">{opts.message}</p>
            <div className="mt-2 flex flex-col-reverse gap-[10px] sm:flex-row">
              <button
                type="button"
                onClick={() => settle(false)}
                className="flex flex-1 items-center justify-center rounded-btn border-[1.5px] border-line-btn px-4 py-[13px] text-[14px] font-extrabold uppercase tracking-[.06em] text-paper transition-colors duration-150 hover:border-text-4 max-md:min-h-[50px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow"
              >
                Cancelar
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => settle(true)}
                className={`flex flex-1 items-center justify-center rounded-btn px-4 py-[14.5px] text-[14px] font-extrabold uppercase tracking-[.06em] transition-colors duration-150 max-md:min-h-[52px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow ${
                  opts.destructive ? "bg-red text-paper hover:bg-red-light" : "bg-yellow text-ink hover:bg-brand-hover"
                }`}
              >
                {opts.label}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
