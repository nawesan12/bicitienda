import { readFile } from "node:fs/promises";
import { isCloudinaryConfigured } from "@/lib/server/cloudinary";
import { localUploadPath } from "@/lib/server/uploads";

/**
 * Sirve las fotos subidas desde el admin en modo local (`.data/uploads`).
 * Con Cloudinary las URLs son absolutas a res.cloudinary.com y esta ruta
 * no participa: en producción (Vercel, fs de solo lectura) responde 404 al
 * toque, sin tocar el disco. El nombre lleva hash del contenido → cache
 * inmutable.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ file: string[] }> },
) {
  if (isCloudinaryConfigured()) return new Response("Not found", { status: 404 });
  const { file } = await ctx.params;
  // Exactamente un segmento con formato de upload válido (anti-traversal).
  const target = file.length === 1 ? localUploadPath(file[0]) : null;
  if (!target) return new Response("Not found", { status: 404 });

  try {
    const bytes = await readFile(target.path);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": target.contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
