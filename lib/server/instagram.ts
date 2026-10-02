import { eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { getDb, schema } from "@/lib/server/db";

/**
 * Feed de Instagram por la API oficial ("Instagram API with Instagram
 * Login", graph.instagram.com — la Basic Display API ya no existe).
 * Doc: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login
 *
 *   GET https://graph.instagram.com/v25.0/<IG_USER_ID>/media
 *       ?fields=id,media_type,media_url,thumbnail_url,permalink,caption,timestamp
 *       &limit=N&access_token=<token>          (o /me/media sin user id)
 *   GET https://graph.instagram.com/refresh_access_token
 *       ?grant_type=ig_refresh_token&access_token=<token>
 *       → { access_token, token_type, expires_in }   (60 días)
 *   https://developers.facebook.com/docs/instagram-platform/reference/refresh_access_token
 *
 * De dónde sale la cuenta, en orden:
 *   1. settings.igToken + igUserId — los guarda "Conectar Instagram"
 *      (OAuth, app/api/auth/instagram/*) desde Ajustes del admin;
 *   2. env IG_TOKEN + IG_USER_ID — token pegado a mano (legado).
 *
 * El token de larga duración vence a los 60 días: se renueva solo, de
 * forma perezosa, cuando faltan menos de 7 (o la primera vez que se usa el
 * de IG_TOKEN), y el nuevo se guarda en settings.igToken/igTokenExpiresAt.
 *
 * Cacheado 1 h con el tag "instagram" (conectar/desconectar lo invalida).
 * Ante CUALQUIER error o sin configuración devuelve null y la UI muestra
 * los igSlots del handoff. Los tokens NUNCA se loguean.
 */

export interface InstagramMedia {
  id: string;
  type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  /** Imagen a mostrar: la foto, o la miniatura si es video. */
  imageUrl: string;
  permalink: string;
  caption: string;
}

/** Host y versión de la Graph API de Instagram (la de la doc vigente). */
export const IG_GRAPH = "https://graph.instagram.com";
export const IG_GRAPH_VERSION = "v25.0";
const REFRESH_BEFORE_MS = 7 * 24 * 3600_000;

interface StoredAccount {
  token: string;
  userId: string | null;
  expiresAt: Date | null;
  /** "oauth": guardada desde el admin; "env": variables de entorno. */
  source: "oauth" | "env";
}

async function readSettingsAccount() {
  const db = await getDb();
  const [row] = await db
    .select({
      token: schema.settings.igToken,
      expiresAt: schema.settings.igTokenExpiresAt,
      userId: schema.settings.igUserId,
      username: schema.settings.igUsername,
    })
    .from(schema.settings)
    .where(eq(schema.settings.id, "main"));
  return row ?? null;
}

async function currentAccount(): Promise<StoredAccount | null> {
  const row = await readSettingsAccount();
  const account: StoredAccount | null = row?.token
    ? {
        token: row.token,
        // Un token renovado desde el env no trae user id: cae al del env.
        userId: row.userId ?? (process.env.IG_USER_ID || null),
        expiresAt: row.expiresAt,
        source: row.userId ? "oauth" : "env",
      }
    : process.env.IG_TOKEN
      ? {
          token: process.env.IG_TOKEN,
          userId: (process.env.IG_USER_ID || null),
          expiresAt: null,
          source: "env",
        }
      : null;
  if (!account) return null;

  // Sin vencimiento conocido (token recién pegado en env) o por vencer:
  // se intenta renovar. Si falla, se sigue usando el que hay.
  const { expiresAt } = account;
  if (!expiresAt || expiresAt.getTime() - Date.now() < REFRESH_BEFORE_MS) {
    const refreshed = await refreshToken(account.token);
    if (refreshed) {
      const db = await getDb();
      await db
        .update(schema.settings)
        .set({ igToken: refreshed.token, igTokenExpiresAt: refreshed.expiresAt })
        .where(eq(schema.settings.id, "main"));
      return { ...account, token: refreshed.token, expiresAt: refreshed.expiresAt };
    }
  }
  return account;
}

async function refreshToken(
  token: string,
): Promise<{ token: string; expiresAt: Date } | null> {
  try {
    const qs = new URLSearchParams({
      grant_type: "ig_refresh_token",
      access_token: token,
    });
    const res = await fetch(`${IG_GRAPH}/refresh_access_token?${qs}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    if (!json.access_token || !json.expires_in) return null;
    return {
      token: json.access_token,
      expiresAt: new Date(Date.now() + json.expires_in * 1000),
    };
  } catch {
    return null;
  }
}

async function fetchFeed(limit: number): Promise<InstagramMedia[] | null> {
  try {
    const account = await currentAccount();
    if (!account) return null;
    const qs = new URLSearchParams({
      fields: "id,media_type,media_url,thumbnail_url,permalink,caption,timestamp",
      limit: String(limit),
      access_token: account.token,
    });
    const owner = account.userId ? encodeURIComponent(account.userId) : "me";
    const res = await fetch(
      `${IG_GRAPH}/${IG_GRAPH_VERSION}/${owner}/media?${qs}`,
      { next: { revalidate: 3600, tags: ["instagram"] } },
    );
    if (!res.ok) {
      console.error(`[instagram] feed no disponible: HTTP ${res.status}`);
      return null;
    }
    const json = (await res.json()) as {
      data?: {
        id: string;
        media_type: InstagramMedia["type"];
        media_url?: string;
        thumbnail_url?: string;
        permalink: string;
        caption?: string;
      }[];
    };
    const items = (json.data ?? [])
      .map((m) => ({
        id: m.id,
        type: m.media_type,
        imageUrl:
          (m.media_type === "VIDEO" ? m.thumbnail_url : m.media_url) ??
          m.thumbnail_url ??
          "",
        permalink: m.permalink,
        caption: m.caption ?? "",
      }))
      .filter((m) => m.imageUrl && m.permalink);
    return items.length ? items.slice(0, limit) : null;
  } catch (err) {
    // Solo el mensaje: el error de fetch no incluye la URL con el token.
    console.error(
      "[instagram] feed no disponible:",
      err instanceof Error ? err.message : "error",
    );
    return null;
  }
}

/** Últimos `limit` posts, o null (→ placeholders igSlots). */
export const getInstagramFeed = unstable_cache(
  async (limit: number = 5) => fetchFeed(limit),
  ["instagram-feed"],
  { tags: ["instagram"], revalidate: 3600 },
);

/* ── Conexión (para Ajustes del admin) ─────────────────────── */

export interface InstagramConnection {
  /** Hay un token utilizable (de OAuth o del env). */
  connected: boolean;
  /** "oauth" = conectada desde el admin; "env" = IG_TOKEN; null = ninguna. */
  source: "oauth" | "env" | null;
  /** @usuario de la cuenta conectada por OAuth (sin la @). */
  username: string | null;
  /** Vencimiento del token largo (se renueva solo antes de vencer). */
  expiresAt: Date | null;
  /** El OAuth está configurado (IG_APP_ID, IG_APP_SECRET, IG_REDIRECT_URI). */
  canConnect: boolean;
}

/** Ruta que arranca el OAuth ("Conectar Instagram"). */
export const INSTAGRAM_CONNECT_PATH = "/api/auth/instagram/start";
/** Ruta (POST) que borra la conexión guardada. */
export const INSTAGRAM_DISCONNECT_PATH = "/api/auth/instagram/disconnect";

/**
 * Estado de la cuenta de Instagram para Ajustes. Lee la DB sin cache y no
 * renueva nada. No expone el token.
 */
export async function getInstagramConnection(): Promise<InstagramConnection> {
  const canConnect = Boolean(
    process.env.IG_APP_ID &&
      process.env.IG_APP_SECRET &&
      process.env.IG_REDIRECT_URI,
  );
  try {
    const row = await readSettingsAccount();
    if (row?.token) {
      return {
        connected: true,
        source: row.userId ? "oauth" : "env",
        username: row.username,
        expiresAt: row.expiresAt,
        canConnect,
      };
    }
  } catch {
    /* sin DB: se informa como desconectado */
  }
  const env = Boolean(process.env.IG_TOKEN);
  return {
    connected: env,
    source: env ? "env" : null,
    username: null,
    expiresAt: null,
    canConnect,
  };
}

/** Guarda la cuenta recién conectada por OAuth. */
export async function saveInstagramConnection(account: {
  token: string;
  expiresAt: Date;
  userId: string;
  username: string | null;
}): Promise<void> {
  const db = await getDb();
  await db
    .update(schema.settings)
    .set({
      igToken: account.token,
      igTokenExpiresAt: account.expiresAt,
      igUserId: account.userId,
      igUsername: account.username,
    })
    .where(eq(schema.settings.id, "main"));
}

/** Borra la cuenta guardada (el env IG_TOKEN, si existe, sigue de fallback). */
export async function clearInstagramConnection(): Promise<void> {
  const db = await getDb();
  await db
    .update(schema.settings)
    .set({
      igToken: null,
      igTokenExpiresAt: null,
      igUserId: null,
      igUsername: null,
    })
    .where(eq(schema.settings.id, "main"));
}
