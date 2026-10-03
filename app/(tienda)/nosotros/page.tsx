import type { Metadata } from "next";
import Link from "next/link";
import { LocalPhoto } from "@/components/store/local-photo";
import { WaLink } from "@/components/store/wa-link";
import { lexicon } from "@/lib/data/content";
import { paths } from "@/lib/paths";
import { getBrands, getStore, getVisibleProducts } from "@/lib/server/queries";
import { wa } from "@/lib/whatsapp";

/** ISR on-demand por tag; 1 día de respaldo (ver BACKUP_REVALIDATE). */
export const revalidate = 86400;

export const metadata: Metadata = {
  title: lexicon.about.metaTitle,
  description: lexicon.about.metaDescription,
  alternates: { canonical: "/nosotros" },
};

const dataLabel = "font-sans text-[10.5px] font-bold leading-normal tracking-[.18em] text-cream/50";

export default async function AboutPage() {
  const [runtime, brands, visible] = await Promise.all([
    getStore(),
    getBrands(),
    getVisibleProducts(),
  ]);
  const nos = runtime.content.nosotros;
  // Chips de marcas: las que tienen modelos visibles, en orden de catálogo.
  const brandList = [...new Set(visible.map((p) => p.brandId))]
    .map((id) => brands.find((b) => b.id === id))
    .filter((b) => b != null);

  return (
    <>
      <section className="animate-fade-in bg-cream px-[clamp(16px,4vw,40px)] pb-20 pt-[50px]">
        <div className="mx-auto max-w-content">
          <div className="font-sans text-[12px] font-bold tracking-[.26em] text-brand-deep">
            {lexicon.about.kicker}
          </div>
          <h1 className="font-display mb-0 mt-3 text-[clamp(38px,5vw,68px)] leading-none [text-wrap:balance]">
            {nos.title}
          </h1>
          <p className="mb-0 mt-[18px] max-w-[58ch] text-[18px] leading-[1.6] text-ink/65 [text-wrap:pretty]">
            {nos.intro}
          </p>
          <LocalPhoto
            photo={nos.localPhoto}
            className="mt-9 aspect-[16/7] min-h-[260px] min-w-0 max-w-[calc(100%-2px)]"
            titleSize="text-[18px]"
          />

          <div className="mt-12 grid grid-cols-[repeat(auto-fit,minmax(min(360px,100%),1fr))] items-start gap-[clamp(24px,4vw,50px)]">
            <div className="flex flex-col gap-4">
              {nos.paras.filter(Boolean).map((p, i) => (
                <p
                  key={i}
                  className="m-0 text-[16.5px] leading-[1.75] text-ink/80 [text-wrap:pretty]"
                >
                  {p}
                </p>
              ))}
            </div>
            <div className="bg-grid-dark flex flex-col gap-[14px] rounded-[20px] bg-night p-7 text-cream [--grid-size:36px]">
              <div className="font-sans text-[11px] font-bold tracking-[.26em] text-brand">
                {lexicon.about.visitKicker}
              </div>
              <div className="flex flex-col gap-3 font-sans text-[14px] font-medium leading-[1.45]">
                {[
                  [lexicon.contact.address, runtime.address],
                  [lexicon.contact.hours, runtime.hours],
                  [
                    lexicon.contact.whatsapp,
                    `+${runtime.whatsapp} — ${lexicon.contact.waSuffix}`,
                  ],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div className={dataLabel}>{k.toUpperCase()}</div>
                    <div className="mt-[3px]">{v}</div>
                  </div>
                ))}
              </div>
              <div className="mt-[6px] flex flex-wrap gap-[10px]">
                <a
                  href={runtime.mapsUrl}
                  target="_blank"
                  rel="noopener"
                  className="rounded-full bg-brand px-[22px] py-[13px] font-sans text-[13.5px] font-bold text-night hover:bg-brand-hover"
                >
                  {lexicon.contact.maps}
                </a>
                <WaLink
                  whatsapp={runtime.whatsapp}
                  {...wa.general()}
                  className="box-border rounded-full border-[1.5px] border-cream/30 px-[22px] py-[13px] font-sans text-[13.5px] font-bold text-cream hover:border-brand hover:text-brand"
                >
                  {lexicon.contact.write}
                </WaLink>
              </div>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-[repeat(auto-fit,minmax(min(250px,100%),1fr))] gap-[14px]">
            {nos.pillars.map((e) => (
              <div key={e.n} className="rounded-[18px] border border-ink/10 bg-white p-[26px]">
                <div className="font-display text-[30px] tracking-normal text-brand-deep">
                  {e.n}
                </div>
                <div className="font-display mt-[10px] text-[18px] font-extrabold tracking-normal">
                  {e.title}
                </div>
                <div className="mt-[6px] font-sans text-[13.5px] leading-[1.6] text-ink/60">
                  {e.body}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12">
            <div className="font-sans text-[12px] font-bold tracking-[.24em] text-ink/50">
              {lexicon.about.brandsKicker}
            </div>
            <div className="mt-[14px] flex flex-wrap gap-[10px]">
              {brandList.map((b) => (
                <Link
                  key={b.id}
                  href={paths.catalogQuery(`?marca=${encodeURIComponent(b.id)}`)}
                  className="rounded-full border-[1.5px] border-ink/[.12] bg-white px-5 py-3 font-sans text-[14px] font-bold text-ink hover:border-brand hover:text-brand-deeper"
                >
                  {b.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
