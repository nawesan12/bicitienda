import { img } from "@/lib/images";
import { SITE_URL } from "@/lib/site";
import { paths } from "@/lib/paths";
import { isOutOfStock } from "@/lib/pricing";
import type { RuntimeStore } from "@/lib/server/queries";
import type { Product } from "@/lib/types";

/**
 * Datos estructurados (JSON-LD) de la web pública: `LocalBusiness` en el
 * home y en cada ficha, y `Product` en cada ficha. Se renderizan como
 * <script type="application/ld+json"> escapando "<" (guía de Next).
 */

function abs(url: string): string {
  return url.startsWith("http") ? url : `${SITE_URL}${url}`;
}

export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

export function localBusinessLd(runtime: RuntimeStore) {
  const [street, city] = runtime.address.split(" · ");
  return {
    "@context": "https://schema.org",
    "@type": runtime.businessType,
    "@id": `${SITE_URL}/#local`,
    name: runtime.brandName,
    url: SITE_URL,
    logo: abs("/brand/logo-black.png"),
    image: abs("/opengraph-image.png"),
    telephone: `+${runtime.whatsapp}`,
    address: {
      "@type": "PostalAddress",
      streetAddress: street,
      addressLocality: city ?? runtime.city.split(",")[0],
      addressCountry: "AR",
    },
    openingHours: runtime.openingHours,
    hasMap: runtime.mapsUrl,
    sameAs: [
      `https://www.instagram.com/${runtime.instagram}/`,
      ...(runtime.tiktok ? [`https://www.tiktok.com/@${runtime.tiktok}`] : []),
    ],
  };
}

export function productLd(
  p: Product,
  brandName: string,
  runtime: RuntimeStore,
) {
  const url = `${SITE_URL}${paths.catalog(p.slug)}`;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    sku: p.id,
    url,
    image: p.images.map((i) => abs(img(i, { w: 1200 }))),
    description:
      p.description || [p.chips.join(" · "), ...p.specs.map((s) => `${s.label}: ${s.value}`)].join(". "),
    brand: { "@type": "Brand", name: brandName },
    additionalProperty: p.specs.map((s) => ({
      "@type": "PropertyValue",
      name: s.label,
      value: s.value,
    })),
    ...(runtime.showPrices && p.price != null
      ? {
          offers: {
            "@type": "Offer",
            url,
            priceCurrency: "ARS",
            price: p.price,
            availability: isOutOfStock(p)
              ? "https://schema.org/OutOfStock"
              : "https://schema.org/InStock",
            seller: { "@id": `${SITE_URL}/#local` },
          },
        }
      : {}),
  };
}
