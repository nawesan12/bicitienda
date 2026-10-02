import Link from "next/link";
import { CartButton } from "@/components/store/cart-drawer";
import { WaLink } from "@/components/store/wa-link";
import { lexicon } from "@/lib/data/content";
import { img, resolveImage } from "@/lib/images";
import { features } from "@/lib/features";
import { paths } from "@/lib/paths";
import type { RuntimeStore } from "@/lib/server/queries";
import type { Category, SiteTexts } from "@/lib/types";
import { wa } from "@/lib/whatsapp";

const link = "text-cream/75 hover:text-brand";
const colTitle =
  "mb-[6px] font-sans text-[11px] font-bold tracking-[.24em] text-cream/45";

/**
 * Footer de 4 columnas del prototipo: marca + local, categorías (se arman
 * solas), la tienda y contacto. Con la venta online prendida suma
 * "Carrito (n)" donde el prototipo tenía "Tienda online ↗".
 */
export function SiteFooter({
  runtime,
  categories,
  texts,
}: {
  runtime: RuntimeStore;
  categories: Category[];
  texts: SiteTexts;
}) {
  return (
    <footer className="border-t border-white/[.08] bg-night px-[clamp(16px,4vw,40px)] pb-[34px] pt-[60px] text-cream">
      <div className="mx-auto max-w-wide">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(210px,100%),1fr))] gap-10">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element -- logo en Cloudinary/public */}
            <img
              src={img(resolveImage("/brand/logo-white.png"), { w: 400 })}
              alt={lexicon.nav.logoAlt}
              className="block w-[200px] max-w-full"
            />
            <p className="mb-0 mt-[18px] max-w-[34ch] font-sans text-[13px] leading-[1.6] text-cream/55">
              {runtime.address}
              <br />
              {runtime.hours}
            </p>
          </div>

          <div className="flex flex-col gap-[10px] font-sans text-[13.5px]">
            <div className={colTitle}>{lexicon.footer.catalogTitle}</div>
            {categories.map((c) => (
              <Link key={c.slug} href={paths.catalog(c.pathSlug)} className={link}>
                {c.label}
              </Link>
            ))}
          </div>

          <div className="flex flex-col items-start gap-[10px] font-sans text-[13.5px]">
            <div className={colTitle}>{runtime.brandName.toUpperCase()}</div>
            {features.blog && (
              <Link href="/novedades" className={link}>
                {lexicon.footer.blog}
              </Link>
            )}
            <Link href="/nosotros" className={link}>
              {lexicon.nav.about}
            </Link>
            {features.repairs && (
              <Link href="/reparaciones" className={link}>
                {lexicon.footer.repairs}
              </Link>
            )}
            {features.community && (
              <Link
                href={paths.community()}
                className="text-brand hover:text-brand-hover"
              >
                {lexicon.nav.communityLong}
              </Link>
            )}
            {runtime.catalogPdfUrl && (
              <a
                href={runtime.catalogPdfUrl}
                target="_blank"
                rel="noopener"
                className={link}
              >
                {lexicon.footer.catalogPdf}
              </a>
            )}
            {runtime.ventaOnline && (
              <CartButton variant="footer" className={`text-left ${link}`} />
            )}
          </div>

          <div className="flex flex-col gap-[10px] font-sans text-[13.5px]">
            <div className={colTitle}>{lexicon.footer.contactTitle}</div>
            <WaLink whatsapp={runtime.whatsapp} {...wa.general()} className={link}>
              WhatsApp +{runtime.whatsapp}
            </WaLink>
            <a
              href={`https://www.instagram.com/${runtime.instagram}/`}
              target="_blank"
              rel="noopener"
              className={link}
            >
              Instagram @{runtime.instagram}
            </a>
            {runtime.tiktok && (
              <a
                href={`https://www.tiktok.com/@${runtime.tiktok}`}
                target="_blank"
                rel="noopener"
                className={link}
              >
                TikTok @{runtime.tiktok}
              </a>
            )}
            <a href={runtime.mapsUrl} target="_blank" rel="noopener" className={link}>
              {lexicon.contact.maps}
            </a>
          </div>
        </div>

        <div className="mt-11 flex flex-wrap justify-between gap-5 border-t border-white/10 pt-[22px] font-sans text-[11.5px] text-cream/40">
          <span>{texts.footer_copy}</span>
        </div>
      </div>
    </footer>
  );
}
