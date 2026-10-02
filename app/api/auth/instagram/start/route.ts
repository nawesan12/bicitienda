import { NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/server/admin-auth";
import {
  authorizeUrl,
  createOAuthState,
  IG_STATE_COOKIE,
  IG_STATE_TTL_MS,
  instagramAppConfig,
} from "@/lib/server/instagram-oauth";

/**
 * "Conectar Instagram" (botón de Ajustes): solo con sesión de admin.
 * Deja el state firmado en una cookie httpOnly y manda al admin a
 * autorizar en instagram.com (ver lib/server/instagram-oauth.ts).
 */
export async function GET(request: Request) {
  const back = (qs: string) =>
    NextResponse.redirect(new URL(`/admin/ajustes?${qs}`, request.url), 303);

  if (!(await hasAdminSession())) {
    return NextResponse.redirect(new URL("/admin/ingresar", request.url), 303);
  }
  const cfg = instagramAppConfig();
  if (!cfg) return back("ig=error&motivo=config");
  const state = await createOAuthState();
  if (!state) return back("ig=error&motivo=config");

  const res = NextResponse.redirect(authorizeUrl(cfg, state.state), 303);
  res.cookies.set(IG_STATE_COOKIE, state.state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // lax: la cookie viaja en la navegación GET de vuelta desde Instagram.
    sameSite: "lax",
    path: "/api/auth/instagram",
    maxAge: Math.floor(IG_STATE_TTL_MS / 1000),
  });
  return res;
}
