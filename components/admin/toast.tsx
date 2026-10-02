"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

/**
 * Toast del admin, fiel al prototipo: pill negra con check verde, abajo al
 * centro, 2 segundos. Un solo provider en el layout del panel.
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
        <div className="pointer-events-none fixed inset-x-0 bottom-[26px] z-[300] flex justify-center">
          <div className="animate-toast-in flex max-w-[92vw] items-center gap-[10px] rounded-full border border-brand/50 bg-night px-6 py-[13px] font-sans text-[13px] font-bold text-cream shadow-[0_16px_44px_rgba(0,0,0,.4)]">
            <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-brand text-[11px] text-night">
              ✓
            </span>
            {msg}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}
