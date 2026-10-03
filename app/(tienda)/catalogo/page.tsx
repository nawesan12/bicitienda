import { paths } from "@/lib/paths";
import { SEO, pageMetadata } from "@/lib/seo";
import { withRouteOgImage } from "@/lib/server/screens/tienda-a";
import { CatalogScreenView } from "./_screens/catalog-screen";

/**
 * 2b / 4b · Portada del catálogo (todo, y el buscador del header con
 * `?q=`). ISR: se regenera on-demand por tag desde el admin
 * (invalidatePublic); 1 día es solo el respaldo (literal: la segment config
 * no admite imports).
 */
export const revalidate = 86400;

// og:image/twitter:image: los completa Next con ./opengraph-image.tsx.
export const metadata = withRouteOgImage(
  pageMetadata({ ...SEO.sections.catalog.meta, path: paths.catalog() }),
);

export default function CatalogPage() {
  return <CatalogScreenView slug={null} />;
}
