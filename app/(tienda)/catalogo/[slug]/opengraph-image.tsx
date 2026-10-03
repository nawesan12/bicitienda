import { categoryOgImage, catalogOgImage, productOgImage } from "@/lib/og/render";
import { isOutOfStock } from "@/lib/pricing";
import { OG_SIZE, SEO, categoryTerms } from "@/lib/seo";
import { brandName, categoryChain, descendantSlugs } from "@/lib/server/screens/tienda-a";
import {
  getBrands,
  getCategories,
  getCategory,
  getProduct,
  getSettings,
  getVisibleProducts,
} from "@/lib/server/queries";
import { sizesOf } from "@/lib/variants";

/**
 * OG de la categoría o de la ficha (mismo despacho que la página). Sin
 * generateStaticParams a propósito: en dev Next lo corre en otro proceso y
 * choca con el lock de PGlite; se genera a pedido y queda en caché (ISR).
 */
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = SEO.og.defaultAlt;
export const revalidate = 86400;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [categories, brands, settings, products] = await Promise.all([
    getCategories(),
    getBrands(),
    getSettings(),
    getVisibleProducts(),
  ]);

  const category = await getCategory(slug);
  if (category) {
    const scope = descendantSlugs(categories, category.slug);
    const inCat = products.filter((p) => scope.has(p.category));
    return categoryOgImage({
      title: categoryTerms(category).plural,
      count: inCat.length,
      photoUrl: inCat.find((p) => p.images[0])?.images[0] ?? null,
    });
  }

  const p = await getProduct(slug);
  if (!p) return catalogOgImage();
  const chain = categoryChain(categories, p.category);
  const cat = chain[chain.length - 1];
  const brand = brandName(brands, p.brandId);
  return productOgImage({
    name: p.name,
    kicker: [cat?.label, brand].filter(Boolean).join(" / "),
    photoUrl: p.images[0] ?? null,
    price: settings.showPrices ? p.price : null,
    oldPrice: p.oldPrice,
    installments: settings.maxInstallments,
    transferDiscount: settings.transferDiscount,
    outOfStock: isOutOfStock(p),
    sizes: sizesOf(p.variants.filter((v) => v.active)).filter((sz) =>
      p.variants.some((v) => v.active && v.size === sz && v.stock > 0),
    ),
    tag: p.tag,
  });
}
