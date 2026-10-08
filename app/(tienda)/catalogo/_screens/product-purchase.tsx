"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button, TextLink } from "@/components/bt/button";
import { cx } from "@/components/bt/cx";
import { TileGrid, Tile } from "@/components/bt/panel";
import { QtyStepper } from "@/components/bt/qty-stepper";
import { FONT } from "@/components/bt/styles";
import { ColorSelector, SizeSelector } from "@/components/bt/variant-selector";
import { useCart } from "@/lib/cart-store";

/**
 * Compra de la ficha (2c / 4c, isla cliente): talle (con altura
 * sugerida), color (solo con más de uno, con el estilo de los talles),
 * cantidad (solo desktop, como el prototipo), "Agregar al carrito", el
 * link discreto al taller y las dos celdas Retiro / Stock.
 *
 * Selección inicial: el talle con más stock (en la MTB R29 da M, como el
 * prototipo) y su primer color con stock. Un talle está disponible si
 * alguna de sus variantes tiene stock; un color, si la variante del talle
 * elegido tiene stock. El stock que se muestra es el de la variante
 * elegida (talle × color).
 */

export interface PurchaseVariant {
  id: string;
  size: string;
  color: string;
  heightRange: string | null;
  stock: number;
}

export interface ProductPurchaseProps {
  slug: string;
  variants: PurchaseVariant[];
  /** Stock forzado a 0 desde el admin ("sin_stock"). */
  forcedOut?: boolean;
  swatches: Record<string, string | undefined>;
  /** Link discreto al taller ("¿Ya tenés bici? Service…"). */
  repairHref: string;
  sizeHelpHref: string;
  cartHref: string;
  copy: {
    sizeLabel: string;
    sizeHelp: string;
    sizeHelpMobile: string;
    colorLabel: string;
    addToCart: string;
    repairLink: string;
    pickupTitle: string;
    pickupText: string;
    pickupTextMobile: string;
    stockTitle: string;
    stockTitleMobile: string;
    stockText: string;
  };
}

const SINGLE = "Único";

/** "1,65 – 1,75 m" → "1,65–1,75" (formato del selector del prototipo). */
const shortHeight = (h: string | null) => (h ? h.replace(/\s*m$/, "").replace(/\s*[–-]\s*/, "–") : undefined);

const uniq = (xs: string[]) => [...new Set(xs)];

export function ProductPurchase({
  slug,
  variants,
  forcedOut,
  swatches,
  repairHref,
  sizeHelpHref,
  cartHref,
  copy,
}: ProductPurchaseProps) {
  const router = useRouter();
  const add = useCart((s) => s.add);
  const setQtyInCart = useCart((s) => s.setQty);
  const items = useCart((s) => s.items);

  const stockOf = (v: PurchaseVariant | undefined) => (forcedOut || !v ? 0 : v.stock);
  const sizes = useMemo(() => uniq(variants.map((v) => v.size).filter((s) => s && s !== SINGLE)), [variants]);
  const colors = useMemo(() => uniq(variants.map((v) => v.color).filter(Boolean)), [variants]);

  const sizeTotal = (s: string) => variants.filter((v) => v.size === s).reduce((a, v) => a + stockOf(v), 0);
  const find = (s: string | null, c: string | null) =>
    variants.find((v) => (!sizes.length || v.size === s) && (!colors.length || v.color === c));
  const firstColorFor = (s: string | null) =>
    colors.find((c) => stockOf(find(s, c)) > 0) ?? colors[0] ?? null;

  const [size, setSize] = useState<string | null>(() =>
    sizes.length ? sizes.reduce((best, s) => (sizeTotal(s) > sizeTotal(best) ? s : best), sizes[0]) : null,
  );
  const [color, setColor] = useState<string | null>(() => firstColorFor(size));
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);

  const variant = find(size, color) ?? (sizes.length || colors.length ? undefined : variants[0]);
  const stock = stockOf(variant);

  const chooseSize = (s: string) => {
    setSize(s);
    if (colors.length && stockOf(find(s, color)) <= 0) setColor(firstColorFor(s));
    setQty(1);
  };

  const stockLine =
    stock > 0
      ? size
        ? copy.stockText.replace("{n}", String(stock)).replace("{talle}", size) +
          (colors.length > 1 && color ? ` · ${color}` : "")
        : `Quedan ${stock} en el local`
      : "Sin stock por ahora";

  const onAdd = () => {
    if (!variant || stock <= 0) return;
    setAdding(true);
    const existing = items.find((i) => i.productSlug === slug && (i.variantId ?? "") === variant.id)?.quantity ?? 0;
    add(slug, stock, variant.id);
    if (qty > 1) setQtyInCart(slug, existing + qty, stock, variant.id);
    router.push(cartHref);
  };

  return (
    <div className={cx("flex flex-col gap-[18px] lg:gap-6", FONT)}>
      {sizes.length > 0 && (
        <SizeSelector
          name="talle"
          label={copy.sizeLabel}
          value={size ?? undefined}
          onChange={chooseSize}
          help={{
            href: sizeHelpHref,
            label: (
              <>
                <span className="lg:hidden">{copy.sizeHelpMobile}</span>
                <span className="max-lg:hidden">{copy.sizeHelp}</span>
              </>
            ),
          }}
          options={sizes.map((s) => {
            const v = variants.find((x) => x.size === s);
            return { value: s, label: s, height: shortHeight(v?.heightRange ?? null), available: sizeTotal(s) > 0 };
          })}
        />
      )}

      <ColorSelector
        name="color"
        label={copy.colorLabel.replace(" · {color}", "")}
        selectedLabel={color ?? undefined}
        value={color ?? undefined}
        onChange={(c) => {
          setColor(c);
          setQty(1);
        }}
        options={colors.map((c) => ({
          value: c,
          label: c,
          swatch: swatches[c],
          available: stockOf(find(size, c)) > 0,
        }))}
      />

      <div className="flex flex-col gap-[10px]">
        <div className="grid grid-cols-1 gap-[10px] lg:grid-cols-[140px_1fr]">
          <QtyStepper
            size="lg"
            value={qty}
            min={1}
            max={Math.max(1, stock)}
            onChange={setQty}
            disabled={stock <= 0}
            className="max-lg:hidden"
          />
          <Button variant="primary" size="full-lg" onClick={onAdd} disabled={stock <= 0 || adding}>
            {stock > 0 ? copy.addToCart : "Sin stock"}
          </Button>
        </div>
        <TextLink href={repairHref} tone="muted" underline className="self-start lg:mt-1">
          {copy.repairLink}
        </TextLink>
      </div>

      <TileGrid columns={2} className="max-lg:hidden">
        <Tile className="px-[18px] py-4">
          <span className="text-[15px] font-extrabold">{copy.pickupTitle}</span>
          <span className="text-[14px] text-text-2">{copy.pickupText}</span>
        </Tile>
        <Tile className="px-[18px] py-4">
          <span className="text-[15px] font-extrabold">{copy.stockTitle}</span>
          <span className={cx("text-[14px]", stock > 0 ? "text-text-2" : "text-red-light")} aria-live="polite">
            {stockLine}
          </span>
        </Tile>
      </TileGrid>
      <div className="grid grid-cols-2 gap-2 lg:hidden">
        <div className="flex flex-col gap-[2px] rounded-box bg-surface p-3">
          <span className="text-[14px] font-extrabold">{copy.pickupTitle}</span>
          <span className="text-[13px] text-text-2">{copy.pickupTextMobile}</span>
        </div>
        <div className="flex flex-col gap-[2px] rounded-box bg-surface p-3">
          <span className="text-[14px] font-extrabold">{copy.stockTitleMobile}</span>
          <span className={cx("text-[13px]", stock > 0 ? "text-text-2" : "text-red-light")}>{stockLine}</span>
        </div>
      </div>
    </div>
  );
}
