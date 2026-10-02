/**
 * Fotos demo del prototipo (Pexels) → Cloudinary, y su URL al manifest:
 *
 *   pnpm demo:images            → sube las que falten (necesita CLOUDINARY_URL)
 *   pnpm demo:images --force    → vuelve a bajar y subir todas (pisa)
 *   pnpm demo:images --dry-run  → solo lista qué haría
 *
 * - Baja cada foto de Pexels a 1600 px (el patrón del prototipo:
 *   https://images.pexels.com/photos/{id}/pexels-photo-{id}.jpeg?auto=compress&cs=tinysrgb&w=1600).
 * - La sube firmada (lib/server/cloudinary.ts) a `bicitienda-mdq/demo/<id>`.
 * - Mergea en lib/data/image-manifest.json la clave `pexels:<id>` → URL
 *   (no toca las demás claves). `demoPhoto(id)` (lib/data/demo/photos.ts)
 *   la resuelve.
 *
 * Idempotente: sin --force saltea los ids que ya están en el manifest, y
 * el public_id es estable (re-subir pisa lo mismo).
 *
 * OJO: `pnpm seed:images` reescribe el manifest entero (no mergea) y
 * borra las claves `pexels:*`. Si se corre después, volver a correr este
 * script: re-sube las fotos al mismo public_id y repone las claves.
 */
import { readFile, writeFile } from "node:fs/promises";
import { ALL_PEXELS_IDS, manifestKey, pexelsUrl } from "../lib/data/demo/photos";
import { cloudinaryConfig, uploadToCloudinary } from "../lib/server/cloudinary";

const MANIFEST = "lib/data/image-manifest.json";
const FOLDER = "bicitienda-mdq/demo";

async function readManifest(): Promise<Record<string, string>> {
  try {
    return JSON.parse(await readFile(MANIFEST, "utf8")) as Record<string, string>;
  } catch {
    return {};
  }
}

async function download(id: number): Promise<Buffer> {
  const res = await fetch(pexelsUrl(id, 1600), {
    headers: { "User-Agent": "bicitienda-demo-images/1.0" },
  });
  if (!res.ok) throw new Error(`Pexels ${id}: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    /* sin .env.local: solo variables de entorno */
  }
  const force = process.argv.includes("--force");
  const dryRun = process.argv.includes("--dry-run");

  const manifest = await readManifest();
  const todo = ALL_PEXELS_IDS.filter((id) => force || !manifest[manifestKey(id)]);
  console.log(`${ALL_PEXELS_IDS.length} fotos demo · ${todo.length} para subir${force ? " (--force)" : ""}`);
  if (todo.length === 0) return;
  if (dryRun) {
    for (const id of todo) console.log(`  · ${pexelsUrl(id, 1600)} → ${FOLDER}/${id}`);
    return;
  }

  const cfg = cloudinaryConfig();
  if (!cfg) {
    console.warn("⚠ CLOUDINARY_URL no está configurada: no se sube nada (las fotos siguen saliendo de Pexels).");
    return;
  }

  const queue = [...todo];
  let done = 0;
  const failed: number[] = [];
  async function worker() {
    for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
      try {
        const bytes = await download(id);
        const res = await uploadToCloudinary(
          {
            bytes,
            filename: `${id}.jpg`,
            contentType: "image/jpeg",
            folder: FOLDER,
            publicId: String(id),
            overwrite: true,
          },
          { config: cfg! },
        );
        manifest[manifestKey(id)] = res.secureUrl;
        done++;
        console.log(`  ✓ pexels:${id} → ${res.secureUrl} (${Math.round(res.bytes / 1024)} KB)`);
      } catch (err) {
        failed.push(id);
        console.error(`  ✗ pexels:${id}: ${(err as Error).message}`);
      }
    }
  }
  // De a 4 en paralelo, como seed-images.
  await Promise.all([worker(), worker(), worker(), worker()]);

  // Re-leer antes de escribir por si otro proceso tocó el manifest.
  const current = await readManifest();
  for (const id of ALL_PEXELS_IDS) {
    const k = manifestKey(id);
    if (manifest[k]) current[k] = manifest[k];
  }
  const sorted = Object.fromEntries(Object.entries(current).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(MANIFEST, JSON.stringify(sorted, null, 2) + "\n");
  console.log(`✔ ${done} subidas · manifest en ${MANIFEST}`);
  if (failed.length) {
    console.error(`✗ Fallaron ${failed.length}: ${failed.join(", ")} (volvé a correrlo)`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
