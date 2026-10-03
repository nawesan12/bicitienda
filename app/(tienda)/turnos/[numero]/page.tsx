import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppointmentPill, Button, Display, EmptyState, Eyebrow } from "@/components/bt";
import { AppointmentManager } from "@/components/bt/appointment-manager";
import { features } from "@/lib/features";
import { paths } from "@/lib/paths";
import { withinRateLimit } from "@/lib/server/rate-limit";
import { getBookingData, getGuestAppointmentScreen } from "@/lib/server/screens/cliente-c";
import { NOINDEX } from "@/lib/seo";

export const metadata: Metadata = { title: "Tu turno", robots: NOINDEX };

export const dynamic = "force-dynamic";

/**
 * Gestión de un turno por link (`/turnos/<número>?t=<token>`): es el
 * `manageUrl` que mandan el mail de confirmación y la plantilla de
 * WhatsApp. Sin diseño: reusa la card del próximo turno de 2g.
 */
export default async function GuestAppointmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ numero: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  if (!features.appointments) notFound();
  const [{ numero }, { t }] = await Promise.all([params, searchParams]);
  if (!t || !(await withinRateLimit("appointment-manage-view", 30))) notFound();
  const [screen, booking] = await Promise.all([getGuestAppointmentScreen(numero, t), getBookingData()]);

  if (!screen) {
    return (
      <div className="px-4 py-10 md:px-14 md:py-20">
        <EmptyState
          eyebrow="Turnos"
          title="No encontramos ese turno"
          description="Revisá que el link esté completo. Si lo reprogramaste, usá el link nuevo que te mandamos."
          action={
            <Button href={paths.appointments()} variant="primary" size="lg">
              Sacar un turno
            </Button>
          }
        />
      </div>
    );
  }

  const { appointment: a, customerName } = screen;
  const active = a.status === "pendiente" || a.status === "confirmado";
  return (
    <div className="flex flex-col gap-5 px-4 pt-5 pb-7 md:gap-8 md:px-14 md:pt-10 md:pb-20">
      <header className="flex flex-col gap-2 md:gap-3">
        <Eyebrow tone="yellow" size="lg" as="p" className="max-md:text-[12px]">
          Turno #{a.number} · {customerName}
        </Eyebrow>
        <Display size="page">Tu turno</Display>
      </header>
      <div className="flex max-w-[960px] flex-col gap-4">
        <div className="flex items-center gap-3">
          <AppointmentPill status={a.status} size="lg" />
          {!active && <span className="text-[15px] text-text-2">Este turno ya no está activo.</span>}
        </div>
        {active ? (
          <AppointmentManager
            appointment={a}
            appointmentRef={{ number: a.number, token: t }}
            agenda={{ timeZone: booking.timeZone, maxDaysAhead: booking.maxDaysAhead, minNoticeMin: booking.minNoticeMin }}
            mode="guest"
          />
        ) : (
          <div>
            <Button href={paths.appointments()} variant="primary" size="lg">
              Sacar otro turno
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
