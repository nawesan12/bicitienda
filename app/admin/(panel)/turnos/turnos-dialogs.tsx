"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useToast } from "@/components/admin/toast";
import { Button, Field, FormError, Input, Modal, Select, Textarea } from "@/components/bt";
import { adminBlockSchedule, adminCreateAppointment } from "@/lib/server/actions/admin-appointments";

/** Lunes de la semana de una fecha local "YYYY-MM-DD" (domingo → lunes siguiente). */
export function mondayOfDate(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  const wd = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (wd === 0 ? 1 : 1 - wd));
  return d.toISOString().slice(0, 10);
}

/**
 * Diálogos de 3b que se abren por URL (?nuevo=1 / ?bloquear=1), así los
 * botones son links y el Resumen puede abrir "+ Turno manual":
 * - Turno manual: servicio, día, hora, nombre, WhatsApp, email, detalle
 *   y nota interna (adminCreateAppointment, source "manual").
 * - Bloquear horario: día, desde / hasta (vacío = el día entero) y motivo
 *   (adminBlockSchedule). Los turnos ya tomados no se cancelan solos.
 */
export function TurnosDialogs({
  services,
  times,
  newOpen,
  newDate,
  newTime,
  blockOpen,
  closeHref,
}: {
  services: { id: string; name: string; allowsProduct: boolean }[];
  times: string[];
  newOpen: boolean;
  newDate: string;
  newTime?: string;
  blockOpen: boolean;
  closeHref: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const close = () => {
    setError(null);
    router.replace(closeHref, { scroll: false });
  };

  function createAppt(fd: FormData) {
    setError(null);
    const get = (k: string) => String(fd.get(k) ?? "").trim();
    const date = get("date");
    start(async () => {
      const res = await adminCreateAppointment({
        serviceId: get("serviceId"),
        date,
        time: get("time"),
        name: get("name"),
        phone: get("phone"),
        email: get("email"),
        note: get("note") || undefined,
        internalNote: get("internalNote") || undefined,
      });
      if (!res.ok) return setError(res.error);
      toast("Turno cargado");
      router.replace(`/admin/turnos?semana=${mondayOfDate(date)}${res.appointment ? `&sel=${res.appointment.id}` : ""}`, { scroll: false });
    });
  }

  function block(fd: FormData) {
    setError(null);
    const get = (k: string) => String(fd.get(k) ?? "").trim();
    const date = get("date");
    const from = get("from");
    const to = get("to");
    if ((from && !to) || (!from && to)) return setError("Completá desde y hasta, o dejá los dos vacíos para bloquear el día entero.");
    start(async () => {
      const res = await adminBlockSchedule({ date, from: from || undefined, to: to || undefined, reason: get("reason") || undefined });
      if (!res.ok) return setError(res.error);
      toast("Horario bloqueado");
      router.replace(`/admin/turnos?semana=${mondayOfDate(date)}&bloqueo=${res.id}`, { scroll: false });
    });
  }

  const ends = [...new Set(times.map((t) => addMin(t, 30)))];

  return (
    <>
      <Modal open={newOpen} onClose={close} title="Turno manual" width={560}>
        <form action={createAppt} className="flex flex-col gap-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Servicio">
              <Select name="serviceId" size="sm" defaultValue={services[0]?.id}>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Día">
              <Input type="date" name="date" size="sm" required defaultValue={newDate} />
            </Field>
            <Field label="Hora">
              <Select name="time" size="sm" defaultValue={newTime ?? times[0]}>
                {times.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Nombre">
              <Input name="name" size="sm" required minLength={2} autoComplete="off" />
            </Field>
            <Field label="WhatsApp">
              <Input name="phone" size="sm" required inputMode="tel" placeholder="223 555-0182" autoComplete="off" />
            </Field>
          </div>
          <Field label="Email" optional>
            <Input type="email" name="email" size="sm" autoComplete="off" />
          </Field>
          <Field label="Detalle" optional hint="Qué bici quiere probar o qué consulta (lo ve el cliente).">
            <Input name="note" size="sm" placeholder="MTB rodado 29 · talle M" />
          </Field>
          <Field label="Nota interna" optional>
            <Textarea name="internalNote" size="sm" rows={2} className="min-h-[72px]" />
          </Field>
          <FormError>{error}</FormError>
          <div className="flex flex-wrap justify-end gap-[10px]">
            <Button variant="secondary" size="sm" onClick={close}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={pending}>
              {pending ? "Guardando…" : "Cargar turno"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={blockOpen} onClose={close} title="Bloquear horario" width={480}>
        <form action={block} className="flex flex-col gap-4">
          <Field label="Día">
            <Input type="date" name="date" size="sm" required defaultValue={newDate} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Desde" optional>
              <Select name="from" size="sm" defaultValue="">
                <option value="">Todo el día</option>
                {times.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Hasta" optional>
              <Select name="to" size="sm" defaultValue="">
                <option value="">Todo el día</option>
                {ends.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Motivo" optional hint="Los turnos ya tomados en ese rango no se cancelan solos.">
            <Input name="reason" size="sm" placeholder="Feriado, inventario…" />
          </Field>
          <FormError>{error}</FormError>
          <div className="flex flex-wrap justify-end gap-[10px]">
            <Button variant="secondary" size="sm" onClick={close}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={pending}>
              {pending ? "Guardando…" : "Bloquear"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function addMin(time: string, min: number): string {
  const [h, m] = time.split(":").map(Number);
  const t = h * 60 + m + min;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}
