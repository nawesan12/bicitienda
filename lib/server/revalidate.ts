import { revalidatePath, revalidateTag, updateTag } from "next/cache";
import { INTERNAL_CATALOG } from "@/lib/internal-routes";

/**
 * Invalidación de la web pública después de un cambio del admin (o de un
 * webhook). Un solo lugar que sabe qué tag y qué rutas toca cada tipo de
 * dato, así ninguna action se olvida de una página.
 *
 * Tags (los de lib/server/queries.ts y lib/server/instagram.ts):
 *   catalog · content · settings · locations · instagram
 *
 * Desde una server action se usa `updateTag` (el que guardó ve su cambio
 * en la misma respuesta); desde un route handler (webhooks, cron) no está
 * permitido y va `revalidateTag(tag, "max")`. Las rutas se marcan con
 * `revalidatePath` (los paths son los INTERNOS de app/: la URL pública de
 * rubro llega por rewrite).
 */

export type PublicScope =
  | "catalog"
  | "content"
  | "settings"
  | "locations"
  | "instagram";

/** Páginas afectadas por cada tipo de dato, además del tag. */
const PATHS: Record<PublicScope, [path: string, type?: "page" | "layout"][]> = {
  // Productos, categorías, stock: home (destacados/categorías), catálogo,
  // fichas, comparador y el checkout (precios vigentes).
  catalog: [
    ["/"],
    [INTERNAL_CATALOG],
    [`${INTERNAL_CATALOG}/[slug]`, "page"],
    ["/comparador"],
    ["/checkout"],
    ["/sitemap.xml"],
  ],
  // Textos, hero, notas, agenda, Nosotros, test: los usa el layout (nav y
  // footer), así que se invalida todo el árbol.
  content: [["/", "layout"]],
  // Contacto, precios visibles, venta online, recargos: idem.
  settings: [["/", "layout"]],
  locations: [["/", "layout"]],
  // El feed es un JSON estático (ISR 1 h) que la home pide desde el
  // cliente: no hace falta regenerar ninguna página.
  instagram: [["/api/instagram"]],
};

export function invalidatePublic(
  scopes: PublicScope | PublicScope[],
  opts: { from?: "action" | "route" | "any" } = {},
): void {
  const list = Array.isArray(scopes) ? scopes : [scopes];
  const from = opts.from ?? "action";
  if (from === "any") {
    // Código compartido que puede correr en una action, en un route
    // handler o durante un render (p. ej. el barrido de reservas
    // vencidas): se intenta lo más fuerte y, si el contexto no lo
    // permite, se cae al siguiente. En un render no se puede invalidar
    // nada: queda el revalidate por tiempo.
    for (const scope of new Set(list)) {
      try {
        invalidatePublic(scope, { from: "action" });
      } catch {
        try {
          invalidatePublic(scope, { from: "route" });
        } catch {
          /* render: sin invalidación on-demand */
        }
      }
    }
    return;
  }
  for (const scope of new Set(list)) {
    if (from === "action") updateTag(scope);
    else revalidateTag(scope, "max");
    for (const [path, type] of PATHS[scope]) {
      if (type) revalidatePath(path, type);
      else revalidatePath(path);
    }
  }
}

/** Contadores y listados del panel (badge de consultas, pedidos…). */
export function invalidateAdmin(): void {
  revalidatePath("/admin", "layout");
}
