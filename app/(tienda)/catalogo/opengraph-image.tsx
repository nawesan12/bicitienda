import { catalogOgImage } from "@/lib/og/render";
import { OG_SIZE, SEO } from "@/lib/seo";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = SEO.sections.catalog.meta.title;
export const revalidate = 86400;

export default function Image() {
  return catalogOgImage();
}
