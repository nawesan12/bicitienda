import Link from "next/link";
import { StoreShell } from "@/components/store/store-shell";
import { WaLink } from "@/components/store/wa-link";
import { paths } from "@/lib/paths";
import { getStore } from "@/lib/server/queries";
import { lexicon } from "@/lib/data/content";
import { wa } from "@/lib/whatsapp";

export default async function NotFound() {
  const runtime = await getStore();
  return (
    <StoreShell>
      <section className="bg-cream px-[clamp(16px,4vw,40px)] py-[110px]">
        <div className="mx-auto max-w-[1280px] text-center">
          <div className="font-sans text-xs font-bold tracking-[.26em] text-brand-deep">
            ERROR 404
          </div>
          <h1 className="font-display mx-auto mb-0 mt-[14px] max-w-[16ch] text-balance text-[clamp(38px,5vw,64px)] leading-[1.02]">
            {lexicon.notFound.titleTop}
            <br />
            <span className="stroke-title">{lexicon.notFound.titleAccent}</span>
          </h1>
          <p className="mx-auto mt-[18px] max-w-[46ch] font-sans text-[15px] leading-relaxed text-ink/60">
            {lexicon.notFound.body}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href={paths.catalog()}
              className="rounded-full bg-ink px-[26px] py-[14px] font-sans text-[14px] font-bold text-cream hover:bg-brand hover:text-night"
            >
              {lexicon.notFound.cta}
            </Link>
            <WaLink
              whatsapp={runtime.whatsapp}
              {...wa.general()}
              message={lexicon.notFound.waMessage}
              className="box-border rounded-full border-[1.5px] border-brand px-[26px] py-[14px] font-sans text-[14px] font-bold text-brand-deep hover:bg-brand hover:text-night"
            >
              {lexicon.notFound.waCta}
            </WaLink>
          </div>
        </div>
      </section>
    </StoreShell>
  );
}
