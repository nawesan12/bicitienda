import { eq, ilike } from "drizzle-orm";
import { z } from "zod";
import { parseCsv, toCsv } from "@/lib/csv";
import { slugify } from "@/lib/slug";
import { getDb, schema, type Db } from "@/lib/server/db";
import { invalidatePublic } from "@/lib/server/revalidate";
import { setStockLevel, getVariantTotals } from "@/lib/server/stock";
import { createVariant, ensureDefaultVariant, updateVariant } from "@/lib/server/variants";
import { isXlsx, readXlsxRows, XlsxError } from "@/lib/server/xlsx";
import { SINGLE_SIZE, type ProductStatus } from "@/lib/types";
import { defaultVariantId } from "@/lib/variants";

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
export const MAX_IMPORT_BYTES = 4 * 1024 * 1024;

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
  const [categories, products, variants, locations] = await Promise.all([
    db.select({ slug: schema.categories.slug, label: schema.categories.label }).from(schema.categories),
    db.select().from(schema.products),
    db.select().from(schema.productVariants),
    db.select().from(schema.locations),
  ]);
  const principal = [...locations]
    .filter((l) => l.active)
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))[0];
  if (!principal) throw new Error("Sin sucursales activas: corré `pnpm db:seed`.");
  const rows = await db
    .select()
    .from(schema.productStock)
    .where(eq(schema.productStock.locationId, principal.id));
  return {
    categories,
    products,
    variants,
    stock: new Map(rows.map((r) => [r.variantId, r.qty])),
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

async function brandIdFor(db: Db, name: string): Promise<string> {
  const label = name.trim() || "Sin marca";
  const [found] = await db
    .select({ id: schema.brands.id })
    .from(schema.brands)
    .where(ilike(schema.brands.name, label));
  if (found) return found.id;
  const base = slugify(label, 40) || "marca";
  let id = base;
  for (let i = 2; ; i++) {
    const [clash] = await db.select({ id: schema.brands.id }).from(schema.brands).where(eq(schema.brands.id, id));
    if (!clash) break;
    id = `${base}-${i}`;
  }
  await db.insert(schema.brands).values({ id, name: label });
  return id;
}

async function uniqueSlug(db: Db, name: string): Promise<string> {
  const base = slugify(name) || `producto-${Date.now()}`;
  let slug = base;
  for (let i = 2; ; i++) {
    const [clash] = await db.select({ id: schema.products.id }).from(schema.products).where(eq(schema.products.slug, slug));
    if (!clash) return slug;
    slug = `${base}-${i}`;
  }
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
  const ctx = await loadContext(db);
  let sheet: string[][];
  try {
    sheet = readSheet(bytes);
  } catch (err) {
    if (err instanceof XlsxError) return previewProductImport(bytes);
    throw err;
  }
  const { preview, parsed } = analyze(sheet, ctx);
  if (!preview.ok) return preview;

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

    let product = ctx.products.find((p) => p.sku === sku);
    if (!product) {
      const slug = await uniqueSlug(db, name!);
      [product] = await db
        .insert(schema.products)
        .values({
          id: slug,
          slug,
          sku,
          name: name!,
          brandId: await brandIdFor(db, brand ?? ""),
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
        })
        .returning();
    } else {
      const set: Partial<typeof schema.products.$inferInsert> = {};
      if (name && name !== product.name) set.name = name;
      if (category && category !== product.category) set.category = category;
      if (brand) set.brandId = await brandIdFor(db, brand);
      if (price != null && price !== product.price) set.price = price;
      if (oldPrice != null && oldPrice !== product.oldPrice) set.oldPrice = oldPrice;
      if (rodado && rodado !== product.rodado) set.rodado = rodado;
      if (first.description && first.description !== product.description) set.description = first.description;
      if (first.hideWhenOut !== null) set.hideWhenOut = first.hideWhenOut;
      if (first.status !== null) set.status = first.status;
      if (first.photos.length) set.images = first.photos;
      if (Object.keys(set).length)
        [product] = await db.update(schema.products).set(set).where(eq(schema.products.id, product.id)).returning();
    }

    const slug = product.slug;
    const sized = rows.some((r) => r.size !== SINGLE_SIZE || r.color);
    if (!sized) await ensureDefaultVariant(db, slug, sku);
    let variants = await db.select().from(schema.productVariants).where(eq(schema.productVariants.productSlug, slug));

    for (const [i, r] of rows.entries()) {
      const match =
        (r.variantSku && variants.find((v) => v.sku === r.variantSku)) ||
        variants.find((v) => v.size.toLowerCase() === r.size.toLowerCase() && v.color.toLowerCase() === r.color.toLowerCase());
      let variantId: string;
      if (!match) {
        const v = await createVariant(db, slug, {
          size: r.size,
          color: r.color,
          heightRange: r.height || null,
          sku: r.variantSku || null,
          order: i,
        });
        variantId = v.id;
        variants = await db.select().from(schema.productVariants).where(eq(schema.productVariants.productSlug, slug));
      } else {
        variantId = match.id;
        const patch: Parameters<typeof updateVariant>[2] = {};
        if (r.height && r.height !== (match.heightRange ?? "")) patch.heightRange = r.height;
        if (r.variantSku && r.variantSku !== match.sku) patch.sku = r.variantSku;
        if (!match.active) patch.active = true;
        if (Object.keys(patch).length) await updateVariant(db, match.id, patch);
      }
      if (r.stock !== null)
        await setStockLevel(db, {
          variantId,
          productSlug: slug,
          locationId: ctx.principal,
          qty: r.stock,
          reason: "importacion",
          actor: opts.actor ?? "admin",
        });
    }

    // Con talles: la "Único" vacía que pudo quedar del alta se desactiva.
    if (sized) {
      const totals = await getVariantTotals(db);
      const def = defaultVariantId(slug);
      if (variants.some((v) => v.id === def && v.active) && (totals.get(def) ?? 0) === 0)
        await updateVariant(db, def, { active: false });
    }
  }

  invalidatePublic("catalog", { from: "any" });
  return preview;
}
