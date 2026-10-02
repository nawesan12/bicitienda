import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StoreShell } from "@/components/store/store-shell";
import { WaLink } from "@/components/store/wa-link";
import { lexicon } from "@/lib/data/content";
import { getArticle, getArticles, getStore } from "@/lib/server/queries";
import { wa } from "@/lib/whatsapp";

/** ISR on-demand por tag; 1 día de respaldo (ver BACKUP_REVALIDATE). */
export const revalidate = 86400;

export async function generateStaticParams() {
  return (await getArticles()).map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.excerpt,
    alternates: { canonical: `/novedades/${article.slug}` },
    openGraph: { type: "article", title: article.title, description: article.excerpt },
  };
}

const CTA =
  "whitespace-nowrap rounded-full bg-brand px-[26px] py-[14px] font-sans text-[14px] font-bold text-night hover:bg-brand-hover";

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [article, all, runtime] = await Promise.all([
    getArticle(slug),
    getArticles(),
    getStore(),
  ]);
  if (!article) notFound();
  const more = all.filter((a) => a.id !== article.id).slice(0, 2);

  return (
    <StoreShell>
      <section className="animate-fade-in box-content min-h-screen bg-cream px-[clamp(16px,4vw,40px)] pb-[90px] pt-10">
        <div className="mx-auto max-w-[760px]">
          <Link
            href="/novedades"
            className="hit relative font-sans text-[13px] font-bold text-ink/55 hover:text-ink"
          >
            {lexicon.blog.backLink}
          </Link>
          <div className="mt-[22px] flex items-center gap-[10px]">
            <span className="rounded-full bg-brand-pastel px-[10px] py-[5px] font-sans text-[10.5px] font-bold tracking-[.16em] text-brand-deeper">
              {article.tag}
            </span>
            <span className="font-sans text-[12px] text-ink/45">
              {article.date} · {article.readMinutes} min
            </span>
          </div>
          <h1 className="font-display mb-0 mt-4 text-[clamp(32px,4vw,50px)] leading-[1.08] [text-wrap:balance]">
            {article.title}
          </h1>
          <div className="mt-7 flex flex-col gap-[18px]">
            {article.paras.map((p, i) => (
              <p key={i} className="m-0 text-[16px] leading-[1.75] text-ink/80">
                {p}
              </p>
            ))}
          </div>

          <div className="mt-9 flex flex-wrap items-center justify-between gap-5 rounded-[20px] bg-night p-[30px] text-cream">
            <div>
              <div className="font-display text-[19px] font-extrabold tracking-normal">
                {article.ctaTitle}
              </div>
              <div className="mt-1 font-sans text-[13px] text-cream/60">
                {lexicon.blog.ctaSub}
              </div>
            </div>
            {article.ctaKind === "pdf" ? (
              runtime.catalogPdfUrl && (
                // El PDF no registra consulta (como el prototipo).
                <a href={runtime.catalogPdfUrl} target="_blank" rel="noopener" className={CTA}>
                  {article.ctaLabel}
                </a>
              )
            ) : (
              <WaLink
                whatsapp={runtime.whatsapp}
                {...wa.article(article.title, article.ctaLabel, article.ctaMsg)}
                className={CTA}
              >
                {article.ctaLabel}
              </WaLink>
            )}
          </div>

          {more.length > 0 && (
            <div className="mt-11">
              <div className="font-sans text-[12px] font-bold tracking-[.24em] text-ink/50">
                {lexicon.blog.moreKicker}
              </div>
              <div className="mt-[14px] grid grid-cols-[repeat(auto-fit,minmax(min(280px,100%),1fr))] gap-[14px]">
                {more.map((a) => (
                  <Link
                    key={a.id}
                    href={`/novedades/${a.slug}`}
                    className="flex flex-col gap-2 rounded-2xl border border-ink/10 bg-white p-5 text-ink hover:border-brand"
                  >
                    <span className="font-sans text-[10px] font-bold tracking-[.16em] text-brand-deep">
                      {a.tag}
                    </span>
                    <span className="font-display text-[16px] font-extrabold leading-[1.3] tracking-normal">
                      {a.title}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </StoreShell>
  );
}
