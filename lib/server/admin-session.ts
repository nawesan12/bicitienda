/**
 * Token de sesión del admin, firmado con HMAC-SHA256. Usa SOLO Web Crypto
 * (`crypto.subtle`, global en Node 20+ y en cualquier runtime edge): lo
 * comparten el proxy (que corta /admin antes de renderizar) y las server
 * actions (lib/server/admin-auth.ts), sin depender de `node:crypto`.
 *
 * Formato: `v1.<expMs>.<nonce>.<firma base64url>`, con la firma sobre
 * `v1.<expMs>.<nonce>`. No lleva datos del usuario: el panel tiene un
 * único PIN, así que la sesión solo prueba "entró alguien con el PIN" y
 * hasta cuándo vale.
 */

export const ADMIN_COOKIE = "admin_session";

/** Duración de la sesión: 7 días. */
export const SESSION_TTL_MS = 7 * 24 * 3600_000;

/**
 * Secreto de firma. En producción es obligatorio (sin él ninguna sesión
 * es válida); en desarrollo hay uno fijo para que el login funcione sin
 * configurar nada.
 */
export function sessionSecret(): string | null {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (secret && secret.length >= 16) return secret;
  if (process.env.NODE_ENV === "production") return null;
  return "dev-only-admin-session-secret-no-usar-en-produccion";
}

const encoder = new TextEncoder();

function toBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = "";
  for (const b of arr) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> | null {
  try {
    const b64 = text.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/** Crea un token nuevo que vence en `ttlMs`. */
export async function createSessionToken(
  secret: string,
  ttlMs = SESSION_TTL_MS,
): Promise<{ token: string; expires: Date }> {
  const exp = Date.now() + ttlMs;
  const nonce = toBase64Url(crypto.getRandomValues(new Uint8Array(12)));
  const payload = `v1.${exp}.${nonce}`;
  const sig = await crypto.subtle.sign(
    "HMAC",
    await hmacKey(secret),
    encoder.encode(payload),
  );
  return { token: `${payload}.${toBase64Url(sig)}`, expires: new Date(exp) };
}

/**
 * true si el token está bien formado, la firma es válida y no venció.
 * `crypto.subtle.verify` compara en tiempo constante.
 */
export async function verifySessionToken(
  token: string | undefined | null,
  secret: string | null,
): Promise<boolean> {
  if (!token || !secret || token.length > 200) return false;
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") return false;
  const [v, expRaw, nonce, sigRaw] = parts;
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp <= Date.now()) return false;
  const sig = fromBase64Url(sigRaw);
  if (!sig) return false;
  try {
    return await crypto.subtle.verify(
      "HMAC",
      await hmacKey(secret),
      sig,
      encoder.encode(`${v}.${expRaw}.${nonce}`),
    );
  } catch {
    return false;
  }
}
