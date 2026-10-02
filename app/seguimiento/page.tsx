import type { Metadata } from "next";
import { StoreShell } from "@/components/store/store-shell";
import { lexicon } from "@/lib/data/content";
import { TrackingForm } from "./tracking-form";

const t = lexicon.commerce.tracking;

export const metadata: Metadata = {
  title: t.metaTitle,
  robots: { index: false },
};

/** ISR on-demand por tag; 1 día de respaldo (ver BACKUP_REVALIDATE). */
export const revalidate = 86400;

export default function TrackingIndexPage() {
  return (
    <StoreShell>
      <section className="animate-fade-in bg-cream px-[clamp(16px,4vw,40px)] pb-[90px] pt-[clamp(40px,6vw,72px)]">
        <div className="mx-auto grid max-w-content items-center gap-[clamp(28px,5vw,60px)] min-[900px]:grid-cols-[minmax(0,1fr)_440px]">
          <div>
            <div className="font-sans text-[11px] font-bold tracking-[.26em] text-brand-deep">
              {t.kicker}
            </div>
            <h1 className="font-display mb-0 mt-3 text-[clamp(36px,5vw,64px)] leading-[1.02] text-ink">
              {t.title}
            </h1>
            <p className="mb-0 mt-4 max-w-[44ch] font-sans text-[15.5px] leading-[1.65] text-ink/60">
              {t.sub}
            </p>
          </div>
          <TrackingForm />
        </div>
      </section>
    </StoreShell>
  );
}
