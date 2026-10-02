"use server";

import { z } from "zod";
import { UPLOAD_KINDS, type UploadKind } from "@/lib/images";
import { requireAdmin } from "@/lib/server/actions/guard";
import { readImageUpload, saveUpload } from "@/lib/server/uploads";

/**
 * Upload genérico de fotos del sitio (galería de la comunidad, foto del
 * local, foto HD del hero): guarda el archivo y devuelve la URL. Quien
 * llama persiste la URL donde corresponda (settings.content) con su propia
 * action — así este endpoint no sabe nada del contenido. Las fotos de
 * producto van por uploadProductPhoto (lib/server/actions/products.ts).
 */

const kindSchema = z.enum(UPLOAD_KINDS as [UploadKind, ...UploadKind[]]);

export async function uploadSiteImage(
  kind: UploadKind,
  formData: FormData,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  await requireAdmin();
  const parsed = kindSchema.safeParse(kind);
  if (!parsed.success || parsed.data === "product") {
    return { ok: false, error: "Tipo de foto inválido." };
  }
  const upload = await readImageUpload(formData.get("photo"));
  if (!upload.ok) return upload;
  try {
    const url = await saveUpload(parsed.data, parsed.data, upload.bytes, upload.mime);
    return { ok: true, url };
  } catch (err) {
    console.error("[uploads] error subiendo foto:", err);
    return { ok: false, error: "No se pudo subir la foto. Probá de nuevo." };
  }
}
