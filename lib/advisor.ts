import type { CardProduct } from "@/lib/product-view";
import type { TestPick } from "@/lib/types";

/**
 * ── CAPA POR TIENDA ──────────────────────────────────────────
 * Test "¿Cuál es para mí?" — versión placeholder del starter: preguntas,
 * opciones y el mapeo de respuestas a perfil (`pickKey`). Al crear una
 * tienda real, escribí preguntas y perfiles propios del rubro.
 *
 * Qué producto recomienda cada perfil y por qué NO vive acá: es contenido
 * editable (`content.test`, /admin → Test), con el seed en
 * lib/data/content.ts. Cada clave de TEST_PROFILES tiene que tener su
 * entrada en `content.test`.
 */

export interface TestQuestion {
  q: string;
  opts: { label: string; value: string }[];
}

export const TEST_QUESTIONS: TestQuestion[] = [
  {
    q: "¿Para qué lo buscás?",
    opts: [
      { label: "Para mi casa", value: "hogar" },
      { label: "Para salir de viaje", value: "viaje" },
      { label: "Para regalar", value: "regalo" },
    ],
  },
  {
    q: "¿Con qué frecuencia lo vas a usar?",
    opts: [
      { label: "Todos los días", value: "diario" },
      { label: "Cada tanto", value: "ocasional" },
    ],
  },
  {
    q: "¿Presupuesto aproximado?",
    opts: [
      { label: "Hasta $80.000", value: "bajo" },
      { label: "Entre $80.000 y $150.000", value: "medio" },
      { label: "Sin límite, quiero lo mejor", value: "alto" },
    ],
  },
];

/** Los perfiles posibles (las claves de `content.test`). */
export const TEST_PROFILES = [
  "hogar_alto",
  "hogar",
  "viaje_bajo",
  "viaje",
  "regalo_bajo",
  "regalo",
] as const;

export type TestProfile = (typeof TEST_PROFILES)[number];

/**
 * Tarjetas del editor del test (/admin → Test): perfil, etiqueta y a
 * quién le cae.
 */
export const TEST_PROFILE_INFO: [TestProfile, label: string, desc: string][] = [
  ["hogar", "HOGAR · HASTA $150.000", "Busca algo para su casa"],
  ["hogar_alto", "HOGAR · SIN LÍMITE", "Busca algo para su casa"],
  ["viaje_bajo", "VIAJE · HASTA $80.000", "Lo quiere para salir de viaje"],
  ["viaje", "VIAJE · MÁS DE $80.000", "Lo quiere para salir de viaje"],
  ["regalo_bajo", "REGALO · HASTA $80.000", "Busca un regalo"],
  ["regalo", "REGALO · MÁS DE $80.000", "Busca un regalo"],
];

/**
 * El uso manda y el presupuesto desempata. La frecuencia (segunda
 * pregunta) no cambia el perfil en el ejemplo: una tienda real puede
 * usarla para sumar perfiles.
 */
export function pickKey(uso: string, _frecuencia: string, pres: string): TestProfile {
  if (uso === "viaje") return pres === "bajo" ? "viaje_bajo" : "viaje";
  if (uso === "regalo") return pres === "bajo" ? "regalo_bajo" : "regalo";
  return pres === "alto" ? "hogar_alto" : "hogar";
}

export interface Recommendation {
  product: CardProduct;
  why: string;
}

/**
 * Recomendación para las 3 respuestas: el producto del perfil en
 * `content.test`; si está oculto o no existe, el primero del catálogo.
 */
export function recommend(
  products: CardProduct[],
  picks: Record<string, TestPick>,
  [uso, frecuencia, pres]: string[],
): Recommendation | null {
  const pick = picks[pickKey(uso, frecuencia, pres)];
  const product =
    products.find((p) => p.slug === pick?.id) ?? products[0] ?? null;
  return product ? { product, why: pick?.why ?? "" } : null;
}
