"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useToast } from "@/components/admin/toast";
import { Button, buttonClasses, ClosedNote, cx, Field, FormError, Input, KeyValueList, Modal, Pill, Select, Textarea } from "@/components/bt";
import {
  adminCancelAppointment,
  adminConfirmAppointment,
  adminDeleteBlock,
  adminMarkAttendance,
  adminRescheduleAppointment,
  adminSetAppointmentNote,
} from "@/lib/server/actions/admin-appointments";
import type { AppointmentDetail } from "@/lib/server/screens/admin-d1";
import type { AppointmentStatus } from "@/lib/types";
import { mondayOfDate } from "./turnos-dialogs";

const STATUS: Record<AppointmentStatus, { label: string; tone?: "red-light" | "muted" | "yellow" }> = {
  pendiente: { label: "Sin confirmar", tone: "red-light" },
  confirmado: { label: "Confirmado" },
  asistio: { label: "Vino", tone: "yellow" },
  no_asistio: { label: "No vino", tone: "red-light" },
  cancelado: { label: "Cancelado", tone: "muted" },
  reprogramado: { label: "Reprogramado", tone: "muted" },
};

const CLOSED: Partial<Record<AppointmentStatus, string>> = {
  asistio: "El cliente vino al turno.",
  no_asistio: "El cliente no vino al turno.",
  cancelado: "Turno cancelado: el horario quedó libre.",
  reprogramado: "Turno reprogramado: el nuevo está en la agenda.",
};

/**
 * Panel del turno seleccionado (3b): chip del servicio, nombre, Cuándo /
 * Detalle / WhatsApp / Estado, nota interna editable (se guarda al salir
 * del campo), y las acciones: Confirmar por WhatsApp (sin confirmar),
 * Avisar por WhatsApp (confirmado; plantilla "Turno confirmado"), Vino /
 * No vino, Reprogramar y Cancelar (con motivo opcional para el mail).
 */
export function AppointmentPanel({ appt, times }: { appt: AppointmentDetail; times: string[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [note, setNote] = useState(appt.internalNote);
  const [savedNote, setSavedNote] = useState(appt.internalNote);
  const [dialog, setDialog] = useState<null | "reschedule" | "cancel">(null);
  const [error, setError] = useState<string | null>(null);
  const open = appt.status === "pendiente" || appt.status === "confirmado";
  const st = STATUS[appt.status];

  function act(fn: () => Promise<{ ok: true } | { ok: false; error: string }>, done: string, after?: () => void) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (!res.ok) return setError(res.error);
      setDialog(null);
      toast(done);
      if (after) after();
      else router.refresh();
    });
  }

  function confirmWithWhatsApp() {
    // La ventana se abre en el click (si no, el navegador la bloquea).
    if (appt.whatsappUrl) window.open(appt.whatsappUrl, "_blank", "noopener");
    act(() => adminConfirmAppointment(appt.id), "Turno confirmado");
  }

  function saveNote() {
    if (note.trim() === savedNote.trim()) return;
    start(async () => {
      const res = await adminSetAppointmentNote(appt.id, note);
      if (res.ok) {
        setSavedNote(note);
        toast("Nota guardada");
      } else setError(res.error);
    });
  }

  function reschedule(fd: FormData) {
    const date = String(fd.get("date") ?? "");
    const time = String(fd.get("time") ?? "");
    setError(null);
    start(async () => {
      const r = await adminRescheduleAppointment(appt.id, { date, time });
      if (!r.ok) return setError(r.error);
      setDialog(null);
      toast("Turno reprogramado");
      router.replace(`/admin/turnos?semana=${mondayOfDate(date)}${r.appointment ? `&sel=${r.appointment.id}` : ""}`, { scroll: false });
    });
  }

  return (
    <div className="flex min-w-0 flex-col gap-4 rounded-card border border-line bg-surface p-6">
      <Pill tone={appt.service === "prueba" ? "yellow" : appt.service === "asesoramiento" ? "paper" : "dark"} className="self-start">
        {appt.serviceName}
      </Pill>
      <h2 className="m-0 text-[40px] font-black uppercase leading-[.95] stretch-70">{appt.name}</h2>
      <KeyValueList
        items={[
          { label: "Cuándo", value: appt.when },
          { label: "Detalle", value: appt.detail },
          ...(appt.customerNote ? [{ label: "Nota del cliente", value: appt.customerNote }] : []),
          { label: "WhatsApp", value: appt.phoneLabel },
          { label: "Estado", value: st.label, tone: st.tone },
        ]}
      />
      <label className="flex flex-col gap-[6px]">
        <span className="sr-only">Nota interna</span>
        <Textarea
          surface="panel"
          size="sm"
          rows={3}
          value={note}
          placeholder="Nota interna (solo la ve el local): preparar la bici, traer casco…"
          onChange={(e) => setNote(e.target.value)}
          onBlur={saveNote}
          maxLength={1000}
          className="min-h-[72px] border-line-strong text-[14px]"
        />
      </label>
      <FormError>{!dialog ? error : null}</FormError>

      {open ? (
        <>
          {appt.status === "pendiente" ? (
            <Button variant="primary" size="full" disabled={pending} onClick={confirmWithWhatsApp}>
              Confirmar por WhatsApp
            </Button>
          ) : (
            appt.whatsappUrl && (
              <a
                href={appt.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses({ variant: "secondary", size: "full" })}
              >
                Avisar por WhatsApp
              </a>
            )
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" size="sm" disabled={pending} onClick={() => act(() => adminMarkAttendance(appt.id, true), "Marcado: vino")}>
              Vino ✓
            </Button>
            <Button variant="secondary" size="sm" disabled={pending} onClick={() => act(() => adminMarkAttendance(appt.id, false), "Marcado: no vino")}>
              No vino
            </Button>
            <Button variant="secondary" size="sm" disabled={pending} onClick={() => setDialog("reschedule")}>
              Reprogramar
            </Button>
            <Button variant="danger" size="sm" disabled={pending} onClick={() => setDialog("cancel")}>
              Cancelar
            </Button>
          </div>
        </>
      ) : (
        <ClosedNote>{CLOSED[appt.status] ?? "Turno cerrado."}</ClosedNote>
      )}

      <Modal open={dialog === "reschedule"} onClose={() => setDialog(null)} title="Reprogramar" width={420}>
        <form action={reschedule} className="flex flex-col gap-4">
          <p className="m-0 text-[14px] text-text-3">Ahora: {appt.when}. El turno nuevo queda confirmado y le llega el mail.</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Día">
              <Input type="date" name="date" size="sm" required defaultValue={appt.date} />
            </Field>
            <Field label="Hora">
              <Select name="time" size="sm" defaultValue={appt.time}>
                {times.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <FormError>{error}</FormError>
          <div className="flex justify-end gap-[10px]">
            <Button variant="secondary" size="sm" onClick={() => setDialog(null)}>
              Volver
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={pending}>
              {pending ? "Guardando…" : "Reprogramar"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={dialog === "cancel"} onClose={() => setDialog(null)} title="Cancelar turno" width={420}>
        <form
          action={(fd) => act(() => adminCancelAppointment(appt.id, String(fd.get("reason") ?? "").trim() || undefined), "Turno cancelado")}
          className="flex flex-col gap-4"
        >
          <p className="m-0 text-[14px] leading-[1.5] text-text-2">
            Se libera el horario de {appt.when}. Si el cliente tiene email, le llega el aviso.
          </p>
          <Field label="Motivo" optional hint="Va en el mail de turno cancelado.">
            <Input name="reason" size="sm" maxLength={200} placeholder="Ej: el local cierra por inventario" />
          </Field>
          <FormError>{error}</FormError>
          <div className="flex justify-end gap-[10px]">
            <Button variant="secondary" size="sm" onClick={() => setDialog(null)}>
              Volver
            </Button>
            <Button type="submit" variant="danger" size="sm" disabled={pending}>
              {pending ? "Cancelando…" : "Sí, cancelar"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

/** Panel de un horario bloqueado (nuevo: el prototipo no lo dibuja). */
export function BlockPanel({
  block,
  closeHref,
}: {
  block: { id: number; date: string; from: string; to: string; reason: string; allDay: boolean };
  closeHref: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [, d, m] = [0, block.date.slice(8, 10), block.date.slice(5, 7)];
  return (
    <div className="flex min-w-0 flex-col gap-4 rounded-card border border-line bg-surface p-6">
      <Pill tone="muted" className="self-start">
        Horario bloqueado
      </Pill>
      <h2 className="m-0 text-[40px] font-black uppercase leading-[.95] stretch-70">{block.reason || "Bloqueado"}</h2>
      <KeyValueList
        items={[
          { label: "Día", value: `${Number(d)}/${Number(m)}` },
          { label: "Horario", value: block.allDay ? "Todo el día" : `${block.from} a ${block.to}` },
        ]}
      />
      <p className="m-0 text-[14px] text-text-3">En ese rango la web no ofrece turnos. Los que ya estaban tomados siguen en pie.</p>
      <div className="grid grid-cols-2 gap-2">
        <Link href={closeHref} scroll={false} className={cx(buttonClasses({ variant: "secondary", size: "sm" }))}>
          Cerrar
        </Link>
        <Button
          variant="danger"
          size="sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await adminDeleteBlock(block.id);
              toast("Bloqueo quitado");
              router.replace(`/admin/turnos?semana=${mondayOfDate(block.date)}`, { scroll: false });
            })
          }
        >
          Quitar bloqueo
        </Button>
      </div>
    </div>
  );
}
