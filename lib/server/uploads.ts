import { createHash } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { store } from "@/lib/config";
import { MAX_UPLOAD_BYTES, type UploadKind } from "@/lib/images";
import {
  destroyFromCloudinary,
  isCloudinaryConfigured,
  publicIdFromUrl,
  uploadToCloudinary,
} from "@/lib/server/cloudinary";

/**
 * Almacenamiento de las fotos que sube el admin, con el mismo patrón de
 * modo simulado que los pagos y los emails:
 *
 *   - con CLOUDINARY_URL → Cloudinary (upload firmado, carpeta
 *     `<slug-tienda>/uploads/<tipo>`); la web pide cada tamaño con img();
 *   - sin env (local) → `.data/uploads/`, servido por la ruta
 *     `/uploads/[...file]` (route handler propio: `public/` se congela en
 *     el build, así que escribir ahí no serviría con `next start`).
 *
 * Las fotos llegan YA redimensionadas por el navegador (JPEG con fondo
 * blanco, lado máximo según el tipo: UPLOAD_LIMITS en lib/images.ts); acá
 * se validan por firma de bytes y se persisten.
 */

const LOCAL_DIR = ".data/uploads";

export type ImageMime = "image/jpeg" | "image/webp";

/** Tipo real por la firma de bytes (no confiamos en el content-type). */
export function sniffImage(bytes: Buffer): ImageMime | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return "image/jpeg";
  if (
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  )
    return "image/webp";
  return null;
}

/** Valida un File de un FormData y devuelve sus bytes, o el error visible. */
export async function readImageUpload(
  file: FormDataEntryValue | null,
): Promise<{ ok: true; bytes: Buffer; mime: ImageMime } | { ok: false; error: string }> {
  if (!(file instanceof File)) return { ok: false, error: "Falta la foto." };
  if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "La foto supera los 4 MB." };
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const mime = sniffImage(bytes);
  if (!mime) return { ok: false, error: "La foto debe ser JPEG o WebP." };
  return { ok: true, bytes, mime };
}

/** Nombre seguro: prefijo + hash del contenido. */
function uploadName(prefix: string, bytes: Buffer, mime: ImageMime): string {
  const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 10);
  const slug = prefix.replace(/[^a-z0-9-]/gi, "").toLowerCase() || "foto";
  return `${slug}-${hash}.${mime === "image/jpeg" ? "jpg" : "webp"}`;
}

function uploadsFolder(kind: UploadKind): string {
  return `${store.slug}/uploads/${kind}`;
}

/**
 * Guarda una foto y devuelve su URL pública. `prefix` es un nombre
 * legible (slug del producto, "hero", "galeria-2"…).
 */
export async function saveUpload(
  kind: UploadKind,
  prefix: string,
  bytes: Buffer,
  mime: ImageMime,
): Promise<string> {
  const name = uploadName(prefix, bytes, mime);

  if (!isCloudinaryConfigured()) {
    await mkdir(LOCAL_DIR, { recursive: true });
    await writeFile(path.join(LOCAL_DIR, name), bytes);
    return `/uploads/${name}`;
  }

  const { secureUrl } = await uploadToCloudinary({
    bytes,
    filename: name,
    contentType: mime,
    folder: uploadsFolder(kind),
    // El hash del contenido hace el id estable: re-subir la misma foto no
    // duplica.
    publicId: name.replace(/\.[a-z]+$/, ""),
    overwrite: true,
  });
  return secureUrl;
}

/**
 * Borra el archivo de una foto subida. Ignora las del seed (public/ o la
 * carpeta del seed en Cloudinary): solo toca `<slug>/uploads/…`.
 */
export async function deleteUpload(url: string): Promise<void> {
  if (url.startsWith("/uploads/")) {
    const name = path.basename(url);
    // Nunca salir del directorio de uploads.
    if (name !== url.slice("/uploads/".length)) return;
    await unlink(path.join(LOCAL_DIR, name)).catch(() => {});
    return;
  }

  const publicId = publicIdFromUrl(url);
  if (publicId?.startsWith(`${store.slug}/uploads/`)) {
    await destroyFromCloudinary(publicId);
  }
}

/** Ruta absoluta local y content-type de un `/uploads/...` válido, o null. */
export function localUploadPath(
  file: string,
): { path: string; contentType: ImageMime } | null {
  // Un solo segmento, sin traversal ni caracteres raros.
  const m = /^[a-z0-9-]+-[a-f0-9]{10}\.(webp|jpg)$/.exec(file);
  if (!m) return null;
  return {
    path: path.join(process.cwd(), LOCAL_DIR, file),
    contentType: m[1] === "jpg" ? "image/jpeg" : "image/webp",
  };
}
