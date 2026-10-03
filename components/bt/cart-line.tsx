"use client";

import { cx } from "./cx";
import { QtyStepper } from "./qty-stepper";
import { FONT, MONO, TRANSITION, FOCUS } from "./styles";
import { Price } from "./typography";

/**
 * Fila de ítem del carrito (2d / 4d).
 *
 * - Desktop (md+): grilla 160 | 1fr | 150 | 150, gap 24, padding 24.
 *   Foto 160×120 r8, "CATEGORÍA / MARCA" mono 12 #8d867a, nombre 800 20,
 *   variante 14 #cfc8bb, "Quitar" subrayado, stepper (md) y precio 30 @75.
 * - Mobile: grilla 88 | 1fr, gap 12, padding 14. Foto 88×88 r6, nombre
 *   800 15, variante 13 y abajo stepper (sm, 44 px) + precio 22 @75. Sin
 *   mono ni "Quitar": bajar a 0 saca la línea.
 *
 * `warning` muestra un aviso de stock en rojo claro bajo la variante.
 */
export function CartLine({
  image,
  name,
  eyebrow,
  variant,
  quantity,
  max,
  price,
  onQuantityChange,
  onRemove,
  removeLabel = "Quitar",
  warning,
  className,
}: {
  image: string | null;
  name: string;
  /** "MTB / Marca" (solo desktop). */
  eyebrow?: string;
  /** "Talle M · Negro / amarillo". */
  variant?: string;
  quantity: number;
  /** Tope del stepper (stock disponible). */
  max: number;
  /** Total de la línea (precio × cantidad). null = sin precio (no disponible). */
  price: number | null;
  onQuantityChange: (qty: number) => void;
  onRemove: () => void;
  removeLabel?: string;
  warning?: string;
  className?: string;
}) {
  return (
    <li
      className={cx(
        "grid grid-cols-[88px_minmax(0,1fr)] gap-3 border-b border-line py-[14px] text-paper",
        "md:grid-cols-[160px_minmax(0,1fr)_150px_150px] md:items-center md:gap-6 md:py-6",
        FONT,
        className,
      )}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element -- Cloudinary transforma (img())
        <img
          src={image}
          alt=""
          className="block size-[88px] rounded-btn bg-surface object-cover md:h-[120px] md:w-[160px] md:rounded-box"
        />
      ) : (
        <span aria-hidden className="block size-[88px] rounded-btn bg-surface md:h-[120px] md:w-[160px] md:rounded-box" />
      )}

      <div className="flex min-w-0 flex-col gap-1 md:gap-[6px]">
        {eyebrow && (
          <span className={cx(MONO, "text-[12px] font-semibold text-text-3 max-md:hidden")}>{eyebrow}</span>
        )}
        <span className="text-[15px] leading-[1.2] font-extrabold md:text-[20px]">{name}</span>
        {variant && <span className="text-[13px] text-text-2 md:text-[14px]">{variant}</span>}
        {warning && (
          <span role="status" className="text-[13px] font-semibold text-red-light md:text-[14px]">
            {warning}
          </span>
        )}
        <button
          type="button"
          onClick={onRemove}
          className={cx(
            "mt-1 self-start rounded-[2px] text-[13px] font-semibold text-text-3 underline underline-offset-2 hover:text-paper max-md:hidden",
            TRANSITION,
            FOCUS,
          )}
        >
          {removeLabel}
        </button>
        {/* Mobile: stepper + precio en una fila */}
        <div className="mt-1 flex items-center justify-between gap-3 md:hidden">
          <QtyStepper
            size="sm"
            min={0}
            max={Math.max(max, quantity)}
            value={quantity}
            onChange={onQuantityChange}
            label={`Cantidad de ${name}`}
          />
          {price != null && <Price amount={price} size="card-sm" />}
        </div>
      </div>

      <QtyStepper
        className="max-md:hidden"
        size="md"
        min={1}
        max={Math.max(max, quantity)}
        value={quantity}
        onChange={onQuantityChange}
        label={`Cantidad de ${name}`}
      />
      {price != null ? (
        <Price amount={price} size="card" className="text-right max-md:hidden" />
      ) : (
        <span className="max-md:hidden" />
      )}
    </li>
  );
}
