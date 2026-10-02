import { createHash } from "node:crypto";

/**
 * Cloudinary por REST, sin SDK (una dependencia menos; la API de upload es
 * estable). Credenciales en una sola variable, el formato oficial del
 * dashboard: CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
 *
 * Upload firmado desde el server (el secreto nunca llega al navegador):
 *   POST https://api.cloudinary.com/v1_1/<cloud>/<image|raw>/upload
 *   firma = SHA-1 de los parámetros firmables ordenados ("a=1&b=2") +
 *   api_secret. No se firman file, cloud_name, resource_type ni api_key.
 *   https://cloudinary.com/documentation/authentication_signatures
 *   https://cloudinary.com/documentation/image_upload_api_reference#upload
 */

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export function cloudinaryConfig(): CloudinaryConfig | null {
  const raw = process.env.CLOUDINARY_URL;
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== "cloudinary:") return null;
    const cfg = {
      cloudName: u.hostname,
      apiKey: decodeURIComponent(u.username),
      apiSecret: decodeURIComponent(u.password),
    };
    return cfg.cloudName && cfg.apiKey && cfg.apiSecret ? cfg : null;
  } catch {
    return null;
  }
}

export function isCloudinaryConfigured(): boolean {
  return cloudinaryConfig() !== null;
}

type Params = Record<string, string | number | boolean | undefined>;

/** Firma oficial: params ordenados, sin vacíos, + secreto, en SHA-1 hex. */
export function signParams(params: Params, apiSecret: string): string {
  const toSign = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== "")
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(toSign + apiSecret).digest("hex");
}

export type ResourceType = "image" | "raw";

export interface UploadInput {
  bytes: Buffer;
  /** Nombre de archivo para el multipart (Cloudinary toma la extensión). */
  filename: string;
  contentType: string;
  /** Carpeta: `<slug-tienda>/…`. */
  folder: string;
  /** public_id estable (sin carpeta). Sin esto Cloudinary genera uno. */
  publicId?: string;
  resourceType?: ResourceType;
  /** Reemplazar si ya existe ese public_id (idempotencia del seed). */
  overwrite?: boolean;
}

export interface UploadResult {
  secureUrl: string;
  publicId: string;
  bytes: number;
}

/** Fetch inyectable: el script de seed lo reemplaza en --dry-run. */
export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export async function uploadToCloudinary(
  input: UploadInput,
  opts: { config?: CloudinaryConfig; fetchImpl?: FetchLike } = {},
): Promise<UploadResult> {
  const cfg = opts.config ?? cloudinaryConfig();
  if (!cfg) throw new Error("Falta CLOUDINARY_URL.");
  const resourceType = input.resourceType ?? "image";

  const params: Params = {
    folder: input.folder,
    public_id: input.publicId,
    overwrite: input.publicId ? (input.overwrite ?? false) : undefined,
    // Con overwrite, invalida la copia del CDN para que se vea la nueva.
    invalidate: input.publicId && input.overwrite ? true : undefined,
    timestamp: Math.floor(Date.now() / 1000),
  };
  const signature = signParams(params, cfg.apiSecret);

  const form = new FormData();
  form.set(
    "file",
    new Blob([new Uint8Array(input.bytes)], { type: input.contentType }),
    input.filename,
  );
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") form.set(k, String(v));
  }
  form.set("api_key", cfg.apiKey);
  form.set("signature", signature);

  const doFetch = opts.fetchImpl ?? fetch;
  const res = await doFetch(
    `https://api.cloudinary.com/v1_1/${cfg.cloudName}/${resourceType}/upload`,
    { method: "POST", body: form },
  );
  if (!res.ok) {
    throw new Error(`Cloudinary ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as {
    secure_url: string;
    public_id: string;
    bytes: number;
  };
  return { secureUrl: json.secure_url, publicId: json.public_id, bytes: json.bytes };
}

/**
 * public_id de una URL de entrega de Cloudinary de NUESTRA cuenta (sin
 * transformaciones ni versión ni extensión), o null si no es nuestra.
 */
export function publicIdFromUrl(url: string): string | null {
  const cfg = cloudinaryConfig();
  if (!cfg) return null;
  const prefix = `https://res.cloudinary.com/${cfg.cloudName}/image/upload/`;
  if (!url.startsWith(prefix)) return null;
  const segments = url.slice(prefix.length).split("/");
  // Saltea transformaciones (tienen "_" y ",") y la versión v123.
  while (
    segments.length > 1 &&
    (/^v\d+$/.test(segments[0]) || /^[a-z]{1,3}_/.test(segments[0]))
  ) {
    segments.shift();
  }
  const id = segments.join("/").replace(/\.[a-z0-9]+$/i, "");
  return id || null;
}

/** Borra un recurso (fotos del admin reemplazadas o quitadas). */
export async function destroyFromCloudinary(
  publicId: string,
  resourceType: ResourceType = "image",
): Promise<void> {
  const cfg = cloudinaryConfig();
  if (!cfg) return;
  const params: Params = {
    public_id: publicId,
    invalidate: true,
    timestamp: Math.floor(Date.now() / 1000),
  };
  const form = new FormData();
  for (const [k, v] of Object.entries(params)) form.set(k, String(v));
  form.set("api_key", cfg.apiKey);
  form.set("signature", signParams(params, cfg.apiSecret));
  await fetch(
    `https://api.cloudinary.com/v1_1/${cfg.cloudName}/${resourceType}/destroy`,
    { method: "POST", body: form },
  ).catch(() => {});
}
