import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { isOutOfStock } from "@/lib/pricing";
import { paths } from "@/lib/paths";
import { SEO, categorySeo, pageMetadata, productSeo, withRouteOgImage } from "@/lib/seo";
import { brandName, categoryChain, descendantSlugs } from "@/lib/server/screens/tienda-a";
import {
  getBrands,
  getCategories,
  getCategory,
  getProduct,
  getSettings,
  getVisibleProducts,
} from "@/lib/server/queries";
import { CatalogScreenView } from "../_screens/catalog-screen";
import { ProductScreenView } from "../_screens/product-screen";

/**
 * Despacho bajo el path público del catálogo (`routes.catalog`):
 * <catalogo>/bicicletas es el catálogo de la categoría (2b) y
 * <catalogo>/<slug-de-producto> la ficha (2c). Las categorías canonicalizan
 * a su pathSlug. og:image y twitter:image los completa Next con
 * ./opengraph-image.tsx (ver withRouteOgImage).
 *
 * ISR: se regenera on-demand por tag desde el admin (invalidatePublic);
 * 1 día es solo el respaldo (literal: la segment config no admite imports).
 */
export const revalidate = 86400;

type Params = { slug: string };

export async function generateStaticParams() {
  const [products, categories] = await Promise.all([getVisibleProducts(), getCategories()]);
  return [
    ...categories.map((c) => ({ slug: c.pathSlug })),
    ...products.map((p) => ({ slug: p.slug })),
  ];
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const [categories, brands, settings] = await Promise.all([getCategories(), getBrands(), getSettings()]);

  const category = await getCategory(slug);
  if (category) {
    const scope = descendantSlugs(categories, category.slug);
    const inCat = (await getVisibleProducts()).filter((p) => scope.has(p.category));
    const names = [...new Set(inCat.map((p) => brandName(brands, p.brandId)).filter((b): b is string => !!b))];
    const { title, description } = categorySeo(category, inCat.length, names);
    const path = paths.catalog(category.pathSlug);
    return withRouteOgImage(
      pageMetadata({
        title,
        description,
        path,
      }),
    );
  }

  const p = await getProduct(slug);
  if (!p) return { title: SEO.notFoundTitle };
  const chain = categoryChain(categories, p.category);
  const { title, description } = productSeo({
    name: p.name,
    brand: brandName(brands, p.brandId) ?? "",
    category: chain[chain.length - 1],
    price: settings.showPrices ? p.price : null,
    outOfStock: isOutOfStock(p),
    keySpecs: p.chips.join(" · "),
  });
  const path = paths.catalog(p.slug);
  return withRouteOgImage(pageMetadata({ title, absolute: true, description, path }));
}

export default async function CategoryOrProductPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;

  const category = await getCategory(slug);
  if (category) {
    if (slug !== category.pathSlug) redirect(paths.catalog(category.pathSlug));
    return <CatalogScreenView slug={category.slug} />;
  }

  const product = await getProduct(slug);
  if (!product) notFound();
  return <ProductScreenView product={product} />;
}
