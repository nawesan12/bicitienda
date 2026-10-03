import type { MetadataRoute } from "next";
import { features } from "@/lib/features";
import { paths } from "@/lib/paths";
import { getCategories, getVisibleProducts } from "@/lib/server/queries";
import { SITE_URL } from "@/lib/site";

/** ISR on-demand por tag "catalog"; 1 día de respaldo. */
export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([getVisibleProducts(), getCategories()]);
  // Solo rutas que existen y cuyo módulo está prendido (lib/features.ts).
  // /cuenta, /checkout y /seguimiento no van: son privadas (robots.ts).
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, priority: 1 },
    { url: `${SITE_URL}${paths.catalog()}`, priority: 0.9 },
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

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
