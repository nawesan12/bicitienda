import type { MetadataRoute } from "next";
import { features } from "@/lib/features";
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
  // Solo rutas que existen y cuyo módulo está prendido (lib/features.ts).
  // /cuenta, /checkout y /seguimiento no van: son privadas (robots.ts).
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, priority: 1 },
    { url: `${SITE_URL}${paths.catalog()}`, priority: 0.9 },
    ...(features.repairs ? [{ url: `${SITE_URL}/reparaciones`, priority: 0.7 }] : []),
    { url: `${SITE_URL}/nosotros`, priority: 0.5 },
    ...(features.blog ? [{ url: `${SITE_URL}/novedades`, priority: 0.6 }] : []),
    ...(features.community ? [{ url: `${SITE_URL}${paths.community()}`, priority: 0.6 }] : []),
    ...(features.compare ? [{ url: `${SITE_URL}/comparador`, priority: 0.4 }] : []),
    ...(features.appointments ? [{ url: `${SITE_URL}${paths.appointments()}`, priority: 0.7 }] : []),
    ...(features.quotes ? [{ url: `${SITE_URL}${paths.quote()}`, priority: 0.7 }] : []),
  ];

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${SITE_URL}${paths.catalog(c.pathSlug)}`,
    priority: 0.8,
  }));

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${SITE_URL}${paths.catalog(p.slug)}`,
    priority: 0.7,
  }));

  const articleRoutes: MetadataRoute.Sitemap = (features.blog ? articles : []).map((a) => ({
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
