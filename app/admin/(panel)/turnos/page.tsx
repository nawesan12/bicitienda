import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminTopBar, BackLink, Button, Display, Panel, Pill, SegmentedControl } from "@/components/bt";
import { Legend, WeekAgenda, WeekNav, type WeekAgendaGroup } from "./agenda";
import { features } from "@/lib/features";
import {
  getAgendaWeek,
  getAppointmentDetail,
  localNow,
  mondayOf,
  type AgendaCellData,
  type AgendaData,
} from "@/lib/server/screens/admin-d1";
import { addDays, fromMinutes, isLocalDate } from "@/lib/zoned-time";
import { AppointmentPanel, BlockPanel } from "./appointment-panel";
import { TurnosDialogs } from "./turnos-dialogs";

export const metadata: Metadata = { title: "Turnos" };

type SP = { semana?: string; vista?: string; dia?: string; sel?: string; bloqueo?: string; nuevo?: string; hora?: string; bloquear?: string };

function hrefWith(sp: SP, patch: Partial<SP>): string {
  const n = { ...sp, ...patch };
  const qs = new URLSearchParams();
  if (n.semana) qs.set("semana", n.semana);
  if (n.vista === "dia") qs.set("vista", "dia");
  if (n.dia) qs.set("dia", n.dia);
  if (n.sel) qs.set("sel", n.sel);
  if (n.bloqueo) qs.set("bloqueo", n.bloqueo);
  if (n.nuevo) qs.set("nuevo", n.nuevo);
  if (n.hora) qs.set("hora", n.hora);
  if (n.bloquear) qs.set("bloquear", n.bloquear);
  const s = qs.toString();
  return s ? `/admin/turnos?${s}` : "/admin/turnos";
}

const SUB: Record<string, string> = { prueba: "Prueba", asesoramiento: "Asesor.", otro: "" };

/** Celdas de la grilla para un set de días (semana o un día). */
function buildGroups(data: AgendaData, sp: SP, dates: string[], selId: string | null, selBlock: number | null): WeekAgendaGroup[] {
  const base: SP = { semana: data.monday, vista: sp.vista, dia: sp.dia };
  const cellProps = (c: AgendaCellData) => {
    const key = `${c.date}-${c.time}`;
    const active = c.appointments.filter((a) => a.status === "pendiente" || a.status === "confirmado");
    const shown = active[0] ?? c.appointments[0];
    if (shown) {
      const sub = [SUB[shown.service] || shown.serviceName, shown.status === "no_asistio" ? "No vino" : shown.detail].filter(Boolean).join(" · ");
      return {
        key,
        kind: shown.service,
        title: shown.name,
        sub,
        unconfirmed: shown.status === "pendiente",
        selected: shown.id === selId,
        dim: shown.status === "asistio" || shown.status === "no_asistio",
        extra: c.appointments.length > 1 ? c.appointments.length - 1 : undefined,
        href: hrefWith(base, { sel: shown.id }),
        label: `${shown.name}, ${shown.serviceName}, ${c.time}`,
      } as const;
    }
    if (c.block)
      return {
        key,
        kind: "blocked" as const,
        title: "Bloqueado",
        sub: c.block.reason || undefined,
        selected: c.block.id === selBlock,
        href: hrefWith(base, { bloqueo: String(c.block.id) }),
        label: `Bloqueado ${c.time}${c.block.reason ? `: ${c.block.reason}` : ""}`,
      };
    if (c.closed) return { key, kind: "closed" as const };
    const past = c.date < data.today;
    return {
      key,
      kind: "empty" as const,
      href: past ? undefined : hrefWith(base, { nuevo: "1", dia: c.date, hora: c.time }),
      label: past ? undefined : `Cargar turno el ${c.date} a las ${c.time}`,
    };
  };
  const idx = dates.map((d) => data.days.findIndex((x) => x.date === d));
  return data.groups.map((g) => ({
    label: g.label,
    rows: g.rows.map((r) => ({ time: r.time, cells: idx.map((i) => cellProps(r.cells[i])) })),
  }));
}

/**
 * 3b · Turnos: agenda semanal Lun–Sáb (mañana / "Tarde", armada desde el
 * horario de Ajustes) o vista día, panel del turno seleccionado, turno
 * manual y bloqueos. En mobile (< lg) es siempre la vista día.
 */
export default async function AdminTurnosPage({ searchParams }: { searchParams: Promise<SP> }) {
  if (!features.appointments) notFound();
  const sp = await searchParams;
  const { date: today, minutes } = localNow();
  const monday = mondayOf(sp.semana && isLocalDate(sp.semana) ? sp.semana : today);
  const data = await getAgendaWeek(monday);
  const dates = data.days.map((d) => d.date);
  const dayView = sp.vista === "dia";
  const day = sp.dia && dates.includes(sp.dia) ? sp.dia : dates.includes(today) ? today : monday;

  // Selección: la de la URL o el próximo turno activo de la semana.
  const blockId = sp.bloqueo ? Number(sp.bloqueo) : null;
  const block = blockId ? (data.blocks.find((b) => b.id === blockId) ?? null) : null;
  const pool = dayView || sp.dia ? data.appointments.filter((a) => a.date === day) : data.appointments;
  const upcoming =
    pool.find((a) => (a.status === "pendiente" || a.status === "confirmado") && `${a.date} ${a.time}` >= `${today} ${fromMinutes(minutes)}`) ??
    pool.find((a) => a.status === "pendiente" || a.status === "confirmado") ??
    pool[0] ??
    data.appointments.find((a) => (a.status === "pendiente" || a.status === "confirmado") && `${a.date} ${a.time}` >= `${today} ${fromMinutes(minutes)}`) ??
    data.appointments.find((a) => a.status === "pendiente" || a.status === "confirmado");
  const selId = block ? null : (sp.sel ?? upcoming?.id ?? null);
  const detail = selId ? await getAppointmentDetail(selId) : null;
  const explicit = !!(sp.sel || block);

  const base: SP = { semana: monday, vista: sp.vista, dia: sp.dia };
  const times = [...new Set(data.groups.flatMap((g) => g.rows.map((r) => r.time)))];
  const weekGroups = buildGroups(data, sp, dates, selId, blockId);
  const dayGroups = buildGroups(data, sp, [day], selId, blockId);
  const dayOf = (d: string) => data.days.find((x) => x.date === d)!;

  const nav = (
    <WeekNav
      label={data.label}
      prevHref={hrefWith(base, { semana: addDays(monday, -7), dia: undefined })}
      nextHref={hrefWith(base, { semana: addDays(monday, 7), dia: undefined })}
    />
  );

  const dayStrip = (
    <nav aria-label="Día" className="grid grid-cols-6 gap-[6px]">
      {data.days.map((d) => (
        <a
          key={d.date}
          href={hrefWith(base, { vista: sp.vista, dia: d.date, sel: undefined, bloqueo: undefined })}
          aria-current={d.date === day ? "date" : undefined}
          className={
            "flex min-h-11 flex-col items-center justify-center rounded-btn border px-1 py-[6px] transition-colors duration-150 " +
            (d.date === day ? "border-paper bg-paper text-ink" : d.isToday ? "border-yellow text-paper" : "border-line-strong text-paper hover:border-text-4")
          }
        >
          <span className="text-[11px] font-bold uppercase tracking-[.08em] opacity-70">{d.short}</span>
          <span className="text-[20px] font-black leading-none stretch-72">{d.num}</span>
        </a>
      ))}
    </nav>
  );

  const legend = (
    <Legend
      items={[
        { label: "Prueba de bici", swatch: "yellow" },
        { label: "Asesoramiento", swatch: "paper" },
        { label: "Sin confirmar", swatch: "red-outline" },
        { label: "Bloqueado", swatch: "blocked" },
      ]}
      note={
        <Link href="/admin/ajustes" className="hover:text-paper">
          Horarios desde Ajustes → Turnos
        </Link>
      }
    />
  );

  const panel = block ? (
    <BlockPanel block={block} closeHref={hrefWith(base, { bloqueo: undefined })} />
  ) : detail ? (
    <AppointmentPanel key={detail.id} appt={detail} times={times} />
  ) : (
    <Panel padding="lg" gap="md" className="border border-line">
      <Pill tone="muted" className="self-start">
        Sin turno
      </Pill>
      <p className="m-0 text-[14px] text-text-3">
        {data.appointments.length ? "Elegí un turno de la agenda para ver el detalle." : "No hay turnos esta semana. Cargá uno con “+ Turno manual”."}
      </p>
    </Panel>
  );

  const closeHref = hrefWith(base, { dia: dayView ? sp.dia : undefined });
  const toolbar = (cls: string) => (
    <div className={cls}>
      <Button variant="secondary" size="md" href={hrefWith(base, { bloquear: "1" })} className="whitespace-nowrap max-lg:min-w-0 max-lg:flex-1 max-lg:whitespace-normal max-lg:px-2">
        Bloquear horario
      </Button>
      <Button variant="primary" size="md" href={hrefWith(base, { nuevo: "1", dia: day })} className="whitespace-nowrap max-lg:min-w-0 max-lg:flex-1 max-lg:whitespace-normal max-lg:px-2">
        + Turno manual
      </Button>
    </div>
  );

  return (
    <>
      <TurnosDialogs
        services={data.services}
        times={times}
        newOpen={sp.nuevo === "1"}
        newDate={sp.dia && isLocalDate(sp.dia) ? sp.dia : day}
        newTime={sp.hora}
        blockOpen={sp.bloquear === "1"}
        closeHref={closeHref}
      />
      {/* ── 3b desktop ── */}
      <div className="max-lg:hidden">
        <AdminTopBar
          title="Turnos"
          actions={
            <>
              <SegmentedControl
                tone="paper"
                ariaLabel="Vista"
                items={[
                  { label: "Semana", href: hrefWith(base, { vista: undefined, dia: undefined }), active: !dayView },
                  { label: "Día", href: hrefWith(base, { vista: "dia", dia: day }), active: dayView },
                ]}
              />
              {toolbar("flex gap-[14px]")}
            </>
          }
        >
          <div className="ml-4">{nav}</div>
        </AdminTopBar>
        <div className="px-10 pt-4">{legend}</div>
        <div className="grid grid-cols-[minmax(0,1fr)_360px] items-start gap-6 px-10 pb-10 pt-4">
          <div className="flex min-w-0 flex-col gap-4">
            {dayView && dayStrip}
            {dayView ? (
              <WeekAgenda size="day" days={[{ key: day, short: dayOf(day).short, num: dayOf(day).num, isToday: day === today }]} groups={dayGroups} />
            ) : (
              <WeekAgenda
                days={data.days.map((d) => ({ key: d.date, short: d.short, num: d.num, isToday: d.isToday, href: hrefWith(base, { vista: "dia", dia: d.date }) }))}
                groups={weekGroups}
              />
            )}
          </div>
          <div className="sticky top-6">{panel}</div>
        </div>
      </div>

      {/* ── mobile: vista día ── */}
      <div className="flex flex-col gap-4 px-4 pb-7 pt-[18px] lg:hidden">
        <div className="flex items-end justify-between gap-3">
          <Display size="admin">Turnos</Display>
        </div>
        {nav}
        {toolbar("flex gap-[10px]")}
        {explicit && (
          <div id="detalle" className="flex flex-col gap-2">
            <BackLink href={hrefWith(base, { dia: day })}>Agenda del día</BackLink>
            {panel}
          </div>
        )}
        {dayStrip}
        <WeekAgenda size="day" days={[{ key: day, short: dayOf(day).short, num: dayOf(day).num, isToday: day === today }]} groups={dayGroups} />
        {legend}
      </div>
    </>
  );
}
