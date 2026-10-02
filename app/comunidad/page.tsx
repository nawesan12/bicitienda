import type { Metadata } from "next";
import { StoreShell } from "@/components/store/store-shell";
import { WaLink } from "@/components/store/wa-link";
import { galleryLabels, lexicon } from "@/lib/data/content";
import { img } from "@/lib/images";
import { paths } from "@/lib/paths";
import { getAgenda, getStore, getTexts } from "@/lib/server/queries";
import { wa } from "@/lib/whatsapp";

/** ISR on-demand por tag; 1 día de respaldo (ver BACKUP_REVALIDATE). */
export const revalidate = 86400;

export const metadata: Metadata = {
  title: lexicon.community.metaTitle,
  description: lexicon.community.metaDescription,
  alternates: { canonical: paths.community() },
};

const CARD =
  "rounded-[18px] border border-white/[.12] bg-white/[.03] hover:border-[rgba(94,184,56,.6)]";

export default async function CommunityPage() {
  const [rides, runtime, texts] = await Promise.all([
    getAgenda(),
    getStore(),
    getTexts(),
  ]);
  const { perks, gallery } = runtime.content;

  return (
    <StoreShell>
      <section className="animate-fade-in bg-night px-[clamp(16px,4vw,40px)] py-[70px] text-cream">
        <div className="mx-auto max-w-content">
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(94,184,56,.5)] px-[14px] py-[7px] font-sans text-[11px] font-semibold tracking-[.24em] text-brand">
            {lexicon.community.badge}
          </div>
          <h1 className="font-display mb-0 mt-[18px] text-[clamp(44px,5.5vw,76px)] leading-none">
            {lexicon.community.heroLine}{" "}
            <span className="stroke-title">{lexicon.community.heroAccent}</span>
          </h1>
          <p className="mb-0 mt-[22px] max-w-[56ch] text-[16.5px] leading-[1.65] text-cream/65">
            {texts.erp_body}
          </p>

          <div className="mt-11 grid grid-cols-[repeat(auto-fit,minmax(min(250px,100%),1fr))] gap-4">
            {perks.map((perk) => (
              <div key={perk.n} className={`${CARD} p-[26px]`}>
                <div className="font-display text-[34px] font-extrabold tracking-normal text-brand">
                  {perk.n}
                </div>
                <div className="font-display mt-[10px] text-[17px] font-extrabold tracking-normal">
                  {perk.title}
                </div>
                <div className="mt-[6px] font-sans text-[13.5px] leading-[1.55] text-cream/55">
                  {perk.body}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-14">
            <div className="font-sans text-[12px] font-bold tracking-[.26em] text-brand">
              {lexicon.community.agendaTitle}
            </div>
            <div className="mt-[18px] grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-[14px]">
              {rides.map((ev) => (
                <div key={ev.id} className={`${CARD} flex items-center gap-[18px] px-[22px] py-5`}>
                  <div className="box-content min-w-[56px] flex-none rounded-[14px] border border-[rgba(94,184,56,.4)] bg-[rgba(94,184,56,.12)] px-2 py-[10px] text-center">
                    <div className="font-display text-[24px] tracking-normal text-brand">
                      {ev.day}
                    </div>
                    <div className="font-sans text-[10px] font-bold tracking-[.18em] text-cream/60">
                      {ev.month}
                    </div>
                  </div>
                  <div>
                    <div className="font-display text-[17px] font-extrabold tracking-normal">
                      {ev.title}
                    </div>
                    <div className="mt-[3px] font-sans text-[13px] text-cream/55">
                      {ev.meta}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-11 flex flex-wrap items-center gap-[18px]">
            {/* Con link del grupo abre la invitación; sin él, escribe al local.
                En los dos casos registra la consulta de comunidad. */}
            <WaLink
              whatsapp={runtime.whatsapp}
              {...wa.community()}
              href={runtime.whatsappGroupUrl ?? undefined}
              className="rounded-full bg-brand px-[30px] py-4 font-sans text-[15px] font-bold text-night hover:bg-brand-hover"
            >
              {lexicon.community.joinCta}
            </WaLink>
            <span className="font-sans text-[13px] text-cream/50">
              {lexicon.community.joinNote}
            </span>
          </div>

          <div className="mt-14 grid grid-cols-[repeat(auto-fill,minmax(min(200px,100%),1fr))] gap-3">
            {galleryLabels.map((label, i) => (
              <div
                key={label}
                className="stripes-dark relative aspect-[4/3] overflow-hidden rounded-[14px] border border-white/10"
              >
                {gallery[i] ? (
                  // eslint-disable-next-line @next/next/no-img-element -- Cloudinary transforma (img())
                  <img
                    src={img(gallery[i]!, { w: 600 })}
                    alt={label}
                    loading="lazy"
                    className="absolute inset-0 block h-full w-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center p-[10px]">
                    <span className="text-center font-mono text-[10.5px] font-medium tracking-[.08em] text-cream/40">
                      {label}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </StoreShell>
  );
}
