import { NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/server/admin-auth";
import { clearInstagramConnection } from "@/lib/server/instagram";
import { invalidatePublic } from "@/lib/server/revalidate";

/**
 * "Desconectar Instagram" (form POST desde Ajustes): borra el token y la
 * cuenta guardados e invalida el feed. Si IG_TOKEN está en el env, el feed
 * sigue funcionando con ese (fallback legado).
 *
 * CSRF: la cookie de sesión es SameSite=Lax (no viaja en un POST
 * cross-site) y además se exige que el Origin, si viene, sea el propio.
 */
export async function POST(request: Request) {
  const back = (qs: string) =>
    NextResponse.redirect(new URL(`/admin/ajustes?${qs}`, request.url), 303);

  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return new Response("Forbidden", { status: 403 });
  }
  if (!(await hasAdminSession())) {
    return NextResponse.redirect(new URL("/admin/ingresar", request.url), 303);
  }

  try {
    await clearInstagramConnection();
  } catch {
    console.error("[instagram] no se pudo borrar la conexión");
    return back("ig=error&motivo=db");
  }
  invalidatePublic("instagram", { from: "route" });
  return back("ig=desconectado");
}
