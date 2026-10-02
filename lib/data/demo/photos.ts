import manifest from "@/lib/data/image-manifest.json";
import type { PexelsId } from "./types";

/**
 * Fotos de stock (Pexels) del prototipo. Son placeholders hasta que el
 * cliente mande las reales. `pnpm demo:images` (scripts/demo-images.ts) las
 * sube a Cloudinary en `bicitienda-mdq/demo/<id>` y anota en
 * `lib/data/image-manifest.json` la clave `pexels:<id>` → URL.
 */

/** Las 16 fotos del prototipo, con dónde aparecen. */
export const DEMO_PHOTOS = {
  hero: 11923271, // hero del home (2a/4a) · "Bicicletas a la venta en el local"
  local: 132695, // login (2h) · "Bicicletas colgadas en el local" · y kit de luces
  mtb29: 31581017,
  mtb29Doble: 7635132,
  mtb275Juvenil: 11075610,
  gravel: 5807754,
  ruta: 128202,
  urbana28: 170379,
  paseo26: 35269121,
  urbanaVintage: 14388756,
  infantil16: 19012942,
  cascoUrbano: 12956080,
  cascoMtb: 33181395,
  remera: 17015631,
  /** Galería de la MTB R29 (2c/3d): fotos 3 y 4. */
  galeria3: 5807803,
  galeria4: 5807792,
} as const satisfies Record<string, PexelsId>;

export const ALL_PEXELS_IDS: PexelsId[] = [...new Set(Object.values(DEMO_PHOTOS))];

/** Textos alternativos del prototipo para las fotos de ambiente. */
export const PHOTO_ALT: Partial<Record<PexelsId, string>> = {
  [DEMO_PHOTOS.hero]: "Bicicletas a la venta en el local",
  [DEMO_PHOTOS.local]: "Bicicletas colgadas en el local",
};

/** URL original de Pexels (el patrón del prototipo). */
export function pexelsUrl(id: PexelsId, w = 1600): string {
  return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;
}

/** Clave del manifest para una foto de Pexels. */
export const manifestKey = (id: PexelsId) => `pexels:${id}`;

const MANIFEST = manifest as Record<string, string>;

/**
 * URL a usar para una foto demo: Cloudinary si ya se subió (pasala por
 * `img(url, { w })` de lib/images.ts para el tamaño), si no Pexels.
 */
export function demoPhoto(id: PexelsId): string {
  return MANIFEST[manifestKey(id)] ?? pexelsUrl(id);
}
