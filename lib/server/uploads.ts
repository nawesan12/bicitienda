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

/* ── Archivos privados (comprobantes, fotos de presupuestos) ─────── */

/**
 * Archivos que sube el PÚBLICO y que solo mira el admin: comprobantes de
 * transferencia y fotos de los pedidos de presupuesto. Se guardan con un
 * nombre aleatorio (128 bits, inadivinable), nunca con datos del cliente:
 *
 *   - con CLOUDINARY_URL → `<slug>/privado/<tipo>/` (imagen, o "raw" para
 *     los PDF);
 *   - sin env → `.data/private/<tipo>/`, servido SOLO al admin por la ruta
 *     /admin/archivos/<tipo>/<archivo> (cerrada por el proxy y por sesión).
 */

export type PrivateKind = "comprobantes" | "presupuestos";
export type PrivateMime = "image/jpeg" | "image/png" | "image/webp" | "application/pdf";

const PRIVATE_DIR = ".data/private";
const PRIVATE_EXT: Record<PrivateMime, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

/**
 * Tope de un archivo del público (comprobante o foto). Vercel corta el body
 * en 4,5 MB y `serverActions.bodySizeLimit` es 4 MB: las imágenes se achican
 * en el navegador y los PDF tienen que entrar como vienen.
 */
export const MAX_PRIVATE_UPLOAD_BYTES = 3.8 * 1024 * 1024;

/** Tipo real por la firma de bytes: JPEG, PNG, WebP o PDF. */
export function sniffFile(bytes: Buffer): PrivateMime | null {
  const img = sniffImage(bytes);
  if (img) return img;
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes.toString("ascii", 1, 4) === "PNG"
  )
    return "image/png";
  if (bytes.length >= 5 && bytes.toString("ascii", 0, 5) === "%PDF-") return "application/pdf";
  return null;
}

/** Valida un archivo del público (imagen o, si se permite, PDF). */
export async function readPrivateUpload(
  file: FormDataEntryValue | null,
  opts: { allowPdf: boolean },
): Promise<{ ok: true; bytes: Buffer; mime: PrivateMime } | { ok: false; error: string }> {
  if (!(file instanceof File)) return { ok: false, error: "Falta el archivo." };
  if (file.size === 0 || file.size > MAX_PRIVATE_UPLOAD_BYTES)
    return { ok: false, error: "El archivo supera los 4 MB." };
  const bytes = Buffer.from(await file.arrayBuffer());
  const mime = sniffFile(bytes);
  if (!mime || (mime === "application/pdf" && !opts.allowPdf))
    return {
      ok: false,
      error: opts.allowPdf ? "Subí una imagen (JPG, PNG o WebP) o un PDF." : "Subí una imagen (JPG, PNG o WebP).",
    };
  return { ok: true, bytes, mime };
}

/** Guarda un archivo privado y devuelve su URL (Cloudinary o ruta del admin). */
export async function savePrivateUpload(
  kind: PrivateKind,
  bytes: Buffer,
  mime: PrivateMime,
): Promise<string> {
  const { randomBytes } = await import("node:crypto");
  const id = randomBytes(16).toString("hex");
  const name = `${id}.${PRIVATE_EXT[mime]}`;

  if (!isCloudinaryConfigured()) {
    const dir = path.join(PRIVATE_DIR, kind);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), bytes);
    return `/admin/archivos/${kind}/${name}`;
  }

  const { secureUrl } = await uploadToCloudinary({
    bytes,
    filename: name,
    contentType: mime,
    folder: `${store.slug}/privado/${kind}`,
    publicId: mime === "application/pdf" ? name : id,
    resourceType: mime === "application/pdf" ? "raw" : "image",
  });
  return secureUrl;
}

/** Ruta local y content-type de un archivo privado válido, o null. */
export function localPrivatePath(
  kind: string,
  file: string,
): { path: string; contentType: PrivateMime } | null {
  if (kind !== "comprobantes" && kind !== "presupuestos") return null;
  const m = /^[a-f0-9]{32}\.(jpg|png|webp|pdf)$/.exec(file);
  if (!m) return null;
  const contentType = (Object.entries(PRIVATE_EXT).find(([, ext]) => ext === m[1])?.[0] ??
    "application/octet-stream") as PrivateMime;
  return { path: path.join(process.cwd(), PRIVATE_DIR, kind, file), contentType };
}
