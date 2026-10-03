"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Button, TextLink } from "@/components/bt/button";
import { EmptyState } from "@/components/bt/empty-state";
import { Input } from "@/components/bt/field";
import { RadioCard } from "@/components/bt/option-card";
import { Panel } from "@/components/bt/panel";
import { Display, Eyebrow } from "@/components/bt/typography";
import { formatMoney } from "@/components/bt/format";
import { CalloutLink, CartLine, InfoBox, SummaryRow, SummaryRows, SummaryTotal } from "@/components/bt";
import { cartLineKey, useCart } from "@/lib/cart-store";
import { COPY } from "@/lib/data/demo/copy";
import { fillTemplate } from "@/lib/data/demo/format";
import { isValidArPhone } from "@/lib/phone";
import { getMyAccount } from "@/lib/server/actions/account";
import { placeOrder } from "@/lib/server/actions/checkout";
import type { CartCatalogItem } from "@/lib/server/screens/compra-b";
import type { PaymentMethodId } from "@/lib/types";
import { BUY } from "./_lib/copy";

const C = COPY.cart;
const B = BUY.cart;

export interface CartPayment {
  id: PaymentMethodId;
  name: string;
  description: string;
  /** Plantilla de la nota bajo el total ({monto} = lo que ahorra por transferencia). */
  note: string;
  cta: string;
  transferDiscount: boolean;
}

type FieldKey = "name" | "phone" | "email";

/**
 * 2d / 4d · Carrito con pago integrado. Los totales son informativos: el
 * cobro real (precios, stock, descuento) se recalcula en placeOrder.
 * Las cuotas de Mercado Pago se eligen en Mercado Pago (installments 1).
 */
export function CheckoutClient({
  catalog,
  payments,
  transferDiscountPct,
  pickupLocationId,
  pickup,
  hrefs,
}: {
  catalog: CartCatalogItem[];
  payments: CartPayment[];
  transferDiscountPct: number;
  pickupLocationId?: string;
  pickup: { title: string; place: string; note: string };
  hrefs: { catalog: string; bikes: string; appointments: string };
}) {
  const router = useRouter();
  const { items, hydrated, setQty, remove, clear } = useCart();
  const [payment, setPayment] = useState<PaymentMethodId | undefined>(
    (payments.find((p) => p.id === "mercadopago") ?? payments[0])?.id,
  );
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [logged, setLogged] = useState(false);
  const [invalid, setInvalid] = useState<FieldKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Con sesión: prellena nombre, WhatsApp y email de la cuenta.
  useEffect(() => {
    let alive = true;
    getMyAccount()
      .then((a) => {
        if (!alive || !a) return;
        setLogged(true);
        setName((v) => v || a.name || "");
        setPhone((v) => v || a.phone || "");
        setEmail((v) => v || a.email || "");
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const bySlug = useMemo(() => new Map(catalog.map((p) => [p.slug, p])), [catalog]);

  const lines = items.map((item) => {
    const product = bySlug.get(item.productSlug);
    const variant = product
      ? item.variantId
        ? product.variants.find((v) => v.id === item.variantId)
        : product.variants.length === 1
          ? product.variants[0]
          : undefined
      : undefined;
    const available = product ? (variant ? variant.stock : product.stock) : 0;
    let warning: string | undefined;
    if (!product || (item.variantId && !variant)) warning = B.stock.gone;
    else if (available <= 0) warning = B.stock.none;
    else if (item.quantity > available) warning = B.stock.few(available);
    return { item, product, variant, available, warning };
  });
  const blocked = lines.some((l) => l.warning);

  const subtotal = lines.reduce((sum, l) => sum + (l.product ? l.product.price * l.item.quantity : 0), 0);
  const selected = payments.find((p) => p.id === payment);
  const discount = selected?.transferDiscount
    ? subtotal - Math.round(subtotal * (1 - transferDiscountPct / 100))
    : 0;
  const total = subtotal - discount;
  const note = selected
    ? fillTemplate(selected.note, { monto: formatMoney(discount) })
    : "";

  function firstInvalid(): { field: FieldKey; message: string } | null {
    if (name.trim().length < 2) return { field: "name", message: B.errors.name };
    if (!isValidArPhone(phone)) return { field: "phone", message: B.errors.phone };
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return { field: "email", message: B.errors.email };
    return null;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInvalid(null);
    if (!payment) return setError(B.errors.noPayment);
    if (blocked) return setError(B.stock.blocked);
    const bad = firstInvalid();
    if (bad) {
      setInvalid(bad.field);
      setError(bad.message);
      const el = document.getElementById(`co-${bad.field}`);
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
      el?.focus({ preventScroll: true });
      return;
    }
    startTransition(async () => {
      const result = await placeOrder({
        items: lines.map((l) => ({
          productSlug: l.item.productSlug,
          ...(l.item.variantId ? { variantId: l.item.variantId } : {}),
          quantity: l.item.quantity,
        })),
        name,
        email: email.trim(),
        phone,
        deliveryMethod: "retiro",
        paymentMethod: payment,
        pickupLocationId,
        paymentMode: "total",
        installments: 1,
      });
      if (!result.ok) {
        setError(result.error);
        router.refresh();
        return;
      }
      clear();
      if (result.redirect.startsWith("http")) window.location.assign(result.redirect);
      else router.push(result.redirect);
    });
  }

  const header = (
    <div className="flex items-end justify-between gap-6 px-4 pt-5 md:px-14 md:pt-10">
      <Display size="page" className="max-md:text-[64px]">
        {C.title}
      </Display>
      <TextLink href={hrefs.catalog} className="mb-[6px] max-md:hidden">
        {C.continueShopping}
      </TextLink>
    </div>
  );

  // Antes de hidratar el carrito (localStorage) no se sabe si está vacío.
  if (!hydrated) {
    return (
      <div className="pb-20">
        {header}
        <div aria-busy className="mx-4 mt-8 h-[280px] rounded-card border border-line md:mx-14" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="pb-14 md:pb-20">
        {header}
        <div className="px-4 pt-6 md:px-14 md:pt-8">
          <EmptyState
            eyebrow={B.empty.eyebrow}
            title={B.empty.title}
            description={B.empty.text}
            action={
              <>
                <Button href={hrefs.bikes}>{B.empty.bikes}</Button>
                <Button href={hrefs.catalog} variant="secondary">
                  {B.empty.catalog}
                </Button>
              </>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      {header}
      <div className="grid items-start gap-[18px] px-4 pt-[18px] pb-7 md:px-14 md:pt-8 md:pb-20 lg:grid-cols-[minmax(0,1fr)_480px] lg:gap-10">
        {/* Columna izquierda: líneas + banner del taller */}
        <div className="flex min-w-0 flex-col gap-6">
          <ul className="m-0 list-none border-t border-line p-0">
            {lines.map(({ item, product, variant, available, warning }) => (
              <CartLine
                key={cartLineKey(item)}
                image={product?.image ?? null}
                name={product?.name ?? B.stock.unknownName}
                eyebrow={product ? [product.category, product.brand].filter(Boolean).join(" / ") : undefined}
                variant={variant?.label || undefined}
                quantity={item.quantity}
                max={Math.max(1, available)}
                price={product ? product.price * item.quantity : null}
                warning={warning}
                removeLabel={C.remove}
                onQuantityChange={(q) => setQty(item.productSlug, q, Math.max(1, available), item.variantId)}
                onRemove={() => remove(item.productSlug, item.variantId)}
              />
            ))}
          </ul>
          <CalloutLink
            className="max-md:hidden"
            href={`${hrefs.appointments}?servicio=reparacion`}
            title={C.repairBanner.title}
            text={C.repairBanner.text}
            cta={C.repairBanner.cta}
          />
        </div>

        {/* Panel: en mobile no hay caja, los bloques van sobre la página */}
        <Panel
          as="section"
          padding="lg"
          gap="xl"
          className="max-lg:gap-[18px] max-lg:border-0 max-lg:bg-transparent max-lg:p-0"
        >
          <fieldset className="m-0 flex min-w-0 flex-col gap-[10px] border-0 p-0 md:gap-3">
            <Eyebrow as="legend" size="md" className="mb-[10px] max-md:text-[12px] md:mb-3">
              <span className="max-md:hidden">{C.payTitle}</span>
              <span className="md:hidden">{B.payTitleMobile}</span>
            </Eyebrow>
            {payments.map((p) => (
              <RadioCard
                key={p.id}
                name="paymentMethod"
                value={p.id}
                checked={payment === p.id}
                onChange={() => setPayment(p.id)}
                title={p.name}
                description={p.description}
              />
            ))}
          </fieldset>

          <div className="flex flex-col gap-3">
            <Eyebrow as="h2" size="md" className="max-md:hidden">
              {C.pickupTitle}
            </Eyebrow>
            <InfoBox title={pickup.title}>
              <span>{pickup.place}</span>
              <span className="max-md:hidden">{pickup.note}</span>
            </InfoBox>
          </div>

          <fieldset className="m-0 flex min-w-0 flex-col gap-[10px] border-0 p-0">
            <Eyebrow as="legend" size="md" className="mb-[10px] max-md:text-[12px] md:mb-3">
              <span className="max-md:hidden">{B.dataTitle}</span>
              <span className="md:hidden">{B.dataTitleMobile}</span>
            </Eyebrow>
            <Input
              id="co-name"
              aria-label={B.name}
              placeholder={B.name}
              autoComplete="name"
              value={name}
              invalid={invalid === "name"}
              onChange={(e) => setName(e.target.value)}
              surface="panel"
              size="lg"
              className="max-lg:bg-surface"
            />
            <div className="grid gap-[10px] sm:grid-cols-2">
              <Input
                id="co-phone"
                aria-label={B.phone}
                placeholder={B.phone}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                invalid={invalid === "phone"}
                onChange={(e) => setPhone(e.target.value)}
                surface="panel"
                size="lg"
                className="max-lg:bg-surface"
              />
              <Input
                id="co-email"
                aria-label={B.email}
                placeholder={B.email}
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                invalid={invalid === "email"}
                onChange={(e) => setEmail(e.target.value)}
                surface="panel"
                size="lg"
                className="max-lg:bg-surface"
              />
            </div>
            <p className="m-0 text-[13px] text-text-3 md:text-[14px]">{logged ? B.loggedNote : B.dataNote}</p>
          </fieldset>

          <div className="flex flex-col gap-[18px] md:gap-[22px]">
            <SummaryRows>
              <SummaryRow label={C.totals.subtotal} value={formatMoney(subtotal)} />
              {discount > 0 && (
                <SummaryRow
                  variant="discount"
                  label={fillTemplate(C.totals.transferDiscount, { off: transferDiscountPct })}
                  value={`− ${formatMoney(discount)}`}
                />
              )}
              <SummaryRow className="max-md:hidden" label={C.totals.pickup} value={C.totals.pickupValue} />
              <SummaryTotal label={C.totals.total} amount={total} note={note} />
            </SummaryRows>

            {error && (
              <p role="alert" className="m-0 text-[14px] font-semibold text-red-light">
                {error}
              </p>
            )}

            <Button type="submit" size="full-lg" disabled={pending || !selected}>
              {pending ? B.pending : (selected?.cta ?? C.payments.mp.cta)}
            </Button>
          </div>
        </Panel>
      </div>
    </form>
  );
}
