import Link from "next/link";
import type { ReactNode } from "react";
import { Accordion, AccordionGroup, SpecList } from "@/components/bt/accordion";
import { CardAddButton } from "@/components/bt/card-add";
import { cx } from "@/components/bt/cx";
import { JsonLd, breadcrumbLd, productLd } from "@/components/bt/json-ld";
import { Breadcrumb } from "@/components/bt/navigation";
import { RelatedProductCard } from "@/components/bt/product-card";
import { FOCUS, TRANSITION } from "@/components/bt/styles";
import { Display, Mono } from "@/components/bt/typography";
import { ProductPhotos } from "./product-gallery";
import { ProductPurchase } from "./product-purchase";
import { COPY } from "@/lib/data/demo/copy";
import { img, resolveImage } from "@/lib/images";
import { paths } from "@/lib/paths";
import { productImageAlt } from "@/lib/seo";
import { paymentOptions } from "@/lib/server/checkout-options";
import {
  brandName,
  categoryChain,
  colorSwatch,
  descendantSlugs,
  getCatalogItems,
  getPricing,
  getRuntime,
} from "@/lib/server/screens/tienda-a";
import type { PaymentMethodId, Product } from "@/lib/types";
import { variantPrice } from "@/lib/variants";

/** Grupo del que salen los relacionados de una bici ("Sumale a tu bici"). */
const RELATED_GROUP = "accesorios";

/** "Armada y ajustada" solo aplica a bicis: el resto se retira sin cargo. */
const PICKUP_TEXT_OTHER = "Sin cargo, listo para llevar";

/** Nombre corto de cada medio de pago para la fila de garantías (sin cuotas). */
const PAYMENT_SHORT: Partial<Record<PaymentMethodId, string>> = {
  mercadopago: "Mercado Pago",
  payway: "Tarjeta",
  transferencia: "Transferencia",
  efectivo: "Efectivo",
  link: "Link de pago",
};

/**
 * 2c / 4c · Ficha de producto. Server: datos, breadcrumb, encabezado
 * (con chips), garantías, detalles (specs + descripción) y relacionados;
 * la galería (con lightbox) y la compra (precio por talle y panel de
 * agregado) son islas cliente (`ProductPhotos`, `ProductPurchase`).
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
      full: img(url, { w: 2000 }),
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
  const chips = p.chips.map((x) => x.trim()).filter(Boolean);
  const showPrice = p.price != null && runtime.showPrices;

  // Relacionados: accesorios para las bicis; para el resto, su mismo grupo.
  const isBike = group?.slug === "bicicletas";
  const relScope = descendantSlugs(categories, isBike ? RELATED_GROUP : (group?.slug ?? p.category));
  const related = items.filter((it) => it.slug !== p.slug && relScope.has(it.categorySlug)).slice(0, 4);
  // El panel de agregado ofrece solo los que se pueden sumar ya.
  const sheetItems = related
    .filter((it) => !it.outOfStock)
    .map((it) => ({
      slug: it.slug,
      href: it.href,
      name: it.name,
      image: it.image,
      price: it.price,
      priceFrom: it.priceFrom,
      quickVariant: it.quickVariant,
    }));
  const relatedTitle = isBike ? c.relatedTitle : c.relatedTitleOther;
  const detailsTitle = isBike ? c.forWhoTitle : c.detailsTitleOther;

  // Garantías: datos reales de Ajustes (sucursal principal y medios de pago activos).
  const local = runtime.locations[0];
  const payments = [
    ...new Set(paymentOptions(runtime).map((m) => PAYMENT_SHORT[m.id] ?? m.name)),
  ];

  const sizeHelpHref = `${paths.appointments()}?servicio=asesoramiento`;

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

      {/* Mobile: compacto en una línea (el nombre se recorta). */}
      <Breadcrumb
        items={crumbs}
        className={cx(
          "px-4 pt-3 pb-3 lg:px-14 lg:pt-7 lg:pb-0",
          "max-lg:[&_ol]:flex-nowrap max-lg:[&_ol]:overflow-hidden max-lg:[&_ol]:text-[12px] max-lg:[&_ol]:whitespace-nowrap",
          "max-lg:[&_li:last-child]:min-w-0 max-lg:[&_li:last-child>span]:truncate",
        )}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] lg:gap-14 lg:px-14 lg:pt-6 lg:pb-16">
        <ProductPhotos photos={photos} tag={p.tag} labels={c.gallery} />

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
            {chips.length > 0 && (
              <ul className="m-0 mt-1 flex list-none flex-wrap gap-[6px] p-0" aria-label="Destacados">
                {chips.map((chip) => (
                  <li
                    key={chip}
                    className="rounded-pill border border-line-strong px-3 py-[5px] text-[13px] font-semibold text-text-2 lg:text-[14px]"
                  >
                    {chip}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <ProductPurchase
            slug={p.slug}
            name={p.name}
            image={photos[0]?.thumb}
            price={showPrice ? p.price : null}
            oldPrice={p.oldPrice}
            transferDiscountPct={pricing.transferDiscountPct}
            related={sheetItems}
            variants={variants.map((v) => ({
              id: v.id,
              size: v.size,
              color: v.color,
              heightRange: v.heightRange,
              price: showPrice ? variantPrice(p.price, v) : null,
              stock: v.stock,
            }))}
            forcedOut={p.stockOverride === "sin_stock"}
            swatches={swatches}
            repairHref={paths.repairs()}
            sizeHelpHref={sizeHelpHref}
            cartHref={paths.cart()}
            copy={{
              sizeLabel: c.sizeLabel,
              sizeHelp: c.sizeHelp,
              sizeHelpMobile: c.sizeHelpMobile,
              colorLabel: c.colorLabel,
              addToCart: c.addToCart,
              chooseSize: c.chooseSize,
              repairLink: c.repairLink,
              pickupTitle: c.pickupTitle,
              pickupText: isBike ? c.pickupText : PICKUP_TEXT_OTHER,
              pickupTextMobile: isBike ? "Armada y ajustada" : PICKUP_TEXT_OTHER,
              stockTitle: c.stockTitle,
              stockTitleMobile: "Stock",
              stockText: c.stockText,
              added: {
                title: c.added.title,
                subtitle: isBike ? c.added.subtitle : c.added.subtitleOther,
                keepShopping: c.added.keepShopping,
                goToCart: c.added.goToCart,
              },
            }}
          />

          {/* Garantías: retiro, taller y medios de pago (sin cuotas). */}
          <ul className="m-0 grid list-none grid-cols-1 gap-[10px] border-y border-line p-0 py-4 sm:grid-cols-3 lg:gap-4">
            <Perk icon={<IconStore />} title={c.perks.pickup}>
              {local ? `Sin cargo · ${local.shortName || local.address}` : PICKUP_TEXT_OTHER}
            </Perk>
            <Perk icon={<IconWrench />} title={c.perks.workshop} href={paths.repairs()}>
              {c.perks.workshopText}
            </Perk>
            {payments.length > 0 && (
              <Perk icon={<IconCard />} title={c.perks.payments}>
                {payments.join(" · ")}
              </Perk>
            )}
          </ul>

          {/* Mobile: detalles en un acordeón (specs y debajo la descripción). */}
          {(specs.length > 0 || description) && (
            <AccordionGroup className="lg:hidden">
              <Accordion title={detailsTitle} defaultOpen>
                <div className="flex flex-col gap-4">
                  {specs.length > 0 && <SpecList variant="mobile" items={specs} />}
                  {description && (
                    <p className="m-0 text-[15px] leading-[1.6] whitespace-pre-line text-text-2">{description}</p>
                  )}
                </div>
              </Accordion>
            </AccordionGroup>
          )}
        </div>
      </div>

      {/* Desktop: un solo bloque, specs primero y la descripción debajo. */}
      {(specs.length > 0 || description) && (
        <section className="grid grid-cols-[1fr_1.25fr] gap-14 px-14 pb-16 max-lg:hidden" aria-labelledby="detalles">
          <Display size="h2" id="detalles">
            {detailsTitle}
          </Display>
          <div className="flex flex-col gap-8">
            {specs.length > 0 && <SpecList variant="desktop" items={specs} />}
            {description && (
              <div className="flex flex-col gap-3">
                {specs.length > 0 && (
                  <h3 className="m-0 text-[13px] font-bold tracking-[.08em] text-text-3 uppercase">{c.descriptionTitle}</h3>
                )}
                <p className="m-0 text-[17px] leading-[1.6] whitespace-pre-line text-text-2">{description}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="flex flex-col gap-4 pb-12 lg:gap-6 lg:px-14 lg:pb-[72px]" aria-labelledby="relacionados">
          <Display size="h2" id="relacionados" className="px-4 lg:px-0">
            {relatedTitle}
          </Display>
          {/* Mobile: carrusel horizontal con snap. Desktop: grilla de 4. */}
          <div className="flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:grid lg:grid-cols-4 lg:gap-4 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
            {related.map((it) => (
              <RelatedProductCard
                key={it.slug}
                href={it.href}
                name={it.name}
                image={it.image}
                price={it.price}
                priceFrom={it.priceFrom}
                className="w-[62%] flex-none snap-start sm:w-[40%] lg:w-auto"
                addAction={
                  it.outOfStock ? undefined : (
                    <CardAddButton slug={it.slug} name={it.name} href={it.href} variant={it.quickVariant} />
                  )
                }
              />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

/* ── Garantías ─────────────────────────────────────────────── */

function Perk({
  icon,
  title,
  href,
  children,
}: {
  icon: ReactNode;
  title: string;
  href?: string;
  children: ReactNode;
}) {
  const body = (
    <>
      <span aria-hidden className="flex size-9 flex-none items-center justify-center rounded-full bg-surface text-yellow">
        {icon}
      </span>
      <span className="flex min-w-0 flex-col gap-[2px]">
        <span className="text-[14px] font-extrabold">{title}</span>
        <span className="text-[13px] leading-[1.35] text-text-2">{children}</span>
      </span>
    </>
  );
  return (
    <li className="min-w-0">
      {href ? (
        <Link href={href} className={cx("flex items-start gap-3 rounded-box hover:text-yellow", TRANSITION, FOCUS)}>
          {body}
        </Link>
      ) : (
        <div className="flex items-start gap-3">{body}</div>
      )}
    </li>
  );
}

const ICON = {
  viewBox: "0 0 24 24",
  className: "size-[18px]",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function IconStore() {
  return (
    <svg {...ICON}>
      <path d="M3 9.5 4.5 4h15L21 9.5M3 9.5h18M3 9.5a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M5 12v8h14v-8M10 20v-5h4v5" />
    </svg>
  );
}

function IconWrench() {
  return (
    <svg {...ICON}>
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.1L3.5 17.2a1.8 1.8 0 0 0 2.5 2.5l5.8-5.8a4 4 0 0 0 5.1-5.4l-2.6 2.6-2.4-.6-.6-2.4z" />
    </svg>
  );
}

function IconCard() {
  return (
    <svg {...ICON}>
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <path d="M2.5 10h19M6.5 15h4" />
    </svg>
  );
}
