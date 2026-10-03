import { notFound } from "next/navigation";
import { Display, Eyebrow } from "@/components/bt";
import { COPY } from "@/lib/data/demo/copy";
import { features } from "@/lib/features";
import { paths } from "@/lib/paths";
import { getBookingData } from "@/lib/server/screens/cliente-c";
import { ogImagePath, pageMetadata, SEO } from "@/lib/seo";
import { BookingClient } from "./booking-client";

const T = COPY.appointment;

export const metadata = pageMetadata({
  ...SEO.sections.appointments.meta,
  path: paths.appointments(),
  image: { path: ogImagePath(paths.appointments()), alt: SEO.sections.appointments.meta.title },
});

/** Servicios y agenda cacheados (tag "settings"); la disponibilidad se pide desde el cliente. */
export const revalidate = 300;

/**
 * 2f / 4e · Reservá tu turno. Estática: servicios, horizonte de la agenda
 * y bicis con prueba vienen cacheados; los días y horarios libres los pide
 * la isla con `fetchAvailability`, y la sesión con `getMyAccount`.
 */
export default async function AppointmentsPage() {
  if (!features.appointments) notFound();
  // Parche mínimo (R1): sin pruebas de bici no hay bicis para elegir. R2 rehace la isla.
  const data = await getBookingData();
  return (
    <div className="px-4 pt-5 pb-7 md:px-14 md:pt-10 md:pb-20">
      <header className="flex flex-col gap-2 md:gap-3">
        <Eyebrow tone="yellow" size="lg" as="p" className="max-md:text-[12px]">
          <span className="max-md:hidden">{T.eyebrow}</span>
          <span className="md:hidden">{T.eyebrowMobile}</span>
        </Eyebrow>
        <Display size="page" className="max-md:text-[60px]">
          {T.title}
        </Display>
      </header>
      <div className="pt-5 md:pt-8">
        <BookingClient data={data} bikes={[]} />
      </div>
    </div>
  );
}
