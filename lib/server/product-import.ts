import { randomBytes } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { z } from "zod";
import { parseCsv, toCsv } from "@/lib/csv";
import { slugify } from "@/lib/slug";
import { atomicWrites, getDb, schema, type Db } from "@/lib/server/db";
import { invalidatePublic } from "@/lib/server/revalidate";
import { getVariantTotals } from "@/lib/server/stock";
import { autoSku, VariantError } from "@/lib/server/variants";
import { isXlsx, readXlsxRows, XlsxError } from "@/lib/server/xlsx";
import { SINGLE_SIZE, type ProductStatus } from "@/lib/types";
import { defaultVariantId, defaultVariantSku } from "@/lib/variants";

/**
 * Importación de productos desde una planilla (CSV o XLSX): una fila por
 * VARIANTE; las filas con el mismo `sku_producto` forman un producto.
 *
 *   1. preview: parsea, valida cada fila con zod y el conjunto (SKUs
 *      repetidos, datos del producto que no coinciden entre filas,
 *      categorías inexistentes) y muestra qué se crea / actualiza.
 *   2. commit: vuelve a validar el MISMO archivo y, si no hay errores,
 *      aplica. Idempotente por SKU: el producto se busca por `sku_producto`
 *      y la variante por `sku_variante` (o talle + color); el stock es un
 *      valor absoluto en la sucursal principal (setStockLevel), así que
 *      importar dos veces la misma planilla no cambia nada la segunda vez.
 *
 * Celda vacía en un producto existente = "no tocar" ese campo.
 */

export const IMPORT_COLUMNS = [
  "sku_producto",
  "nombre",
  "categoria",
  "marca",
  "precio",
  "precio_lista",
  "rodado",
  "talle",
  "color",
  "altura",
  "sku_variante",
  "stock",
  "ocultar_sin_stock",
  "estado",
  "descripcion",
  "fotos",
] as const;

type Column = (typeof IMPORT_COLUMNS)[number];
const REQUIRED: Column[] = ["sku_producto", "nombre", "categoria"];

export const MAX_IMPORT_ROWS = 2000;
/** Con margen bajo el `bodySizeLimit` de 4 MB de las server actions. */
export const MAX_IMPORT_BYTES = 3.8 * 1024 * 1024;

/** Plantilla descargable: encabezados + dos ejemplos (con talles y sin). */
export function importTemplateCsv(): string {
  const rows: string[][] = [
    [...IMPORT_COLUMNS],
    ["MTB29-21", "MTB rodado 29 · 21 vel. · aluminio", "mtb", "Venzo", "489900", "", "29", "M", "Negro/amarillo", "1,65 – 1,75 m", "", "3", "no", "publicado", "Cuadro de aluminio, 21 velocidades.", ""],
    ["MTB29-21", "", "", "", "", "", "", "L", "Negro/amarillo", "1,75 – 1,85 m", "", "2", "", "", "", ""],
    ["LUCES-USB", "Kit luces delantera + trasera", "accesorios", "Genérica", "24900", "", "", "", "", "", "", "12", "no", "publicado", "", ""],
  ];
  return toCsv(rows, ";");
}

/* ── Parseo ───────────────────────────────────────────────── */

function normHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

const HEADER_ALIASES: Record<string, Column> = {
  sku: "sku_producto",
  producto: "nombre",
  categoria: "categoria",
  precio_anterior: "precio_lista",
  talla: "talle",
  altura_sugerida: "altura",
  descripcion: "descripcion",
  imagenes: "fotos",
  foto: "fotos",
};

/** Filas crudas del archivo (CSV o XLSX por firma de bytes). */
export function readSheet(bytes: Buffer): string[][] {
  if (isXlsx(bytes)) return readXlsxRows(bytes);
  return parseCsv(bytes.toString("utf8"));
}

/* ── Validación por fila ──────────────────────────────────── */

function parseMoney(v: string): number | null | "invalid" {
  const t = v.trim();
  if (!t) return null;
  // "$ 489.900", "489900", "489.900,00"
  const cleaned = t.replace(/[$\s]/g, "").replace(/,00$/, "").replace(/\./g, "").replace(/,/g, "");
  if (!/^\d+$/.test(cleaned)) return "invalid";
  return Number(cleaned);
}

function parseBool(v: string): boolean | null | "invalid" {
  const t = v.trim().toLowerCase();
  if (!t) return null;
  if (["si", "sí", "s", "yes", "y", "true", "1", "x"].includes(t)) return true;
  if (["no", "n", "false", "0"].includes(t)) return false;
  return "invalid";
}

const rowSchema = z.object({
  sku_producto: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9._-]{2,40}$/, "SKU de producto inválido (letras, números, . _ -; 2 a 40)."),
  nombre: z.string().trim().max(160, "Nombre demasiado largo."),
  categoria: z.string().trim().max(60),
  marca: z.string().trim().max(60),
  rodado: z.string().trim().max(20),
  talle: z.string().trim().max(20),
  color: z.string().trim().max(40),
  altura: z.string().trim().max(40),
  sku_variante: z
    .string()
    .trim()
    .refine((v) => !v || /^[A-Za-z0-9._-]{2,60}$/.test(v), "SKU de variante inválido."),
  descripcion: z.string().max(4000),
  fotos: z.string().max(4000),
});

export interface ImportIssue {
  /** Fila de la planilla (1 = encabezados). */
  row: number;
  field?: string;
  message: string;
}

interface ParsedRow {
  row: number;
  productSku: string;
  name: string;
  category: string;
  brand: string;
  price: number | null | undefined;
  oldPrice: number | null | undefined;
  rodado: string;
  size: string;
  color: string;
  height: string;
  variantSku: string;
  stock: number | null;
  hideWhenOut: boolean | null;
  status: ProductStatus | null;
  description: string;
  photos: string[];
}

export interface ImportVariantPlan {
  row: number;
  sku: string;
  size: string;
  color: string;
  heightRange: string | null;
  action: "crear" | "actualizar" | "sin_cambios";
  /** Stock pedido (absoluto, sucursal principal). null = no se toca. */
  stock: number | null;
  stockBefore: number;
}

export interface ImportProductPlan {
  sku: string;
  name: string;
  action: "crear" | "actualizar" | "sin_cambios";
  variants: ImportVariantPlan[];
}

export interface ImportPreview {
  ok: boolean;
  /** Filas de datos de la planilla (sin encabezado ni filas vacías), válidas o no. */
  rows: number;
  /** De esas, las que pasaron la validación por fila. */
  validRows?: number;
  errors: ImportIssue[];
  products: ImportProductPlan[];
  summary: {
    productsNew: number;
    productsUpdated: number;
    variantsNew: number;
    variantsUpdated: number;
    stockChanges: number;
  };
}

interface Context {
  categories: { slug: string; label: string }[];
  products: (typeof schema.products.$inferSelect)[];
  variants: (typeof schema.productVariants.$inferSelect)[];
  stock: Map<string, number>;
  principal: string;
}

async function loadContext(db: Db): Promise<Context> {
  // Todo en paralelo (un solo viaje): el stock de todas las sucursales es
  // chico y se filtra la principal acá.
  const [categories, products, variants, locations, stockRows] = await Promise.all([
    db.select({ slug: schema.categories.slug, label: schema.categories.label }).from(schema.categories),
    db.select().from(schema.products),
    db.select().from(schema.productVariants),
    db.select().from(schema.locations),
    db
      .select({ variantId: schema.productStock.variantId, locationId: schema.productStock.locationId, qty: schema.productStock.qty })
      .from(schema.productStock),
  ]);
  const principal = [...locations]
    .filter((l) => l.active)
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))[0];
  if (!principal) throw new Error("Sin sucursales activas: corré `pnpm db:seed`.");
  return {
    categories,
    products,
    variants,
    stock: new Map(stockRows.filter((r) => r.locationId === principal.id).map((r) => [r.variantId, r.qty])),
    principal: principal.id,
  };
}

function findCategory(ctx: Context, value: string): string | null {
  const v = slugify(value);
  return (
    ctx.categories.find((c) => c.slug === value.trim() || slugify(c.label) === v || c.slug === v)?.slug ?? null
  );
}

/** Parsea y valida; no escribe nada. */
function analyze(sheet: string[][], ctx: Context): { preview: ImportPreview; parsed: ParsedRow[] } {
  const errors: ImportIssue[] = [];
  const parsed: ParsedRow[] = [];
  const empty: ImportPreview = {
    ok: false,
    rows: 0,
    errors,
    products: [],
    summary: { productsNew: 0, productsUpdated: 0, variantsNew: 0, variantsUpdated: 0, stockChanges: 0 },
  };
  if (!sheet.length) {
    errors.push({ row: 1, message: "La planilla está vacía." });
    return { preview: empty, parsed };
  }

  const header = sheet[0].map((h) => {
    const n = normHeader(h);
    return (HEADER_ALIASES[n] ?? n) as Column;
  });
  for (const col of REQUIRED)
    if (!header.includes(col))
      errors.push({ row: 1, field: col, message: `Falta la columna "${col}". Usá la plantilla.` });
  if (errors.length) return { preview: empty, parsed };
  const data = sheet.slice(1);
  if (data.length > MAX_IMPORT_ROWS) {
    errors.push({ row: 1, message: `Máximo ${MAX_IMPORT_ROWS} filas por importación.` });
    return { preview: empty, parsed };
  }

  let dataRows = 0;
  data.forEach((cells, i) => {
    const rowNum = i + 2;
    if (cells.every((c) => !c || !c.trim())) return;
    const get = (col: Column) => {
      const idx = header.indexOf(col);
      return idx >= 0 ? (cells[idx] ?? "").toString() : "";
    };
    const base = rowSchema.safeParse(
      Object.fromEntries(
        (["sku_producto", "nombre", "categoria", "marca", "rodado", "talle", "color", "altura", "sku_variante", "descripcion", "fotos"] as const).map(
          (c) => [c, get(c)],
        ),
      ),
    );
    dataRows++;
    // Todos los errores de la fila juntos (no solo el primero): los de
    // formato (zod) y los de precio, stock, si/no, estado y fotos.
    let bad = false;
    if (!base.success) {
      bad = true;
      for (const issue of base.error.issues)
        errors.push({ row: rowNum, field: String(issue.path[0] ?? ""), message: issue.message });
    }
    const b = base.success ? base.data : null;
    const price = parseMoney(get("precio"));
    const oldPrice = parseMoney(get("precio_lista"));
    const stockRaw = get("stock").trim();
    const stock = stockRaw === "" ? null : /^\d{1,5}$/.test(stockRaw) ? Number(stockRaw) : NaN;
    // "se_puede_probar" (planillas viejas) se ignora: ya no hay pruebas de bici.
    const hideWhenOut = parseBool(get("ocultar_sin_stock"));
    const statusRaw = get("estado").trim().toLowerCase();
    const status: ProductStatus | null | "invalid" = !statusRaw
      ? null
      : statusRaw === "publicado" || statusRaw === "borrador"
        ? statusRaw
        : "invalid";
    const photos = get("fotos")
      .split(/[|\s]+/)
      .map((u) => u.trim())
      .filter(Boolean);

    const err = (field: Column, message: string) => {
      errors.push({ row: rowNum, field, message });
      bad = true;
    };
    if (price === "invalid") err("precio", "Precio inválido: usá solo números (ej. 489900).");
    if (oldPrice === "invalid") err("precio_lista", "Precio de lista inválido.");
    if (Number.isNaN(stock)) err("stock", "Stock inválido: un número entero de 0 a 99999.");
    if (hideWhenOut === "invalid") err("ocultar_sin_stock", "Usá si o no.");
    if (status === "invalid") err("estado", "Usá publicado o borrador.");
    if (photos.some((u) => !/^https?:\/\/\S+$/.test(u))) err("fotos", "Las fotos tienen que ser URLs (separadas por |).");
    if (bad || !b) return;

    parsed.push({
      row: rowNum,
      productSku: b.sku_producto.toUpperCase(),
      name: b.nombre,
      category: b.categoria,
      brand: b.marca,
      price: price as number | null,
      oldPrice: oldPrice as number | null,
      rodado: b.rodado,
      size: b.talle || SINGLE_SIZE,
      color: b.color,
      height: b.altura,
      variantSku: b.sku_variante.toUpperCase(),
      stock: stock as number | null,
      hideWhenOut: hideWhenOut as boolean | null,
      status: status as ProductStatus | null,
      description: b.descripcion.trim(),
      photos,
    });
  });

  // Validación del conjunto: grupos por producto.
  const groups = new Map<string, ParsedRow[]>();
  for (const r of parsed) groups.set(r.productSku, [...(groups.get(r.productSku) ?? []), r]);
  const seenVariantSku = new Map<string, number>();
  const plans: ImportProductPlan[] = [];
  const summary = { ...empty.summary };

  for (const [sku, rows] of groups) {
    const existing = ctx.products.find((p) => p.sku === sku);
    const first = rows[0];
    // Datos del producto: la primera fila con valor manda; si otra fila trae
    // un valor distinto, es un error (no se sabe cuál vale).
    for (const field of ["name", "category", "brand", "price", "oldPrice", "rodado"] as const) {
      const values = rows.map((r) => r[field]).filter((v) => v !== null && v !== "" && v !== undefined);
      if (new Set(values.map(String)).size > 1)
        errors.push({ row: rows[1]?.row ?? first.row, field, message: `"${sku}": ${field} distinto entre filas del mismo producto.` });
    }
    const name = rows.find((r) => r.name)?.name ?? "";
    const categoryValue = rows.find((r) => r.category)?.category ?? "";
    if (!existing && !name) errors.push({ row: first.row, field: "nombre", message: `"${sku}" es nuevo: falta el nombre.` });
    if (!existing && !categoryValue)
      errors.push({ row: first.row, field: "categoria", message: `"${sku}" es nuevo: falta la categoría.` });
    if (categoryValue && !findCategory(ctx, categoryValue))
      errors.push({ row: first.row, field: "categoria", message: `La categoría "${categoryValue}" no existe.` });

    const combos = new Set<string>();
    const variantPlans: ImportVariantPlan[] = [];
    const productVariants = existing ? ctx.variants.filter((v) => v.productSlug === existing.slug) : [];
    for (const r of rows) {
      const combo = `${r.size.toLowerCase()}|${r.color.toLowerCase()}`;
      if (combos.has(combo)) {
        errors.push({ row: r.row, field: "talle", message: `"${sku}": talle ${r.size}${r.color ? ` ${r.color}` : ""} repetido.` });
        continue;
      }
      combos.add(combo);
      if (r.variantSku) {
        const prev = seenVariantSku.get(r.variantSku);
        if (prev) errors.push({ row: r.row, field: "sku_variante", message: `SKU ${r.variantSku} repetido (fila ${prev}).` });
        seenVariantSku.set(r.variantSku, r.row);
        const owner = ctx.variants.find((v) => v.sku === r.variantSku);
        if (owner && (!existing || owner.productSlug !== existing.slug))
          errors.push({ row: r.row, field: "sku_variante", message: `El SKU ${r.variantSku} ya es de otro producto.` });
      }
      const match =
        (r.variantSku && productVariants.find((v) => v.sku === r.variantSku)) ||
        productVariants.find((v) => v.size.toLowerCase() === r.size.toLowerCase() && v.color.toLowerCase() === r.color.toLowerCase());
      const stockBefore = match ? (ctx.stock.get(match.id) ?? 0) : 0;
      const changed =
        !!match &&
        ((r.height && r.height !== (match.heightRange ?? "")) ||
          (r.variantSku && r.variantSku !== match.sku) ||
          !match.active);
      const action: ImportVariantPlan["action"] = !match ? "crear" : changed ? "actualizar" : "sin_cambios";
      if (action === "crear") summary.variantsNew++;
      if (action === "actualizar") summary.variantsUpdated++;
      if (r.stock !== null && r.stock !== stockBefore) summary.stockChanges++;
      variantPlans.push({
        row: r.row,
        sku: r.variantSku || match?.sku || "(automático)",
        size: r.size,
        color: r.color,
        heightRange: r.height || null,
        action,
        stock: r.stock,
        stockBefore,
      });
    }

    let action: ImportProductPlan["action"] = "crear";
    if (existing) {
      const cat = categoryValue ? findCategory(ctx, categoryValue) : null;
      const price = rows.find((r) => r.price !== null)?.price;
      const oldPrice = rows.find((r) => r.oldPrice !== null)?.oldPrice;
      const differs =
        (name && name !== existing.name) ||
        (cat && cat !== existing.category) ||
        (price != null && price !== existing.price) ||
        (oldPrice != null && oldPrice !== existing.oldPrice) ||
        (first.rodado && first.rodado !== (existing.rodado ?? "")) ||
        (first.description && first.description !== existing.description) ||
        (first.hideWhenOut !== null && first.hideWhenOut !== existing.hideWhenOut) ||
        (first.status !== null && first.status !== existing.status) ||
        (first.photos.length > 0 && JSON.stringify(first.photos) !== JSON.stringify(existing.images));
      action = differs ? "actualizar" : "sin_cambios";
    }
    if (action === "crear") summary.productsNew++;
    if (action === "actualizar") summary.productsUpdated++;
    plans.push({ sku, name: name || existing?.name || sku, action, variants: variantPlans });
  }

  errors.sort((a, b) => a.row - b.row);
  return {
    parsed,
    preview: {
      ok: errors.length === 0,
      rows: dataRows,
      validRows: parsed.length,
      errors,
      products: plans,
      summary,
    },
  };
}

/** Vista previa: qué se crearía / actualizaría, y los errores por fila. */
export async function previewProductImport(bytes: Buffer): Promise<ImportPreview> {
  const db = await getDb();
  let sheet: string[][];
  try {
    sheet = readSheet(bytes);
  } catch (err) {
    if (err instanceof XlsxError)
      return {
        ok: false,
        rows: 0,
        errors: [{ row: 1, message: err.message }],
        products: [],
        summary: { productsNew: 0, productsUpdated: 0, variantsNew: 0, variantsUpdated: 0, stockChanges: 0 },
      };
    throw err;
  }
  return analyze(sheet, await loadContext(db)).preview;
}

/* ── Commit ───────────────────────────────────────────────── */

/**
 * El commit lee TODO lo que necesita en un par de queries (Context +
 * marcas + totales de stock), simula en memoria exactamente lo que hacía
 * la versión fila por fila (slugs y SKUs únicos, variante "Único",
 * desactivar la "Único" vacía al pasar a talles, stock absoluto en la
 * principal) y escribe todo junto con `atomicWrites`: en Neon es UN
 * request (db.batch, atómico) y si algo falla no queda nada a medias.
 */

type ProductRow = typeof schema.products.$inferSelect;
type VariantRow = typeof schema.productVariants.$inferSelect;

/** Sentencias por INSERT multi-fila (tope holgado de parámetros de Postgres). */
const INSERT_CHUNK = 500;

function chunks<T>(list: T[], size = INSERT_CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

interface ImportWrites {
  brands: (typeof schema.brands.$inferInsert)[];
  products: (typeof schema.products.$inferInsert)[];
  productUpdates: { id: string; set: Partial<typeof schema.products.$inferInsert> }[];
  variants: (typeof schema.productVariants.$inferInsert)[];
  variantUpdates: { id: string; set: Partial<typeof schema.productVariants.$inferInsert> }[];
  /** Variación neta de stock por variante en la sucursal principal. */
  stock: { variantId: string; productSlug: string; delta: number }[];
  principal: string;
  actor: string;
}

/** Calcula en memoria todas las escrituras del commit (sin escribir nada). */
function planImport(
  ctx: Context,
  parsed: ParsedRow[],
  extra: { brands: (typeof schema.brands.$inferSelect)[]; totals: Map<string, number> },
  actor: string,
): ImportWrites {
  const brandRows = extra.brands;
  const writes: ImportWrites = {
    brands: [],
    products: [],
    productUpdates: [],
    variants: [],
    variantUpdates: [],
    stock: [],
    principal: ctx.principal,
    actor,
  };

  // Marcas: por nombre sin distinguir mayúsculas (como el ILIKE de antes).
  const brandByName = new Map<string, string>();
  for (const b of brandRows) if (!brandByName.has(b.name.toLowerCase())) brandByName.set(b.name.toLowerCase(), b.id);
  const brandIds = new Set(brandRows.map((b) => b.id));
  const brandIdFor = (name: string): string => {
    const label = name.trim() || "Sin marca";
    const found = brandByName.get(label.toLowerCase());
    if (found) return found;
    const base = slugify(label, 40) || "marca";
    let id = base;
    for (let i = 2; brandIds.has(id); i++) id = `${base}-${i}`;
    brandIds.add(id);
    brandByName.set(label.toLowerCase(), id);
    writes.brands.push({ id, name: label });
    return id;
  };

  // Slugs tomados (también los ids: el producto nuevo usa slug = id).
  const takenSlugs = new Set(ctx.products.flatMap((p) => [p.slug, p.id]));
  const uniqueSlug = (name: string): string => {
    const base = slugify(name) || `producto-${Date.now()}`;
    let slug = base;
    for (let i = 2; takenSlugs.has(slug); i++) slug = `${base}-${i}`;
    takenSlugs.add(slug);
    return slug;
  };

  // Variantes "en vivo" (estado simulado de la base) y su estado inicial.
  const live = new Map<string, VariantRow>(ctx.variants.map((v) => [v.id, { ...v }]));
  const initial = new Map<string, VariantRow>(ctx.variants.map((v) => [v.id, v]));
  const touched: string[] = [];
  const touch = (id: string) => {
    if (initial.has(id) && !touched.includes(id)) touched.push(id);
  };
  const skuOwner = new Map<string, string>(ctx.variants.map((v) => [v.sku, v.id]));
  const bySlug = new Map<string, VariantRow[]>();
  for (const v of live.values()) bySlug.set(v.productSlug, [...(bySlug.get(v.productSlug) ?? []), v]);
  const variantsOf = (slug: string) => bySlug.get(slug) ?? [];
  const uniqueSku = (wanted: string): string => {
    const base = wanted.trim().toUpperCase();
    let sku = base;
    for (let i = 2; skuOwner.has(sku); i++) sku = `${base}-${i}`;
    return sku;
  };
  const addVariant = (v: VariantRow) => {
    live.set(v.id, v);
    bySlug.set(v.productSlug, [...variantsOf(v.productSlug), v]);
    skuOwner.set(v.sku, v.id);
    writes.variants.push({ ...v });
  };

  // Stock: total (todas las sucursales) y principal, actualizados al simular.
  const totals = new Map(extra.totals);
  const principalQty = new Map(ctx.stock);
  const stockDelta = new Map<string, { productSlug: string; delta: number }>();

  /** createVariant → retireEmptyDefault: la "Único" sin stock se desactiva. */
  const retireEmptyDefault = (slug: string) => {
    const id = defaultVariantId(slug);
    if ((totals.get(id) ?? 0) > 0) return;
    const v = live.get(id);
    if (v && v.active) {
      v.active = false;
      touch(id);
    }
  };

  const groups = new Map<string, ParsedRow[]>();
  for (const r of parsed) groups.set(r.productSku, [...(groups.get(r.productSku) ?? []), r]);

  for (const [sku, rows] of groups) {
    const first = rows[0];
    const pick = <K extends keyof ParsedRow>(k: K) =>
      rows.map((r) => r[k]).find((v) => v !== null && v !== "" && v !== undefined) as ParsedRow[K] | undefined;
    const name = pick("name");
    const categoryValue = pick("category");
    const category = categoryValue ? findCategory(ctx, categoryValue) : null;
    const brand = pick("brand");
    const price = rows.find((r) => r.price !== null)?.price;
    const oldPrice = rows.find((r) => r.oldPrice !== null)?.oldPrice;
    const rodado = pick("rodado");

    let product: Pick<ProductRow, "slug" | "sku"> | undefined = ctx.products.find((p) => p.sku === sku);
    if (!product) {
      const slug = uniqueSlug(name!);
      writes.products.push({
        id: slug,
        slug,
        sku,
        name: name!,
        brandId: brandIdFor(brand ?? ""),
        category: category!,
        price: price ?? null,
        oldPrice: oldPrice ?? null,
        rodado: rodado || null,
        description: first.description,
        hideWhenOut: first.hideWhenOut ?? false,
        status: first.status ?? "publicado",
        images: first.photos,
        custom: true,
        createdAt: new Date().toISOString().slice(0, 10),
      });
      product = { slug, sku };
    } else {
      const p = ctx.products.find((x) => x.sku === sku)!;
      const set: Partial<typeof schema.products.$inferInsert> = {};
      if (name && name !== p.name) set.name = name;
      if (category && category !== p.category) set.category = category;
      if (brand) {
        const brandId = brandIdFor(brand);
        if (brandId !== p.brandId) set.brandId = brandId;
      }
      if (price != null && price !== p.price) set.price = price;
      if (oldPrice != null && oldPrice !== p.oldPrice) set.oldPrice = oldPrice;
      if (rodado && rodado !== p.rodado) set.rodado = rodado;
      if (first.description && first.description !== p.description) set.description = first.description;
      if (first.hideWhenOut !== null && first.hideWhenOut !== p.hideWhenOut) set.hideWhenOut = first.hideWhenOut;
      if (first.status !== null && first.status !== p.status) set.status = first.status;
      if (first.photos.length && JSON.stringify(first.photos) !== JSON.stringify(p.images)) set.images = first.photos;
      if (Object.keys(set).length) writes.productUpdates.push({ id: p.id, set });
    }

    const slug = product.slug;
    const def = defaultVariantId(slug);
    const sized = rows.some((r) => r.size !== SINGLE_SIZE || r.color);
    // ensureDefaultVariant (idempotente).
    if (!sized && !live.has(def) && !variantsOf(slug).some((v) => v.size === SINGLE_SIZE && v.color === "")) {
      addVariant({
        id: def,
        productSlug: slug,
        size: SINGLE_SIZE,
        color: "",
        heightRange: null,
        sku: uniqueSku(defaultVariantSku(slug, sku)),
        order: 0,
        active: true,
      });
    }
    // Foto de las variantes que se usa para matchear las filas: como antes,
    // se refresca solo después de crear una variante.
    let snap = variantsOf(slug).map((v) => ({ ...v }));

    for (const [i, r] of rows.entries()) {
      const match =
        (r.variantSku && snap.find((v) => v.sku === r.variantSku)) ||
        snap.find((v) => v.size.toLowerCase() === r.size.toLowerCase() && v.color.toLowerCase() === r.color.toLowerCase());
      let variantId: string;
      if (!match) {
        // createVariant
        const size = r.size.trim() || SINGLE_SIZE;
        const color = r.color.trim();
        if (variantsOf(slug).some((v) => v.size === size && v.color === color))
          throw new VariantError("Esa combinación de talle y color ya existe.");
        const vsku = r.variantSku ? r.variantSku.trim().toUpperCase() : uniqueSku(autoSku(slug, product.sku, { size, color }));
        if (skuOwner.has(vsku)) throw new VariantError(`El SKU ${vsku} ya está en uso.`);
        variantId = size === SINGLE_SIZE && !color ? def : `${slug}--${randomBytes(4).toString("hex")}`;
        addVariant({
          id: variantId,
          productSlug: slug,
          size,
          color,
          heightRange: r.height.trim() || null,
          sku: vsku,
          order: i,
          active: true,
        });
        if (size !== SINGLE_SIZE || color) retireEmptyDefault(slug);
        snap = variantsOf(slug).map((v) => ({ ...v }));
      } else {
        // updateVariant
        variantId = match.id;
        const v = live.get(match.id)!;
        let changed = false;
        if (r.height && r.height !== (match.heightRange ?? "")) {
          v.heightRange = r.height.trim() || null;
          changed = true;
        }
        if (r.variantSku && r.variantSku !== match.sku) {
          const next = r.variantSku.trim().toUpperCase();
          const owner = skuOwner.get(next);
          if (owner && owner !== v.id) throw new VariantError(`El SKU ${next} ya está en uso.`);
          if (skuOwner.get(v.sku) === v.id) skuOwner.delete(v.sku);
          v.sku = next;
          skuOwner.set(next, v.id);
          changed = true;
        }
        if (!match.active) {
          v.active = true;
          changed = true;
        }
        if (changed) touch(v.id);
      }
      // setStockLevel: absoluto en la principal, asentado como delta.
      if (r.stock !== null) {
        const target = Math.max(0, Math.trunc(r.stock));
        const delta = target - (principalQty.get(variantId) ?? 0);
        if (delta) {
          principalQty.set(variantId, target);
          totals.set(variantId, (totals.get(variantId) ?? 0) + delta);
          const acc = stockDelta.get(variantId) ?? { productSlug: slug, delta: 0 };
          acc.delta += delta;
          stockDelta.set(variantId, acc);
        }
      }
    }

    // Con talles: la "Único" vacía que pudo quedar del alta se desactiva.
    if (sized && snap.some((v) => v.id === def && v.active) && (totals.get(def) ?? 0) === 0) {
      const v = live.get(def);
      if (v && v.active) {
        v.active = false;
        touch(def);
      }
    }
  }

  // Variantes existentes: solo lo que cambió respecto de la base.
  for (const id of touched) {
    const before = initial.get(id)!;
    const after = live.get(id)!;
    const set: Partial<typeof schema.productVariants.$inferInsert> = {};
    if (after.heightRange !== before.heightRange) set.heightRange = after.heightRange;
    if (after.sku !== before.sku) set.sku = after.sku;
    if (after.active !== before.active) set.active = after.active;
    if (Object.keys(set).length) writes.variantUpdates.push({ id, set });
  }
  // Las nuevas van con su estado final (p. ej. la "Único" ya desactivada).
  writes.variants = writes.variants.map((v) => ({ ...live.get(v.id!)! }));
  for (const [variantId, { productSlug, delta }] of stockDelta)
    if (delta) writes.stock.push({ variantId, productSlug, delta });
  return writes;
}

/** Las sentencias del commit, en orden de dependencias (FKs). */
function importQueries(q: Db, w: ImportWrites): BatchItem<"pg">[] {
  const out: BatchItem<"pg">[] = [];
  for (const part of chunks(w.brands)) out.push(q.insert(schema.brands).values(part));
  for (const part of chunks(w.products)) out.push(q.insert(schema.products).values(part));
  for (const u of w.productUpdates) out.push(q.update(schema.products).set(u.set).where(eq(schema.products.id, u.id)));
  // Primero las ediciones (pueden liberar un SKU que toma una variante nueva).
  for (const u of w.variantUpdates)
    out.push(q.update(schema.productVariants).set(u.set).where(eq(schema.productVariants.id, u.id)));
  for (const part of chunks(w.variants)) out.push(q.insert(schema.productVariants).values(part));
  for (const part of chunks(w.stock)) {
    // La fila puede no existir (variante o sucursal nueva).
    out.push(
      q
        .insert(schema.productStock)
        .values(part.map((s) => ({ variantId: s.variantId, productSlug: s.productSlug, locationId: w.principal, qty: 0 })))
        .onConflictDoNothing(),
    );
    // Delta atómico + asiento en el libro con el qty real que quedó (lo que
    // hacía applyStockMovement, para todas las variantes en una sentencia).
    const values = sql.join(
      part.map((s) => sql`(${s.variantId}::text, ${s.delta}::int)`),
      sql`, `,
    );
    out.push(
      q.execute(sql`
        with d (variant_id, delta) as (values ${values}),
        upd as (
          update ${schema.productStock} as ps
             set qty = ps.qty + d.delta
            from d
           where ps.variant_id = d.variant_id
             and ps.location_id = ${w.principal}
             and ps.qty + d.delta >= 0
          returning ps.variant_id, ps.product_slug, ps.location_id, ps.qty, d.delta
        )
        insert into ${schema.stockMovements} (variant_id, product_slug, location_id, delta, qty_after, reason, actor)
        select variant_id, product_slug, location_id, delta, qty, 'importacion', ${w.actor} from upd`),
    );
  }
  return out;
}

/**
 * Aplica la planilla si no tiene errores (si tiene, devuelve la preview
 * con los errores y no escribe nada).
 */
export async function commitProductImport(
  bytes: Buffer,
  opts: { actor?: string } = {},
): Promise<ImportPreview> {
  const db = await getDb();
  let sheet: string[][];
  try {
    sheet = readSheet(bytes);
  } catch (err) {
    if (err instanceof XlsxError) return previewProductImport(bytes);
    throw err;
  }
  // Lecturas: todas en paralelo, un solo viaje.
  const [ctx, brands, totals] = await Promise.all([
    loadContext(db),
    db.select().from(schema.brands),
    getVariantTotals(db),
  ]);
  const { preview, parsed } = analyze(sheet, ctx);
  if (!preview.ok) return preview;

  const writes = planImport(ctx, parsed, { brands, totals }, opts.actor ?? "admin");
  await atomicWrites(db, (q) => importQueries(q, writes));

  invalidatePublic("catalog", { from: "any" });
  return preview;
}
