import { Button, buttonClasses } from "@/components/bt/button";
import { Display, Eyebrow, Highlight } from "@/components/bt/typography";
import { StoreFrame } from "@/components/store/store-frame";
import { WaLink } from "@/components/store/wa-link";
import { WHATSAPP_PENDING } from "@/lib/config";
import { paths } from "@/lib/paths";
import { getStore } from "@/lib/server/queries";
import { lexicon } from "@/lib/data/content";
import { wa } from "@/lib/whatsapp";

const T = lexicon.notFound;

/**
 * 404 de todo el sitio (sin diseño en el handoff): el chrome de la tienda
 * y un bloque con la misma jerarquía que el seguimiento (eyebrow amarillo,
 * Display de página y texto secundario), con el catálogo como acción
 * principal y WhatsApp como secundaria (oculta mientras el número sea el
 * provisorio, como en el footer).
 */
export default async function NotFound() {
  const runtime = await getStore();
  return (
    <StoreFrame>
      <section className="px-4 pt-14 pb-20 md:px-14 md:pt-24 md:pb-28">
        <div className="flex max-w-[760px] flex-col gap-[14px]">
          <Eyebrow tone="yellow" size="lg">
            Error 404
          </Eyebrow>
          <Display size="page" as="h1">
            {T.titleTop} <Highlight>{T.titleAccent}</Highlight>
          </Display>
          <p className="m-0 max-w-[560px] text-[17px] leading-[1.5] text-text-2 md:text-[19px]">{T.body}</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Button href={paths.catalog()} size="lg">
              {T.cta}
            </Button>
            {runtime.whatsapp !== WHATSAPP_PENDING && (
              <WaLink
                whatsapp={runtime.whatsapp}
                {...wa.general()}
                message={T.waMessage}
                className={buttonClasses({ variant: "secondary", size: "lg" })}
              >
                {T.waCta}
              </WaLink>
            )}
          </div>
        </div>
      </section>
    </StoreFrame>
  );
}
