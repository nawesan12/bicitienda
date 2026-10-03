import { Accordion, AccordionGroup, SpecList } from "@/components/bt/accordion";
import { JsonLd, breadcrumbLd, productLd } from "@/components/bt/json-ld";
import { Breadcrumb } from "@/components/bt/navigation";
import { PriceBox, RelatedProductCard } from "@/components/bt/product-card";
import { Display, Mono } from "@/components/bt/typography";
import { ProductPhotos } from "@/components/bt/tienda-a/product-gallery";
import { ProductPurchase } from "@/components/bt/tienda-a/product-purchase";
import { COPY } from "@/lib/data/demo/copy";
import { img, resolveImage } from "@/lib/images";
import { paths } from "@/lib/paths";
import { productImageAlt } from "@/lib/seo";
import {
  brandName,
  categoryChain,
  colorSwatch,
  descendantSlugs,
  getCatalogItems,
  getPricing,
  getRuntime,
} from "@/lib/server/screens/tienda-a";
import type { Product } from "@/lib/types";

/** Grupo del que salen los relacionados de una bici ("Sumale a tu bici"). */
const RELATED_GROUP = "accesorios";

/** "Armada y ajustada" solo aplica a bicis: el resto se retira sin cargo. */
const PICKUP_TEXT_OTHER = "Sin cargo, listo para llevar";

/**
 * 2c / 4c · Ficha de producto. Server: datos, breadcrumb, encabezado,
 * precio, descripción, specs y relacionados; la galería y la compra son
 * islas cliente (`ProductPhotos`, `ProductPurchase`).
 */
export async function ProductScreenView({ product: p }: { product: Product }) {
  const [{ items, categories, brands }, pricing, runtime] = await Promise.all([
    getCatalogItems((s) => paths.catalog(s)),
    getPricing(),
    getRuntime(),
  ]);
  const chain = categoryChain(categories, p.category);
  const category = chain[chain.length - 1];
  const group = chain[0];
  const brand = brandName(brands, p.brandId);
  const alt = productImageAlt(p.name, category);
  const c = COPY.product;

  const photos = (p.images.length ? p.images : ["/brand/logo-bicitiendamdq-320.webp"]).map((src, i) => {
    const url = resolveImage(src);
    return {
      src: img(url, { w: 1400 }),
      thumb: img(url, { w: 200 }),
      alt: i === 0 ? alt : `${alt} · foto ${i + 1}`,
    };
  });

  const meta = [category?.single ?? category?.label, brand].filter(Boolean).join(" / ");
  const variants = p.variants.filter((v) => v.active);
  const swatches = Object.fromEntries(
    [...new Set(variants.map((v) => v.color).filter(Boolean))].map((col) => [col, colorSwatch(col)]),
  );
  // Orden cargado en el admin (el del prototipo), sin las filas vacías.
  const specs = p.specs.filter((s) => s.label.trim() && s.value.trim());
  const description = p.description.trim();

  // Relacionados: accesorios para las bicis; para el resto, su mismo grupo.
  const isBike = group?.slug === "bicicletas";
  const relScope = descendantSlugs(categories, isBike ? RELATED_GROUP : (group?.slug ?? p.category));
  const related = items.filter((it) => it.slug !== p.slug && relScope.has(it.categorySlug)).slice(0, 4);

  const testRideHref = p.testRide
    ? `${paths.appointments()}?servicio=prueba&producto=${encodeURIComponent(p.slug)}`
    : null;
  const sizeHelpHref = `${paths.appointments()}?servicio=asesoramiento&producto=${encodeURIComponent(p.slug)}`;

  const crumbs = [
    { label: COPY.catalog.breadcrumbHome, href: "/" },
    ...chain.map((cat) => ({ label: cat.label, href: paths.catalog(cat.pathSlug) })),
    { label: p.name },
  ];

  return (
    <>
      <JsonLd
        data={[
          productLd(p, { brandName: brand ?? undefined, category, runtime }),
          breadcrumbLd([
            ...chain.map((cat) => ({ name: cat.label, path: paths.catalog(cat.pathSlug) })),
            { name: p.name, path: paths.catalog(p.slug) },
          ]),
        ]}
      />

      <Breadcrumb items={crumbs} className="px-14 pt-7 max-lg:hidden" />

      <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] lg:gap-14 lg:px-14 lg:pt-6 lg:pb-16">
        <ProductPhotos photos={photos} tag={p.tag} />

        <div className="flex min-w-0 flex-col gap-[18px] px-4 pt-[18px] pb-7 lg:gap-6 lg:p-0">
          <div className="flex flex-col gap-[10px]">
            <Mono size={13} uppercase className="max-lg:text-[11px]">
              {meta}
              {p.sku && (
                <>
                  {meta && " · "}
                  <span className="max-lg:hidden">SKU </span>
                  {p.sku}
                </>
              )}
            </Mono>
            <h1 className="m-0 text-[48px] leading-[.88] font-black uppercase stretch-66 lg:text-[72px]">{p.name}</h1>
          </div>

          {p.price != null && runtime.showPrices && (
            <PriceBox
              price={p.price}
              installments={pricing.installments}
              transferDiscountPct={pricing.transferDiscountPct}
            />
          )}

          <ProductPurchase
            slug={p.slug}
            variants={variants.map((v) => ({
              id: v.id,
              size: v.size,
              color: v.color,
              heightRange: v.heightRange,
              stock: v.stock,
            }))}
            forcedOut={p.stockOverride === "sin_stock"}
            swatches={swatches}
            testRideHref={testRideHref}
            sizeHelpHref={sizeHelpHref}
            cartHref={paths.cart()}
            copy={{
              sizeLabel: c.sizeLabel,
              sizeHelp: c.sizeHelp,
              sizeHelpMobile: c.sizeHelpMobile,
              colorLabel: c.colorLabel,
              addToCart: c.addToCart,
              testRide: c.testRide,
              testRideMobile: c.testRideMobile,
              pickupTitle: c.pickupTitle,
              pickupText: isBike ? c.pickupText : PICKUP_TEXT_OTHER,
              pickupTextMobile: isBike ? "Armada y ajustada" : PICKUP_TEXT_OTHER,
              stockTitle: c.stockTitle,
              stockTitleMobile: "Stock",
              stockText: c.stockText,
            }}
          />

          {/* Mobile: specs y "Para quién es" en acordeones (4c). */}
          {(specs.length > 0 || description) && (
            <AccordionGroup className="lg:hidden">
              {specs.length > 0 && (
                <Accordion title={c.specsTitle} defaultOpen>
                  <SpecList variant="mobile" items={specs} />
                </Accordion>
              )}
              {description && (
                <Accordion title={c.forWhoTitle}>
                  <p className="m-0 text-[15px] leading-[1.6] whitespace-pre-line text-text-2">{description}</p>
                </Accordion>
              )}
            </AccordionGroup>
          )}
        </div>
      </div>

      {/* Desktop: "Para quién es" + specs (invierte las proporciones). */}
      {(specs.length > 0 || description) && (
        <div className="grid grid-cols-[1fr_1.25fr] gap-14 px-14 pb-16 max-lg:hidden">
          <div className="flex flex-col gap-4">
            {description && (
              <>
                <Display size="h2">{c.forWhoTitle}</Display>
                <p className="m-0 text-[17px] leading-[1.6] whitespace-pre-line text-text-2">{description}</p>
              </>
            )}
          </div>
          <div className="flex flex-col gap-4">
            {specs.length > 0 && (
              <>
                <Display size="h2">{c.specsTitle}</Display>
                <SpecList variant="desktop" items={specs} />
              </>
            )}
          </div>
        </div>
      )}

      {related.length > 0 && (
        <section className="flex flex-col gap-6 px-14 pb-[72px] max-lg:hidden">
          <Display size="h2">{c.relatedTitle}</Display>
          <div className="grid grid-cols-4 gap-4">
            {related.map((it) => (
              <RelatedProductCard key={it.slug} href={it.href} name={it.name} image={it.image} price={it.price} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
