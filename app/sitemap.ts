import type { MetadataRoute } from "next";
import { paths } from "@/lib/paths";
import {
  getArticles,
  getCategories,
  getVisibleProducts,
} from "@/lib/server/queries";
import { SITE_URL } from "@/lib/site";

/** ISR on-demand por tag "catalog"/"content"; 1 día de respaldo. */
export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, articles, categories] = await Promise.all([
    getVisibleProducts(),
    getArticles(),
    getCategories(),
  ]);
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, priority: 1 },
    { url: `${SITE_URL}${paths.catalog()}`, priority: 0.9 },
    { url: `${SITE_URL}/reparaciones`, priority: 0.7 },
    { url: `${SITE_URL}/nosotros`, priority: 0.5 },
    { url: `${SITE_URL}/novedades`, priority: 0.6 },
    { url: `${SITE_URL}${paths.community()}`, priority: 0.6 },
    { url: `${SITE_URL}/comparador`, priority: 0.4 },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${SITE_URL}${paths.catalog(c.pathSlug)}`,
    priority: 0.8,
  }));

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${SITE_URL}${paths.catalog(p.slug)}`,
    priority: 0.7,
  }));

  const articleRoutes: MetadataRoute.Sitemap = articles.map((a) => ({
    url: `${SITE_URL}/novedades/${a.slug}`,
    priority: 0.5,
  }));

  return [
    ...staticRoutes,
    ...categoryRoutes,
    ...productRoutes,
    ...articleRoutes,
  ];
}
