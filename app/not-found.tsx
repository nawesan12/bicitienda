import { buttonClasses, Button, Display, Eyebrow, Highlight, TextLink } from "@/components/bt";
import { StoreFrame } from "@/components/store/store-frame";
import { WaLink } from "@/components/store/wa-link";
import { lexicon } from "@/lib/data/content";
import { paths } from "@/lib/paths";
import { getStore } from "@/lib/server/queries";
import { wa } from "@/lib/whatsapp";

const T = lexicon.notFound;

/**
 * 404 de toda la app (sin diseño en el handoff, armada con el lenguaje de
 * bt). El not-found raíz no pasa por el layout de app/(tienda), así que
 * se envuelve a mano en el mismo shell (`StoreFrame`: header, menú mobile
 * y footer). CTAs: catálogo, WhatsApp (registra el lead) y el taller.
 */
export default async function NotFound() {
  const runtime = await getStore();
  return (
    <StoreFrame>
      <section className="relative grid items-center gap-8 overflow-hidden px-4 pt-10 pb-16 md:px-14 md:pt-20 md:pb-24 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-12">
        <div className="flex flex-col gap-[14px] md:gap-5">
          <Eyebrow tone="yellow" size="lg" as="p" className="max-md:text-[12px]">
            Error 404
          </Eyebrow>
          <Display size="page" className="max-w-[12ch] text-balance">
            {T.titleTop} <Highlight>{T.titleAccent}</Highlight>
          </Display>
          <p className="m-0 max-w-[520px] text-[17px] leading-[1.5] text-text-2 md:text-[19px]">{T.body}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3 max-md:flex-col max-md:items-stretch">
            <Button href={paths.catalog()} variant="primary" size="lg">
              {T.cta}
            </Button>
            <WaLink
              whatsapp={runtime.whatsapp}
              {...wa.general()}
              message={T.waMessage}
              className={buttonClasses({ variant: "secondary", size: "lg" })}
            >
              {T.waCta}
            </WaLink>
          </div>
          <TextLink href={paths.repairs()} className="mt-1 max-md:self-center">
            Llevá tu bici al taller →
          </TextLink>
        </div>
        <p
          aria-hidden
          className="m-0 font-sans text-[200px] leading-[.8] font-black text-line-strong select-none stretch-66 max-lg:hidden xl:text-[280px]"
        >
          404
        </p>
      </section>
    </StoreFrame>
  );
}
