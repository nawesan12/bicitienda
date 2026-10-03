import { JsonLd, localBusinessLd, siteLd } from "@/components/bt/json-ld";
import { TextLink } from "@/components/bt/button";
import { Display } from "@/components/bt/typography";
import { CatalogCard } from "@/components/bt/catalog-card";
import { CategoryStrip, HomeHero, HowItWorks } from "./_components/home";
import { COPY } from "@/lib/data/demo/copy";
import { manifestKey } from "@/lib/data/demo/photos";
import { img, resolveImage } from "@/lib/images";
import { paths } from "@/lib/paths";
import { SEO, pageMetadata } from "@/lib/seo";
import {
  getCatalogItems,
  getPricing,
  getRuntime,
  homeStrip,
} from "@/lib/server/screens/tienda-a";

/**
 * 2a / 4a · Home. ISR: se regenera on-demand por tag desde el admin
 * (invalidatePublic); 1 día es solo el respaldo (literal: la segment config
 * no admite imports).
 */
export const revalidate = 86400;

export const metadata = pageMetadata({
  title: SEO.defaultTitle,
  absolute: true,
  description: SEO.defaultDescription,
  path: "/",
});

/**
 * Textos cortos de los pasos en mobile (4a). `COPY.home.steps` solo trae
 * los de desktop; estos son los del artboard 4a (`howTo`).
 */
const STEPS_MOBILE: Record<string, string> = {
  "01": "O pasás a probarla con un turno.",
  "02": "Mercado Pago, transferencia o efectivo.",
  "03": "Te avisamos por WhatsApp.",
};

export default async function HomePage() {
  const [{ items, products, categories }, pricing, runtime] = await Promise.all([
    getCatalogItems((slug) => paths.catalog(slug)),
    getPricing(),
    getRuntime(),
  ]);
  const featured = items.filter((it) => products.find((p) => p.slug === it.slug)?.featured).slice(0, 4);
  const hero = COPY.home.hero;
  const bikesHref = paths.catalog("bicicletas");
  const strip = homeStrip(categories).map((c) => ({ ...c, href: paths.catalog(c.pathSlug) }));

  return (
    <>
      <JsonLd data={[siteLd(runtime), localBusinessLd(runtime, products)]} />

      <HomeHero
        photo={img(resolveImage(manifestKey(hero.photo)), { w: 2000 })}
        photoAlt={hero.photoAlt}
        tag={hero.tag}
        titleLead={hero.titleLead}
        titleHighlight={hero.titleHighlight}
        cta={{ href: bikesHref, label: hero.cta }}
        subline={hero.subline}
      />

      <CategoryStrip cells={strip} />

      {featured.length > 0 && (
        <section className="flex flex-col gap-4 px-4 py-7 lg:gap-7 lg:px-14 lg:pt-14 lg:pb-[72px]">
          <div className="flex items-end justify-between gap-4">
            <Display size="section" className="lg:hidden">
              {COPY.home.featured.titleMobile}
            </Display>
            <Display size="section" className="max-lg:hidden">
              {COPY.home.featured.title}
            </Display>
            <TextLink
              href={paths.catalog()}
              tone="yellow"
              className="flex-none py-3 lg:py-0"
            >
              <span className="lg:hidden">{COPY.home.featured.ctaMobile}</span>
              <span className="max-lg:hidden">{COPY.home.featured.cta}</span>
            </TextLink>
          </div>
          <div className="grid grid-cols-2 gap-[10px] md:gap-4 lg:grid-cols-4">
            {featured.map((it) => (
              <CatalogCard key={it.slug} item={it} pricing={pricing} />
            ))}
          </div>
        </section>
      )}

      <HowItWorks
        steps={COPY.home.steps.map((s) => ({
          ...s,
          textMobile: STEPS_MOBILE[s.n],
        }))}
      />
    </>
  );
}
