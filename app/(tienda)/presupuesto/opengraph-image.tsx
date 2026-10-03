import { quoteOgImage } from "@/lib/og/render";
import { OG_SIZE, SEO } from "@/lib/seo";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = SEO.sections.quote.meta.title;

export default function Image() {
  return quoteOgImage();
}
