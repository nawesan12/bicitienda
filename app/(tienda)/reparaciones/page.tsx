import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { breadcrumbLd, JsonLd, repairServiceLd } from "@/components/bt/json-ld";
import { cx } from "@/components/bt/cx";
import { FONT } from "@/components/bt/styles";
import { Tag } from "@/components/bt/tag";
import { Display } from "@/components/bt/typography";
import { DEMO_PHOTOS, manifestKey, PHOTO_ALT } from "@/lib/data/demo/photos";
import { features } from "@/lib/features";
import { img, resolveImage } from "@/lib/images";
import { paths } from "@/lib/paths";
import { getRepairsContent, getStore } from "@/lib/server/queries";
import { ogImagePath, pageMetadata, withRouteOgImage } from "@/lib/seo";
import { HowItWorks } from "../_components/home";
import { repairBookingHref, WORKSHOP_COPY, WorkOrder, WorkshopCtas, WorkshopCtaStrip } from "../_components/workshop";
import { REPAIRS_COPY, REPAIRS_SEO } from "./copy";

/** Contenido y WhatsApp cacheados por tag ("content", "settings"); 1 día de respaldo. */
export const revalidate = 86400;

export async function generateMetadata(): Promise<Metadata> {
  if (!features.repairs) return {};
  return withRouteOgImage(
    pageMetadata({
      ...REPAIRS_SEO.meta,
      path: paths.repairs(),
      image: { path: ogImagePath(paths.repairs()), alt: REPAIRS_SEO.meta.title },
    }),
  );
}

/**
 * /reparaciones · El taller (sin diseño en el handoff, con el lenguaje de
 * bt). Hero con la foto del local, orden de taller con los trabajos de
 * `content.rep` (sin precios), "Cómo funciona" en 3 pasos y franja final
 * amarilla. Los presupuestos van por WhatsApp (`wa.repair()`), no por
 * /presupuesto.
 */
export default async function RepairsPage() {
  if (!features.repairs) notFound();
  const [rep, runtime] = await Promise.all([getRepairsContent(), getStore()]);
  const bookHref = repairBookingHref();
  const photo = img(resolveImage(manifestKey(DEMO_PHOTOS.local)), { w: 2000 });

  return (
    <>
      <JsonLd
        data={[
          repairServiceLd(runtime, rep.services, {
            name: REPAIRS_SEO.serviceType,
            description: rep.body,
            path: paths.repairs(),
          }),
          breadcrumbLd([{ name: REPAIRS_COPY.breadcrumb, path: paths.repairs() }]),
        ]}
      />

      {/* Hero: como el del home (foto + degradé), con el Tag rojo del taller y los dos CTAs. */}
      <section className={cx("lg:px-14 lg:pt-6", FONT)}>
        <div className="relative flex min-h-[520px] flex-col justify-end gap-4 overflow-hidden bg-surface px-4 pt-24 pb-6 lg:min-h-[560px] lg:gap-5 lg:rounded-card lg:p-11">
          {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary/Pexels ya transformadas */}
          <img
            src={photo}
            alt={PHOTO_ALT[DEMO_PHOTOS.local] ?? ""}
            fetchPriority="high"
            className="absolute inset-0 block h-full w-full object-cover"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,17,16,.15)_10%,rgba(18,17,16,.96)_72%)] lg:bg-[linear-gradient(90deg,rgba(18,17,16,.95)_30%,rgba(18,17,16,.35))]"
          />
          <Tag tone="red" size="hero" className="relative self-start">
            {WORKSHOP_COPY.tag}
          </Tag>
          <Display size="hero" as="h1" className="relative max-w-[11ch] text-balance max-lg:text-[64px]">
            {rep.title}
          </Display>
          <p className="relative m-0 max-w-[520px] text-[16px] leading-[1.5] font-medium text-pretty text-text-2 lg:text-[19px]">
            {rep.body}
          </p>
          <WorkshopCtas
            bookHref={bookHref}
            whatsapp={runtime.whatsapp}
            surface="page"
            className="relative mt-1"
          />
        </div>
      </section>

      {rep.services.length > 0 && (
        <WorkOrder title={REPAIRS_COPY.servicesTitle} services={rep.services} whatsapp={runtime.whatsapp} />
      )}

      <section aria-labelledby="como-funciona">
        <Display id="como-funciona" size="section" className="px-4 pb-4 md:px-14 md:pb-7">
          {REPAIRS_COPY.stepsTitle}
        </Display>
        <HowItWorks steps={[...REPAIRS_COPY.steps]} />
      </section>

      <WorkshopCtaStrip
        title={REPAIRS_COPY.ctaTitle}
        text={REPAIRS_COPY.ctaText}
        bookHref={bookHref}
        whatsapp={runtime.whatsapp}
      />
    </>
  );
}
