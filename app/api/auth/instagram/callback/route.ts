import { NextResponse, type NextRequest } from "next/server";
import { hasAdminSession } from "@/lib/server/admin-auth";
import { saveInstagramConnection } from "@/lib/server/instagram";
import {
  exchangeCode,
  IG_STATE_COOKIE,
  instagramAppConfig,
  InstagramOAuthError,
  verifyOAuthState,
} from "@/lib/server/instagram-oauth";
import { invalidatePublic } from "@/lib/server/revalidate";

/**
 * Vuelta del OAuth de Instagram (IG_REDIRECT_URI). Valida sesión de admin
 * y state, cambia el code por el token largo, guarda la cuenta en settings
 * e invalida el feed. Siempre termina en /admin/ajustes?ig=ok o
 * ?ig=error&motivo=<cancelado|sesion|estado|config|token|token-largo|perfil|db>.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const result = (qs: string) => {
    const res = NextResponse.redirect(
      new URL(`/admin/ajustes?${qs}`, request.url),
      303,
    );
    // El state es de un solo uso.
    res.cookies.set(IG_STATE_COOKIE, "", {
      path: "/api/auth/instagram",
      maxAge: 0,
    });
    return res;
  };

  if (!(await hasAdminSession())) return result("ig=error&motivo=sesion");

  const okState = await verifyOAuthState(
    url.searchParams.get("state"),
    request.cookies.get(IG_STATE_COOKIE)?.value,
  );
  if (!okState) return result("ig=error&motivo=estado");

  // El admin tocó "Cancelar" en Instagram (?error=access_denied).
  if (url.searchParams.get("error")) return result("ig=error&motivo=cancelado");

  const code = url.searchParams.get("code");
  if (!code) return result("ig=error&motivo=token");

  const cfg = instagramAppConfig();
  if (!cfg) return result("ig=error&motivo=config");

  let account: Awaited<ReturnType<typeof exchangeCode>>;
  try {
    account = await exchangeCode(cfg, code);
  } catch (err) {
    return result(
      `ig=error&motivo=${err instanceof InstagramOAuthError ? err.reason : "token"}`,
    );
  }

  try {
    await saveInstagramConnection(account);
  } catch {
    console.error("[instagram] no se pudo guardar la conexión");
    return result("ig=error&motivo=db");
  }

  invalidatePublic("instagram", { from: "route" });
  return result("ig=ok");
}
