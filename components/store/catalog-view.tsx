import { CatalogGrid } from "@/components/store/catalog-grid";
import { ratesOf } from "@/lib/pricing";
import { toCardProduct } from "@/lib/product-view";
import {
  getBrands,
  getCategories,
  getStore,
  getTexts,
  getVisibleProducts,
} from "@/lib/server/queries";
import type { Category } from "@/lib/types";

/**
 * Cuerpo del catálogo, compartido entre la portada (`routes.catalog`) y
 * las rutas de categoría. Server: arma la lista completa (prerenderizada,
 * buena para SEO) y la grilla filtra en el cliente.
 */
export async function CatalogView({ category }: { category: Category | null }) {
  const [visible, brands, runtime, categories, texts] = await Promise.all([
    getVisibleProducts(),
    getBrands(),
    getStore(),
    getCategories(),
    getTexts(),
  ]);
  const cards = visible.map((p) => toCardProduct(p, brands, categories));
  // Select de marca: solo las marcas con modelos visibles, en el orden en
  // que aparecen en el catálogo (como el prototipo).
  const brandIds = [...new Set(visible.map((p) => p.brandId))];
  const brandOptions = brandIds
    .map((id) => brands.find((b) => b.id === id))
    .filter((b) => b != null);

  return (
    <CatalogGrid
      title={texts.veh_title}
      products={cards}
      categories={categories.map((c) => ({
        slug: c.slug,
        label: c.label,
        pathSlug: c.pathSlug,
      }))}
      activeCategory={category?.slug ?? null}
      brands={brandOptions}
      rates={ratesOf(runtime)}
      whatsapp={runtime.whatsapp}
    />
  );
}
