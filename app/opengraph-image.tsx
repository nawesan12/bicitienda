import { COPY } from "@/lib/data/demo/copy";
import { manifestKey } from "@/lib/data/demo/photos";
import { siteOgImage } from "@/lib/og/render";
import { OG_SIZE, SEO } from "@/lib/seo";
import { getSettings } from "@/lib/server/queries";

/** OG del home y fallback del sitio: la foto del hero (2a). */
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = SEO.og.defaultAlt;
export const revalidate = 86400;

export default async function Image() {
  const s = await getSettings();
  return siteOgImage({
    photoUrl: manifestKey(COPY.home.hero.photo),
    installments: s.maxInstallments,
    transferDiscount: s.transferDiscount,
  });
}
