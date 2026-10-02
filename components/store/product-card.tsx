import Link from "next/link";
import { CompareToggle } from "@/components/store/compare-button";
import { features } from "@/lib/features";
import { WaLink } from "@/components/store/wa-link";
import { lexicon } from "@/lib/data/content";
import { img } from "@/lib/images";
import { paths } from "@/lib/paths";
import type { PricingRates } from "@/lib/pricing";
import { priceView, type CardProduct } from "@/lib/product-view";
import { wa } from "@/lib/whatsapp";

/**
 * Tarjeta de producto, fiel al prototipo en sus dos variantes:
 *   - "featured" (Destacados del home): algo más grande, sin "+ VS" ni
 *     etiqueta SIN STOCK.
 *   - "catalog" (Vehículos): con "+ VS" y SIN STOCK sobre la foto.
 * Foto 4:3 sobre crema con multiply, badge, precio tachado si hay promo,
 * "6 cuotas MiPyME de $X" y "Consultar" por WhatsApp (registra el lead).
 * Sin imports de server: la usan el home (server) y la grilla (client).
 */
export function ProductCard({
  product: p,
  rates,
  whatsapp,
  variant = "catalog",
}: {
  product: CardProduct;
  rates: PricingRates;
  whatsapp: string;
  variant?: "featured" | "catalog";
}) {
  const v = priceView(rates, p);
  const big = variant === "featured";
  const href = paths.catalog(p.slug);

  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-[20px] border border-ink/10 bg-white hover:shadow-[0_24px_50px_rgba(21,23,15,.13)] ${
        big ? "hover:-translate-y-[6px]" : "hover:-translate-y-[5px]"
      }`}
    >
      {!big && features.compare && <CompareToggle slug={p.slug} />}
      <Link
        href={href}
        className="relative box-border block aspect-[4/3] flex-none bg-cream-4"
      >
        {p.tag && (
          <span
            className={`absolute z-[1] rounded-full bg-night font-sans font-bold text-brand ${
              big
                ? "left-[14px] top-[14px] px-[11px] py-[6px] text-[10.5px] tracking-[.14em]"
                : "left-3 top-3 px-[10px] py-[5px] text-[10px] tracking-[.12em]"
            }`}
          >
            {p.tag}
          </span>
        )}
        {!big && p.outOfStock && (
          <span className="absolute bottom-3 left-3 z-[1] rounded-full border border-ink/20 bg-white px-[10px] py-[5px] font-sans text-[10px] font-bold tracking-[.12em] text-ink/60">
            {lexicon.product.outOfStock.toUpperCase()}
          </span>
        )}
        {p.image && (
          // eslint-disable-next-line @next/next/no-img-element -- Cloudinary transforma (img())
          <img
            src={img(p.image, { w: 640 })}
            alt={p.name}
            loading="lazy"
            className="absolute inset-[14px] block h-[calc(100%-28px)] w-[calc(100%-28px)] object-contain mix-blend-multiply"
          />
        )}
      </Link>
      <div
        className={`flex flex-1 flex-col ${
          big ? "gap-3 px-[22px] pb-[22px] pt-[18px]" : "gap-[10px] px-5 pb-5 pt-4"
        }`}
      >
        <div
          className={`font-sans font-semibold text-ink/45 ${
            big ? "text-[11px] tracking-[.2em]" : "text-[10.5px] tracking-[.18em]"
          }`}
        >
          {p.catLabel}
        </div>
        <Link
          href={href}
          className={`font-display font-extrabold tracking-[-.01em] text-ink hover:text-brand-deep ${
            big ? "text-[20px]" : "text-[18px]"
          }`}
        >
          {p.name}
        </Link>
        <div className={`flex flex-wrap ${big ? "gap-[6px]" : "gap-[5px]"}`}>
          {p.chips.map((chip) => (
            <span
              key={chip}
              className={`rounded-full bg-chip font-sans font-medium text-ink/70 ${
                big ? "px-[10px] py-[5px] text-[11.5px]" : "px-[9px] py-1 text-[11px]"
              }`}
            >
              {chip}
            </span>
          ))}
        </div>
        <div
          className={`mt-auto flex items-end justify-between ${
            big ? "gap-3 pt-2" : "gap-[10px] pt-[6px]"
          }`}
        >
          <div>
            {v.hasList && (
              <div
                className={`font-sans font-medium text-ink/45 line-through ${
                  big ? "text-[12px]" : "text-[11.5px]"
                }`}
              >
                {v.listF}
              </div>
            )}
            <div
              className={`font-display font-extrabold tracking-normal ${
                big ? "text-[19px]" : "text-[17px]"
              }`}
            >
              {v.priceF}
            </div>
            <div
              className={`font-sans text-brand-deep ${
                big ? "text-[11px]" : "text-[10.5px]"
              }`}
            >
              {v.sub}
            </div>
          </div>
          <WaLink
            whatsapp={whatsapp}
            {...wa.product(p.name)}
            className={`hit relative whitespace-nowrap rounded-full bg-ink font-sans font-bold text-cream hover:bg-brand hover:text-night ${
              big ? "px-[18px] py-[11px] text-[13px]" : "px-4 py-[10px] text-[12px]"
            }`}
          >
            {lexicon.product.consult}
          </WaLink>
        </div>
      </div>
    </div>
  );
}
