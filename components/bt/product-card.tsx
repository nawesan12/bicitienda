import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "./cx";
import { formatMoney, installmentsLabel, transferLabel, installmentAmount, transferPrice } from "./format";
import { FONT, MONO } from "./styles";
import { Tag, type TagTone } from "./tag";

/**
 * Card de producto (2a, 2b, 3d preview, 4a, 4b). Altura consistente: la
 * foto tiene aspecto fijo, el nombre ocupa siempre 2 líneas (min-h 2.4em
 * + line-clamp) y el bloque de precio va al fondo (margin-top auto).
 *
 * Desktop (≥ md, o layout="desktop"): radio 10, foto 4/3 sobre #e8e1d3,
 * tag 12 px, cuerpo paper padding 18 gap 6, mono 12 px #6f675a
 * "CATEGORÍA / MARCA", nombre 700 18/1.2, divisor dashed #c9c0ae
 * (padding-top 12), precio 900 30 @75 %, cuotas 500 13 #4c463d,
 * transferencia 700 13 #b81d16, botón "+" 40×40 tinta/amarillo.
 *
 * Mobile (< md, o layout="mobile"): radio 8, foto 1:1, tag 10 px, padding
 * 10/10/12 gap 4, mono 10 px, nombre 700 14/1.2, precio 900 22 @75 %,
 * cuotas 500 11 px; sin transferencia ni "+" (como 4a/4b).
 *
 * Toda la card es un link (stretched link); `addAction` es el botón "+"
 * real (cliente) y queda por encima del link.
 */

export interface ProductCardProps {
  href: string;
  name: string;
  /** "MTB", "Cascos"… (se muestra en mayúsculas). */
  category: string;
  brand?: string;
  image: { src: string; alt?: string };
  price: number;
  tag?: { label: string; tone?: TagTone };
  installments?: number;
  transferDiscountPct?: number;
  /** "responsive" cambia de mobile a desktop en md. */
  layout?: "responsive" | "desktop" | "mobile";
  /** Aspecto de la foto; por defecto 1:1 mobile y 4/3 desktop. */
  imageAspect?: "auto" | "square" | "4/3";
  /** Botón "+" real (ej. agregar al carrito). Si falta se dibuja decorativo. */
  addAction?: ReactNode;
  /** Oculta el "+" decorativo (ej. productos sin talle elegido). */
  hideAdd?: boolean;
  className?: string;
}

type L = "responsive" | "desktop" | "mobile";

/** Elige la clase según el layout: [mobile, desktop]. */
function pick(layout: L, mobile: string, desktop: string, responsive: string): string {
  return layout === "mobile" ? mobile : layout === "desktop" ? desktop : responsive;
}

export function ProductCard({
  href,
  name,
  category,
  brand,
  image,
  price,
  tag,
  installments = 6,
  transferDiscountPct = 10,
  layout = "responsive",
  imageAspect = "auto",
  addAction,
  hideAdd,
  className,
}: ProductCardProps) {
  const meta = brand ? `${category} / ${brand}` : category;
  const aspect =
    imageAspect === "square"
      ? "aspect-square"
      : imageAspect === "4/3"
        ? "aspect-[4/3]"
        : pick(layout, "aspect-square", "aspect-[4/3]", "aspect-square md:aspect-[4/3]");
  const showDesktopExtras = layout !== "mobile";
  const extrasCls = layout === "responsive" ? "max-md:hidden" : "";

  return (
    <article
      className={cx(
        "relative flex h-full min-w-0 flex-col overflow-hidden bg-paper text-ink",
        pick(layout, "rounded-box", "rounded-card", "rounded-box md:rounded-card"),
        "has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-yellow",
        FONT,
        className,
      )}
    >
      <div className={cx("relative overflow-hidden bg-card-photo", aspect)}>
        {/* eslint-disable-next-line @next/next/no-img-element -- URLs de Cloudinary ya transformadas */}
        <img
          src={image.src}
          alt={image.alt ?? name}
          loading="lazy"
          className="absolute inset-0 block h-full w-full object-cover"
        />
        {tag && (
          <span className="absolute top-0 left-0">
            <Tag flush tone={tag.tone} size={layout === "mobile" ? "xs" : layout === "desktop" ? "md" : "card"}>
              {tag.label}
            </Tag>
          </span>
        )}
      </div>

      <div
        className={cx(
          "flex flex-1 flex-col",
          pick(layout, "gap-1 px-[10px] pt-[10px] pb-3", "gap-[6px] p-[18px]", "gap-1 px-[10px] pt-[10px] pb-3 md:gap-[6px] md:p-[18px]"),
        )}
      >
        <span
          className={cx(
            "font-semibold uppercase text-text-4",
            MONO,
            pick(layout, "text-[10px]", "text-[12px]", "text-[10px] md:text-[12px]"),
          )}
        >
          {meta}
        </span>
        <h3
          className={cx(
            "m-0 line-clamp-2 min-h-[2.4em] font-bold leading-[1.2]",
            pick(layout, "text-[14px]", "mb-2 text-[18px]", "text-[14px] md:mb-2 md:text-[18px]"),
          )}
        >
          <Link href={href} className="outline-none after:absolute after:inset-0 after:content-['']">
            {name}
          </Link>
        </h3>

        <div
          className={cx(
            "mt-auto flex items-end justify-between gap-2 border-t border-dashed border-card-dash",
            pick(layout, "pt-2", "pt-3", "pt-2 md:pt-3"),
          )}
        >
          <div className="flex min-w-0 flex-col gap-[1px] md:gap-[2px]">
            <span
              className={cx(
                "font-black leading-none stretch-75",
                pick(layout, "text-[22px]", "text-[30px]", "text-[22px] md:text-[30px]"),
              )}
            >
              {formatMoney(price)}
            </span>
            <span
              className={cx(
                "truncate font-medium text-card-cuotas",
                pick(layout, "text-[11px]", "text-[13px]", "text-[11px] md:text-[13px]"),
              )}
              aria-label={`${installments} cuotas sin interés de ${formatMoney(installmentAmount(price, installments))}`}
            >
              {installmentsLabel(price, installments)}
            </span>
            {showDesktopExtras && transferDiscountPct > 0 && (
              <span
                className={cx("text-[13px] font-bold text-card-transfer", extrasCls)}
                aria-label={`${formatMoney(transferPrice(price, transferDiscountPct))} pagando por transferencia`}
              >
                {transferLabel(price, transferDiscountPct)}
              </span>
            )}
          </div>
          {showDesktopExtras && !hideAdd && (
            <span className={cx("relative z-10 flex-none", extrasCls)}>
              {addAction ?? (
                <span
                  aria-hidden
                  className="flex size-10 items-center justify-center rounded-btn bg-ink text-[22px] font-extrabold text-yellow"
                >
                  +
                </span>
              )}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

/** Botón "+" con el estilo de la card, para pasar como `addAction`. */
export const PRODUCT_CARD_ADD_CLASSES =
  "flex size-10 items-center justify-center rounded-btn bg-ink text-[22px] font-extrabold text-yellow hover:bg-surface-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink transition-colors duration-150";

/**
 * Card chica de relacionados ("Sumale a tu bici", 2c): foto 4/3, padding
 * 16, nombre 700 16/1.2, precio 900 26 @75 %.
 */
export function RelatedProductCard({
  href,
  name,
  image,
  price,
  className,
}: {
  href: string;
  name: string;
  image: { src: string; alt?: string };
  price: number;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cx(
        "flex min-w-0 flex-col overflow-hidden rounded-card bg-paper text-ink",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow",
        FONT,
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- URLs de Cloudinary ya transformadas */}
      <img src={image.src} alt={image.alt ?? name} loading="lazy" className="block aspect-[4/3] w-full bg-card-photo object-cover" />
      <span className="flex flex-col gap-1 p-4">
        <span className="line-clamp-2 text-[16px] font-bold leading-[1.2]">{name}</span>
        <span className="mt-[6px] text-[26px] font-black leading-none stretch-75">{formatMoney(price)}</span>
      </span>
    </Link>
  );
}

/**
 * Caja de precio del producto (2c / 4c): panel #1f1d1a, precio 900 56 @72 %
 * (mobile 44), "6 cuotas sin interés" amarillo + " de $ …" #cfc8bb 600 16
 * (mobile 14), transferencia #ff6a5c 700 16 (mobile 14).
 */
export function PriceBox({
  price,
  installments = 6,
  transferDiscountPct = 10,
  className,
}: {
  price: number;
  installments?: number;
  transferDiscountPct?: number;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "flex flex-col gap-1 rounded-box border border-line bg-surface p-4 text-paper md:gap-2 md:rounded-card md:p-[22px]",
        FONT,
        className,
      )}
    >
      <span className="text-[44px] font-black leading-none stretch-72 md:text-[56px]">{formatMoney(price)}</span>
      {installments > 1 && (
        <span className="text-[14px] font-semibold text-text-2 md:text-[16px]">
          <span className="text-yellow">{installments} cuotas sin interés</span> de{" "}
          {formatMoney(installmentAmount(price, installments))}
        </span>
      )}
      {transferDiscountPct > 0 && (
        <span className="text-[14px] font-bold text-red-light md:text-[16px]">
          {formatMoney(transferPrice(price, transferDiscountPct))}
          <span className="max-md:hidden"> pagando por transferencia ({transferDiscountPct}% off)</span>
          <span className="md:hidden"> por transferencia</span>
        </span>
      )}
    </div>
  );
}
