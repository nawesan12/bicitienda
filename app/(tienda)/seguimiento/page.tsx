import type { Metadata } from "next";
import { Display, Eyebrow } from "@/components/bt/typography";
import { NOINDEX } from "@/lib/seo";
import { BUY } from "../checkout/_lib/copy";
import { TrackingForm } from "./tracking-form";

const T = BUY.tracking;

export const metadata: Metadata = { title: T.metaTitle, robots: NOINDEX };

/** ISR on-demand por tag; 1 día de respaldo (ver BACKUP_REVALIDATE). */
export const revalidate = 86400;

/** Seguimiento sin cuenta: número de pedido + WhatsApp o email. */
export default function TrackingIndexPage() {
  return (
    <div className="grid items-center gap-8 px-4 pt-8 pb-14 md:px-14 md:pt-16 md:pb-20 lg:grid-cols-[minmax(0,1fr)_480px] lg:gap-12">
      <div className="flex flex-col gap-[14px]">
        <Eyebrow tone="yellow" size="lg">
          {T.eyebrow}
        </Eyebrow>
        <Display size="page">{T.title}</Display>
        <p className="m-0 max-w-[560px] text-[17px] leading-[1.5] text-text-2 md:text-[19px]">{T.text}</p>
      </div>
      <TrackingForm />
    </div>
  );
}
