import { readFile } from "node:fs/promises";
import { hasAdminSession } from "@/lib/server/admin-auth";
import { isCloudinaryConfigured } from "@/lib/server/cloudinary";
import { localPrivatePath } from "@/lib/server/uploads";

/**
 * Archivos privados en modo local (comprobantes de transferencia, fotos de
 * presupuestos): SOLO para el admin. El proxy ya corta /admin sin sesión;
 * acá se vuelve a verificar porque es un endpoint propio. Con Cloudinary
 * las URLs son absolutas y esta ruta no participa.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ kind: string; file: string }> },
) {
  if (isCloudinaryConfigured() || !(await hasAdminSession()))
    return new Response("Not found", { status: 404 });
  const { kind, file } = await ctx.params;
  const target = localPrivatePath(kind, file);
  if (!target) return new Response("Not found", { status: 404 });
  try {
    const bytes = await readFile(target.path);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": target.contentType,
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
