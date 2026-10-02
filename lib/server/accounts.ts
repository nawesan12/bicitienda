import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { normalizeArPhone } from "@/lib/phone";
import { upsertCustomer } from "@/lib/server/customers";
import { getDb, schema, type Db } from "@/lib/server/db";
import { hashPassword, verifyPassword } from "@/lib/server/password";

/**
 * Cuentas de cliente: registro, login, recupero de contraseña y
 * vinculación del historial. Lógica pura de datos (sin cookies ni
 * headers): las server actions de lib/server/actions/account.ts la
 * envuelven con la sesión y el rate-limit.
 *
 * Contraseñas con scrypt (lib/server/password.ts). El recupero guarda solo
 * el SHA-256 del token; consumirlo es un UPDATE condicional (`usedAt IS
 * NULL AND expiresAt > now()`), así que un token sirve UNA vez aunque
 * lleguen dos pedidos a la vez.
 */

export type AccountRow = typeof schema.customerAccounts.$inferSelect;
/** Lo que se expone de una cuenta (nunca el hash). */
export type PublicAccount = Pick<AccountRow, "id" | "email" | "name" | "phone" | "createdAt">;

export const MIN_PASSWORD = 8;
export const RESET_TTL_MIN = 60;

export class AccountError extends Error {
  constructor(
    message: string,
    readonly code: "EXISTS" | "INVALID" | "CREDENTIALS" | "TOKEN" | "PHONE_TAKEN" = "INVALID",
  ) {
    super(message);
    this.name = "AccountError";
  }
}

export function toPublic(a: AccountRow): PublicAccount {
  return { id: a.id, email: a.email, name: a.name, phone: a.phone, createdAt: a.createdAt };
}

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

/* ── Vinculación del historial ────────────────────────────── */

/**
 * Vincula a la cuenta lo que el cliente hizo antes sin cuenta: pedidos,
 * turnos y presupuestos de la ficha del CRM con su WhatsApp, siempre que
 * esa ficha no tenga otro email (un email distinto = no se puede
 * asegurar que sea la misma persona; queda para el local). Idempotente.
 */
export async function linkPreviousRecords(db: Db, account: AccountRow): Promise<number> {
  const [customer] = await db
    .select()
    .from(schema.customers)
    .where(eq(schema.customers.phone, account.phone));
  if (!customer) return 0;
  if (customer.accountId && customer.accountId !== account.id) return 0;
  if (customer.email && customer.email !== account.email) return 0;

  await db
    .update(schema.customers)
    .set({ accountId: account.id, email: customer.email ?? account.email })
    .where(eq(schema.customers.id, customer.id));
  let n = 0;
  for (const table of [schema.orders, schema.appointments, schema.quoteRequests] as const) {
    const rows = await db
      .update(table)
      .set({ accountId: account.id })
      .where(and(eq(table.customerId, customer.id), isNull(table.accountId)))
      .returning();
    n += rows.length;
  }
  return n;
}

/* ── Registro y login ─────────────────────────────────────── */

export async function registerAccount(input: {
  name: string;
  phone: string;
  email: string;
  password: string;
}): Promise<{ account: AccountRow; linked: number }> {
  const db = await getDb();
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const phone = normalizeArPhone(input.phone);
  if (name.length < 2) throw new AccountError("Completá tu nombre.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AccountError("Revisá el email.");
  if (!phone)
    throw new AccountError("Revisá el WhatsApp: 10 dígitos con la característica (ej. 223 555-0182).");
  if (input.password.length < MIN_PASSWORD)
    throw new AccountError(`La contraseña tiene que tener al menos ${MIN_PASSWORD} caracteres.`);

  const inserted = await db
    .insert(schema.customerAccounts)
    .values({ email, name, phone, passwordHash: hashPassword(input.password) })
    .onConflictDoNothing({ target: schema.customerAccounts.email })
    .returning();
  const account = inserted[0];
  if (!account) throw new AccountError("Ya hay una cuenta con ese email. Ingresá o recuperá la contraseña.", "EXISTS");

  // Ficha del CRM por WhatsApp (la crea si no existe) + historial previo.
  const customer = await upsertCustomer(db, { name, phone, email: null });
  if (!customer.email || customer.email === email) {
    if (!customer.accountId)
      await db.update(schema.customers).set({ email }).where(eq(schema.customers.id, customer.id));
  }
  const linked = await linkPreviousRecords(db, account);
  return { account, linked };
}

/**
 * Valida email + contraseña. Compara contra un hash de mentira cuando el
 * email no existe para no delatar por tiempo qué emails tienen cuenta.
 */
const DUMMY_HASH = hashPassword(randomBytes(12).toString("hex"));

export async function authenticate(emailRaw: string, password: string): Promise<AccountRow> {
  const db = await getDb();
  const email = emailRaw.trim().toLowerCase();
  const [account] = await db
    .select()
    .from(schema.customerAccounts)
    .where(eq(schema.customerAccounts.email, email));
  const ok = verifyPassword(password, account?.passwordHash ?? DUMMY_HASH);
  if (!account || !ok) throw new AccountError("Email o contraseña incorrectos.", "CREDENTIALS");
  await db
    .update(schema.customerAccounts)
    .set({ lastLoginAt: new Date() })
    .where(eq(schema.customerAccounts.id, account.id));
  await linkPreviousRecords(db, account);
  return account;
}

export async function getAccount(id: string): Promise<AccountRow | null> {
  const db = await getDb();
  const [row] = await db.select().from(schema.customerAccounts).where(eq(schema.customerAccounts.id, id));
  return row ?? null;
}

/** Datos de la cuenta (Mi cuenta → Datos). El email no se cambia acá. */
export async function updateAccountProfile(
  id: string,
  patch: { name?: string; phone?: string },
): Promise<AccountRow> {
  const db = await getDb();
  const set: Partial<typeof schema.customerAccounts.$inferInsert> = {};
  if (patch.name !== undefined) {
    if (patch.name.trim().length < 2) throw new AccountError("Completá tu nombre.");
    set.name = patch.name.trim();
  }
  if (patch.phone !== undefined) {
    const phone = normalizeArPhone(patch.phone);
    if (!phone) throw new AccountError("Revisá el WhatsApp.");
    set.phone = phone;
  }
  const [row] = await db
    .update(schema.customerAccounts)
    .set(set)
    .where(eq(schema.customerAccounts.id, id))
    .returning();
  if (!row) throw new AccountError("Cuenta inexistente.");
  if (set.phone) await linkPreviousRecords(db, row);
  return row;
}

/* ── Recupero de contraseña ───────────────────────────────── */

/**
 * Crea un token de recupero (si la cuenta existe y no pidió demasiados en
 * la última hora). Devuelve el token en claro para el mail, o null si no
 * corresponde mandar nada — el caller responde igual en los dos casos
 * (sin enumeración de cuentas).
 */
export async function createPasswordReset(
  emailRaw: string,
  opts: { maxPerHour?: number } = {},
): Promise<{ account: AccountRow; token: string } | null> {
  const db = await getDb();
  const email = emailRaw.trim().toLowerCase();
  const [account] = await db
    .select()
    .from(schema.customerAccounts)
    .where(eq(schema.customerAccounts.email, email));
  if (!account) return null;
  const [recent] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(schema.passwordResets)
    .where(
      and(
        eq(schema.passwordResets.accountId, account.id),
        gt(schema.passwordResets.createdAt, new Date(Date.now() - 3600_000)),
      ),
    );
  if ((recent?.n ?? 0) >= (opts.maxPerHour ?? 3)) return null;

  const token = randomBytes(32).toString("base64url");
  await db.insert(schema.passwordResets).values({
    tokenHash: sha256(token),
    accountId: account.id,
    expiresAt: new Date(Date.now() + RESET_TTL_MIN * 60_000),
  });
  return { account, token };
}

/** true si el token existe, no venció y no se usó (para mostrar el form). */
export async function isResetTokenValid(token: string): Promise<boolean> {
  if (!token) return false;
  const db = await getDb();
  const [row] = await db
    .select()
    .from(schema.passwordResets)
    .where(eq(schema.passwordResets.tokenHash, sha256(token)));
  return !!row && !row.usedAt && row.expiresAt > new Date();
}

/**
 * Consume el token (una sola vez) y fija la contraseña nueva. Sube
 * `sessionVersion`: todas las sesiones abiertas de la cuenta se cierran.
 */
export async function consumePasswordReset(token: string, newPassword: string): Promise<AccountRow> {
  if (newPassword.length < MIN_PASSWORD)
    throw new AccountError(`La contraseña tiene que tener al menos ${MIN_PASSWORD} caracteres.`);
  const db = await getDb();
  const [used] = await db
    .update(schema.passwordResets)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(schema.passwordResets.tokenHash, sha256(token)),
        isNull(schema.passwordResets.usedAt),
        gt(schema.passwordResets.expiresAt, new Date()),
      ),
    )
    .returning();
  if (!used) throw new AccountError("El link venció o ya se usó. Pedí uno nuevo.", "TOKEN");
  const [account] = await db
    .update(schema.customerAccounts)
    .set({
      passwordHash: hashPassword(newPassword),
      sessionVersion: sql`${schema.customerAccounts.sessionVersion} + 1`,
    })
    .where(eq(schema.customerAccounts.id, used.accountId))
    .returning();
  // Los demás tokens pendientes de la cuenta quedan inutilizados.
  await db
    .update(schema.passwordResets)
    .set({ usedAt: new Date() })
    .where(and(eq(schema.passwordResets.accountId, used.accountId), isNull(schema.passwordResets.usedAt)));
  return account;
}
