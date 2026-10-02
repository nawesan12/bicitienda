import {
  createSessionToken,
  sessionSecret,
  verifySessionToken,
} from "@/lib/server/admin-session";
import { IG_GRAPH, IG_GRAPH_VERSION } from "@/lib/server/instagram";

/**
 * "Conectar Instagram" — OAuth de "Instagram API with Instagram Login"
 * (Business Login). Doc oficial:
 * https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login
 *
 *   1. Autorización (navegador del admin):
 *      GET https://www.instagram.com/oauth/authorize
 *          ?client_id=<IG_APP_ID>&redirect_uri=<IG_REDIRECT_URI>
 *          &response_type=code&scope=instagram_business_basic&state=<state>
 *      → vuelve a redirect_uri con ?code=…&state=… (o ?error=access_denied).
 *        El code dura 1 hora y es de un solo uso.
 *   2. Token corto (1 h):
 *      POST https://api.instagram.com/oauth/access_token   (form-urlencoded)
 *           client_id, client_secret, grant_type=authorization_code,
 *           redirect_uri, code
 *      → { access_token, user_id, permissions }  (la doc lo muestra también
 *        envuelto en { data: [ … ] }: se aceptan las dos formas)
 *   3. Token largo (60 días):
 *      GET https://graph.instagram.com/access_token
 *          ?grant_type=ig_exchange_token&client_secret=…&access_token=<corto>
 *      → { access_token, token_type: "bearer", expires_in }
 *   4. Cuenta:
 *      GET https://graph.instagram.com/v25.0/me?fields=user_id,username
 *      → { user_id, username, id }
 *
 * Env: IG_APP_ID, IG_APP_SECRET, IG_REDIRECT_URI (la URI exacta cargada en
 * el panel de la app de Meta). Los tokens nunca se loguean.
 */

export const IG_STATE_COOKIE = "ig_oauth_state";
/** El state vale 10 minutos: lo que tarda el admin en autorizar. */
export const IG_STATE_TTL_MS = 10 * 60_000;

export interface InstagramAppConfig {
  appId: string;
  appSecret: string;
  redirectUri: string;
}

export function instagramAppConfig(): InstagramAppConfig | null {
  const appId = process.env.IG_APP_ID;
  const appSecret = process.env.IG_APP_SECRET;
  const redirectUri = process.env.IG_REDIRECT_URI;
  if (!appId || !appSecret || !redirectUri) return null;
  return { appId, appSecret, redirectUri };
}

/**
 * Clave del state derivada del secreto de sesión del admin pero DISTINTA:
 * el state viaja en la URL (pasa por Instagram), así que nunca puede ser
 * válido como cookie de sesión del panel.
 */
function stateSecret(): string | null {
  const secret = sessionSecret();
  return secret ? `${secret}:instagram-oauth-state` : null;
}

/** State aleatorio, firmado (HMAC) y con vencimiento. */
export async function createOAuthState(): Promise<{
  state: string;
  expires: Date;
} | null> {
  const secret = stateSecret();
  if (!secret) return null;
  const { token, expires } = await createSessionToken(secret, IG_STATE_TTL_MS);
  return { state: token, expires };
}

/** true si el state de la URL es el de la cookie, con firma válida y vigente. */
export async function verifyOAuthState(
  fromQuery: string | null,
  fromCookie: string | undefined,
): Promise<boolean> {
  if (!fromQuery || !fromCookie || fromQuery !== fromCookie) return false;
  return verifySessionToken(fromQuery, stateSecret());
}

export function authorizeUrl(cfg: InstagramAppConfig, state: string): string {
  const qs = new URLSearchParams({
    client_id: cfg.appId,
    redirect_uri: cfg.redirectUri,
    response_type: "code",
    scope: "instagram_business_basic",
    state,
  });
  return `https://www.instagram.com/oauth/authorize?${qs}`;
}

export class InstagramOAuthError extends Error {
  constructor(
    /** Motivo corto para ?motivo= (sin datos sensibles). */
    readonly reason: "token" | "token-largo" | "perfil",
  ) {
    super(`Instagram OAuth: ${reason}`);
  }
}

/** code → token corto → token largo → cuenta. */
export async function exchangeCode(
  cfg: InstagramAppConfig,
  code: string,
): Promise<{
  token: string;
  expiresAt: Date;
  userId: string;
  username: string | null;
}> {
  // 2. Token corto.
  const shortRes = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: cfg.appId,
      client_secret: cfg.appSecret,
      grant_type: "authorization_code",
      redirect_uri: cfg.redirectUri,
      code,
    }),
    cache: "no-store",
  });
  if (!shortRes.ok) {
    console.error(`[instagram] token corto: HTTP ${shortRes.status}`);
    throw new InstagramOAuthError("token");
  }
  type ShortToken = { access_token?: string; user_id?: string | number };
  const shortJson = (await shortRes.json()) as ShortToken & {
    data?: ShortToken[];
  };
  const short = shortJson.data?.[0] ?? shortJson;
  if (!short.access_token) throw new InstagramOAuthError("token");

  // 3. Token largo.
  const longQs = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: cfg.appSecret,
    access_token: short.access_token,
  });
  const longRes = await fetch(`${IG_GRAPH}/access_token?${longQs}`, {
    cache: "no-store",
  });
  if (!longRes.ok) {
    console.error(`[instagram] token largo: HTTP ${longRes.status}`);
    throw new InstagramOAuthError("token-largo");
  }
  const longJson = (await longRes.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!longJson.access_token) throw new InstagramOAuthError("token-largo");
  const token = longJson.access_token;
  const expiresAt = new Date(
    Date.now() + (longJson.expires_in ?? 60 * 24 * 3600) * 1000,
  );

  // 4. Cuenta: el user_id de /me es el IG ID de la cuenta profesional,
  // el que va en /<IG_ID>/media.
  const meQs = new URLSearchParams({
    fields: "user_id,username",
    access_token: token,
  });
  const meRes = await fetch(`${IG_GRAPH}/${IG_GRAPH_VERSION}/me?${meQs}`, {
    cache: "no-store",
  });
  if (!meRes.ok) {
    console.error(`[instagram] perfil: HTTP ${meRes.status}`);
    throw new InstagramOAuthError("perfil");
  }
  const me = (await meRes.json()) as {
    user_id?: string | number;
    id?: string;
    username?: string;
  };
  const userId = String(me.user_id ?? short.user_id ?? me.id ?? "");
  if (!userId) throw new InstagramOAuthError("perfil");

  return { token, expiresAt, userId, username: me.username ?? null };
}
