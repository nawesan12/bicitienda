"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cancelMyAppointment, rescheduleMyAppointment } from "@/lib/server/actions/appointments";
import type { AppointmentCardView } from "@/lib/server/screens/cliente-c";
import { Button } from "./button";
import { cx } from "./cx";
import { Panel } from "./panel";
import { FONT } from "./styles";
import { Eyebrow } from "./typography";
import { DateBadge } from "./calendar";
import { SlotPicker, type SlotValue } from "./slot-picker";

/**
 * Próximo turno con Reprogramar / Cancelar (2g / 4f, y la gestión por
 * link de invitados en /turnos/[numero]). Isla cliente: llama a
 * `rescheduleMyAppointment` / `cancelMyAppointment` con la sesión (`id`) o
 * con el link (`number` + `token`). Si ya pasó la anticipación mínima
 * (`canModify` false), los botones se reemplazan por WhatsApp (wa.me).
 */

export type AppointmentRef = { id: string } | { number: string; token: string };

function noticeLabel(min: number): string {
  if (min % 60 === 0) {
    const h = min / 60;
    return h === 1 ? "1 hora" : `${h} horas`;
  }
  return `${min} minutos`;
}

export function AppointmentManager({
  appointment: a,
  appointmentRef,
  agenda,
  mode,
}: {
  appointment: AppointmentCardView;
  appointmentRef: AppointmentRef;
  agenda: { timeZone: string; maxDaysAhead: number; minNoticeMin: number };
  mode: "account" | "guest";
}) {
  const router = useRouter();
  const [panel, setPanel] = useState<"none" | "reschedule" | "cancel">("none");
  const [slot, setSlot] = useState<SlotValue>({ date: null, time: null });
  const [refreshKey, setRefreshKey] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function doCancel() {
    setPending(true);
    setError(null);
    const res = await cancelMyAppointment(appointmentRef).catch(() => null);
    setPending(false);
    if (!res || !res.ok) {
      setError(res && !res.ok ? res.error : "No pudimos cancelar el turno. Probá de nuevo.");
      return;
    }
    setDone("Cancelamos tu turno.");
    setPanel("none");
    router.refresh();
  }

  async function doReschedule() {
    if (!slot.date || !slot.time) return;
    setPending(true);
    setError(null);
    const res = await rescheduleMyAppointment(appointmentRef, { date: slot.date, time: slot.time }).catch(() => null);
    setPending(false);
    if (!res || !res.ok) {
      setError(res && !res.ok ? res.error : "No pudimos reprogramar el turno. Probá de nuevo.");
      if (res && !res.ok && (res.code === "SLOT" || res.code === "TOO_LATE")) setRefreshKey((k) => k + 1);
      return;
    }
    setPanel("none");
    setDone("Listo, reprogramamos tu turno.");
    if (mode === "guest") {
      // El turno reprogramado puede tener otro número/token: vamos a su link.
      router.replace(`/turnos/${res.appointment.number}?t=${encodeURIComponent(res.appointment.manageToken)}`);
    }
    router.refresh();
  }

  const actionsCls = "flex-1 md:w-full md:flex-none";

  return (
    <div className={cx("flex flex-col gap-3", FONT)}>
      <Panel
        surface="yellow"
        padding="none"
        gap="none"
        className="gap-[14px] p-[18px] max-md:rounded-box md:grid md:grid-cols-[200px_minmax(0,1fr)_auto] md:items-center md:gap-7 md:p-6"
      >
        <div className="flex items-center gap-[14px] md:contents">
          <DateBadge weekday={a.weekday} day={a.day} caption={`${a.month} · ${a.time}`} className="max-md:hidden" />
          <DateBadge weekday={a.weekdayShort} day={a.day} caption={a.time} size="sm" className="md:hidden" />
          <div className="flex min-w-0 flex-col gap-1 md:gap-2">
            <p className="m-0 text-[30px] leading-[.9] font-black uppercase stretch-66 md:text-[48px]">{a.serviceName}</p>
            <p className="m-0 text-[14px] md:text-[16px]">{a.detail}</p>
            <p className="m-0 text-[15px] max-md:hidden">{a.address}</p>
          </div>
        </div>
        {a.canModify ? (
          <div className="grid grid-cols-2 gap-2 md:flex md:min-w-[170px] md:flex-col">
            <Button
              variant="ink"
              size="sm"
              className={cx(actionsCls, "md:px-[22px] md:py-[14px] md:text-[14px]")}
              aria-expanded={panel === "reschedule"}
              onClick={() => setPanel((p) => (p === "reschedule" ? "none" : "reschedule"))}
            >
              Reprogramar
            </Button>
            <Button
              variant="ink-outline"
              size="sm"
              className={cx(actionsCls, "md:px-[22px] md:py-[12.5px] md:text-[14px]")}
              aria-expanded={panel === "cancel"}
              onClick={() => setPanel((p) => (p === "cancel" ? "none" : "cancel"))}
            >
              Cancelar
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 md:max-w-[220px]">
            <Button
              href={a.whatsappHref}
              external
              variant="ink"
              size="sm"
              className="md:px-[22px] md:py-[14px] md:text-[14px]"
            >
              Escribinos por WhatsApp
            </Button>
            <p className="m-0 text-[13px] leading-[1.4]">
              Faltan menos de {noticeLabel(agenda.minNoticeMin)}: para cambiarlo o cancelarlo, escribinos.
            </p>
          </div>
        )}
      </Panel>

      {done && (
        <p role="status" className="m-0 text-[14px] font-semibold text-yellow">
          {done}
        </p>
      )}
      {error && (
        <p role="alert" className="m-0 text-[14px] font-semibold text-red-light">
          {error}
        </p>
      )}

      {panel === "cancel" && (
        <Panel surface="surface" padding="md" gap="md">
          <p className="m-0 text-[16px] font-extrabold">¿Cancelamos el turno del {a.dayLabel.toLowerCase()} a las {a.time}?</p>
          <p className="m-0 text-[14px] text-text-2">El horario queda libre para otra persona.</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="danger" size="sm" disabled={pending} onClick={doCancel}>
              {pending ? "Cancelando…" : "Sí, cancelar"}
            </Button>
            <Button variant="secondary" size="sm" disabled={pending} onClick={() => setPanel("none")}>
              No, dejarlo
            </Button>
          </div>
        </Panel>
      )}

      {panel === "reschedule" && (
        <Panel surface="surface" padding="md" gap="lg">
          <SlotPicker
            timeZone={agenda.timeZone}
            maxDaysAhead={agenda.maxDaysAhead}
            value={slot}
            onChange={setSlot}
            refreshKey={refreshKey}
            surface="panel"
            dayLabel={
              <Eyebrow tone="muted" size="md" as="h3">
                Nuevo día
              </Eyebrow>
            }
            timeLabel={
              <Eyebrow tone="muted" size="md" as="h3">
                Nuevo horario
              </Eyebrow>
            }
          />
          <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
            <Button variant="primary" size="md" disabled={!slot.date || !slot.time || pending} onClick={doReschedule}>
              {pending ? "Guardando…" : "Confirmar cambio"}
            </Button>
            <Button variant="secondary" size="md" disabled={pending} onClick={() => setPanel("none")}>
              Volver
            </Button>
            {slot.date && slot.time && (
              <span className="text-[14px] text-text-2">
                Pasa al {slot.date.slice(8).replace(/^0/, "")}/{slot.date.slice(5, 7)} a las {slot.time} hs.
              </span>
            )}
          </div>
        </Panel>
      )}
    </div>
  );
}
