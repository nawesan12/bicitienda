import manifest from "@/lib/data/image-manifest.json";

/**
 * Imágenes, isomórfico (server y cliente). Todas las fotos viven en
 * Cloudinary cuando hay CLOUDINARY_URL; sin eso (local) son paths propios
 * (`/products/…` del seed, `/uploads/…` de lo subido desde el admin).
 *
 * - `img(url, { w })`: pide a Cloudinary el tamaño justo con formato y
 *   calidad automáticos. Cloudinary transforma: `images.unoptimized` sigue
 *   prendido (nunca el optimizador de Vercel). Cualquier otra URL vuelve
 *   tal cual.
 * - `resolveImage(path)`: traduce un path local del seed a su URL en
 *   Cloudinary si `pnpm seed:images` ya lo subió (image-manifest.json).
 */

const CLOUDINARY_UPLOAD = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.*)$/;

export interface ImgOptions {
  /** Ancho máximo en px (Cloudinary nunca agranda: c_limit). */
  w?: number;
}

/** URL de Cloudinary con `f_auto,q_auto,c_limit,w_<w>`; el resto, igual. */
export function img(url: string, opts: ImgOptions = {}): string {
  const m = CLOUDINARY_UPLOAD.exec(url);
  if (!m) return url;
  const [, base, rest] = m;
  // Si ya trae una transformación nuestra al frente, se reemplaza.
  const clean = rest.replace(/^f_auto,q_auto[^/]*\//, "");
  const parts = ["f_auto", "q_auto"];
  if (opts.w && opts.w > 0) parts.push("c_limit", `w_${Math.round(opts.w)}`);
  return `${base}${parts.join(",")}/${clean}`;
}

const MANIFEST = manifest as Record<string, string>;

/**
 * Path local del seed → URL de Cloudinary (si se subió); si no, el path.
 * Las fotos demo se referencian como `pexels:<id>` (lib/data/demo/photos.ts):
 * sin subir a Cloudinary (`pnpm demo:images`) caen a la URL de Pexels.
 */
export function resolveImage(path: string): string {
  const hit = MANIFEST[path];
  if (hit) return hit;
  const pexels = /^pexels:(\d+)$/.exec(path);
  if (pexels)
    return `https://images.pexels.com/photos/${pexels[1]}/pexels-photo-${pexels[1]}.jpeg?auto=compress&cs=tinysrgb&w=1600`;
  return path;
}

/* ── Límites de upload por tipo (los del prototipo del admin) ── */

export type UploadKind = "product" | "gallery" | "local" | "hero";

export interface UploadLimit {
  /** Lado mayor máximo en px tras el redimensionado del navegador. */
  maxSide: number;
  /** Calidad JPEG (0–1). */
  quality: number;
}

/**
 * Producto 1400, galería 1000, local 1600 y hero 2000 px, en JPEG sobre
 * fondo blanco — igual que `readImg`/`onPhoto`/`onHeroPhoto` del handoff.
 */
export const UPLOAD_LIMITS: Record<UploadKind, UploadLimit> = {
  product: { maxSide: 1400, quality: 0.86 },
  gallery: { maxSide: 1000, quality: 0.86 },
  local: { maxSide: 1600, quality: 0.82 },
  hero: { maxSide: 2000, quality: 0.9 },
};

export const UPLOAD_KINDS = Object.keys(UPLOAD_LIMITS) as UploadKind[];

/** Tope de bytes que acepta el server (una foto de 2000px JPEG q.9 entra). */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
