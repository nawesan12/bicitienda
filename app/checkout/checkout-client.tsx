"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Bolt } from "@/components/store/bolt";
import {
  darkField,
  darkLabel,
  darkPanel,
  radioDot,
} from "@/components/store/form-styles";
import { useCart } from "@/lib/cart-store";
import type { CartProduct } from "@/lib/cart-view";
import { lexicon } from "@/lib/data/content";
import { formatARS } from "@/lib/format";
import { img } from "@/lib/images";
import { paths } from "@/lib/paths";
import {
  surchargePct,
  type Installments,
  type PricingRates,
} from "@/lib/pricing";
import { placeOrder } from "@/lib/server/actions/checkout";
import type {
  DeliveryMethodId,
  PaymentMethodId,
  PaymentMode,
} from "@/lib/types";

const t = lexicon.commerce.checkout;

/**
 * Checkout con el lenguaje del handoff: los tres pasos (datos → entrega →
 * pago) en la tarjeta oscura con grilla del formulario de Reparaciones, y
 * el resumen en una tarjeta blanca sticky. Con tarjeta, las cuotas se
 * eligen en la caja de precio de la ficha (6 cuotas MiPyME en negro,
 * 3 en crema, 1 pago) mostrando el recargo r3/r6 de cada plan.
 *
 * Los totales de acá son informativos: el cobro real se recalcula
 * server-side en createOrder (computeTotals) con la misma cuenta.
 */

interface DeliveryOption {
  id: DeliveryMethodId;
  name: string;
  detail: string;
  cost: number | null;
  isPickup: boolean;
}

interface PaymentOption {
  id: PaymentMethodId;
  name: string;
  detail: string;
  pickupOnly: boolean;
  /** Se cobra por una pasarela (Payway/MP): redirige a pagar. */
  online: boolean;
  allowsInstallments: boolean;
  allowsDeposit: boolean;
  transferDiscount: boolean;
}

interface PickupLocation {
  id: string;
  name: string;
  shortName: string;
  address: string;
  hours: string;
}

/** Orden de la caja de precio de la ficha: 6, 3 y después 1 pago. */
const PLANS: Installments[] = [6, 3, 1];

/** Campos de texto que valida el cliente antes de llamar a placeOrder. */
type Field = "name" | "email" | "phone" | "address";

function optionShell(selected: boolean): string {
  return `overflow-hidden rounded-[14px] border-[1.5px] transition-colors ${
    selected
      ? "border-brand bg-[rgba(94,184,56,.08)]"
      : "border-white/[.18] hover:border-brand"
  }`;
}

const optionHead =
  "flex w-full items-start gap-[14px] px-[18px] py-[15px] text-left font-sans text-[14.5px] font-semibold text-cream disabled:cursor-not-allowed disabled:opacity-40";

function Dot({ on }: { on: boolean }) {
  return (
    <span className={radioDot(on)}>
      {on && <span className="h-2 w-2 rounded-full bg-brand" />}
    </span>
  );
}

function Step({
  n,
  label,
  children,
}: {
  n: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="flex items-center gap-3 p-0">
        <span className="font-display flex h-8 w-8 items-center justify-center rounded-full bg-brand text-[13px] tracking-normal text-night">
          {n}
        </span>
        <span className="font-sans text-[11px] font-bold tracking-[.26em] text-brand">
          {label}
        </span>
      </legend>
      <div className="mt-[18px]">{children}</div>
    </fieldset>
  );
}

export function CheckoutClient({
  products,
  rates,
  depositMinTotal,
  transferAlias,
  reservationHours,
  pickupLocations,
  deliveryOptions,
  paymentOptions,
}: {
  products: CartProduct[];
  rates: PricingRates;
  /** Total desde el cual se ofrece reservar con seña (Ajustes). */
  depositMinTotal: number;
  /** Alias para transferir (Ajustes). */
  transferAlias: string;
  /** Horas que se reserva un pedido en efectivo. */
  reservationHours: number;
  /** Sucursales activas; con más de una aparece el selector de retiro. */
  pickupLocations: PickupLocation[];
  deliveryOptions: DeliveryOption[];
  paymentOptions: PaymentOption[];
}) {
  const router = useRouter();
  const { items, hydrated, clear } = useCart();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [delivery, setDelivery] = useState<DeliveryMethodId>("retiro");
  const [pickupLocationId, setPickupLocationId] = useState(
    pickupLocations[0]?.id ?? "",
  );
  // Por defecto, la pasarela online habilitada (Payway en Rodar).
  const defaultPayment =
    paymentOptions.find((p) => p.online)?.id ?? paymentOptions[0]?.id;
  const [payment, setPayment] = useState<PaymentMethodId>(defaultPayment);
  const [mode, setMode] = useState<PaymentMode>("total");
  const [installments, setInstallments] = useState<Installments>(1);
  const [error, setError] = useState<string | null>(null);
  const [invalid, setInvalid] = useState<Field | null>(null);
  const fieldClass = (f: Field) =>
    invalid === f ? `${darkField} !border-danger` : darkField;
  const [pending, startTransition] = useTransition();

  const bySlug = useMemo(
    () => new Map(products.map((p) => [p.slug, p])),
    [products],
  );
  const lines = items
    .map((item) => ({ item, product: bySlug.get(item.productSlug) }))
    .filter((l) => l.product) as {
    item: { productSlug: string; quantity: number };
    product: CartProduct;
  }[];

  const subtotal = lines.reduce(
    (sum, l) => sum + l.product.price * l.item.quantity,
    0,
  );
  const selectedDelivery = deliveryOptions.find((d) => d.id === delivery)!;
  const shippingCost = selectedDelivery.cost ?? 0;
  const shippingPending = selectedDelivery.cost === null;
  const selectedPayment = paymentOptions.find((p) => p.id === payment);
  const discount = selectedPayment?.transferDiscount
    ? // Misma cuenta que transferPrice() (lib/pricing.ts): dto en %.
      subtotal - Math.round(subtotal * (1 - rates.transferDiscount / 100))
    : 0;
  const base = subtotal - discount + shippingCost;

  // Seña: solo online y por encima del umbral de Ajustes (sobre el total
  // en un pago). El monto de acá es informativo — el real se recalcula
  // server-side con la misma cuenta (computeTotals).
  const depositOffered =
    !!selectedPayment?.allowsDeposit && base >= depositMinTotal;
  const deposit = Math.round((base * rates.depositRate) / 1000) * 1000;
  const useDeposit = depositOffered && mode === "sena";
  const depositPct = Math.round(rates.depositRate * 100);

  // Cuotas MiPyME (3 o 6, con recargo r3/r6): solo pagando el total online.
  const installmentsOffered =
    !!selectedPayment?.allowsInstallments && !useDeposit;
  const n: Installments = installmentsOffered ? installments : 1;
  const surcharge = Math.round((base * surchargePct(rates, n)) / 100);
  const total = base + surcharge;

  // El efectivo exige retiro: si cambia la entrega, se corrige el pago.
  function pickDelivery(id: DeliveryMethodId) {
    setDelivery(id);
    const opt = deliveryOptions.find((d) => d.id === id);
    if (!opt?.isPickup && paymentOptions.find((p) => p.id === payment)?.pickupOnly)
      setPayment(defaultPayment);
  }

  // Disponibilidad del carrito completo por sucursal, para el selector de
  // retiro. Informativa: la validación real es server-side al confirmar.
  const pickupAvailability = pickupLocations.map((loc) => {
    const missing = lines
      .filter(
        (l) => (l.product.stockByLocation?.[loc.id] ?? 0) < l.item.quantity,
      )
      .map((l) => l.product.name);
    return { loc, ok: missing.length === 0, missing };
  });

  const multiPickup = pickupLocations.length > 1;
  const selectedPickup = pickupAvailability.find(
    (a) => a.loc.id === pickupLocationId,
  );

  /**
   * Chequeo previo en el cliente con los mismos criterios y mensajes que
   * placeOrder (que igual revalida todo): un error de tipeo no gasta una
   * invocación de la server action y el campo queda marcado y enfocado.
   */
  function firstInvalid(): { field: Field; message: string } | null {
    if (name.trim().length < 2) return { field: "name", message: "Completá tu nombre." };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return { field: "email", message: "Revisá el email." };
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 15)
      return { field: "phone", message: "Revisá el teléfono." };
    if (delivery === "envio-mdq" && !address.trim())
      return { field: "address", message: "Completá la dirección de entrega." };
    return null;
  }

  function submit() {
    setError(null);
    setInvalid(null);
    const bad = firstInvalid();
    if (bad) {
      setInvalid(bad.field);
      setError(bad.message);
      // Centrado: con focus() solo, el campo queda tapado por el nav fijo.
      const el = document.getElementById(`co-${bad.field}`);
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
      el?.focus({ preventScroll: true });
      return;
    }
    if (delivery === "retiro" && multiPickup && !selectedPickup?.ok) {
      setError(t.pickupError);
      return;
    }
    startTransition(async () => {
      const result = await placeOrder({
        items: lines.map((l) => ({
          productSlug: l.item.productSlug,
          quantity: l.item.quantity,
        })),
        name,
        email,
        phone,
        deliveryMethod: delivery,
        deliveryAddress: address,
        deliveryNotes: notes,
        paymentMethod: payment,
        pickupLocationId:
          delivery === "retiro" ? pickupLocationId : undefined,
        paymentMode: useDeposit ? "sena" : "total",
        installments: n,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      clear();
      if (result.redirect.startsWith("http")) {
        window.location.assign(result.redirect);
      } else {
        router.push(result.redirect);
      }
    });
  }

  if (hydrated && lines.length === 0) {
    return (
      <section className="animate-fade-in flex min-h-[70vh] items-center justify-center bg-cream px-[clamp(16px,4vw,40px)] py-16">
        <div className="flex max-w-[420px] flex-col items-center text-center">
          <span className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-night">
            <Bolt width={20} height={27} stroke="#5eb838" strokeWidth={1.6} />
          </span>
          <h1 className="font-display mb-0 mt-6 text-[clamp(30px,3.6vw,42px)] leading-[1.05] text-ink">
            {t.emptyTitle}
          </h1>
          <p className="mb-0 mt-3 font-sans text-[14.5px] leading-[1.6] text-ink/55">
            {t.emptyBody}
          </p>
          <Link
            href={paths.catalog()}
            className="mt-6 rounded-full bg-ink px-7 py-[15px] font-sans text-[15px] font-bold text-cream hover:bg-brand hover:text-night"
          >
            {t.emptyCta}
          </Link>
        </div>
      </section>
    );
  }

  const costLabel = (cost: number | null) =>
    cost === null ? t.toQuote : cost === 0 ? t.free : formatARS(cost);

  return (
    <section className="animate-fade-in box-content min-h-screen bg-cream px-[clamp(16px,4vw,40px)] pb-[90px] pt-[34px]">
      <div className="mx-auto max-w-content">
        <Link
          href={paths.catalog()}
          className="hit relative font-sans text-[13px] font-bold text-ink/55 hover:text-ink"
        >
          {t.back}
        </Link>
        <div className="mt-6 font-sans text-[11px] font-bold tracking-[.26em] text-brand-deep">
          {t.kicker}
        </div>
        <h1 className="font-display mb-0 mt-2 text-[clamp(34px,4.4vw,56px)] leading-[1.02] text-ink">
          {t.title}
        </h1>
        <p className="mb-0 mt-3 max-w-[52ch] font-sans text-[15px] leading-[1.6] text-ink/60">
          {t.sub}
        </p>

        <div className="mt-8 grid items-start gap-[clamp(20px,3vw,36px)] min-[960px]:grid-cols-[minmax(0,1fr)_400px]">
          {/* ── Pasos ───────────────────────────────────────── */}
          <div className={`${darkPanel} flex min-w-0 flex-col gap-8`}>
            <Step n="1" label={t.stepData}>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-x-3 gap-y-[18px]">
                <label className="col-span-full">
                  <span className={darkLabel}>{t.name}</span>
                  <input
                    id="co-name"
                    aria-invalid={invalid === "name" || undefined}
                    className={fieldClass("name")}
                    placeholder={t.namePh}
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (invalid === "name") setInvalid(null);
                    }}
                    autoComplete="name"
                  />
                  {invalid === "name" && error && (
                    <span role="alert" className="mt-[6px] block font-sans text-[12px] font-semibold text-[#ff8f8f]">
                      {error}
                    </span>
                  )}
                </label>
                <label>
                  <span className={darkLabel}>{t.email}</span>
                  <input
                    id="co-email"
                    aria-invalid={invalid === "email" || undefined}
                    className={fieldClass("email")}
                    placeholder={t.emailPh}
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (invalid === "email") setInvalid(null);
                    }}
                    autoComplete="email"
                  />
                  {invalid === "email" && error && (
                    <span role="alert" className="mt-[6px] block font-sans text-[12px] font-semibold text-[#ff8f8f]">
                      {error}
                    </span>
                  )}
                </label>
                <label>
                  <span className={darkLabel}>{t.phone}</span>
                  <input
                    id="co-phone"
                    aria-invalid={invalid === "phone" || undefined}
                    className={fieldClass("phone")}
                    placeholder={t.phonePh}
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (invalid === "phone") setInvalid(null);
                    }}
                    autoComplete="tel"
                  />
                  {invalid === "phone" && error && (
                    <span role="alert" className="mt-[6px] block font-sans text-[12px] font-semibold text-[#ff8f8f]">
                      {error}
                    </span>
                  )}
                </label>
              </div>
            </Step>

            <div className="h-px bg-white/10" />

            <Step n="2" label={t.stepDelivery}>
              <div className="flex flex-col gap-[10px]">
                {deliveryOptions.map((d) => {
                  const on = delivery === d.id;
                  return (
                    <div key={d.id} className={optionShell(on)}>
                      <button
                        type="button"
                        aria-pressed={on}
                        onClick={() => pickDelivery(d.id)}
                        className={optionHead}
                      >
                        <Dot on={on} />
                        <span className="min-w-0 flex-1">
                          {d.name}
                          <span className="mt-[3px] block text-[12.5px] font-normal leading-[1.45] text-cream/55">
                            {d.detail}
                          </span>
                        </span>
                        <span className="whitespace-nowrap font-bold text-brand">
                          {costLabel(d.cost)}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>

              {delivery === "retiro" && multiPickup && (
                <div className="mt-[18px]">
                  <div className={darkLabel}>{t.pickupWhere}</div>
                  <div className="mt-2 flex flex-col gap-2">
                    {pickupAvailability.map(({ loc, ok, missing }) => {
                      const on = pickupLocationId === loc.id && ok;
                      return (
                        <div key={loc.id} className={optionShell(on)}>
                          <button
                            type="button"
                            disabled={!ok}
                            aria-pressed={on}
                            onClick={() => setPickupLocationId(loc.id)}
                            className={optionHead}
                          >
                            <Dot on={on} />
                            <span className="min-w-0 flex-1">
                              {loc.name}
                              <span className="mt-[3px] block text-[12.5px] font-normal text-cream/55">
                                {ok
                                  ? `${loc.address} · ${loc.hours}`
                                  : t.pickupMissing(missing.join(", "))}
                              </span>
                            </span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {delivery !== "retiro" && (
                <label className="mt-[18px] block">
                  <span className={darkLabel}>{t.address}</span>
                  <input
                    id="co-address"
                    aria-invalid={invalid === "address" || undefined}
                    className={fieldClass("address")}
                    placeholder={
                      delivery === "envio-mdq"
                        ? t.addressLocalPh
                        : t.addressCountryPh
                    }
                    value={address}
                    onChange={(e) => {
                      setAddress(e.target.value);
                      if (invalid === "address") setInvalid(null);
                    }}
                    autoComplete="street-address"
                  />
                  {invalid === "address" && error && (
                    <span role="alert" className="mt-[6px] block font-sans text-[12px] font-semibold text-[#ff8f8f]">
                      {error}
                    </span>
                  )}
                </label>
              )}

              <label className="mt-[18px] block">
                <span className={darkLabel}>{t.notes}</span>
                <textarea
                  rows={2}
                  className={`${darkField} resize-y leading-[1.55]`}
                  placeholder={t.notesPh}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </label>
            </Step>

            <div className="h-px bg-white/10" />

            <Step n="3" label={t.stepPayment}>
              <div className="flex flex-col gap-[10px]">
                {paymentOptions.map((p) => {
                  const disabled = p.pickupOnly && !selectedDelivery.isPickup;
                  const on = payment === p.id && !disabled;
                  return (
                    <div key={p.id} className={optionShell(on)}>
                      <button
                        type="button"
                        disabled={disabled}
                        aria-pressed={on}
                        onClick={() => setPayment(p.id)}
                        className={optionHead}
                      >
                        <Dot on={on} />
                        <span className="min-w-0 flex-1">
                          {p.name}
                          <span className="mt-[3px] block text-[12.5px] font-normal leading-[1.45] text-cream/55">
                            {p.transferDiscount
                              ? t.transferBody
                              : p.pickupOnly
                                ? disabled && t.cashPickupOnly
                                  ? t.cashPickupOnly
                                  : t.cashBody(reservationHours)
                                : p.detail}
                          </span>
                        </span>
                        {p.transferDiscount && (
                          <span className="flex-none rounded-full bg-brand px-[9px] py-1 font-sans text-[11px] font-bold tracking-[.1em] text-night">
                            −{rates.transferDiscount}%
                          </span>
                        )}
                      </button>

                      {on && p.allowsInstallments && (
                        <div className="px-[clamp(10px,2vw,18px)] pb-[18px]">
                          {depositOffered && (
                            <div className="mb-3">
                              <div className={darkLabel}>{t.depositKicker}</div>
                              <div className="mt-2 grid grid-cols-2 gap-2">
                                {(
                                  [
                                    ["total", t.payTotal, formatARS(base)],
                                    ["sena", t.payDeposit(depositPct), formatARS(deposit)],
                                  ] as const
                                ).map(([m, label, amount]) => (
                                  <button
                                    key={m}
                                    type="button"
                                    aria-pressed={mode === m}
                                    onClick={() => setMode(m)}
                                    className={`rounded-2xl border-[1.5px] px-3 py-[11px] text-left font-sans text-[13px] font-bold leading-[1.3] ${
                                      mode === m
                                        ? "border-brand bg-brand text-night"
                                        : "border-white/20 text-cream/80 hover:border-brand"
                                    }`}
                                  >
                                    {label}
                                    <span className="font-display mt-[2px] block text-[15px] font-extrabold tracking-normal">
                                      {amount}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {useDeposit ? (
                            <div className="rounded-[18px] bg-white px-[18px] py-4 text-ink">
                              <div className="font-display text-[20px] font-extrabold tracking-normal">
                                {t.depositPlan(formatARS(deposit))}
                              </div>
                              <div className="mt-[6px] font-sans text-[12px] leading-[1.5] text-ink/55">
                                {t.depositNote}
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-[18px] bg-white p-[clamp(12px,2vw,16px)] text-ink">
                              <div className="font-sans text-[10px] font-bold tracking-[.14em] text-ink/55">
                                {t.planKicker}
                              </div>
                              <div className="mt-[10px] grid gap-2 min-[520px]:grid-cols-3">
                                {PLANS.map((k) => {
                                  const pct = surchargePct(rates, k);
                                  const kTotal = Math.round(base * (1 + pct / 100));
                                  const sel = n === k;
                                  const tone =
                                    k === 6
                                      ? "bg-night text-cream"
                                      : k === 3
                                        ? "bg-chip text-ink"
                                        : "bg-cream-3 text-ink border border-ink/10";
                                  return (
                                    <button
                                      key={k}
                                      type="button"
                                      aria-pressed={sel}
                                      onClick={() => setInstallments(k)}
                                      className={`relative rounded-xl px-[14px] py-[11px] text-left transition-shadow ${tone} ${
                                        sel
                                          ? "ring-2 ring-brand ring-offset-2 ring-offset-white"
                                          : "hover:ring-1 hover:ring-ink/20"
                                      }`}
                                    >
                                      {sel && (
                                        <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand font-sans text-[11px] font-bold text-night">
                                          ✓
                                        </span>
                                      )}
                                      <span
                                        className={`block font-sans text-[10px] font-bold tracking-[.14em] ${
                                          k === 6 ? "text-cream/60" : "text-ink/55"
                                        }`}
                                      >
                                        {k === 6 ? t.plan6 : k === 3 ? t.plan3 : t.plan1}
                                      </span>
                                      <span
                                        className={`font-display mt-[3px] block text-[17px] font-extrabold tracking-normal ${
                                          k === 6 ? "text-brand" : ""
                                        }`}
                                      >
                                        {formatARS(Math.round(kTotal / k))}
                                        {k > 1 && (
                                          <span className="ml-1 font-sans text-[11px] font-semibold opacity-60">
                                            {t.planEach}
                                          </span>
                                        )}
                                      </span>
                                      <span
                                        className={`mt-[3px] block font-sans text-[11px] leading-[1.4] ${
                                          k === 6 ? "text-cream/55" : "text-ink/50"
                                        }`}
                                      >
                                        {pct > 0 ? t.planSurcharge(pct) : t.planNoSurcharge}
                                        {k > 1 && <> · {t.planTotal(formatARS(kTotal))}</>}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                              <div className="mt-[10px] font-sans text-[11.5px] text-ink/50">
                                {t.planNote}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {on && p.transferDiscount && (
                        <div className="px-[clamp(10px,2vw,18px)] pb-[18px]">
                          <div className="rounded-xl bg-brand-pastel px-[18px] py-[14px] text-brand-deeper">
                            <div className="font-sans text-[10px] font-bold tracking-[.14em]">
                              {t.transferKicker}
                            </div>
                            <div className="font-display mt-1 break-all text-[22px] font-extrabold tracking-normal text-night">
                              {transferAlias}
                            </div>
                            <div className="mt-1 font-sans text-[12.5px] font-semibold">
                              {t.transferLine(rates.transferDiscount)} ·{" "}
                              {formatARS(total)}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Step>
          </div>

          {/* ── Resumen ─────────────────────────────────────── */}
          <aside className="min-w-0 rounded-[24px] border border-ink/[.12] bg-white p-[clamp(20px,3vw,28px)] min-[960px]:sticky min-[960px]:top-24">
            <div className="font-sans text-[11px] font-bold tracking-[.26em] text-ink/50">
              {t.summaryKicker}
            </div>
            <div className="mt-4 flex flex-col gap-3">
              {lines.map((l) => (
                <div key={l.item.productSlug} className="flex items-center gap-3">
                  <div className="relative aspect-[4/3] w-[64px] flex-none overflow-hidden rounded-[10px] bg-cream-4">
                    {l.product.image && (
                      // eslint-disable-next-line @next/next/no-img-element -- Cloudinary transforma (img())
                      <img
                        src={img(l.product.image, { w: 140 })}
                        alt=""
                        className="absolute inset-1 block h-[calc(100%-8px)] w-[calc(100%-8px)] object-contain mix-blend-multiply"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-[14px] leading-[1.2] text-ink">
                      {l.product.name}
                    </div>
                    <div className="mt-[2px] font-sans text-[12px] text-ink/50">
                      {l.item.quantity} × {formatARS(l.product.price)}
                    </div>
                  </div>
                  <div className="whitespace-nowrap font-sans text-[13.5px] font-bold text-ink">
                    {formatARS(l.product.price * l.item.quantity)}
                  </div>
                </div>
              ))}
            </div>

            <div className="my-[18px] h-px bg-ink/10" />
            <div className="flex flex-col gap-[7px] font-sans text-[13.5px] text-ink/65">
              <div className="flex justify-between gap-3">
                <span>{t.subtotal}</span>
                <span className="font-semibold text-ink">{formatARS(subtotal)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>{t.shipping}</span>
                <span
                  className={`text-right font-semibold ${
                    !shippingPending && shippingCost === 0
                      ? "text-brand-deep"
                      : "text-ink"
                  }`}
                >
                  {shippingPending
                    ? t.shippingPending
                    : shippingCost === 0
                      ? t.free
                      : formatARS(shippingCost)}
                </span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between gap-3 font-semibold text-brand-deep">
                  <span>{t.transferLine(rates.transferDiscount)}</span>
                  <span>−{formatARS(discount)}</span>
                </div>
              )}
              {surcharge > 0 && (
                <div className="flex justify-between gap-3">
                  <span>{t.surchargeLine(n, surchargePct(rates, n))}</span>
                  <span className="font-semibold text-ink">+{formatARS(surcharge)}</span>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-baseline justify-between gap-3">
              <span className="font-sans text-[11px] font-bold tracking-[.22em] text-ink/50">
                {t.total.toUpperCase()}
              </span>
              <span className="font-display text-[34px] font-extrabold leading-none tracking-normal text-ink">
                {formatARS(total)}
              </span>
            </div>

            {n > 1 && (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-night px-[14px] py-[11px]">
                <span className="font-sans text-[10px] font-bold tracking-[.14em] text-cream/60">
                  {t.installmentsOf(n).toUpperCase()}
                </span>
                <span className="font-display text-[17px] font-extrabold tracking-normal text-brand">
                  {formatARS(Math.round(total / n))}
                </span>
              </div>
            )}
            {useDeposit && (
              <div className="mt-3 rounded-xl bg-brand-pastel px-[14px] py-[11px] text-brand-deeper">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-sans text-[10px] font-bold tracking-[.14em]">
                    {t.payNow(depositPct).toUpperCase()}
                  </span>
                  <span className="font-display text-[17px] font-extrabold tracking-normal">
                    {formatARS(deposit)}
                  </span>
                </div>
                <div className="mt-1 flex justify-between gap-3 font-sans text-[12px] font-semibold">
                  <span>{t.balanceLater}</span>
                  <span>{formatARS(total - deposit)}</span>
                </div>
              </div>
            )}
            {shippingPending && (
              <div className="mt-2 font-sans text-[11.5px] text-ink/45">
                {t.shippingNote}
              </div>
            )}

            <button
              type="button"
              disabled={pending || !hydrated}
              onClick={submit}
              className="mt-5 w-full rounded-full bg-ink p-4 font-sans text-[15px] font-bold text-cream hover:bg-brand hover:text-night disabled:cursor-wait disabled:opacity-60"
            >
              {pending
                ? t.submitPending
                : useDeposit
                  ? t.submitDeposit
                  : selectedPayment?.online
                    ? t.submitOnline
                    : t.submitOffline}
            </button>
            {error && (
              <div
                role="alert"
                className="mt-3 rounded-xl bg-danger-bg px-4 py-3 font-sans text-[13px] font-semibold text-danger"
              >
                {error}
              </div>
            )}
            {selectedPayment?.online && (
              <div className="mt-3 text-center font-sans text-[11.5px] leading-[1.5] text-ink/45">
                {t.secure}
              </div>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}
