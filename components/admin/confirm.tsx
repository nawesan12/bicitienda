"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

/**
 * Modal de confirmación genérico del prototipo: icono circular, título,
 * mensaje y dos botones (el de acción en rojo si es destructiva). Se usa
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
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-5">
          <button
            type="button"
            aria-label="Cancelar"
            onClick={() => settle(false)}
            className="animate-fade-in absolute inset-0 cursor-default bg-night/75 backdrop-blur-[4px]"
          />
          <div className="animate-admin-pop relative w-[484px] max-w-[94vw] rounded-[22px] bg-cream p-8 text-center shadow-[0_40px_90px_rgba(0,0,0,.5)]">
            <div
              className={`mx-auto flex h-[58px] w-[58px] items-center justify-center rounded-full text-2xl font-bold ${
                opts.destructive
                  ? "bg-danger-bg text-danger"
                  : "bg-brand-pastel text-brand-deeper"
              }`}
            >
              {opts.icon ?? (opts.destructive ? "!" : "✓")}
            </div>
            <div className="font-display mt-4 text-[21px] tracking-normal text-ink">
              {opts.title}
            </div>
            <div className="mt-2 font-sans text-[13.5px] leading-relaxed text-ink/60">
              {opts.message}
            </div>
            <div className="mt-[22px] flex gap-[10px]">
              <button
                type="button"
                onClick={() => settle(false)}
                className="box-border flex flex-1 items-center justify-center rounded-full border-[1.5px] border-ink/20 py-[13px] font-sans text-[13.5px] font-bold text-ink transition-colors hover:border-ink"
              >
                Cancelar
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => settle(true)}
                className={`flex flex-1 items-center justify-center rounded-full py-[13px] font-sans text-[13.5px] font-bold transition-transform hover:-translate-y-[1px] ${
                  opts.destructive
                    ? "bg-danger text-white"
                    : "bg-ink text-cream"
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
