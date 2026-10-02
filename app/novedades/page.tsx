import type { Metadata } from "next";
import { features } from "@/lib/features";
import { notFound } from "next/navigation";
import Link from "next/link";
import { StoreShell } from "@/components/store/store-shell";
import { lexicon } from "@/lib/data/content";
import { getArticles, getTexts } from "@/lib/server/queries";

/** ISR on-demand por tag; 1 día de respaldo (ver BACKUP_REVALIDATE). */
export const revalidate = 86400;

export const metadata: Metadata = {
  title: lexicon.blog.metaTitle,
  description: lexicon.blog.metaDescription,
  alternates: { canonical: "/novedades" },
};

export default async function NovedadesPage() {
  // Módulo apagado para esta tienda (lib/features.ts).
  if (!features.blog) notFound();
  const [published, texts] = await Promise.all([getArticles(), getTexts()]);

  return (
    <StoreShell>
      <section className="animate-fade-in box-content min-h-screen bg-cream px-[clamp(16px,4vw,40px)] pb-[90px] pt-10">
        <div className="mx-auto max-w-content">
          <div className="font-sans text-[12px] font-bold tracking-[.26em] text-brand-deep">
            {lexicon.blog.kicker}
          </div>
          <h1 className="font-display mb-0 mt-3 text-[clamp(34px,4vw,56px)]">
            {texts.blogp_title}
          </h1>
          <p className="mb-0 mt-[14px] max-w-[58ch] text-[15px] leading-[1.6] text-ink/60">
            {texts.blogp_sub}
          </p>

          <div className="mt-10 grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] gap-[18px]">
            {published.map((a) => (
              <Link
                key={a.id}
                href={`/novedades/${a.slug}`}
                className="flex flex-col gap-3 rounded-[20px] border border-ink/10 bg-white p-7 text-ink hover:-translate-y-[5px] hover:border-brand hover:shadow-[0_20px_44px_rgba(21,23,15,.12)]"
              >
                <div className="flex items-center gap-[10px]">
                  <span className="rounded-full bg-brand-pastel px-[10px] py-[5px] font-sans text-[10.5px] font-bold tracking-[.16em] text-brand-deeper">
                    {a.tag}
                  </span>
                  <span className="font-sans text-[11.5px] text-ink/45">
                    {a.date} · {a.readMinutes} min
                  </span>
                </div>
                <div className="font-display text-[21px] font-extrabold leading-[1.25] tracking-[-.01em] [text-wrap:pretty]">
                  {a.title}
                </div>
                <div className="font-sans text-[13.5px] leading-[1.55] text-ink/60">
                  {a.excerpt}
                </div>
                <div className="mt-auto font-sans text-[13px] font-bold text-brand-deep">
                  {lexicon.home.readArticle}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </StoreShell>
  );
}
