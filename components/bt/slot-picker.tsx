"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { fetchAvailability } from "@/lib/server/actions/appointments";
import type { AvailabilityDay } from "@/lib/schedule";
import { addDays, toLocalParts } from "@/lib/zoned-time";
import { cx } from "./cx";
import { MonthCalendar, type CalendarDay } from "./calendar";
import { TimeSlotGrid, type TimeSlotGroup } from "./calendar";

/**
 * Día + horario de un turno (2f/4e y reprogramar en Mi cuenta / link de
 * gestión). Pide la disponibilidad real con la action `fetchAvailability`
 * mes a mes (la página queda estática): días cerrados por `schedule_rules`
 * (domingo, sábado a la tarde), bloqueos, ocupación, anticipación y
 * horizonte salen del server. Al cargar un mes elige el primer día con
 * lugar (sin horario).
 */

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const noopSubscribe = () => () => {};

export interface SlotValue {
  date: string | null;
  time: string | null;
}

function daysInMonth(ym: string): number {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export interface SlotPickerProps {
  timeZone: string;
  maxDaysAhead: number;
  value: SlotValue;
  onChange: (v: SlotValue) => void;
  /** Cambiarlo vuelve a pedir el mes (p. ej. después de "ese horario se ocupó"). */
  refreshKey?: number;
  dayLabel: ReactNode;
  timeLabel: ReactNode;
  calendarNote?: ReactNode;
  morningLabel?: string;
  afternoonLabel?: string;
  /** Dentro de un panel #1f1d1a (reprogramar): celdas del calendario en #121110. */
  surface?: "page" | "panel";
  className?: string;
}

export function SlotPicker({
  timeZone,
  maxDaysAhead,
  value,
  onChange,
  refreshKey = 0,
  dayLabel,
  timeLabel,
  calendarNote,
  morningLabel = "Mañana",
  afternoonLabel = "Tarde",
  surface = "page",
  className,
}: SlotPickerProps) {
  // "Hoy" en la zona del local, leído en el navegador (la página es estática).
  const today = useSyncExternalStore(
    noopSubscribe,
    () => toLocalParts(new Date(), timeZone).date,
    () => null,
  );
  const [monthState, setMonth] = useState<string | null>(null);
  const month = monthState ?? value.date?.slice(0, 7) ?? today?.slice(0, 7) ?? null;
  const [days, setDays] = useState<Map<string, AvailabilityDay>>(new Map());
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const key = month ? `${month}:${refreshKey}` : null;
  const loading = key !== loadedKey;
  const req = useRef(0);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    valueRef.current = value;
    onChangeRef.current = onChange;
  });

  const lastDay = today ? addDays(today, maxDaysAhead) : null;

  useEffect(() => {
    if (!today || !month || !key) return;
    const id = ++req.current;
    const first = `${month}-01`;
    const from = first < today ? today : first;
    const count = daysInMonth(month) - Number(from.slice(8)) + 1;
    void fetchAvailability(from, count)
      .catch(() => null)
      .then((res) => {
        if (id !== req.current) return;
        setLoadedKey(key);
        if (!res || !res.ok) {
          setError(res && !res.ok ? res.error : "No pudimos cargar los horarios. Probá de nuevo.");
          setDays(new Map());
          return;
        }
        setError(null);
        const map = new Map(res.days.map((d) => [d.date, d]));
        setDays(map);
        const cur = valueRef.current;
        const curDay = cur.date ? map.get(cur.date) : undefined;
        if (curDay && curDay.open && curDay.available) {
          // El horario elegido puede haberse ocupado.
          if (cur.time && !curDay.slots.some((s) => s.time === cur.time && s.available))
            onChangeRef.current({ date: cur.date, time: null });
          return;
        }
        const firstOpen = res.days.find((d) => d.open && d.available);
        onChangeRef.current({ date: firstOpen?.date ?? null, time: null });
      });
  }, [today, month, key]);

  const goTo = (delta: number) => {
    if (!month) return;
    setMonth(shiftMonth(month, delta));
    onChange({ date: null, time: null });
  };

  const calendarDays: CalendarDay[] = useMemo(() => {
    if (!month) return [];
    return Array.from({ length: daysInMonth(month) }, (_, i) => {
      const date = `${month}-${String(i + 1).padStart(2, "0")}`;
      const d = days.get(date);
      if (!d) return { date, state: loading && today && date >= today ? "loading" : "closed" };
      return { date, state: d.open && d.available ? "available" : "closed" };
    });
  }, [month, days, loading, today]);

  const selectedDay = value.date ? days.get(value.date) : undefined;
  const groups: TimeSlotGroup[] = useMemo(() => {
    if (!selectedDay) return [];
    const slots = selectedDay.slots.map((s) => ({ time: s.time, available: s.available }));
    return [
      { label: morningLabel, slots: slots.filter((s) => s.time < "13:00"), emptyText: "Sin turnos a la mañana." },
      { label: afternoonLabel, slots: slots.filter((s) => s.time >= "13:00"), emptyText: "Ese día no hay turnos a la tarde." },
    ];
  }, [selectedDay, morningLabel, afternoonLabel]);

  const monthLabel = month ? `${MONTHS[Number(month.slice(5)) - 1]} ${month.slice(0, 4)}` : "";
  const prevDisabled = !month || !today || month <= today.slice(0, 7);
  const nextDisabled = !month || !lastDay || month >= lastDay.slice(0, 7);

  return (
    <div
      className={cx(
        "grid min-w-0 grid-cols-1 gap-5 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:gap-8",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-[10px] md:gap-[14px]">
        <MonthCalendar
          label={dayLabel}
          surface={surface}
          monthLabel={monthLabel}
          days={calendarDays}
          selected={value.date}
          onSelect={(date) => onChange({ date, time: null })}
          onPrev={() => goTo(-1)}
          onNext={() => goTo(1)}
          prevDisabled={prevDisabled}
          nextDisabled={nextDisabled}
        />
        {calendarNote && <p className="m-0 text-[13px] text-text-3">{calendarNote}</p>}
      </div>
      <div className="flex min-w-0 flex-col gap-[10px] md:gap-[14px]">
        {timeLabel}
        {error ? (
          <p role="alert" className="m-0 text-[14px] font-semibold text-red-light">
            {error}
          </p>
        ) : loading && !selectedDay ? (
          <p className="m-0 text-[14px] text-text-3">Cargando horarios…</p>
        ) : !selectedDay ? (
          <p className="m-0 text-[14px] text-text-3">
            {calendarDays.some((d) => d.state === "available")
              ? "Elegí un día para ver los horarios."
              : "No quedan turnos este mes. Probá con el mes siguiente."}
          </p>
        ) : (
          <TimeSlotGrid
            groups={groups}
            selected={value.time}
            onSelect={(time) => onChange({ date: value.date, time })}
          />
        )}
      </div>
    </div>
  );
}
