"use client";

import { useSyncExternalStore } from "react";

/**
 * Estado de sesión del cliente compartido entre islas (header, barra de
 * beneficios, bloque del home). Lo escribe StoreChrome cuando resuelve
 * getMyAccount(); el resto solo lee, así la sesión se pide una sola vez.
 * "unknown" hasta que responde: las promos de registro se muestran igual
 * (la mayoría de las visitas no tiene cuenta) y se ocultan si hay sesión.
 */
export type MemberState = "unknown" | "guest" | "member";

let state: MemberState = "unknown";
const listeners = new Set<() => void>();

export function setMemberState(next: MemberState) {
  if (next === state) return;
  state = next;
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useMemberState(): MemberState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => "unknown",
  );
}
