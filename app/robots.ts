import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Panel, endpoints, cuenta, checkout y links de gestión: nada que indexar.
      disallow: ["/admin", "/api", "/cuenta", "/checkout", "/turnos/", "/seguimiento"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
