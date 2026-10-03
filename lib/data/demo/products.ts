import { DEMO_PHOTOS as P } from "./photos";
import type {
  DemoColor,
  DemoProduct,
  DemoSpec,
  DemoVariant,
  PexelsId,
  ProductTag,
  Talle,
} from "./types";

/**
 * Productos demo: `BIKES` (9) y `ACC` (4) del prototipo, con el stock por
 * talle de `STK`, el SKU y el estado que calcula `adminVals()` (3c).
 * Sin "Disponible para prueba": la tienda ya no ofrece pruebas de bici.
 *
 * Reglas del prototipo que se respetan:
 *  - SKU = 'BT-' + cat.slice(0,3).toUpperCase() + '-' + (1040 + i*7),
 *    con `i` = posición en [...BIKES, ...ACC] (BT-MTB-1040, BT-GRA-1061…).
 *  - Bicis con 4 talles S/M/L/XL y la altura sugerida de 3d; la infantil
 *    es talle "Único"; los accesorios van por "Unidades" (variante "Único").
 *  - Borrador = la Urbana vintage (i === 7). "Sin stock" no es un estado
 *    guardado: se deriva del stock (Gravel y Remera quedan en 0).
 *  - Destacados del home ("Lo más pedido en el mostrador"):
 *    BIKES[0], BIKES[5], BIKES[8], ACC[0].
 *
 * Inconsistencias del handoff resueltas:
 *  - Tag "Nueva" (Gravel) vs "Nuevo" (casco) y el README ("Nuevo"):
 *    se normaliza a "Nuevo".
 *  - La Gravel figura sin stock y sin prueba en 3c, pero hay un pedido
 *    "Armando" (#BT-10480) con ella: se respeta 3c (stock 0); el pedido
 *    queda como histórico.
 *  - SKU: la ficha (2c) muestra "BT-MTB29-21" y las variantes de 3d
 *    "BT-MTB29-21-S", que no siguen la fórmula de 3c. Se usa la fórmula de
 *    3c para el producto y `<sku>-<talle>` (+ `-<color>` si hay varios)
 *    para las variantes.
 *  - Rodado de Gravel y Ruta: el nombre dice "700c" / nada. 700c ≈ R28,
 *    así que se cargan como "28" para que entren en el filtro de rodado.
 *  - La MTB R29 muestra 3 colores en 2c (negro/amarillo, rojo, crema) pero
 *    3c/3d solo tienen stock por talle (S 1 · M 3 · L 2 · XL 0). Se reparte
 *    ese stock entre colores sin cambiar el total por talle (M: 2 negro/
 *    amarillo + 1 rojo; L: 1 + 1 crema), así 3c sigue igual. "Quedan 3 en
 *    talle M" de 2c pasa a ser el total del talle.
 *  - Los accesorios con talle en los pedidos ("Remera… Talle L", "Casco
 *    urbano… M/L") no tienen talles en 3c ("Unidades N"): van como "Único".
 *  - Marca: el prototipo dice "MARCA" / "[Marca a confirmar]" → `brand: null`.
 */

/** Talles de bici con la altura sugerida (3d · "Altura sugerida"). */
export const SIZE_HEIGHTS: Record<Talle, string> = {
  S: "1,55 – 1,65 m",
  M: "1,65 – 1,75 m",
  L: "1,75 – 1,85 m",
  XL: "1,85 – 1,95 m",
};
export const TALLES: Talle[] = ["S", "M", "L", "XL"];

/** Colores del prototipo (swatches de 2c y variantes de los pedidos). */
export const COLORS = {
  negroAmarillo: { name: "Negro / amarillo", swatch: ["#121110", "#ffd21f"] },
  rojo: { name: "Rojo", swatch: ["#d7261e"] },
  crema: { name: "Crema", swatch: ["#e8e1d3"] },
  negro: { name: "Negro", swatch: ["#121110"] },
} as const satisfies Record<string, DemoColor>;

interface Row {
  slug: string;
  /** Rótulo del prototipo (`cat`): card y prefijo del SKU. */
  cat: string;
  categorySlug: string;
  name: string;
  price: number;
  photo: PexelsId;
  tag?: ProductTag;
  rodado?: string;
  /** Stock de `STK`: 4 valores = S/M/L/XL; 1 valor = único/unidades. */
  stock: number[];
  color?: DemoColor;
}

const BIKES: Row[] = [
  { slug: "mtb-rodado-29-21-vel-aluminio", cat: "MTB", categorySlug: "mtb", name: "MTB rodado 29 · 21 vel. · aluminio", price: 489900, photo: P.mtb29, tag: "Más vendida", rodado: "29", stock: [1, 3, 2, 0] },
  { slug: "mtb-rodado-29-doble-suspension", cat: "MTB", categorySlug: "mtb", name: "MTB rodado 29 · doble suspensión", price: 1249900, photo: P.mtb29Doble, rodado: "29", stock: [0, 1, 1, 0] },
  { slug: "mtb-rodado-27-5-juvenil", cat: "MTB", categorySlug: "mtb", name: "MTB rodado 27.5 · juvenil", price: 399900, photo: P.mtb275Juvenil, tag: "Oferta", rodado: "27.5", stock: [2, 2, 0, 0] },
  { slug: "gravel-700c-2x9-vel", cat: "Gravel", categorySlug: "ruta-gravel", name: "Gravel 700c · 2x9 vel.", price: 899900, photo: P.gravel, tag: "Nuevo", rodado: "28", stock: [0, 0, 0, 0] },
  { slug: "ruta-aluminio-2x8-vel", cat: "Ruta", categorySlug: "ruta-gravel", name: "Ruta aluminio · 2x8 vel.", price: 759900, photo: P.ruta, rodado: "28", stock: [1, 2, 1, 0] },
  { slug: "urbana-rodado-28-canasto", cat: "Urbana", categorySlug: "urbanas", name: "Urbana rodado 28 · canasto", price: 359900, photo: P.urbana28, rodado: "28", stock: [2, 3, 2, 1], color: COLORS.crema },
  { slug: "paseo-rodado-26-guardabarros", cat: "Urbana", categorySlug: "urbanas", name: "Paseo rodado 26 · guardabarros", price: 319900, photo: P.paseo26, rodado: "26", stock: [1, 1, 0, 0] },
  { slug: "urbana-vintage-rodado-28", cat: "Urbana", categorySlug: "urbanas", name: "Urbana vintage rodado 28", price: 389900, photo: P.urbanaVintage, rodado: "28", stock: [0, 2, 1, 0] },
  { slug: "infantil-rodado-16-rueditas", cat: "Infantil", categorySlug: "infantiles", name: "Infantil rodado 16 · rueditas", price: 189900, photo: P.infantil16, tag: "Oferta", rodado: "16", stock: [3], color: COLORS.rojo },
];

const ACC: Row[] = [
  { slug: "casco-urbano-regulable-m-l", cat: "Cascos", categorySlug: "cascos", name: "Casco urbano regulable · M/L", price: 54900, photo: P.cascoUrbano, tag: "Nuevo", stock: [12], color: COLORS.negro },
  { slug: "casco-mtb-con-visera", cat: "Cascos", categorySlug: "cascos", name: "Casco MTB con visera", price: 79900, photo: P.cascoMtb, stock: [5] },
  { slug: "remera-de-ciclismo-manga-corta", cat: "Indumentaria", categorySlug: "indumentaria", name: "Remera de ciclismo manga corta", price: 42900, photo: P.remera, stock: [0] },
  { slug: "kit-luces-delantera-trasera", cat: "Accesorios", categorySlug: "accesorios", name: "Kit luces delantera + trasera", price: 24900, photo: P.local, stock: [9] },
];

/** Ficha completa de la MTB R29 (2c / 3d): la única con texto y specs. */
const MTB29_DESCRIPTION =
  "Una MTB rodado 29 para arrancar en serio: firme en la Ruta 11, en los caminos de tierra de Sierra de los Padres o para ir al trabajo todos los días. Cuadro liviano de aluminio y 21 cambios para las subidas.";

const MTB29_SPECS: DemoSpec[] = [
  { label: "Cuadro", value: "Aluminio 6061, talles S / M / L / XL" },
  { label: "Horquilla", value: "Suspensión 80 mm con bloqueo" },
  { label: "Transmisión", value: "3x7 · 21 velocidades" },
  { label: "Frenos", value: "Disco mecánico delantero y trasero" },
  { label: "Ruedas", value: "Rodado 29 · doble pared" },
  { label: "Peso aprox.", value: "14,5 kg" },
];

/** Reparto por color del stock de la MTB R29 (ver nota arriba). */
const MTB29_COLOR_STOCK: { color: DemoColor; code: string; stock: number[] }[] = [
  { color: COLORS.negroAmarillo, code: "NA", stock: [1, 2, 1, 0] },
  { color: COLORS.rojo, code: "RO", stock: [0, 1, 0, 0] },
  { color: COLORS.crema, code: "CR", stock: [0, 0, 1, 0] },
];

const FEATURED = new Set([0, 5, 8, 9]);

function buildVariants(row: Row, sku: string, i: number): DemoVariant[] {
  if (i === 0) {
    return MTB29_COLOR_STOCK.flatMap(({ color, code, stock }) =>
      TALLES.map((size, j) => ({
        size,
        color: color.name,
        heightRange: SIZE_HEIGHTS[size],
        sku: `${sku}-${size}-${code}`,
        stock: stock[j],
      })),
    );
  }
  if (row.stock.length === 4) {
    return TALLES.map((size, j) => ({
      size,
      color: row.color?.name ?? null,
      heightRange: SIZE_HEIGHTS[size],
      sku: `${sku}-${size}`,
      stock: row.stock[j],
    }));
  }
  return [{ size: "Único", color: row.color?.name ?? null, heightRange: null, sku: `${sku}-U`, stock: row.stock[0] }];
}

export const PRODUCTS: DemoProduct[] = [...BIKES, ...ACC].map((row, i) => {
  const sku = "BT-" + row.cat.slice(0, 3).toUpperCase() + "-" + String(1040 + i * 7);
  return {
    slug: row.slug,
    name: row.name,
    categorySlug: row.categorySlug,
    cardLabel: row.cat,
    brand: null,
    sku,
    price: row.price,
    tag: row.tag ?? null,
    photos: i === 0 ? [P.mtb29, P.mtb29Doble, P.galeria3, P.galeria4] : [row.photo],
    rodado: row.rodado ?? null,
    status: i === 7 ? "borrador" : "publicado",
    featured: FEATURED.has(i),
    hideWhenOut: false,
    variants: buildVariants(row, sku, i),
    description: i === 0 ? MTB29_DESCRIPTION : null,
    specs: i === 0 ? MTB29_SPECS : [],
    colors: i === 0 ? MTB29_COLOR_STOCK.map((c) => c.color) : row.color ? [row.color] : [],
  };
});

/** Bicis (los 9 de `BIKES`), en el orden del prototipo. */
export const DEMO_BIKES = PRODUCTS.slice(0, BIKES.length);
/** Accesorios (los 4 de `ACC`): también "Sumale a tu bici" en 2c. */
export const DEMO_ACCESSORIES = PRODUCTS.slice(BIKES.length);

export const productBySlug = (slug: string) => PRODUCTS.find((p) => p.slug === slug);

/** Stock total del producto (suma de variantes). */
export const totalStock = (p: DemoProduct) => p.variants.reduce((a, v) => a + v.stock, 0);

/** Estado que muestra 3c: Borrador > Sin stock > Publicado. */
export function adminStatus(p: DemoProduct): "Publicado" | "Sin stock" | "Borrador" {
  if (p.status === "borrador") return "Borrador";
  return totalStock(p) === 0 ? "Sin stock" : "Publicado";
}

/** Texto de stock de 3c: "S 1 · M 3 · L 2 · XL 0" / "Único 3" / "Unidades 12". */
export function stockSummary(p: DemoProduct): string {
  const bySize = new Map<string, number>();
  for (const v of p.variants) bySize.set(v.size, (bySize.get(v.size) ?? 0) + v.stock);
  if (bySize.has("S")) return TALLES.map((t) => `${t} ${bySize.get(t) ?? 0}`).join(" · ");
  const n = bySize.get("Único") ?? 0;
  // El prototipo dice "Único" para la bici infantil y "Unidades" para accesorios.
  return (p.categorySlug === "infantiles" ? "Único " : "Unidades ") + n;
}

/**
 * Contadores decorativos del prototipo (no salen de los datos): el catálogo
 * dice "48 MODELOS" y los chips de 3c "Todos · 124 / Bicicletas · 48 /
 * Accesorios · 38 / Indumentaria · 22 / Cascos · 16 / Sin stock · 2"; el
 * filtro "Tipo" de 2b "MTB 18 · Ruta / Gravel 9 · Urbana 14 · Infantil 7".
 * La UI real cuenta los productos que haya.
 */
