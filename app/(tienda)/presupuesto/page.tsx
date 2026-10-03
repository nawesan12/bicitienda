import { notFound } from "next/navigation";
import { Display, Eyebrow } from "@/components/bt";
import { COPY } from "@/lib/data/demo/copy";
import { features } from "@/lib/features";
import { paths } from "@/lib/paths";
import { getQuoteContact } from "@/lib/server/screens/cliente-c";
import { ogImagePath, pageMetadata, SEO } from "@/lib/seo";
import { QuoteForm } from "./quote-form";

const Q = COPY.quote;

export const metadata = pageMetadata({
  ...SEO.sections.quote.meta,
  path: paths.quote(),
  image: { path: ogImagePath(paths.quote()), alt: SEO.sections.quote.meta.title },
});

/**
 * 5a / 5d · Pedir presupuesto. Estática (el WhatsApp del local sale de
 * getStore, cacheado); el formulario es una isla cliente que envía con
 * `submitQuoteRequest`.
 */
export default async function QuotePage() {
  if (!features.quotes) notFound();
  const contact = await getQuoteContact();
  return (
    <div className="px-4 pt-[22px] pb-7 md:px-14 md:pt-10 md:pb-20">
      <header className="flex flex-col gap-2 md:gap-3">
        <Eyebrow tone="yellow" size="lg" as="p" className="max-md:text-[12px]">
          {Q.eyebrow}
        </Eyebrow>
        <Display size="page" className="max-md:text-[54px] max-md:leading-[.86]">
          {Q.title}
        </Display>
        <p className="m-0 max-w-[680px] text-[15px] leading-normal text-pretty text-text-2 md:text-[18px]">
          <span className="max-md:hidden">{Q.intro}</span>
          <span className="md:hidden">{Q.introMobile}</span>
        </p>
      </header>
      <div className="pt-[22px] md:pt-8">
        <QuoteForm contact={contact} />
      </div>
    </div>
  );
}
