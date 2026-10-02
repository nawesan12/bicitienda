import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AddToCart } from "@/components/store/add-to-cart";
import { CatalogView } from "@/components/store/catalog-view";
import { CompareToggleLong } from "@/components/store/compare-button";
import { JsonLd, localBusinessLd, productLd } from "@/components/store/json-ld";
import { StockAlertForm } from "@/components/store/stock-alert-form";
import { StoreShell } from "@/components/store/store-shell";
import { WaLink } from "@/components/store/wa-link";
import { store } from "@/lib/config";
import { lexicon } from "@/lib/data/content";
import { img } from "@/lib/images";
import { paths } from "@/lib/paths";
import { isBuyable, ratesOf } from "@/lib/pricing";
import { priceView, toCardProduct } from "@/lib/product-view";
import {
  getBrands,
  getCategories,
  getCategory,
  getProductAvailability,
  getStore,
  getTexts,
  getVisibleProducts,
} from "@/lib/server/queries";
import { sortSpecs } from "@/lib/specs";
import type { Product } from "@/lib/types";
import { wa } from "@/lib/whatsapp";

/**
 * Ruta con despacho bajo el path público del catálogo (`routes.catalog`):
 * <catalogo>/bicicletas es el catálogo prefiltrado y <catalogo>/efat la
 * ficha. Las categorías canonicalizan al pathSlug largo
 * (<catalogo>/bici redirige a <catalogo>/bicicletas).
 */

/**
 * ISR: se regenera on-demand por tag desde el admin (invalidatePublic);
 * 1 día es solo el respaldo (literal: la segment config no admite imports).
 */
export const revalidate = 86400;

type Params = { slug: string };

async function findProduct(slug: string): Promise<Product | undefined> {
  return (await getVisibleProducts()).find((p) => p.slug === slug);
}

export async function generateStaticParams() {
  const [products, categories] = await Promise.all([
    getVisibleProducts(),
    getCategories(),
  ]);
  return [
    ...categories.map((c) => ({ slug: c.pathSlug })),
    ...products.map((p) => ({ slug: p.slug })),
  ];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const runtime = await getStore();
  const city = runtime.city.split(",")[0];

  const category = await getCategory(slug);
  if (category) {
    return {
      title: lexicon.catalog.categoryMetaTitle(category.label),
      description: `${category.label}${category.sub ? ` ${category.sub}` : ""}. Garantía oficial y service en ${city}.`,
      alternates: { canonical: paths.catalog(category.pathSlug) },
    };
  }

  const product = await findProduct(slug);
  if (!product) return { title: lexicon.catalog.productMetaFallback };

  const keySpecs = sortSpecs(product.specs)
    .slice(0, 3)
    .map((s) => `${s.label} ${s.value}`)
    .join(" · ");
  const description =
    product.description.trim() ||
    `${product.chips.join(" · ")}. ${keySpecs}. Con garantía oficial en ${runtime.brandName}, ${city}.`;

  return {
    title: product.name,
    description,
    alternates: { canonical: paths.catalog(product.slug) },
    openGraph: {
      title: `${product.name} · ${runtime.brandName}`,
      description,
      images: product.images[0] ? [img(product.images[0], { w: 1200 })] : undefined,
    },
  };
}

export default async function VehicleOrCategoryPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;

  const category = await getCategory(slug);
  if (category) {
    if (slug !== category.pathSlug) redirect(paths.catalog(category.pathSlug));
    return (
      <StoreShell>
        <CatalogView category={category} />
      </StoreShell>
    );
  }

  const product = await findProduct(slug);
  if (!product) notFound();

  return (
    <StoreShell>
      <ProductView product={product} />
    </StoreShell>
  );
}

const box = "rounded-xl px-[14px] py-[11px]";
const boxLabel = "font-sans text-[10px] font-bold tracking-[.14em]";
const boxValue = "font-display mt-[3px] text-[17px] font-extrabold tracking-normal";

async function ProductView({ product }: { product: Product }) {
  const [brands, categories, runtime, texts, availability] = await Promise.all([
    getBrands(),
    getCategories(),
    getStore(),
    getTexts(),
    getProductAvailability(product.slug),
  ]);
  const rates = ratesOf(runtime);
  const card = toCardProduct(product, brands, categories);
  const v = priceView(rates, card);
  // "Comprar en la tienda ↗" agrega al carrito propio: solo con la venta
  // online prendida y si el modelo se puede comprar (precio + stock).
  const buyable = runtime.ventaOnline && isBuyable(rates, product);
  const photo = product.images[0];

  return (
    <section className="animate-fade-in box-content min-h-screen bg-cream px-[clamp(16px,4vw,40px)] pb-[90px] pt-[34px]">
      <JsonLd data={productLd(product, card.brand, runtime)} />
      <JsonLd data={localBusinessLd(runtime)} />
      <div className="mx-auto max-w-content">
        <Link
          href={paths.catalog()}
          className="hit relative font-sans text-[13px] font-bold text-ink/55 hover:text-ink"
        >
          {lexicon.catalog.backLink}
        </Link>

        <div className="mt-6 grid grid-cols-[repeat(auto-fit,minmax(min(440px,100%),1fr))] items-start gap-[clamp(24px,4vw,50px)]">
          <div className="relative box-border flex aspect-[4/3] min-[1000px]:sticky min-[1000px]:top-24 items-center justify-center rounded-[24px] border border-ink/10 bg-white p-5">
            {photo && (
              // eslint-disable-next-line @next/next/no-img-element -- Cloudinary transforma (img())
              <img
                src={img(photo, { w: 1100 })}
                alt={product.name}
                fetchPriority="high"
                className="absolute inset-5 block h-[calc(100%-40px)] w-[calc(100%-40px)] object-contain mix-blend-multiply"
              />
            )}
          </div>

          <div>
            <div className="font-sans text-[11px] font-semibold tracking-[.22em] text-ink/50">
              {card.catLabel} · {card.brand}
            </div>
            <h1 className="font-display mb-0 mt-2 text-[clamp(32px,3.6vw,48px)] leading-[1.02]">
              {product.name}
            </h1>
            {product.description.trim() && (
              <p className="mb-0 mt-[14px] whitespace-pre-line text-[15.5px] leading-[1.65] text-ink/70 [text-wrap:pretty]">
                {product.description}
              </p>
            )}
            <div className="mt-[14px] flex flex-wrap gap-[6px]">
              {card.chips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full bg-brand-pastel px-3 py-[6px] font-sans text-[12px] font-semibold text-night"
                >
                  {chip}
                </span>
              ))}
            </div>

            <div className="mt-[22px] rounded-[18px] border border-ink/[.12] bg-white px-6 py-[22px]">
              {v.hasPrice ? (
                <>
                  {v.hasList && (
                    <div className="flex items-center gap-[10px]">
                      <span className="font-sans text-[15px] font-medium text-ink/45 line-through">
                        {v.listF}
                      </span>
                      <span className="rounded-full bg-brand px-[9px] py-1 font-sans text-[11px] font-bold tracking-[.1em] text-night">
                        {v.offLabel}
                      </span>
                    </div>
                  )}
                  <div className="font-display text-[34px] font-extrabold tracking-normal">
                    {v.priceF}
                  </div>
                  <div className="mt-[14px] grid grid-cols-[repeat(auto-fit,minmax(min(130px,100%),1fr))] gap-2">
                    <div className={`${box} bg-night`}>
                      <div className={`${boxLabel} text-cream/60`}>
                        {lexicon.financing.box6}
                      </div>
                      <div className={`${boxValue} text-brand`}>{v.c6F}</div>
                    </div>
                    <div className={`${box} bg-chip`}>
                      <div className={`${boxLabel} text-ink/55`}>
                        {lexicon.financing.box3}
                      </div>
                      <div className={boxValue}>{v.c3F}</div>
                    </div>
                    <div className={`${box} bg-brand-pastel`}>
                      <div className={`${boxLabel} text-brand-deeper`}>
                        {lexicon.financing.boxTransfer(rates.transferDiscount)}
                      </div>
                      <div className={`${boxValue} text-brand-deeper`}>{v.cashF}</div>
                    </div>
                  </div>
                  <div className="mt-2 font-sans text-[11.5px] text-ink/50">
                    {lexicon.financing.boxNote}
                  </div>
                </>
              ) : (
                <>
                  <div className="font-display text-[22px] font-extrabold tracking-normal">
                    {lexicon.product.noPriceTitle}
                  </div>
                  <div className="mt-[2px] font-sans text-[12.5px] text-ink/55">
                    {lexicon.product.noPriceNote}
                  </div>
                </>
              )}

              <div className="mt-[18px] flex flex-wrap gap-[10px]">
                <WaLink
                  whatsapp={runtime.whatsapp}
                  {...wa.product(product.name)}
                  className="box-content min-w-[180px] flex-1 rounded-full bg-ink px-5 py-[15px] text-center font-sans text-[15px] font-bold text-cream hover:bg-brand hover:text-night"
                >
                  {lexicon.product.waCta}
                </WaLink>
                {buyable && (
                  <AddToCart
                    slug={product.slug}
                    stock={product.stock}
                    label={lexicon.product.buyCta}
                  />
                )}
              </div>
              <CompareToggleLong slug={product.slug} />
              {card.outOfStock && store.features.emails !== false && (
                <StockAlertForm slug={product.slug} />
              )}
            </div>

            {/* Disponibilidad por sucursal — solo con más de una activa. */}
            {availability.length > 0 && (
              <div className="mt-3 flex flex-col gap-[6px] rounded-[14px] border border-ink/10 bg-cream-3 px-5 py-[14px]">
                {availability.map(({ location, level }) => (
                  <div
                    key={location.id}
                    className="flex items-center justify-between gap-3 font-sans text-[12.5px]"
                  >
                    <span className="font-semibold text-ink/70">{location.shortName}</span>
                    <span
                      className={
                        level === "en-stock"
                          ? "font-bold text-brand-deep"
                          : level === "pocas"
                            ? "font-bold text-[#9a6b00]"
                            : "font-semibold text-ink/40"
                      }
                    >
                      {level === "en-stock"
                        ? "En stock"
                        : level === "pocas"
                          ? "Pocas unidades"
                          : lexicon.product.outOfStock}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-[26px]">
              <div className="font-sans text-[12px] font-bold tracking-[.24em] text-ink/50">
                {lexicon.product.specsTitle}
              </div>
              <div className="mt-3 overflow-hidden rounded-2xl border border-ink/10 bg-white">
                {sortSpecs(product.specs).map((spec) => (
                  <div
                    key={spec.label}
                    className="grid grid-cols-[150px_1fr] gap-[14px] border-b border-ink/[.06] px-[18px] py-3 font-sans text-[13.5px]"
                  >
                    <div className="font-semibold text-ink/50">{spec.label}</div>
                    <div>{spec.value}</div>
                  </div>
                ))}
              </div>
              <div className="mt-[10px] font-sans text-[11.5px] text-ink/45">
                {texts.prod_note}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
