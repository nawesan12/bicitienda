"use server";

import { z } from "zod";
import { store } from "@/lib/config";
import { isValidArPhone } from "@/lib/phone";
import {
  AccountError,
  authenticate,
  consumePasswordReset,
  createPasswordReset,
  isResetTokenValid,
  MIN_PASSWORD,
  RESET_TTL_MIN,
  registerAccount as registerAccountInternal,
  toPublic,
  updateAccountProfile,
  type PublicAccount,
} from "@/lib/server/accounts";
import {
  clearCustomerSession,
  getCurrentAccount,
  setCustomerSession,
} from "@/lib/server/customer-auth";
import { sendPasswordResetEmail } from "@/lib/server/mail";
import { withinLimit, withinRateLimit } from "@/lib/server/rate-limit";

/**
 * Cuentas de cliente (registro, login, logout, recupero, datos). Inputs
 * validados con zod, rate-limit por IP y, en login y recupero, también
 * por email (rotar IPs no permite probar contraseñas sin techo).
 */

export type AccountResult =
  | { ok: true; account: PublicAccount; linked?: number }
  | { ok: false; error: string };

const RATE_MSG = "Demasiados intentos. Esperá un minuto.";

const emailSchema = z.string().trim().toLowerCase().email("Revisá el email.").max(200);
const passwordSchema = z
  .string()
  .min(MIN_PASSWORD, `La contraseña tiene que tener al menos ${MIN_PASSWORD} caracteres.`)
  .max(200);
const phoneSchema = z
  .string()
  .trim()
  .max(30)
  .refine(isValidArPhone, "Revisá el WhatsApp: 10 dígitos con la característica (ej. 223 555-0182).");

const registerSchema = z.object({
  name: z.string().trim().min(2, "Completá tu nombre.").max(120),
  phone: phoneSchema,
  email: emailSchema,
  password: passwordSchema,
});

function disabled(): AccountResult | null {
  return store.features.accounts === false
    ? { ok: false, error: "Las cuentas no están disponibles." }
    : null;
}

function firstIssue(err: z.ZodError, fallback: string): string {
  return err.issues[0]?.message ?? fallback;
}

/** Crear cuenta (nombre, WhatsApp, email, contraseña) e ingresar. */
export async function registerAccount(input: unknown): Promise<AccountResult> {
  const off = disabled();
  if (off) return off;
  if (!(await withinRateLimit("account-register", 5))) return { ok: false, error: RATE_MSG };
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error, "Revisá los datos.") };
  try {
    const { account, linked } = await registerAccountInternal(parsed.data);
    await setCustomerSession(account);
    return { ok: true, account: toPublic(account), linked };
  } catch (err) {
    if (err instanceof AccountError) return { ok: false, error: err.message };
    console.error("[cuentas] registro:", err);
    return { ok: false, error: "No pudimos crear la cuenta. Probá de nuevo." };
  }
}

/** Ingresar con email y contraseña. */
export async function loginAccount(input: unknown): Promise<AccountResult> {
  const off = disabled();
  if (off) return off;
  const parsed = z.object({ email: emailSchema, password: z.string().min(1).max(200) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Email o contraseña incorrectos." };
  if (
    !(await withinRateLimit("account-login", 10)) ||
    !withinLimit(`account-login-email:${parsed.data.email}`, 8, 15 * 60_000)
  )
    return { ok: false, error: RATE_MSG };
  try {
    const account = await authenticate(parsed.data.email, parsed.data.password);
    await setCustomerSession(account);
    return { ok: true, account: toPublic(account) };
  } catch (err) {
    if (err instanceof AccountError) return { ok: false, error: err.message };
    console.error("[cuentas] login:", err);
    return { ok: false, error: "No pudimos ingresar. Probá de nuevo." };
  }
}

/** Cerrar sesión. */
export async function logoutAccount(): Promise<{ ok: true }> {
  await clearCustomerSession();
  return { ok: true };
}

/**
 * "Olvidé mi contraseña": manda el mail con el link (si la cuenta existe).
 * La respuesta es siempre la misma para no revelar qué emails tienen
 * cuenta.
 */
export async function requestPasswordReset(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  if (store.features.accounts === false) return { ok: false, error: "Las cuentas no están disponibles." };
  const parsed = z.object({ email: emailSchema }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisá el email." };
  if (
    !(await withinRateLimit("account-reset", 5)) ||
    !withinLimit(`account-reset-email:${parsed.data.email}`, 3, 60 * 60_000)
  )
    return { ok: false, error: RATE_MSG };
  try {
    const reset = await createPasswordReset(parsed.data.email);
    if (reset)
      await sendPasswordResetEmail({
        to: reset.account.email,
        name: reset.account.name,
        token: reset.token,
        validMinutes: RESET_TTL_MIN,
      });
  } catch (err) {
    console.error("[cuentas] recupero:", err);
  }
  return { ok: true };
}

/** Para la página del link: ¿el token sigue sirviendo? */
export async function checkResetToken(token: unknown): Promise<{ valid: boolean }> {
  const parsed = z.string().min(20).max(200).safeParse(token);
  if (!parsed.success) return { valid: false };
  return { valid: await isResetTokenValid(parsed.data) };
}

/** Fija la contraseña nueva con el token (un solo uso) e ingresa. */
export async function resetPassword(input: unknown): Promise<AccountResult> {
  const off = disabled();
  if (off) return off;
  if (!(await withinRateLimit("account-reset-confirm", 10))) return { ok: false, error: RATE_MSG };
  const parsed = z
    .object({ token: z.string().min(20).max(200), password: passwordSchema })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error, "Revisá la contraseña.") };
  try {
    const account = await consumePasswordReset(parsed.data.token, parsed.data.password);
    await setCustomerSession(account);
    return { ok: true, account: toPublic(account) };
  } catch (err) {
    if (err instanceof AccountError) return { ok: false, error: err.message };
    console.error("[cuentas] reset:", err);
    return { ok: false, error: "No pudimos cambiar la contraseña. Probá de nuevo." };
  }
}

/** La cuenta logueada (para el header y Mi cuenta), o null. */
export async function getMyAccount(): Promise<PublicAccount | null> {
  const account = await getCurrentAccount();
  return account ? toPublic(account) : null;
}

/** Mi cuenta → Datos: nombre y WhatsApp. */
export async function updateMyProfile(input: unknown): Promise<AccountResult> {
  const account = await getCurrentAccount();
  if (!account) return { ok: false, error: "Ingresá a tu cuenta." };
  if (!(await withinRateLimit("account-profile", 10))) return { ok: false, error: RATE_MSG };
  const parsed = z
    .object({
      name: z.string().trim().min(2, "Completá tu nombre.").max(120).optional(),
      phone: phoneSchema.optional(),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error, "Revisá los datos.") };
  try {
    const row = await updateAccountProfile(account.id, parsed.data);
    return { ok: true, account: toPublic(row) };
  } catch (err) {
    if (err instanceof AccountError) return { ok: false, error: err.message };
    throw err;
  }
}
