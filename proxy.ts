import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_COOKIE,
  sessionSecret,
  verifySessionToken,
} from "@/lib/server/admin-session";

/**
 * Proxy (el middleware de Next 16): cierra todo /admin salvo el login.
 * Verifica la cookie firmada con Web Crypto (lib/server/admin-session.ts),
 * sin tocar la base. Es un chequeo optimista para la navegación: las
 * server actions y el export de CSV vuelven a validar con requireAdmin.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLogin = pathname === "/admin/ingresar";
  const valid = await verifySessionToken(
    request.cookies.get(ADMIN_COOKIE)?.value,
    sessionSecret(),
  );

  if (!valid && !isLogin) {
    return NextResponse.redirect(new URL("/admin/ingresar", request.nextUrl));
  }

  // Con sesión activa, el login redirige al panel.
  if (valid && isLogin) {
    return NextResponse.redirect(new URL("/admin", request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
