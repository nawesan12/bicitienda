/**
 * Sube las imágenes del seed a Cloudinary y escribe el manifest que usa
 * `resolveImage()` (lib/images.ts):
 *
 *   pnpm seed:images              → sube (necesita CLOUDINARY_URL)
 *   pnpm seed:images --dry-run    → simula la subida con un fetch falso,
 *                                   valida firma y campos, y escribe el
 *                                   manifest en .data/ (no toca el real)
 *
 * Qué sube, a la carpeta `<slug-tienda>/` con public_id estable (re-correrlo
 * pisa lo mismo: idempotente):
 *   - public/products/*.webp      → <slug>/products/<id>
 *   - public/brand/*.{png,jpg,webp,svg} → <slug>/brand/<nombre>
 *   - public/brand/*.pdf          → <slug>/brand/<nombre>.pdf (raw), solo con
 *                                   `--pdf`: las cuentas free de Cloudinary
 *                                   bloquean la entrega de PDF (401) hasta
 *                                   activar "Allow delivery of PDF and ZIP
 *                                   files" en Settings → Security. Sin el
 *                                   flag, el PDF se sirve estático desde
 *                                   /public (CDN de Vercel, sin funciones).
 *
 * Resultado: lib/data/image-manifest.json { "/products/x.webp": "https://…" },
 * MERGEADO con el que ya había (no borra las claves `pexels:<id>` de
 * `pnpm demo:images` ni otras subidas previas).
 * Después de correrlo, `pnpm db:seed` guarda las URLs de Cloudinary en la
 * base (las fotos de producto y la del hero).
 */
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { store } from "../lib/config";
import {
  cloudinaryConfig,
  signParams,
  uploadToCloudinary,
  type CloudinaryConfig,
  type FetchLike,
  type ResourceType,
} from "../lib/server/cloudinary";

const MANIFEST = "lib/data/image-manifest.json";
const DRY_MANIFEST = ".data/image-manifest.dry-run.json";

interface Item {
  /** Path público local: la clave del manifest. */
  localPath: string;
  file: string;
  folder: string;
  publicId: string;
  resourceType: ResourceType;
  contentType: string;
}

const MIME: Record<string, string> = {
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
};

async function listItems(): Promise<Item[]> {
  const items: Item[] = [];
  const products = await readdir("public/products").catch(() => []);
  for (const f of products.sort()) {
    if (!f.endsWith(".webp")) continue;
    items.push({
      localPath: `/products/${f}`,
      file: path.join("public/products", f),
      folder: `${store.slug}/products`,
      publicId: path.basename(f, ".webp"),
      resourceType: "image",
      contentType: "image/webp",
    });
  }
  const brand = await readdir("public/brand").catch(() => []);
  for (const f of brand.sort()) {
    const ext = path.extname(f).toLowerCase();
    if (!MIME[ext]) continue;
    const raw = ext === ".pdf";
    if (raw && !process.argv.includes("--pdf")) continue;
    items.push({
      localPath: `/brand/${f}`,
      file: path.join("public/brand", f),
      folder: `${store.slug}/brand`,
      // Los raw conservan la extensión en el public_id (así se sirven).
      publicId: raw ? f : path.basename(f, ext),
      resourceType: raw ? "raw" : "image",
      contentType: MIME[ext],
    });
  }
  return items;
}

/**
 * Fetch falso del --dry-run: verifica que el form tenga lo que exige la
 * API (file, api_key, timestamp, signature correcta) y responde como
 * Cloudinary.
 */
function dryFetch(cfg: CloudinaryConfig): FetchLike {
  return async (url, init) => {
    const form = init?.body as FormData;
    const m = /\/v1_1\/([^/]+)\/(image|raw)\/upload$/.exec(url);
    if (!m || m[1] !== cfg.cloudName) throw new Error(`URL inesperada: ${url}`);
    const file = form.get("file");
    if (!(file instanceof Blob) || file.size === 0) throw new Error("Falta file");
    const params: Record<string, string> = {};
    for (const [k, v] of form.entries()) {
      if (!["file", "api_key", "signature"].includes(k)) params[k] = String(v);
    }
    if (form.get("api_key") !== cfg.apiKey) throw new Error("api_key incorrecta");
    if (form.get("signature") !== signParams(params, cfg.apiSecret)) {
      throw new Error("Firma inválida");
    }
    const id = `${params.folder}/${params.public_id}`;
    const secureUrl =
      m[2] === "raw"
        ? `https://res.cloudinary.com/${cfg.cloudName}/raw/upload/v1/${id}`
        : `https://res.cloudinary.com/${cfg.cloudName}/image/upload/v1/${id}`;
    return new Response(
      JSON.stringify({ secure_url: secureUrl, public_id: id, bytes: file.size }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };
}

async function main() {
  // Como `next dev`: toma CLOUDINARY_URL de .env.local si existe (no pisa
  // variables ya exportadas en la shell).
  try {
    process.loadEnvFile(".env.local");
  } catch {
    /* sin .env.local: solo variables de entorno */
  }
  const dryRun = process.argv.includes("--dry-run");
  let cfg = cloudinaryConfig();

  if (!cfg && !dryRun) {
    console.warn(
      "⚠ CLOUDINARY_URL no está configurada: no se sube nada. Las imágenes siguen sirviéndose desde public/ (modo local).",
    );
    return;
  }
  if (!cfg) {
    cfg = { cloudName: "demo-dry-run", apiKey: "000000000000000", apiSecret: "dry-run-secret" };
  }
  const fetchImpl = dryRun ? dryFetch(cfg) : undefined;

  const items = await listItems();
  const out = dryRun ? DRY_MANIFEST : MANIFEST;
  // MERGE con el manifest existente: conserva las claves que este script
  // no sube (las `pexels:<id>` de `pnpm demo:images`, u otras fotos ya
  // subidas). Solo se pisan los paths que se vuelven a subir.
  let previous: Record<string, string> = {};
  try {
    previous = JSON.parse(await readFile(MANIFEST, "utf8")) as Record<string, string>;
  } catch {
    /* sin manifest todavía */
  }
  const manifest: Record<string, string> = { ...previous };
  let done = 0;

  // De a 4 en paralelo: rápido sin saturar la cuenta free.
  const queue = [...items];
  async function worker() {
    for (let item = queue.shift(); item; item = queue.shift()) {
      const bytes = await readFile(item.file);
      const res = await uploadToCloudinary(
        {
          bytes,
          filename: path.basename(item.file),
          contentType: item.contentType,
          folder: item.folder,
          publicId: item.publicId,
          resourceType: item.resourceType,
          overwrite: true,
        },
        { config: cfg!, fetchImpl },
      );
      manifest[item.localPath] = res.secureUrl;
      done++;
      console.log(`  ✓ ${item.localPath} → ${res.secureUrl}`);
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()]);

  const sorted = Object.fromEntries(
    Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)),
  );
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, JSON.stringify(sorted, null, 2) + "\n");
  console.log(
    `✔ ${done} archivos ${dryRun ? "simulados (dry-run)" : "subidos"} · manifest en ${out}`,
  );
  if (!dryRun) console.log("  Siguiente paso: `pnpm db:seed` para guardar las URLs en la base.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
