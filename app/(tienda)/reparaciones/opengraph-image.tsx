import { sectionOgImage } from "@/lib/og/render";
import { OG_SIZE } from "@/lib/seo";
import { REPAIRS_SEO } from "./copy";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = REPAIRS_SEO.meta.title;

export default function Image() {
  return sectionOgImage(REPAIRS_SEO.og);
}
