"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Bolt } from "@/components/store/bolt";
import { useCart, useCartCount } from "@/lib/cart-store";
import type { CartProduct } from "@/lib/cart-view";
import { lexicon } from "@/lib/data/content";
import { formatARS } from "@/lib/format";
import { img } from "@/lib/images";
import { paths } from "@/lib/paths";
import { cuota6, transferPrice, type PricingRates } from "@/lib/pricing";

const t = lexicon.commerce.cart;

/**
 * Drawer lateral del carrito con el lenguaje del handoff: panel crema de
 * 440px desde la derecha (slideIn), líneas en tarjetas blancas con la foto
 * 4:3 en multiply, stepper en pill y, al pie, la caja de precio de la
 * ficha en chico (6 cuotas MiPyME en negro + transferencia en pastel).
 *
 * Recibe del server el catálogo comprable vigente: una línea cuyo producto
 * dejó de ser comprable (sin stock, oculto, sin precio) se muestra
 * deshabilitada para quitar (el checkout la ignora).
 */
export function CartDrawer({
  products,
  rates,
}: {
  products: CartProduct[];
  rates: PricingRates;
}) {
  const { items, open, setOpen, setQty, remove } = useCart();
  const count = useCartCount();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (!open) return;
    window.addEventListener("keydown", onKey);
    // La página de atrás no scrollea mientras el drawer está abierto.
    const root = document.documentElement;
    const prev = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      root.style.overflow = prev;
    };
  }, [open, setOpen]);

  if (!open) return null;

  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const lines = items.map((item) => ({
    item,
    product: bySlug.get(item.productSlug) ?? null,
  }));
  const subtotal = lines.reduce(
    (sum, l) => sum + (l.product ? l.product.price * l.item.quantity : 0),
    0,
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.title}
      className="fixed inset-0 z-[100]"
    >
      <button
        type="button"
        aria-label={t.close}
        onClick={() => setOpen(false)}
        className="animate-backdrop absolute inset-0 cursor-default bg-[rgba(12,14,11,.7)] backdrop-blur-[4px]"
      />
      <div className="animate-slide-in absolute inset-y-0 right-0 flex w-[440px] max-w-full flex-col bg-cream shadow-[-20px_0_60px_rgba(0,0,0,.3)] min-[480px]:max-w-[92vw]">
        <div className="flex items-center justify-between gap-4 border-b border-ink/10 bg-white px-[clamp(18px,4vw,26px)] py-[18px]">
          <div>
            <div className="font-sans text-[10.5px] font-bold tracking-[.26em] text-brand-deep">
              {t.kicker}
            </div>
            <div className="font-display mt-1 text-[24px] leading-none text-ink">
              {t.title} <span className="text-brand-deep">({count})</span>
            </div>
          </div>
          <button
            type="button"
            aria-label={t.close}
            onClick={() => setOpen(false)}
            className="flex h-11 w-11 flex-none items-center justify-center rounded-full border-[1.5px] border-ink/15 font-sans text-[15px] font-bold text-ink/60 hover:border-ink hover:text-ink"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-[clamp(18px,4vw,26px)] py-5">
          {lines.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center px-4 py-[60px] text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-night">
                <Bolt width={18} height={24} stroke="#5eb838" strokeWidth={1.6} />
              </span>
              <div className="font-display mt-5 text-[24px] text-ink">
                {t.emptyTitle}
              </div>
              <p className="mb-0 mt-2 max-w-[30ch] font-sans text-[13.5px] leading-[1.55] text-ink/55">
                {t.emptyBody}
              </p>
              <Link
                href={paths.catalog()}
                onClick={() => setOpen(false)}
                className="mt-5 rounded-full bg-ink px-6 py-[13px] font-sans text-[14px] font-bold text-cream hover:bg-brand hover:text-night"
              >
                {t.emptyCta}
              </Link>
            </div>
          )}
          {lines.map(({ item, product }) => (
            <div
              key={item.productSlug}
              className={`flex gap-[14px] rounded-2xl border bg-white p-3 ${
                product ? "border-ink/10" : "border-danger/30"
              }`}
            >
              <div className="relative box-border aspect-[4/3] w-[92px] flex-none self-start overflow-hidden rounded-xl bg-cream-4">
                {product?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element -- Cloudinary transforma (img())
                  <img
                    src={img(product.image, { w: 200 })}
                    alt={product.name}
                    className="absolute inset-[6px] block h-[calc(100%-12px)] w-[calc(100%-12px)] object-contain mix-blend-multiply"
                  />
                ) : (
                  <div className="stripes-card absolute inset-0" />
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="font-display text-[15px] leading-[1.15] text-ink">
                  {product?.name ?? item.productSlug}
                </div>
                {product ? (
                  <div className="font-display mt-1 text-[15px] font-extrabold tracking-normal text-brand-deep">
                    {formatARS(product.price * item.quantity)}
                  </div>
                ) : (
                  <div className="mt-1 font-sans text-[12px] font-semibold text-danger">
                    {t.unavailable}
                  </div>
                )}
                <div className="mt-auto flex items-center gap-2 pt-2">
                  {product && (
                    <div className="flex items-center rounded-full border-[1.5px] border-ink/15">
                      <button
                        type="button"
                        aria-label={t.less}
                        onClick={() =>
                          setQty(item.productSlug, item.quantity - 1, product.stock)
                        }
                        className="hit relative flex h-8 w-9 items-center justify-center rounded-full font-sans text-[16px] font-bold text-ink hover:text-brand-deep"
                      >
                        −
                      </button>
                      <span className="min-w-[18px] text-center font-sans text-[13.5px] font-bold">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label={t.more}
                        disabled={item.quantity >= product.stock}
                        onClick={() =>
                          setQty(item.productSlug, item.quantity + 1, product.stock)
                        }
                        className="hit relative flex h-8 w-9 items-center justify-center rounded-full font-sans text-[16px] font-bold text-ink hover:text-brand-deep disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        +
                      </button>
                    </div>
                  )}
                  <span className="flex-1" />
                  <button
                    type="button"
                    onClick={() => remove(item.productSlug)}
                    className="hit relative font-sans text-[12px] font-bold text-ink/45 hover:text-danger"
                  >
                    {t.remove}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {count > 0 && (
          <div className="border-t border-ink/10 bg-white px-[clamp(18px,4vw,26px)] pb-[max(20px,env(safe-area-inset-bottom))] pt-[18px]">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-sans text-[11px] font-bold tracking-[.22em] text-ink/50">
                {t.subtotal.toUpperCase()}
              </span>
              <span className="font-display text-[28px] font-extrabold tracking-normal text-ink">
                {formatARS(subtotal)}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-night px-[14px] py-[10px]">
                <div className="font-sans text-[9.5px] font-bold tracking-[.14em] text-cream/60">
                  {t.box6}
                </div>
                <div className="font-display mt-[3px] text-[16px] font-extrabold tracking-normal text-brand">
                  {formatARS(cuota6(rates, subtotal))}
                </div>
              </div>
              <div className="rounded-xl bg-brand-pastel px-[14px] py-[10px]">
                <div className="font-sans text-[9.5px] font-bold tracking-[.14em] text-brand-deeper">
                  {t.boxTransfer(rates.transferDiscount)}
                </div>
                <div className="font-display mt-[3px] text-[16px] font-extrabold tracking-normal text-brand-deeper">
                  {formatARS(transferPrice(rates, subtotal))}
                </div>
              </div>
            </div>
            <Link
              href="/checkout"
              onClick={() => setOpen(false)}
              className="mt-[14px] block rounded-full bg-ink p-4 text-center font-sans text-[15px] font-bold text-cream hover:bg-brand hover:text-night"
            >
              {t.cta}
            </Link>
            <div className="mt-[10px] text-center font-sans text-[11.5px] text-ink/50">
              {t.note}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * "Carrito (n)": ocupa el lugar del "Tienda online ↗" del prototipo, con
 * su mismo estilo (pill verde en el nav, link grande en el menú mobile,
 * link de texto en el footer). Solo se monta con la venta online prendida.
 */
export function CartButton({
  variant = "nav",
  className,
  onOpen,
}: {
  variant?: "nav" | "menu" | "footer";
  className?: string;
  onOpen?: () => void;
}) {
  const count = useCartCount();
  const setOpen = useCart((s) => s.setOpen);
  const base =
    variant === "nav"
      ? "hit relative flex items-center gap-2 whitespace-nowrap rounded-full bg-brand px-4 py-[9px] font-sans text-[12.5px] font-bold text-night hover:bg-brand-hover"
      : "";

  return (
    <button
      type="button"
      onClick={() => {
        onOpen?.();
        setOpen(true);
      }}
      className={`${base} ${className ?? ""}`}
    >
      {lexicon.nav.cart} ({count})
    </button>
  );
}
