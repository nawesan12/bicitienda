"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, cx, Display, Eyebrow, Input, OptionCard, Panel, SizeSelector, SummaryRows } from "@/components/bt";
import { SelectedProductRow } from "./selected-product-row";
import { SlotPicker, type SlotValue } from "@/components/bt/slot-picker";
import { COPY } from "@/lib/data/demo/copy";
import { paths } from "@/lib/paths";
import { formatArPhone, isValidArPhone } from "@/lib/phone";
import { getMyAccount } from "@/lib/server/actions/account";
import { bookAppointment } from "@/lib/server/actions/appointments";
import type { BookingData } from "@/lib/server/screens/cliente-c";

/** Parche mínimo (R1): getTestRideBikes ya no existe; R2 saca el picker de bici. */
type TestRideBike = {
  slug: string;
  name: string;
  image: string | null;
  variants: { id: string; size: string; label: string; height: string | null; available: boolean }[];
};
import { longDayLabel } from "@/lib/zoned-time";

const T = COPY.appointment;

type Account = { name: string; phone: string; email: string } | null;

interface Booked {
  number: string;
  manageToken: string;
  confirmed: boolean;
  serviceName: string;
  dayText: string;
  time: string;
  bikeLabel: string | null;
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function fill(tpl: string, min: number) {
  return tpl.replace("{min}", String(min));
}

/**
 * Reserva de turno (2f desktop / 4e mobile). Isla cliente: la página es
 * estática y la disponibilidad se pide con `fetchAvailability`. La
 * preselección (`?servicio=prueba&producto=<slug>&variante=<id>`, desde el
 * botón de la ficha) se lee de la URL al montar.
 */
export function BookingClient({ data, bikes }: { data: BookingData; bikes: TestRideBike[] }) {
  const [serviceId, setServiceId] = useState(data.services[0]?.id ?? "");
  const [bikeSlug, setBikeSlug] = useState<string | null>(null);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [slot, setSlot] = useState<SlotValue>({ date: null, time: null });
  const [refreshKey, setRefreshKey] = useState(0);
  const [account, setAccount] = useState<Account | undefined>(undefined);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ name?: string; phone?: string; email?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [booked, setBooked] = useState<Booked | null>(null);

  const service = data.services.find((s) => s.id === serviceId) ?? data.services[0];
  const bike = bikes.find((b) => b.slug === bikeSlug) ?? null;
  const variant = bike?.variants.find((v) => v.id === variantId) ?? null;
  const showBike = !!service?.allowsProduct && bikes.length > 0;

  // Preselección por URL + sesión (en el navegador: la página es estática).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const wanted = q.get("servicio");
    const slug = q.get("producto");
    const found = slug ? bikes.find((b) => b.slug === slug) : undefined;
    const svc =
      data.services.find((s) => s.id === wanted) ??
      (found ? data.services.find((s) => s.allowsProduct) : undefined);
    const vid = q.get("variante");
    /* eslint-disable react-hooks/set-state-in-effect -- lectura única de la URL al montar */
    if (svc) setServiceId(svc.id);
    if (found) {
      setBikeSlug(found.slug);
      const v = found.variants.find((x) => x.id === vid) ?? (found.variants.length === 1 ? found.variants[0] : null);
      setVariantId(v?.id ?? null);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    let alive = true;
    getMyAccount()
      .then((a) => alive && setAccount(a ? { name: a.name, phone: a.phone, email: a.email } : null))
      .catch(() => alive && setAccount(null));
    return () => {
      alive = false;
    };
  }, [bikes, data.services]);

  const guest = account === null || account === undefined;
  const ready = !!service && !!slot.date && !!slot.time && (!guest || (name.trim() && phone.trim()));
  const dayText = slot.date ? cap(longDayLabel(slot.date)) : "Elegí un día";
  const timeText = slot.time ? `${slot.time} hs` : T.pickTime;
  const bikeLabel = bike
    ? [bike.name, variant && variant.size !== "Único" ? `Talle ${variant.size}` : null].filter(Boolean).join(" · ")
    : null;

  // Para probar alcanza el talle: se agrupan los colores de cada talle.
  const sizeOptions = useMemo(() => {
    const bySize = new Map<string, { value: string; label: string; height?: string; available: boolean }>();
    for (const v of bike?.variants ?? []) {
      const cur = bySize.get(v.size);
      if (cur) cur.available ||= v.available;
      else bySize.set(v.size, { value: v.size, label: v.size, height: v.height ?? undefined, available: v.available });
    }
    return [...bySize.values()];
  }, [bike]);

  function pickSize(size: string) {
    const options = (bike?.variants ?? []).filter((v) => v.size === size);
    setVariantId((options.find((v) => v.available) ?? options[0])?.id ?? null);
  }

  function validate(): boolean {
    if (!guest) return true;
    const next: typeof errors = {};
    if (name.trim().length < 2) next.name = "Completá tu nombre.";
    if (!isValidArPhone(phone)) next.phone = "Revisá el WhatsApp: 10 dígitos con la característica (ej. 223 555-0182).";
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = "Revisá el email.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function confirm() {
    if (!ready || submitting || !service || !slot.date || !slot.time) return;
    setFormError(null);
    if (!validate()) return;
    setSubmitting(true);
    const res = await bookAppointment({
      serviceId: service.id,
      ...(guest ? { name, phone, email } : {}),
      date: slot.date,
      time: slot.time,
      ...(showBike && bike ? { productSlug: bike.slug, ...(variant ? { variantId: variant.id } : {}) } : {}),
    }).catch(() => null);
    setSubmitting(false);
    if (!res) {
      setFormError("No pudimos guardar el turno. Probá de nuevo.");
      return;
    }
    if (!res.ok) {
      setFormError(res.error);
      if (res.code === "SLOT" || res.code === "TOO_LATE") setRefreshKey((k) => k + 1);
      return;
    }
    setBooked({
      number: res.appointment.number,
      manageToken: res.appointment.manageToken,
      confirmed: res.appointment.status === "confirmado",
      serviceName: service.summaryName,
      dayText,
      time: slot.time,
      bikeLabel: showBike ? bikeLabel : null,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (booked) return <BookingSuccess booked={booked} account={account ?? null} address={data.address} />;

  const stepLabel = (desktop: string, mobile?: string) => (
    <Eyebrow tone="muted" size="md" as="h2" className="max-md:text-[12px]">
      <span className={cx(mobile && "max-md:hidden")}>{desktop}</span>
      {mobile && <span className="md:hidden">{mobile}</span>}
    </Eyebrow>
  );

  const fieldError = (msg?: string) =>
    msg ? <span className="text-[13px] font-semibold text-red-light">{msg}</span> : null;

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-10">
      <div className="flex min-w-0 flex-col gap-5 md:gap-9">
        {/* 1 · Servicio */}
        <section className="flex flex-col gap-[10px] md:gap-[14px]">
          {stepLabel(T.step1, "1 · Qué necesitás")}
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-3">
            {data.services.map((s) => (
              <OptionCard
                key={s.id}
                name="service"
                value={s.id}
                checked={s.id === serviceId}
                onChange={() => setServiceId(s.id)}
                title={s.name}
                description={s.description}
                meta={fill(T.durationBadge, s.durationMin)}
                selectedStyle="fill"
                titleStyle="display-lg"
                surface="surface"
                padding="lg"
                radius={10}
                className="max-md:gap-[6px] max-md:rounded-box"
              />
            ))}
          </div>
          {showBike && (
            <div className="flex flex-col gap-3">
              <SelectedProductRow
                eyebrow={T.bikeToTry}
                title={bikeLabel ?? "Elegí el modelo (opcional)"}
                image={bike?.image}
                action={
                  <button
                    type="button"
                    onClick={() => setPicking((p) => !p)}
                    aria-expanded={picking}
                    className="text-[14px] font-bold text-yellow underline underline-offset-2 hover:text-brand-hover"
                  >
                    {picking ? "Listo" : bike ? T.change : "Elegir"}
                  </button>
                }
              />
              {picking && (
                <BikePicker
                  bikes={bikes}
                  selected={bikeSlug}
                  onSelect={(slug) => {
                    setBikeSlug(slug);
                    const b = bikes.find((x) => x.slug === slug);
                    setVariantId(b && b.variants.length === 1 ? b.variants[0].id : null);
                  }}
                />
              )}
              {bike && sizeOptions.length > 1 && (picking || !variant) && (
                <SizeSelector
                  name="variant"
                  label="Talle a probar"
                  options={sizeOptions}
                  value={variant?.size ?? ""}
                  onChange={pickSize}
                />
              )}
            </div>
          )}
        </section>

        {/* 2 · Día + 3 · Horario */}
        <SlotPicker
          timeZone={data.timeZone}
          maxDaysAhead={data.maxDaysAhead}
          value={slot}
          onChange={setSlot}
          refreshKey={refreshKey}
          dayLabel={stepLabel(T.step2, T.step2Mobile)}
          timeLabel={stepLabel(T.step3, T.step3Mobile)}
          calendarNote={T.calendarNote}
          morningLabel={T.morning}
          afternoonLabel={T.afternoon}
        />

        {/* 4 · Tus datos (también en mobile) */}
        <section className="flex flex-col gap-[10px] md:gap-[14px]">
          {stepLabel(T.step4)}
          {account === undefined ? (
            <p className="m-0 text-[14px] text-text-3">Cargando…</p>
          ) : account ? (
            <p className="m-0 text-[15px] leading-normal text-text-2">
              Reservás con tu cuenta: <strong className="text-paper">{account.name}</strong>
              {account.phone && <> · WhatsApp {formatArPhone(account.phone)}</>}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-[10px] md:grid-cols-3 md:gap-3">
              <div className="flex flex-col gap-1">
                <Input
                  surface="page"
                  size="lg"
                  aria-label="Nombre y apellido"
                  placeholder="Nombre y apellido"
                  autoComplete="name"
                  value={name}
                  invalid={!!errors.name}
                  onChange={(e) => setName(e.target.value)}
                />
                {fieldError(errors.name)}
              </div>
              <div className="flex flex-col gap-1">
                <Input
                  surface="page"
                  size="lg"
                  aria-label="WhatsApp"
                  placeholder="WhatsApp"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  value={phone}
                  invalid={!!errors.phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                {fieldError(errors.phone)}
              </div>
              <div className="flex flex-col gap-1">
                <Input
                  surface="page"
                  size="lg"
                  aria-label="Email (opcional)"
                  placeholder="Email (opcional)"
                  type="email"
                  autoComplete="email"
                  value={email}
                  invalid={!!errors.email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {fieldError(errors.email)}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Resumen amarillo */}
      <Panel
        as="aside"
        surface="yellow"
        padding="lg"
        gap="none"
        className="gap-[10px] max-md:rounded-box md:gap-5 lg:sticky lg:top-6"
      >
        <Eyebrow tone="inherit" size="md" className="max-md:hidden">
          {T.summaryTitle}
        </Eyebrow>
        <Display size="h2" as="p" className="max-md:text-[30px]">
          {service?.summaryName}
        </Display>
        <p className="m-0 text-[16px] font-bold md:hidden">
          {dayText} · {timeText}
        </p>
        <p className="m-0 text-[14px] md:hidden">
          {fill(T.durationValue, service?.durationMin ?? 30)} · {data.address}
        </p>
        <SummaryRows
          tone="yellow"
          className="max-md:hidden"
          rows={[
            { label: T.summary.day, value: dayText },
            { label: T.summary.time, value: timeText },
            ...(showBike && bikeLabel ? [{ label: "Bici", value: bikeLabel }] : []),
            { label: T.summary.duration, value: fill(T.durationValue, service?.durationMin ?? 30) },
            { label: T.summary.where, value: data.address },
          ]}
        />
        {formError && (
          <p role="alert" className="m-0 rounded-btn bg-ink px-3 py-2 text-[14px] font-semibold text-red-light">
            {formError}
          </p>
        )}
        <Button
          variant="ink"
          size="full-lg"
          disabled={!ready || submitting}
          onClick={confirm}
          className="mt-1 md:mt-0"
        >
          {submitting ? "Reservando…" : T.cta}
        </Button>
        {!ready && !submitting && (
          <p className="m-0 text-[13px] leading-[1.4] md:text-[14px]">
            {!slot.time
              ? "Elegí día y horario para confirmar."
              : "Completá tu nombre y WhatsApp para confirmar."}
          </p>
        )}
        <p className="m-0 text-[14px] leading-[1.45] max-md:hidden">{T.note}</p>
      </Panel>
    </div>
  );
}

function BikePicker({
  bikes,
  selected,
  onSelect,
}: {
  bikes: TestRideBike[];
  selected: string | null;
  onSelect: (slug: string) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Bici a probar"
      className="flex max-h-[320px] flex-col gap-[6px] overflow-y-auto rounded-card border border-line p-2"
    >
      {bikes.map((b) => (
        <label
          key={b.slug}
          className={cx(
            "flex cursor-pointer items-center gap-3 rounded-btn border-[1.5px] p-2 transition-colors duration-150",
            "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-yellow",
            selected === b.slug ? "border-yellow bg-yellow/8" : "border-transparent hover:bg-surface",
          )}
        >
          <input
            type="radio"
            name="bike"
            className="sr-only"
            checked={selected === b.slug}
            onChange={() => onSelect(b.slug)}
          />
          {b.image ? (
            // eslint-disable-next-line @next/next/no-img-element -- miniatura de Cloudinary
            <img src={b.image} alt="" className="h-[42px] w-[56px] flex-none rounded-tag bg-card-photo object-cover" />
          ) : (
            <span aria-hidden className="h-[42px] w-[56px] flex-none rounded-tag bg-surface-3" />
          )}
          <span className="text-[15px] font-bold">{b.name}</span>
        </label>
      ))}
    </div>
  );
}

function BookingSuccess({ booked, account, address }: { booked: Booked; account: Account; address: string }) {
  const manageHref = `${paths.appointments()}/${booked.number}?t=${encodeURIComponent(booked.manageToken)}`;
  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-10">
      <div className="flex min-w-0 flex-col gap-4 md:gap-5" role="status">
        <Eyebrow tone="yellow" size="lg" className="max-md:text-[12px]">
          Turno #{booked.number}
        </Eyebrow>
        <Display size="section" as="h2">
          {booked.confirmed ? "¡Listo, te esperamos!" : "¡Listo, lo recibimos!"}
        </Display>
        <p className="m-0 max-w-[620px] text-[16px] leading-normal text-text-2 md:text-[18px]">
          {booked.confirmed
            ? "Tu turno quedó reservado. No pagás nada online: si comprás, lo resolvés en el local."
            : "Te escribimos por WhatsApp para confirmarlo. No pagás nada online."}{" "}
          {account
            ? "Lo vas a ver en tu cuenta, y desde ahí podés reprogramarlo o cancelarlo."
            : "Guardá el link de abajo: con él podés reprogramarlo o cancelarlo."}
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          {account ? (
            <Button href={paths.account()} variant="primary" size="lg" className="max-md:w-full">
              Ver en Mi cuenta
            </Button>
          ) : (
            <Button href={manageHref} variant="primary" size="lg" className="max-md:w-full">
              Reprogramar o cancelar
            </Button>
          )}
          <Button href={paths.catalog()} variant="secondary" size="lg" className="max-md:w-full">
            Seguir mirando
          </Button>
        </div>
      </div>
      <Panel surface="yellow" padding="lg" gap="none" className="gap-[14px] max-md:rounded-box md:gap-5">
        <Eyebrow tone="inherit" size="md">
          {T.summaryTitle}
        </Eyebrow>
        <Display size="h2" as="p" className="max-md:text-[30px]">
          {booked.serviceName}
        </Display>
        <SummaryRows
          tone="yellow"
          rows={[
            { label: T.summary.day, value: booked.dayText },
            { label: T.summary.time, value: `${booked.time} hs` },
            ...(booked.bikeLabel ? [{ label: "Bici", value: booked.bikeLabel }] : []),
            { label: T.summary.where, value: address },
          ]}
        />
      </Panel>
    </div>
  );
}
