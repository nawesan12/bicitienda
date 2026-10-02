import type { Metadata } from "next";
import { features } from "@/lib/features";
import { notFound } from "next/navigation";
import { BoltDot } from "@/components/store/bolt";
import { RepairForm } from "@/components/store/repair-form";
import { StoreShell } from "@/components/store/store-shell";
import { lexicon } from "@/lib/data/content";
import { getStore } from "@/lib/server/queries";

/** ISR on-demand por tag; 1 día de respaldo (ver BACKUP_REVALIDATE). */
export const revalidate = 86400;

export const metadata: Metadata = {
  title: lexicon.repairs.metaTitle,
  description: lexicon.repairs.metaDescription,
  alternates: { canonical: "/reparaciones" },
};

export default async function RepairsPage() {
  // Módulo apagado para esta tienda (lib/features.ts).
  if (!features.repairs) notFound();
  const runtime = await getStore();
  const { rep } = runtime.content;

  return (
    <StoreShell>
      <section className="animate-fade-in bg-cream px-[clamp(16px,4vw,40px)] pb-20 pt-[50px]">
        <div className="mx-auto grid max-w-content grid-cols-[repeat(auto-fit,minmax(min(400px,100%),1fr))] items-start gap-[clamp(28px,4vw,56px)]">
          <div>
            <div className="font-sans text-[12px] font-bold tracking-[.26em] text-brand-deep">
              {lexicon.repairs.kicker}
            </div>
            <h1 className="font-display mb-0 mt-3 text-[clamp(36px,4.4vw,60px)] leading-[1.02] [text-wrap:balance]">
              {rep.title}
            </h1>
            <p className="mb-0 mt-[18px] max-w-[50ch] text-[17px] leading-[1.6] text-ink/65">
              {rep.body}
            </p>
            <div className="mt-7 flex flex-col gap-[10px]">
              {rep.services.filter(Boolean).map((s) => (
                <div
                  key={s}
                  className="flex items-center gap-3 rounded-[14px] border border-ink/[.08] bg-white px-[18px] py-[15px] font-sans text-[14.5px] font-semibold"
                >
                  <BoltDot />
                  <span>{s}</span>
                </div>
              ))}
            </div>
            <div className="mt-[22px] font-sans text-[13.5px] font-medium leading-[1.6] text-ink/60">
              {lexicon.repairs.workshop(runtime.address, runtime.hours)}
            </div>
          </div>
          <RepairForm whatsapp={runtime.whatsapp} />
        </div>
      </section>
    </StoreShell>
  );
}
