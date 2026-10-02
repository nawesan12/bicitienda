import { cookies } from "next/headers";
import { store } from "@/lib/config";
import { getAccount, type AccountRow } from "@/lib/server/accounts";
import {
  createCustomerToken,
  CUSTOMER_COOKIE,
  customerSessionSecret,
  readCustomerToken,
} from "@/lib/server/customer-session";

/**
 * Sesión del cliente en las server actions y páginas: ÚNICA puerta de la
 * cookie `customer_session` (el admin tiene la suya en admin-auth.ts). La
 * firma prueba quién es; la base confirma que la cuenta existe y que la
 * sesión no fue invalidada (sessionVersion).
 */

export async function setCustomerSession(account: Pick<AccountRow, "id" | "sessionVersion">): Promise<void> {
  const secret = customerSessionSecret();
  if (!secret) throw new Error("Falta CUSTOMER_SESSION_SECRET.");
  const { token, expires } = createCustomerToken(account.id, account.sessionVersion, secret);
  const jar = await cookies();
  jar.set(CUSTOMER_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function clearCustomerSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(CUSTOMER_COOKIE);
}

/** La cuenta logueada, o null (sin sesión, firma inválida, vencida o revocada). */
export async function getCurrentAccount(): Promise<AccountRow | null> {
  if (store.features.accounts === false) return null;
  const jar = await cookies();
  const data = readCustomerToken(jar.get(CUSTOMER_COOKIE)?.value, customerSessionSecret());
  if (!data) return null;
  const account = await getAccount(data.accountId);
  if (!account || account.sessionVersion !== data.sessionVersion) return null;
  return account;
}
