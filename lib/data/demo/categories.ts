import type { CategoryGroupSlug, DemoCategory } from "./types";

/**
 * Categorías en dos niveles (`parentSlug`):
 *  - Grupos = ítems del nav, en el orden exacto que pidió el cliente:
 *    Bicicletas · Accesorios · Repuestos · Productos importados
 *    (después vienen "Pedir presupuesto" y "Sacar turno", que no son
 *    categorías).
 *  - Tipos dentro de cada grupo: las 8 categorías del cliente.
 *      Bicicletas → Bicicletas Nuevas, Bicicletas Usadas
 *      Accesorios → Accesorios, Indumentaria
 *      Repuestos  → Repuestos, Cubiertas, Cámaras
 *      Productos Importados (sin tipos: es categoría en sí)
 *    "Accesorios" y "Repuestos" como tipo llevan URL propia
 *    (`accesorios-varios`, `repuestos-varios`) para no chocar con la del
 *    grupo.
 *
 * Las categorías viejas (MTB, Ruta / Gravel, Urbanas, Infantiles, Cascos)
 * se migran solas: ver `LEGACY_CATEGORIES` y lib/server/category-sync.ts.
 */
export const CATEGORY_GROUPS: DemoCategory[] = [
  { slug: "bicicletas", name: "Bicicletas", parentSlug: null, order: 1 },
  { slug: "accesorios", name: "Accesorios", parentSlug: null, order: 2 },
  { slug: "repuestos", name: "Repuestos", parentSlug: null, order: 3 },
  { slug: "importados", name: "Productos Importados", parentSlug: null, order: 4 },
];

export const CATEGORY_TYPES: DemoCategory[] = [
  { slug: "bicicletas-nuevas", name: "Bicicletas Nuevas", parentSlug: "bicicletas", order: 1 },
  { slug: "bicicletas-usadas", name: "Bicicletas Usadas", parentSlug: "bicicletas", order: 2 },
  { slug: "accesorios-varios", name: "Accesorios", parentSlug: "accesorios", order: 1 },
  { slug: "indumentaria", name: "Indumentaria", parentSlug: "accesorios", order: 2 },
  { slug: "repuestos-varios", name: "Repuestos", parentSlug: "repuestos", order: 1 },
  { slug: "cubiertas", name: "Cubiertas", parentSlug: "repuestos", order: 2 },
  { slug: "camaras", name: "Cámaras", parentSlug: "repuestos", order: 3 },
];

/** Categorías que existieron antes: sus productos pasan a la nueva. */
export const LEGACY_CATEGORIES: Record<string, string> = {
  mtb: "bicicletas-nuevas",
  "ruta-gravel": "bicicletas-nuevas",
  urbanas: "bicicletas-nuevas",
  infantiles: "bicicletas-nuevas",
  cascos: "accesorios-varios",
};

export const CATEGORIES: DemoCategory[] = [...CATEGORY_GROUPS, ...CATEGORY_TYPES];

/** Clave del nav del Header (`active` del handoff) → grupo. */
export const NAV_GROUP_KEYS: Record<"bicicletas" | "accesorios" | "repuestos" | "importados", CategoryGroupSlug> = {
  bicicletas: "bicicletas",
  accesorios: "accesorios",
  repuestos: "repuestos",
  importados: "importados",
};

/**
 * Tira de categorías del home (2a): las 8 categorías del cliente, con
 * índice mono 01–08. Cada una lleva a su catálogo.
 */
export const HOME_CATEGORY_STRIP: { index: string; name: string; categorySlug: string }[] = [
  { name: "Bicicletas Nuevas", categorySlug: "bicicletas-nuevas" },
  { name: "Bicicletas Usadas", categorySlug: "bicicletas-usadas" },
  { name: "Accesorios", categorySlug: "accesorios-varios" },
  { name: "Indumentaria", categorySlug: "indumentaria" },
  { name: "Repuestos", categorySlug: "repuestos-varios" },
  { name: "Cubiertas", categorySlug: "cubiertas" },
  { name: "Cámaras", categorySlug: "camaras" },
  { name: "Importados", categorySlug: "importados" },
].map((c, i) => ({ index: String(i + 1).padStart(2, "0"), ...c }));

/** Chips de rodado del filtro del catálogo (2b). */
export const RODADOS = ["12", "16", "20", "24", "26", "27.5", "28", "29"] as const;

/** Rango del filtro de precio del catálogo (2b). */
export const PRICE_FILTER_RANGE = { min: 150000, max: 1500000 } as const;
