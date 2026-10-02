import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Token de sesión de las cuentas de cliente, firmado con HMAC-SHA256.
 * SEPARADO del admin: otra cookie (`customer_session`), otro secreto
 * (CUSTOMER_SESSION_SECRET) y otro formato — una cookie de cliente nunca
 * abre el panel ni al revés.
 *
 * Formato: `c1.<accountId>.<sessionVersion>.<expMs>.<firma base64url>`.
 * `sessionVersion` se compara contra la cuenta en la base: subirlo (al
 * recuperar la contraseña) invalida todas las sesiones abiertas.
 */

export const CUSTOMER_COOKIE = "customer_session";

/** Duración de la sesión: 30 días. */
export const CUSTOMER_SESSION_TTL_MS = 30 * 24 * 3600_000;

export function customerSessionSecret(): string | null {
  const secret = process.env.CUSTOMER_SESSION_SECRET;
  if (secret && secret.length >= 16) return secret;
  if (process.env.NODE_ENV === "production") return null;
  return "dev-only-customer-session-secret-no-usar-en-produccion";
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createCustomerToken(
  accountId: string,
  sessionVersion: number,
  secret: string,
  ttlMs = CUSTOMER_SESSION_TTL_MS,
): { token: string; expires: Date } {
  const exp = Date.now() + ttlMs;
  const payload = `c1.${accountId}.${sessionVersion}.${exp}`;
  return { token: `${payload}.${sign(payload, secret)}`, expires: new Date(exp) };
}

/** Datos del token si la firma es válida y no venció; si no, null. */
export function readCustomerToken(
  token: string | undefined | null,
  secret: string | null,
): { accountId: string; sessionVersion: number } | null {
  if (!token || !secret || token.length > 300) return null;
  const parts = token.split(".");
  if (parts.length !== 5 || parts[0] !== "c1") return null;
  const [v, accountId, versionRaw, expRaw, sig] = parts;
  const exp = Number(expRaw);
  const sessionVersion = Number(versionRaw);
  if (!Number.isFinite(exp) || exp <= Date.now() || !Number.isInteger(sessionVersion)) return null;
  if (!/^[0-9a-f-]{36}$/.test(accountId)) return null;
  const expected = Buffer.from(sign(`${v}.${accountId}.${versionRaw}.${expRaw}`, secret));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return { accountId, sessionVersion };
}
