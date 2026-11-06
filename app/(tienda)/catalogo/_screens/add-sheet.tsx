"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { Button } from "@/components/bt/button";
import { CardAddButton } from "@/components/bt/card-add";
import { cx } from "@/components/bt/cx";
import { formatMoney } from "@/components/bt/format";
import { FOCUS, FONT, TRANSITION } from "@/components/bt/styles";

/**
 * Panel "Agregado al carrito ✓ · Sumale a tu bici" (isla cliente). Se abre
 * al tocar "Agregar al carrito" en la ficha: confirma lo agregado y ofrece
 * hasta 4 accesorios (los mismos relacionados de la ficha) con su "+"
 * (`CardAddButton`: agrega directo si tienen una sola variante; si no,
 * lleva a su ficha).
 *
 * Mobile: bottom sheet pegado abajo. Desktop: modal centrado. Misma
 * técnica que `Modal` (<dialog> nativo: foco atrapado, Esc cierra).
 */

export interface AddSheetItem {
  slug: string;
  href: string;
  name: string;
  image: { src: string; alt: string };
  price: number;
  priceFrom: boolean;
  quickVariant: { id: string; stock: number } | null;
}

export interface AddSheetCopy {
  title: string;
  subtitle: string;
  keepShopping: string;
  goToCart: string;
}

export function AddSheet({
  open,
  onClose,
  added,
  items,
  cartHref,
  copy,
}: {
  open: boolean;
  onClose: () => void;
  /** Lo que se acaba de agregar: "MTB R29 · Talle M". */
  added: { name: string; detail?: string; image?: string };
  items: AddSheetItem[];
  cartHref: string;
  copy: AddSheetCopy;
}) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="add-sheet-title"
      className={cx(
        "overflow-visible bg-transparent p-0 text-paper backdrop:bg-ink/75",
        // Mobile: hoja abajo a todo el ancho. Desktop: modal centrado.
        "max-lg:mx-0 max-lg:mt-auto max-lg:mb-0 max-lg:w-full max-lg:max-w-none",
        "lg:m-auto lg:w-[calc(100vw-32px)] lg:max-w-[640px]",
        FONT,
      )}
    >
      {open && (
        <div
          className={cx(
            "flex max-h-[85dvh] flex-col gap-5 overflow-y-auto border border-line bg-surface p-5 pb-[max(20px,env(safe-area-inset-bottom))]",
            "max-lg:rounded-t-card max-lg:border-b-0 lg:max-h-[calc(100dvh-32px)] lg:rounded-card lg:p-6",
          )}
        >
          {/* Agarradera del sheet (solo mobile, decorativa). */}
          <span aria-hidden className="mx-auto -mt-2 h-1 w-10 rounded-full bg-line-strong lg:hidden" />

          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              {added.image && (
                // eslint-disable-next-line @next/next/no-img-element -- Cloudinary ya transformada
                <img src={added.image} alt="" className="size-14 flex-none rounded-box bg-card-photo object-contain" />
              )}
              <div className="flex min-w-0 flex-col gap-1">
                <h2 id="add-sheet-title" className="m-0 text-[24px] leading-none font-black uppercase stretch-70 lg:text-[28px]">
                  {copy.title}
                </h2>
                <p className="m-0 truncate text-[14px] text-text-2">
                  {added.name}
                  {added.detail && <span className="text-text-3"> · {added.detail}</span>}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className={cx(
                "-mt-2 -mr-2 flex size-11 flex-none items-center justify-center rounded-btn text-[20px] font-bold text-text-3 hover:text-paper",
                TRANSITION,
                FOCUS,
              )}
            >
              ✕
            </button>
          </div>

          {items.length > 0 && (
            <section className="flex flex-col gap-3" aria-labelledby="add-sheet-sub">
              <h3 id="add-sheet-sub" className="m-0 text-[13px] font-bold tracking-[.08em] text-text-3 uppercase">
                {copy.subtitle}
              </h3>
              <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">
                {items.slice(0, 4).map((it) => (
                  <li key={it.slug} className="flex items-center gap-3 rounded-box bg-paper p-2 pr-3 text-ink">
                    {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary ya transformada */}
                    <img
                      src={it.image.src}
                      alt=""
                      loading="lazy"
                      className="size-16 flex-none rounded-tag bg-card-photo object-cover"
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <Link
                        href={it.href}
                        onClick={onClose}
                        className="line-clamp-2 rounded-[2px] text-[14px] leading-[1.2] font-bold hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                      >
                        {it.name}
                      </Link>
                      <span className="text-[18px] leading-none font-black stretch-75">
                        {it.priceFrom && <span className="mr-1 text-[11px] font-extrabold uppercase stretch-100">Desde</span>}
                        {formatMoney(it.price)}
                      </span>
                    </div>
                    <CardAddButton slug={it.slug} name={it.name} href={it.href} variant={it.quickVariant} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="grid grid-cols-1 gap-[10px] sm:grid-cols-2">
            <Button variant="secondary" size="full" onClick={onClose}>
              {copy.keepShopping}
            </Button>
            <Button variant="primary" size="full" onClick={() => router.push(cartHref)}>
              {copy.goToCart}
            </Button>
          </div>
        </div>
      )}
    </dialog>
  );
}
