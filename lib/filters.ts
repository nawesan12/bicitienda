import { matchesSearch, type CardProduct } from "@/lib/product-view";

/**
 * Filtros del catálogo, como en el prototipo: categoría (la da la ruta),
 * marca, búsqueda y orden. Se aplican en el cliente sobre la lista que
 * prerenderiza el server (ISR): cambiar un filtro no invoca funciones.
 * Viajan en la query string para que el link sea compartible:
 *   ?marca=<brandId>&orden=asc|desc&q=<texto>
 */

export type SortKey = "rel" | "asc" | "desc";

export interface CatalogFilters {
  brand: string;
  sort: SortKey;
  search: string;
}

export const SORT_KEYS: SortKey[] = ["rel", "asc", "desc"];

/** Lee de la URL solo los filtros presentes (los ausentes no se pisan). */
export function filtersFromQuery(qs: string): Partial<CatalogFilters> {
  const params = new URLSearchParams(qs);
  const out: Partial<CatalogFilters> = {};
  const brand = params.get("marca");
  const sort = params.get("orden");
  const q = params.get("q");
  if (brand != null) out.brand = brand;
  if (sort && (SORT_KEYS as string[]).includes(sort)) out.sort = sort as SortKey;
  if (q != null) out.search = q;
  return out;
}

/** Serializa a query string, omitiendo los vacíos ("" si no hay nada). */
export function filtersToQuery(f: CatalogFilters): string {
  const params = new URLSearchParams();
  if (f.brand) params.set("marca", f.brand);
  if (f.sort !== "rel") params.set("orden", f.sort);
  if (f.search) params.set("q", f.search);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Filtra y ordena. "rel" deja el orden del catálogo; por precio, los que
 * no tienen precio van siempre al final (como el prototipo).
 */
export function applyFilters(
  list: CardProduct[],
  category: string | null,
  f: CatalogFilters,
): CardProduct[] {
  let out = list;
  if (category) out = out.filter((p) => p.category === category);
  if (f.brand) out = out.filter((p) => p.brandId === f.brand);
  if (f.search) out = out.filter((p) => matchesSearch(p, f.search));
  if (f.sort === "asc")
    out = [...out].sort((a, b) => (a.price ?? 1e12) - (b.price ?? 1e12));
  if (f.sort === "desc")
    out = [...out].sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
  return out;
}
