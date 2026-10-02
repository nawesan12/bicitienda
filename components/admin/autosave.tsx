"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/admin/toast";

/**
 * Guardado automático del panel: cada campo guarda solo, con debounce,
 * llamando a su server action. Sin botón "Guardar" (como el prototipo:
 * "Guardado automático activo"). Al perder el foco se guarda en el acto.
 *
 * La action devuelve `{ ok }`; si falla se muestra el error en el toast y
 * el campo conserva lo tipeado.
 */

export type SaveResult = { ok: true } | { ok: false; error: string } | void;

export const AUTOSAVE_DELAY = 600;

/**
 * Debounce de una función de guardado. `schedule(v)` reprograma; `flush()`
 * guarda ya lo pendiente (blur, cierre de modal). `onSaved` corre tras un
 * guardado exitoso (p. ej. el toast del prototipo).
 */
export function useDebouncedSave<T>(
  save: (value: T) => Promise<SaveResult>,
  opts: { delay?: number; onSaved?: (value: T) => void } = {},
) {
  const toast = useToast();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<{ value: T } | null>(null);
  const saveRef = useRef(save);
  const onSavedRef = useRef(opts.onSaved);
  useEffect(() => {
    saveRef.current = save;
    onSavedRef.current = opts.onSaved;
  });

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const p = pending.current;
    pending.current = null;
    if (!p) return;
    try {
      const res = await saveRef.current(p.value);
      if (res && !res.ok) toast(res.error);
      else onSavedRef.current?.(p.value);
    } catch (err) {
      toast(err instanceof Error ? err.message : "No se pudo guardar. Probá de nuevo.");
    }
  }, [toast]);

  const schedule = useCallback(
    (value: T) => {
      pending.current = { value };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, opts.delay ?? AUTOSAVE_DELAY);
    },
    [flush, opts.delay],
  );

  // Lo pendiente no se pierde al desmontar (cerrar el modal, cambiar de tab).
  useEffect(() => () => void flush(), [flush]);

  return { schedule, flush };
}

/**
 * Input/textarea con estado propio que guarda solo. `transform` normaliza
 * lo que se guarda (p. ej. precio "1.250.000" → 1250000).
 */
export function AutoField<T = string>({
  initial,
  onSave,
  onSaved,
  transform,
  multiline = false,
  rows,
  className,
  ...props
}: {
  initial: string;
  onSave: (value: T) => Promise<SaveResult>;
  onSaved?: (value: T) => void;
  transform?: (raw: string) => T;
  multiline?: boolean;
  rows?: number;
  className?: string;
} & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "defaultValue"
>) {
  const [value, setValue] = useState(initial);
  const [prevInitial, setPrevInitial] = useState(initial);
  const [focused, setFocused] = useState(false);
  const { schedule, flush } = useDebouncedSave<T>(onSave, { onSaved });
  const conv = (raw: string) => (transform ? transform(raw) : (raw as unknown as T));
  // Un cambio que llega del server (revertir, restablecer, otra pestaña)
  // se refleja, salvo mientras se está escribiendo en el campo.
  if (initial !== prevInitial && !focused) {
    setPrevInitial(initial);
    setValue(initial);
  }
  const blur = () => {
    setFocused(false);
    void flush();
  };

  if (multiline) {
    return (
      <textarea
        value={value}
        rows={rows}
        onChange={(e) => {
          setValue(e.target.value);
          schedule(conv(e.target.value));
        }}
        onFocus={() => setFocused(true)}
        onBlur={blur}
        className={className}
        placeholder={props.placeholder}
        aria-label={props["aria-label"]}
      />
    );
  }
  return (
    <input
      {...props}
      value={value}
      onChange={(e) => {
        setValue(e.target.value);
        schedule(conv(e.target.value));
      }}
      onFocus={() => setFocused(true)}
      onBlur={blur}
      className={className}
    />
  );
}

/** "1.250.000" / "$ 1250000" → 1250000; vacío → null. */
export function parseMoney(raw: string): number | null {
  const n = parseInt(raw.replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

/** "10,5" → 10.5; vacío → 0. */
export function parsePct(raw: string): number {
  const n = parseFloat(raw.replace(/[^\d.,]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}
