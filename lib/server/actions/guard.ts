import { hasAdminSession } from "@/lib/server/admin-auth";
import { withinRateLimit } from "@/lib/server/rate-limit";

/**
 * ÚNICA puerta de sesión de las server actions del admin: nadie lee la
 * cookie directo fuera de acá (el proxy corta la navegación, pero las
 * actions son endpoints propios y validan por su cuenta). Los inputs se
 * validan con zod en cada action; este guard verifica la sesión y aplica
 * el rate-limit del panel.
 *
 * El tope es generoso porque el panel guarda solo (autosave con debounce:
 * una edición larga dispara decenas de guardados por minuto), pero frena
 * un script que martille las actions con una cookie robada.
 *
 * El panel tiene un único PIN: no hay identidad por usuario, así que el
 * actor de los movimientos de stock es siempre "admin".
 */
export const ADMIN_ACTIONS_PER_MINUTE = 300;

export async function requireAdmin(): Promise<{ actor: "admin" }> {
  if (!(await hasAdminSession())) {
    throw new Error("Sesión requerida");
  }
  if (!(await withinRateLimit("admin-actions", ADMIN_ACTIONS_PER_MINUTE))) {
    throw new Error("Demasiados cambios seguidos. Esperá un minuto.");
  }
  return { actor: "admin" };
}
