"use client";

import { cx } from "@/components/bt/cx";
import { formatMoney } from "@/components/bt/format";
import { FOCUS, FONT, TRANSITION } from "@/components/bt/styles";

/* ── QuoteLinesEditor (5b "Cotización") ───────────────────────
   Líneas grilla minmax(0,1fr) | auto, gap 12, padding 10×0, borde
   superior #2b2824, 14 px; precio 800. "+ Agregar ítem": padding 10×0,
   borde superior punteado #3a362f, 700 13 px amarillo.
   Editable: nombre y precio son inputs que se ven como texto hasta el
   hover/foco (borde #3a362f / amarillo) y cada línea tiene "✕". Con
   `readOnly` (presupuesto cerrado) son filas de texto como el prototipo.
   Controlado: `lines` + `onChange`; `onCommit` al salir de un campo.
   ──────────────────────────────────────────────────────────── */

export interface QuoteLineDraft {
  name: string;
  price: number;
  quantity: number;
  productSlug?: string | null;
  variantId?: string | null;
}

const field = cx(
  "min-w-0 rounded-tag border border-transparent bg-transparent px-[6px] py-1 text-[14px] text-paper outline-none placeholder:text-text-3 hover:border-line-strong focus:border-yellow focus:bg-ink max-md:text-[16px]",
  TRANSITION,
);

export function QuoteLinesEditor({
  lines,
  onChange,
  onCommit,
  readOnly,
  addLabel = "+ Agregar ítem",
  className,
}: {
  lines: QuoteLineDraft[];
  onChange?: (lines: QuoteLineDraft[]) => void;
  onCommit?: (lines: QuoteLineDraft[]) => void;
  readOnly?: boolean;
  addLabel?: string;
  className?: string;
}) {
  const set = (i: number, patch: Partial<QuoteLineDraft>) =>
    onChange?.(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  if (readOnly) {
    return (
      <div className={cx("flex flex-col", FONT, className)}>
        {lines.map((l, i) => (
          <div key={i} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-t border-line py-[10px] text-[14px]">
            <span className="min-w-0">
              {l.quantity > 1 && <span className="text-text-3">{l.quantity} × </span>}
              {l.name}
            </span>
            <span className="font-extrabold">{formatMoney(l.price * l.quantity)}</span>
          </div>
        ))}
        {lines.length === 0 && <div className="border-t border-line py-[10px] text-[14px] text-text-3">Sin ítems.</div>}
      </div>
    );
  }

  return (
    <div className={cx("flex flex-col", FONT, className)}>
      {lines.map((l, i) => (
        <div key={i} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 border-t border-line py-[6px] text-[14px]">
          <input
            aria-label={`Ítem ${i + 1}`}
            value={l.name}
            placeholder="Descripción del ítem"
            onChange={(e) => set(i, { name: e.target.value })}
            onBlur={() => onCommit?.(lines)}
            className={cx(field, "-ml-[6px]")}
          />
          <span className="flex items-center gap-1 font-extrabold">
            <span className="text-text-3">$</span>
            <input
              aria-label={`Precio del ítem ${i + 1}`}
              inputMode="numeric"
              value={l.price ? l.price.toLocaleString("es-AR") : ""}
              placeholder="0"
              onChange={(e) => set(i, { price: Number(e.target.value.replace(/\D/g, "")) || 0 })}
              onBlur={() => onCommit?.(lines)}
              className={cx(field, "w-[88px] text-right font-extrabold md:w-[104px]")}
            />
          </span>
          <button
            type="button"
            aria-label={`Quitar ítem ${i + 1}`}
            onClick={() => {
              const next = lines.filter((_, j) => j !== i);
              onChange?.(next);
              onCommit?.(next);
            }}
            className={cx("flex size-8 items-center justify-center rounded-tag text-[13px] text-text-3 hover:text-red-light max-md:size-11", TRANSITION, FOCUS)}
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange?.([...lines, { name: "", price: 0, quantity: 1 }])}
        className={cx(
          "border-t border-dashed border-line-strong py-[10px] text-left text-[13px] font-bold text-yellow hover:text-brand-hover max-md:min-h-11",
          TRANSITION,
          FOCUS,
        )}
      >
        {addLabel}
      </button>
    </div>
  );
}
