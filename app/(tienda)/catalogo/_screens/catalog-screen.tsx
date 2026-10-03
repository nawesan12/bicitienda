import { JsonLd, breadcrumbLd, itemListLd } from "@/components/bt/json-ld";
import { CatalogBrowser } from "./catalog-browser";
import { COPY } from "@/lib/data/demo/copy";
import { paths } from "@/lib/paths";
import { categoryTerms } from "@/lib/seo";
import { buildCatalogScreen, getCatalogItems, getPricing } from "@/lib/server/screens/tienda-a";

/** Título de la portada del catálogo (`/catalogo`, sin categoría). */
export const CATALOG_ALL_TITLE = "Catálogo";

/**
 * 2b / 4b · Catálogo de una categoría (grupo o tipo) o, con `slug` null,
 * de todo. Server: arma los datos estáticos y el JSON-LD; los filtros
 * corren en la isla `CatalogBrowser`.
 */
export async function CatalogScreenView({ slug }: { slug: string | null }) {
  const [{ items, categories }, pricing] = await Promise.all([
    getCatalogItems((s) => paths.catalog(s)),
    getPricing(),
  ]);
  const screen = buildCatalogScreen(items, categories, slug, {
    allTitle: CATALOG_ALL_TITLE,
    homeLabel: COPY.catalog.breadcrumbHome,
    hrefFor: (s) => paths.catalog(s),
  });
  const category = slug ? categories.find((c) => c.slug === slug) : null;
  const crumbs = screen.breadcrumb
    .slice(1)
    .map((b, i, arr) => ({
      name: b.label,
      path: b.href ?? (i === arr.length - 1 ? paths.catalog(category?.pathSlug) : paths.catalog()),
    }));
  const c = COPY.catalog;

  return (
    <>
      <JsonLd
        data={[
          itemListLd(category ? categoryTerms(category).plural : CATALOG_ALL_TITLE, screen.items),
          breadcrumbLd(crumbs),
        ]}
      />
      <CatalogBrowser
        {...screen}
        pricing={pricing}
        quoteHref={paths.quote()}
        copy={{
          count: c.count,
          type: c.filters.type,
          rodado: c.filters.rodado,
          price: c.filters.price,
          size: c.filters.size,
          testRide: c.filters.testRide,
          testRideHint: c.filters.testRideHint,
          clear: c.filters.clear,
          mobileButton: c.filters.mobileButton,
          sortLabel: c.sortLabel,
          next: c.next,
          loadMore: c.loadMore,
        }}
      />
    </>
  );
}
