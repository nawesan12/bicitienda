import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import {
  ADMIN_COOKIE,
  createSessionToken,
  sessionSecret,
  verifySessionToken,
} from "@/lib/server/admin-session";
import { verifyPassword } from "@/lib/server/password";
import { clientIp, withinRateLimit } from "@/lib/server/rate-limit";

/**
 * Acceso al panel con un PIN único (sin usuarios ni Auth.js):
 *
 *   - ADMIN_PIN_HASH: scrypt `salt:hash` en hex (lo genera `pnpm admin:pin`,
 *     mismo formato que lib/server/password.ts).
 *   - ADMIN_SESSION_SECRET: firma HMAC de la cookie de sesión
 *     (lib/server/admin-session.ts, que también usa el proxy).
 *
 * Defensa contra fuerza bruta, por IP: rate-limit de 10 intentos por
 * minuto y bloqueo de 15 minutos tras 5 PIN incorrectos seguidos. Igual
 * que el rate-limit, vive en memoria por instancia: alcanza para un panel
 * de un solo dueño.
 *
 * En desarrollo, sin ADMIN_PIN_HASH se acepta el PIN 000000 (con warning).
 * En producción, sin hash el login falla siempre con un mensaje claro.
 */

const MAX_FAILS = 5;
const LOCK_MS = 15 * 60_000;
const DEV_PIN = "000000";

const failures = new Map<string, { count: number; lockedUntil: number }>();

export type PinLoginResult =
  | { ok: true }
  | { ok: false; error: "bad" | "locked" | "rate" | "config"; minutes?: number };

function lockState(ip: string): { locked: boolean; minutes: number } {
  const f = failures.get(ip);
  if (!f || f.lockedUntil <= Date.now()) return { locked: false, minutes: 0 };
  return {
    locked: true,
    minutes: Math.ceil((f.lockedUntil - Date.now()) / 60_000),
  };
}

function registerFailure(ip: string): void {
  const now = Date.now();
  const prev = failures.get(ip);
  // Un bloqueo vencido arranca la cuenta de cero.
  const count =
    prev && prev.lockedUntil && prev.lockedUntil <= now ? 1 : (prev?.count ?? 0) + 1;
  failures.set(ip, {
    count,
    lockedUntil: count >= MAX_FAILS ? now + LOCK_MS : 0,
  });
  if (failures.size > 5000) {
    for (const [k, v] of failures) {
      if (v.lockedUntil && v.lockedUntil <= now) failures.delete(k);
    }
  }
}

/** Compara el PIN contra ADMIN_PIN_HASH (o el PIN de desarrollo). */
function pinMatches(pin: string): boolean | "config" {
  const hash = process.env.ADMIN_PIN_HASH;
  if (hash) return verifyPassword(pin, hash);
  if (process.env.NODE_ENV === "production") return "config";
  console.warn(
    "[admin] ADMIN_PIN_HASH no está configurado: en desarrollo se acepta el PIN 000000. Generá uno con `pnpm admin:pin`.",
  );
  const a = Buffer.from(pin);
  const b = Buffer.from(DEV_PIN);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Valida el PIN y, si es correcto, deja la cookie de sesión. */
export async function loginWithPin(pin: string): Promise<PinLoginResult> {
  const ip = await clientIp();
  const lock = lockState(ip);
  if (lock.locked) return { ok: false, error: "locked", minutes: lock.minutes };
  if (!(await withinRateLimit("admin-pin", 10))) {
    return { ok: false, error: "rate" };
  }

  const secret = sessionSecret();
  if (!secret) return { ok: false, error: "config" };

  const match = /^\d{6,12}$/.test(pin) ? pinMatches(pin) : false;
  if (match === "config") return { ok: false, error: "config" };
  if (!match) {
    registerFailure(ip);
    const after = lockState(ip);
    return after.locked
      ? { ok: false, error: "locked", minutes: after.minutes }
      : { ok: false, error: "bad" };
  }

  failures.delete(ip);
  const { token, expires } = await createSessionToken(secret);
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
  return { ok: true };
}

/** Borra la cookie de sesión. */
export async function logoutAdmin(): Promise<void> {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
}

/** true si el request trae una sesión de admin válida y vigente. */
export async function hasAdminSession(): Promise<boolean> {
  const jar = await cookies();
  return verifySessionToken(jar.get(ADMIN_COOKIE)?.value, sessionSecret());
}
