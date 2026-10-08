"use client";

import { useEffect, useState, useTransition } from "react";
import { Button, cx, Field, Input, Panel, PanelTitle, Pill, ResponsiveTopBar, Select, Textarea, Toggle } from "@/components/bt";
import { RepairServicesList, ScheduleDayRow, SettingsSubNav, WhatsAppTemplateCard } from "./settings-parts";
import { useToast } from "@/components/admin/toast";
import { COPY } from "@/lib/data/demo/copy";
import { features } from "@/lib/features";
import { resetRepairsContent } from "@/lib/server/actions/content";
import type { SettingsPatch } from "@/lib/server/actions/settings";
import { saveSettingsScreen, type SettingsScreenSave } from "@/lib/server/actions/settings-screen";
import { adminResetWhatsAppTemplate } from "@/lib/server/actions/whatsapp";
import type { SettingsScreen } from "@/lib/server/screens/admin-d2";

const T = COPY.admin.settings;
const DAYS: Record<number, string> = { 0: "Domingo", 1: "Lunes", 2: "Martes", 3: "Miércoles", 4: "Jueves", 5: "Viernes", 6: "Sábado" };

/** "[Dirección a confirmar]" y similares: se muestran como placeholder. */
const PENDING = /\[[^\]]*a confirmar\]/i;
const WA_PENDING = "5492230000000";
const shown = (v: string) => (PENDING.test(v) || v === WA_PENDING ? "" : v);
const placeholderOf = (v: string, fallback: string) => (PENDING.test(v) ? v : fallback);

/** "10:00 – 13:00" / "10-13" / "10:00 a 13:00" → { start, end } o null; "" = cerrado. */
function parseRange(v: string): { start: string; end: string } | null | "" {
  const t = v.trim();
  if (!t || /^cerrado$/i.test(t)) return "";
  const m = /^(\d{1,2})(?::(\d{2}))?\s*(?:–|-|a|al)\s*(\d{1,2})(?::(\d{2}))?$/i.exec(t);
  if (!m) return null;
  const hh = (h: string, mm?: string) => `${h.padStart(2, "0")}:${mm ?? "00"}`;
  const start = hh(m[1], m[2]);
  const end = hh(m[3], m[4]);
  if (start >= end || end > "23:59") return null;
  return { start, end };
}

const NOTICE = [0, 60, 120, 240, 720, 1440, 2880];
const noticeLabel = (m: number) => (m === 0 ? "Sin mínimo" : m < 60 ? `${m} min` : m % 1440 === 0 && m >= 1440 ? `${m / 1440} ${m === 1440 ? "día" : "días"}` : `${m / 60} ${m === 60 ? "hora" : "horas"}`);
const withCurrent = (list: number[], v: number) => (list.includes(v) ? list : [...list, v].sort((a, b) => a - b));

export function SettingsEditor({ data }: { data: SettingsScreen }) {
  const toast = useToast();
  const [saving, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [base, setBase] = useState(data);
  const [s, setS] = useState(data);
  const dirty = JSON.stringify(s) !== JSON.stringify(base);
  const setLocal = (k: keyof SettingsScreen["local"], v: string) => setS((x) => ({ ...x, local: { ...x.local, [k]: v } }));
  const setPay = <K extends keyof SettingsScreen["payments"]>(k: K, v: SettingsScreen["payments"][K]) =>
    setS((x) => ({ ...x, payments: { ...x.payments, [k]: v } }));
  const setAgenda = (k: keyof SettingsScreen["agenda"], v: number) => setS((x) => ({ ...x, agenda: { ...x.agenda, [k]: v } }));
  const setRep = (patch: Partial<SettingsScreen["repairs"]>) => setS((x) => ({ ...x, repairs: { ...x.repairs, ...patch } }));
  const setDay = (wd: number, patch: Partial<SettingsScreen["schedule"][number]>) =>
    setS((x) => ({ ...x, schedule: x.schedule.map((d) => (d.weekday === wd ? { ...d, ...patch } : d)) }));

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  // Validación de rangos (para marcar los inputs en rojo).
  const bad = Object.fromEntries(
    s.schedule.map((d) => [d.weekday, { am: d.open && parseRange(d.am) === null, pm: d.open && parseRange(d.pm) === null }]),
  );

  function save() {
    setError(null);
    if (Object.values(bad).some((b) => b.am || b.pm)) return setError("Revisá los horarios: usá el formato 10:00 – 13:00 o dejalo vacío (cerrado).");
    if (!s.repairs.title.trim()) return setError("El taller necesita un título.");
    // Una sola action con todo lo que cambió (re-render único al final).
    const input: SettingsScreenSave = {};
    // 1) Local y pagos.
    const patch: SettingsPatch = {};
    const L = s.local;
    const B = base.local;
    if (L.address !== B.address && L.address.trim()) patch.address = L.address;
    if (L.whatsapp !== B.whatsapp && L.whatsapp.trim()) patch.whatsapp = L.whatsapp;
    if (L.instagram !== B.instagram) patch.instagram = L.instagram;
    if (L.hours !== B.hours && L.hours.trim()) patch.hours = L.hours;
    const P = s.payments;
    const BP = base.payments;
    if (P.transferDiscount !== BP.transferDiscount) patch.transferDiscount = P.transferDiscount;
    if (P.maxInstallments !== BP.maxInstallments) patch.maxInstallments = P.maxInstallments;
    if (P.transferAlias !== BP.transferAlias && P.transferAlias.trim()) patch.transferAlias = P.transferAlias;
    if (P.transferCbu !== BP.transferCbu) patch.transferCbu = P.transferCbu;
    if (P.transferHolder !== BP.transferHolder) patch.transferHolder = P.transferHolder;
    if (P.transferBank !== BP.transferBank) patch.transferBank = P.transferBank;
    if (P.reservationHours !== BP.reservationHours) patch.reservationHours = P.reservationHours;
    if (P.cashEnabled !== BP.cashEnabled) patch.cashEnabled = P.cashEnabled;
    if (P.cashReservationHours !== BP.cashReservationHours) patch.cashReservationHours = P.cashReservationHours;
    if (Object.keys(patch).length) input.settings = patch;
    // 2) Horario semanal.
    if (JSON.stringify(s.schedule) !== JSON.stringify(base.schedule)) {
      input.scheduleRules = s.schedule.flatMap((d) =>
        !d.open
          ? []
          : [parseRange(d.am), parseRange(d.pm)].flatMap((r) =>
              r && typeof r === "object" ? [{ weekday: d.weekday, startTime: r.start, endTime: r.end }] : [],
            ),
      );
    }
    // 3) Reglas de la agenda.
    if (JSON.stringify(s.agenda) !== JSON.stringify(base.agenda)) {
      const { slotCapacity, minNoticeMin, maxDaysAhead } = s.agenda;
      input.agenda = { slotCapacity, minNoticeMin, maxDaysAhead };
    }
    // 4) Servicios.
    const services = s.services.filter((sv) => {
      const before = base.services.find((x) => x.id === sv.id);
      return before && before.active !== sv.active;
    });
    if (services.length) input.services = services.map((sv) => ({ id: sv.id, active: sv.active }));
    // 5) Plantillas.
    const templates = s.templates.filter((t) => {
      const before = base.templates.find((x) => x.id === t.id);
      return before && before.body !== t.body;
    });
    if (templates.length) input.templates = templates.map((t) => ({ id: t.id, body: t.body }));
    // 6) Taller (content.rep): los servicios vacíos se descartan al guardar.
    if (JSON.stringify(s.repairs) !== JSON.stringify(base.repairs)) input.repairs = s.repairs;
    if (!Object.keys(input).length) return;

    start(async () => {
      const r = await saveSettingsScreen(input);
      if (!r.ok) return setError(r.error);
      setBase(s);
      toast("Ajustes guardados");
    });
  }

  const saveBtn = (
    <Button variant="primary" size="md" onClick={save} disabled={saving}>
      {saving ? "Guardando…" : "Guardar cambios"}
    </Button>
  );
  const g = s.payments.gateway;
  const sections = [
    { id: "local", label: "Local" },
    { id: "taller", label: "Taller" },
    ...(features.appointments ? [{ id: "turnos", label: "Turnos" }] : []),
    { id: "pagos", label: "Pagos" },
    { id: "notificaciones", label: "Notificaciones" },
  ];

  return (
    <>
      <ResponsiveTopBar
        title="Ajustes"
        actions={
          <>
            <span className={cx("font-mono text-[12px] font-semibold", dirty ? "text-yellow" : "text-text-3")} aria-live="polite">
              {dirty ? "Cambios sin guardar" : "Todo guardado"}
            </span>
            {saveBtn}
          </>
        }
        mobileActions={null}
      />
      {error && (
        <p role="alert" className="mx-4 mt-4 mb-0 rounded-box border border-red-light/60 px-4 py-3 text-[14px] font-semibold text-red-light lg:mx-10">
          {error}
        </p>
      )}

      <div className="grid items-start gap-5 px-4 pt-4 pb-28 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-7 lg:px-10 lg:pt-6 lg:pb-10">
        <SettingsSubNav items={sections} className="max-lg:sticky max-lg:top-[69px] max-lg:z-20 max-lg:-mx-4 max-lg:bg-ink max-lg:px-4 max-lg:py-2" />

        <div className="flex min-w-0 flex-col gap-5">
          {/* A. Local */}
          <div id="local" className="min-w-0 scroll-mt-28">
          <Panel surface="surface" padding="lg" as="section">
            <PanelTitle>{T.local.title}</PanelTitle>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label={T.local.address}>
                <Input value={shown(s.local.address)} placeholder={placeholderOf(s.local.address, "Calle 123, Mar del Plata")} onChange={(e) => setLocal("address", e.target.value)} maxLength={160} />
              </Field>
              <Field label={T.local.whatsapp}>
                <Input inputMode="tel" value={shown(s.local.whatsapp)} placeholder="[Número a confirmar]" onChange={(e) => setLocal("whatsapp", e.target.value)} maxLength={30} />
              </Field>
              <Field label={T.local.email} hint="Lo cargamos nosotros en la configuración de la tienda.">
                <Input value={shown(s.local.email)} placeholder={placeholderOf(s.local.email, "—")} disabled readOnly />
              </Field>
              <Field label={T.local.instagram}>
                <Input value={s.local.instagram} placeholder="@bicitiendamdq" onChange={(e) => setLocal("instagram", e.target.value)} maxLength={200} />
              </Field>
              <Field label="Horarios de atención" hint="Se ven en el pie de la web." className="md:col-span-2">
                <Input value={shown(s.local.hours)} placeholder={placeholderOf(s.local.hours, "Lun a vie 10–13 y 16–19 · Sáb 10–13")} onChange={(e) => setLocal("hours", e.target.value)} maxLength={120} />
              </Field>
            </div>
          </Panel>
          </div>

          {/* A2. Taller: lo que más deja; textos de /reparaciones y de la home. */}
          <div id="taller" className="min-w-0 scroll-mt-28">
          <Panel surface="surface" padding="lg" as="section" className="border-l-[3px] border-l-yellow">
            <PanelTitle action={<span className="text-[13px] text-text-3 max-md:hidden">Se ve en Reparaciones y en la home</span>}>Taller</PanelTitle>
            <div className="grid items-start gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="flex min-w-0 flex-col gap-3">
                <Field label="Título">
                  <Input value={s.repairs.title} placeholder="Taller de bicis" onChange={(e) => setRep({ title: e.target.value })} maxLength={120} invalid={!s.repairs.title.trim()} />
                </Field>
                <Field label="Texto" hint="Corto: qué hace el taller y cómo se pide turno. Sin precios.">
                  <Textarea rows={5} value={s.repairs.body} onChange={(e) => setRep({ body: e.target.value })} maxLength={800} />
                </Field>
              </div>
              <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
                <legend className="mb-2 p-0 text-[12px] font-bold uppercase tracking-[.08em] text-text-3">Servicios del taller</legend>
                <RepairServicesList items={s.repairs.services} onChange={(services) => setRep({ services })} />
                <span className="text-[13px] text-text-3">En este orden se ven en la web.</span>
              </fieldset>
            </div>
            <button
              type="button"
              className="self-start rounded-[2px] text-[12px] font-bold uppercase tracking-[.08em] text-text-3 hover:text-paper focus-visible:outline-2 focus-visible:outline-yellow"
              onClick={async () => {
                const r = await resetRepairsContent();
                if (!r.ok) return setError(r.error);
                // La action invalida y Next re-renderiza la página con el texto original.
                toast("Texto original del taller restaurado");
              }}
            >
              ↺ Volver al texto original
            </button>
          </Panel>
          </div>

          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            {/* B1. Horarios para turnos */}
            {features.appointments && (
              <div id="turnos" className="min-w-0 scroll-mt-28">
              <Panel surface="surface" padding="lg" as="section">
                    <PanelTitle action={<span className="font-mono text-[12px] font-semibold text-text-3 max-sm:hidden">EJ. 10:00 – 13:00</span>}>{T.schedule.title}</PanelTitle>
                <div className="flex flex-col">
                  {s.schedule.map((d) => (
                    <ScheduleDayRow
                      key={d.weekday}
                      day={DAYS[d.weekday]}
                      open={d.open}
                      am={d.am}
                      pm={d.pm}
                      invalid={bad[d.weekday]}
                      closedLabel={T.schedule.closed}
                      onOpen={(v) => setDay(d.weekday, { open: v, ...(v && !d.am && !d.pm ? { am: "10:00 – 13:00" } : {}) })}
                      onAm={(v) => setDay(d.weekday, { am: v })}
                      onPm={(v) => setDay(d.weekday, { pm: v })}
                    />
                  ))}
                </div>
                <div className="grid gap-[10px] sm:grid-cols-3">
                  <Field label={T.appointments.perSlot}>
                    <Select value={s.agenda.slotCapacity} onChange={(e) => setAgenda("slotCapacity", Number(e.target.value))}>
                      {withCurrent([1, 2, 3, 4, 5], s.agenda.slotCapacity).map((n) => (
                        <option key={n} value={n}>{`${n} ${n === 1 ? "turno" : "turnos"}`}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label={T.appointments.notice}>
                    <Select value={s.agenda.minNoticeMin} onChange={(e) => setAgenda("minNoticeMin", Number(e.target.value))}>
                      {withCurrent(NOTICE, s.agenda.minNoticeMin).map((m) => (
                        <option key={m} value={m}>{noticeLabel(m)}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label={T.appointments.maxDays}>
                    <Select value={s.agenda.maxDaysAhead} onChange={(e) => setAgenda("maxDaysAhead", Number(e.target.value))}>
                      {withCurrent([7, 14, 30, 60, 90], s.agenda.maxDaysAhead).map((n) => (
                        <option key={n} value={n}>{`${n} días`}</option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <p className="m-0 text-[13px] leading-[1.5] text-text-3">
                  Turnos cada {s.agenda.slotMinutes} min. Cerrado = dejá el horario vacío. Feriados y bloqueos puntuales: desde Turnos → Bloquear horario.
                </p>
              </Panel>
              </div>
            )}

            <div className="flex min-w-0 flex-col gap-5">
              {/* B2. Servicios */}
              {features.appointments && s.services.length > 0 && (
                <Panel surface="surface" padding="lg" gap="md" as="section">
                  <PanelTitle>{T.services}</PanelTitle>
                  {s.services.map((sv) => (
                    <Toggle
                      key={sv.id}
                      label={sv.name}
                      description={sv.note}
                      checked={sv.active}
                      onChange={(e) => setS((x) => ({ ...x, services: x.services.map((y) => (y.id === sv.id ? { ...y, active: e.target.checked } : y)) }))}
                    />
                  ))}
                </Panel>
              )}

              {/* B3. Pagos */}
              <div id="pagos" className="min-w-0 scroll-mt-28">
              <Panel surface="surface" padding="lg" gap="md" as="section">
                    <PanelTitle>{T.payments.title}</PanelTitle>
                {g && (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[15px] font-extrabold">{g.name}</span>
                      {g.state === "conectado" ? (
                        <Pill tone="yellow" size="lg">{T.payments.mpConnected}</Pill>
                      ) : g.state === "prueba" ? (
                        <Pill tone="yellow-outline" size="lg">Modo prueba</Pill>
                      ) : (
                        <Pill tone="red-outline" size="lg">Sin configurar</Pill>
                      )}
                    </div>
                    {g.state !== "conectado" && (
                      <span className="text-[13px] leading-[1.45] text-text-3">
                        {g.state === "prueba"
                          ? "Sin credenciales: los pagos online van al simulador. Las credenciales se cargan en el servidor, no acá."
                          : "Faltan las credenciales en el servidor: el pago online no aparece en el checkout."}
                      </span>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-[10px]">
                  <Field label={T.payments.transferOff}>
                    <span className="relative block">
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={90}
                        value={s.payments.transferDiscount}
                        onChange={(e) => setPay("transferDiscount", Math.max(0, Math.min(90, Number(e.target.value) || 0)))}
                        className="pr-9"
                      />
                      <span aria-hidden className="pointer-events-none absolute top-1/2 right-[14px] -translate-y-1/2 text-[15px] text-text-3">%</span>
                    </span>
                  </Field>
                  <Field label={T.payments.installments}>
                    <Select value={s.payments.maxInstallments} onChange={(e) => setPay("maxInstallments", Number(e.target.value))}>
                      {withCurrent([1, 3, 6, 9, 12], s.payments.maxInstallments).map((n) => (
                        <option key={n} value={n}>{n === 1 ? "Sin cuotas" : `Hasta ${n}`}</option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <Field label="Alias">
                  <Input value={shown(s.payments.transferAlias)} placeholder={placeholderOf(s.payments.transferAlias, "bicitienda.mdq")} onChange={(e) => setPay("transferAlias", e.target.value)} maxLength={60} />
                </Field>
                <Field label="CBU / CVU">
                  <Input inputMode="numeric" value={shown(s.payments.transferCbu)} placeholder={placeholderOf(s.payments.transferCbu, "22 números")} onChange={(e) => setPay("transferCbu", e.target.value)} maxLength={40} />
                </Field>
                <div className="grid grid-cols-2 gap-[10px]">
                  <Field label="Titular">
                    <Input value={shown(s.payments.transferHolder)} placeholder={placeholderOf(s.payments.transferHolder, "Nombre y apellido")} onChange={(e) => setPay("transferHolder", e.target.value)} maxLength={120} />
                  </Field>
                  <Field label="Banco">
                    <Input value={shown(s.payments.transferBank)} placeholder={placeholderOf(s.payments.transferBank, "Banco")} onChange={(e) => setPay("transferBank", e.target.value)} maxLength={80} />
                  </Field>
                </div>
                <Field label="Reserva por transferencia" hint="Si no llega el comprobante, el pedido vence y el stock vuelve.">
                  <Select value={s.payments.reservationHours} onChange={(e) => setPay("reservationHours", Number(e.target.value))}>
                    {withCurrent([12, 24, 48, 72], s.payments.reservationHours).map((n) => (
                      <option key={n} value={n}>{`${n} horas`}</option>
                    ))}
                  </Select>
                </Field>
                {s.payments.cashFeature && (
                  <>
                    <Toggle label={T.payments.cash} checked={s.payments.cashEnabled} onChange={(e) => setPay("cashEnabled", e.target.checked)} />
                    {s.payments.cashEnabled && (
                      <Field label="Reserva en efectivo">
                        <Select
                          value={s.payments.cashReservationHours ?? ""}
                          onChange={(e) => setPay("cashReservationHours", e.target.value ? Number(e.target.value) : null)}
                        >
                          <option value="">No vence</option>
                          {withCurrent([24, 48, 72], s.payments.cashReservationHours ?? 24).map((n) => (
                            <option key={n} value={n}>{`${n} horas`}</option>
                          ))}
                        </Select>
                      </Field>
                    )}
                  </>
                )}
              </Panel>
              </div>
            </div>
          </div>

          {/* C. Mensajes de WhatsApp */}
          <div id="notificaciones" className="min-w-0 scroll-mt-28">
          <Panel surface="surface" padding="lg" as="section">
            <PanelTitle action={<span className="text-[13px] text-text-3 max-md:hidden">{T.templates.hint}</span>}>{T.templates.title}</PanelTitle>
            <p className="m-0 text-[14px] leading-[1.5] text-text-2">
              Desde el turno o el pedido tocás “WhatsApp” y se abre el chat con este texto listo para mandar. Campos: {"{nombre} {día} {hora} {servicio} {producto} {número} {link}"}.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {s.templates.map((t) => (
                <WhatsAppTemplateCard
                  key={t.id}
                  name={t.name}
                  when={t.when}
                  value={t.body}
                  onChange={(v) => setS((x) => ({ ...x, templates: x.templates.map((y) => (y.id === t.id ? { ...y, body: v } : y)) }))}
                  footer={
                    <button
                      type="button"
                      className="self-start rounded-[2px] text-[12px] font-bold uppercase tracking-[.08em] text-text-3 hover:text-paper focus-visible:outline-2 focus-visible:outline-yellow"
                      onClick={async () => {
                        await adminResetWhatsAppTemplate(t.id);
                        toast("Texto original restaurado");
                      }}
                    >
                      ↺ Volver al texto original
                    </button>
                  }
                />
              ))}
            </div>
          </Panel>
          </div>
        </div>
      </div>

      {dirty && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-line bg-ink-deep px-4 py-3 lg:hidden">
          <span className="flex-1 font-mono text-[12px] font-semibold text-yellow">Cambios sin guardar</span>
          {saveBtn}
        </div>
      )}
    </>
  );
}
