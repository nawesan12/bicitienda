#!/usr/bin/env node
/**
 * Optimiza las fotos del catálogo: toma los originales de
 * `public/products/src/` (png/jpg/webp en cualquier tamaño) y genera
 * `public/products/<nombre>.webp` (máx. 1200px, calidad 82).
 *
 *   npm run optimize:images
 *
 * Regla de la casa: las fotos se sirven como estáticos pre-optimizados
 * (images.unoptimized en next.config) — nunca pasan por el optimizador
 * facturable de Vercel.
 */
import sharp from "sharp";
import { existsSync } from "node:fs";
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SRC = path.join(ROOT, "public/products/src");
const OUT = path.join(ROOT, "public/products");

if (!existsSync(SRC)) {
  console.error(
    "No existe public/products/src/ — poné ahí los originales (png/jpg) y volvé a correr.",
  );
  process.exit(1);
}

await mkdir(OUT, { recursive: true });
const files = (await readdir(SRC)).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));

for (const file of files) {
  const name = file.replace(/\.[^.]+$/, "");
  const img = sharp(path.join(SRC, file));
  const meta = await img.metadata();
  await img
    .resize({
      width: Math.min(meta.width ?? 1200, 1200),
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .toFile(path.join(OUT, `${name}.webp`));
  console.log(`✔ ${name}.webp`);
}

console.log(`${files.length} fotos optimizadas en public/products/`);
