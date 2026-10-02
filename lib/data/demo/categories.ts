import type { CategoryGroupSlug, DemoCategory } from "./types";

/**
 * Categorías en dos niveles (`parentSlug`):
 *  - Grupos = ítems del nav, en el orden exacto que pidió el cliente:
 *    Bicicletas · Accesorios · Repuestos · Productos importados
 *    (después vienen "Pedir presupuesto" y "Sacar turno", que no son
 *    categorías).
 *  - Tipos dentro de cada grupo: MTB, Ruta / Gravel, Urbanas, Infantiles
 *    (bicis) y Cascos, Indumentaria (accesorios).
 *
 * Decisiones sobre el handoff:
 *  - El prototipo usa "Ruta" y "Gravel" como rótulos de card separados,
 *    pero el filtro "Tipo" (2b) y la tira del home los agrupan en
 *    "Ruta / Gravel": se modela un solo tipo `ruta-gravel` y la card sigue
 *    mostrando su rótulo propio (`cardLabel` en products.ts).
 *  - El filtro "Tipo" dice "Urbana"/"Infantil" y la tira del home
 *    "Urbanas"/"Infantiles": el nombre de la categoría es el plural; el
 *    singular queda como `cardLabel` del producto.
 *  - El kit de luces tiene rótulo "Accesorios" sin tipo: cuelga directo
 *    del grupo `accesorios`.
 *  - Repuestos e Importados no tienen productos en la demo (llegan por
 *    presupuesto); quedan como grupos vacíos que usan el mismo catálogo.
 */
export const CATEGORY_GROUPS: DemoCategory[] = [
  { slug: "bicicletas", name: "Bicicletas", parentSlug: null, order: 1 },
  { slug: "accesorios", name: "Accesorios", parentSlug: null, order: 2 },
  { slug: "repuestos", name: "Repuestos", parentSlug: null, order: 3 },
  { slug: "importados", name: "Productos importados", parentSlug: null, order: 4 },
];

export const CATEGORY_TYPES: DemoCategory[] = [
  { slug: "mtb", name: "MTB", parentSlug: "bicicletas", order: 1 },
  { slug: "ruta-gravel", name: "Ruta / Gravel", parentSlug: "bicicletas", order: 2 },
  { slug: "urbanas", name: "Urbanas", parentSlug: "bicicletas", order: 3 },
  { slug: "infantiles", name: "Infantiles", parentSlug: "bicicletas", order: 4 },
  { slug: "cascos", name: "Cascos", parentSlug: "accesorios", order: 1 },
  { slug: "indumentaria", name: "Indumentaria", parentSlug: "accesorios", order: 2 },
];

export const CATEGORIES: DemoCategory[] = [...CATEGORY_GROUPS, ...CATEGORY_TYPES];

/** Clave del nav del Header (`active` del handoff) → grupo. */
export const NAV_GROUP_KEYS: Record<"bicicletas" | "accesorios" | "repuestos" | "importados", CategoryGroupSlug> = {
  bicicletas: "bicicletas",
  accesorios: "accesorios",
  repuestos: "repuestos",
  importados: "importados",
};

/**
 * Tira de categorías del home (2a): 7 celdas en una fila, con índice mono
 * 01–07. Cada una lleva a la categoría (tipo o grupo).
 */
export const HOME_CATEGORY_STRIP: { index: string; name: string; categorySlug: string }[] = [
  { name: "MTB", categorySlug: "mtb" },
  { name: "Ruta / Gravel", categorySlug: "ruta-gravel" },
  { name: "Urbanas", categorySlug: "urbanas" },
  { name: "Infantiles", categorySlug: "infantiles" },
  { name: "Accesorios", categorySlug: "accesorios" },
  { name: "Repuestos", categorySlug: "repuestos" },
  { name: "Importados", categorySlug: "importados" },
].map((c, i) => ({ index: String(i + 1).padStart(2, "0"), ...c }));

/** Chips de rodado del filtro del catálogo (2b). */
export const RODADOS = ["12", "16", "20", "24", "26", "27.5", "28", "29"] as const;

/** Rango del filtro de precio del catálogo (2b). */
export const PRICE_FILTER_RANGE = { min: 150000, max: 1500000 } as const;
