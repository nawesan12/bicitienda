"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

/**
 * Toast del admin (lenguaje bt): caja #0b0a09 con borde #3a362f y check
 * amarillo, abajo al centro, 2 segundos. Un solo provider en el layout del panel.
 */
const ToastContext = createContext<(msg: string) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((m: string) => {
    setMsg(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 2000);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {msg && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[26px] z-[300] flex justify-center px-4">
          <div
            role="status"
            className="animate-toast-in flex max-w-full items-center gap-[10px] rounded-btn border border-line-strong bg-ink-deep px-5 py-[13px] font-sans text-[14px] font-bold text-paper shadow-[0_16px_44px_rgba(0,0,0,.45)]"
          >
            <span className="flex size-5 flex-none items-center justify-center rounded-full bg-yellow text-[11px] font-black text-ink">
              ✓
            </span>
            {msg}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}
