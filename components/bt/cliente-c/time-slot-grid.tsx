import { cx } from "../cx";
import { FOCUS, FONT, TRANSITION } from "../styles";

/* ── TimeSlotGrid (2f / 4e) ───────────────────────────────────
   Desktop (md+): grupos con rótulo ("Mañana" / "Tarde", 800 15
   #cfc8bb) y grilla de 3. Mobile: una sola grilla de 4 con todos los
   horarios seguidos, sin rótulos (como 4e).
   Slot: 13×0, radio 6, 800 16 (mobile min-h 44, 14), borde 1:
   - libre: transparente, paper, borde #3a362f.
   - seleccionado: amarillo / tinta.
   - tomado: #4a453e tachado, borde #2b2824, deshabilitado.
   ──────────────────────────────────────────────────────────── */

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface TimeSlotGroup {
  label: string;
  slots: TimeSlot[];
  /** Texto si el grupo no tiene horarios (sábado a la tarde). */
  emptyText?: string;
}

export interface TimeSlotGridProps {
  groups: TimeSlotGroup[];
  selected?: string | null;
  onSelect?: (time: string) => void;
  className?: string;
}

function SlotButton({
  slot,
  selected,
  onSelect,
  size,
}: {
  slot: TimeSlot;
  selected: boolean;
  onSelect?: (time: string) => void;
  size: "sm" | "md";
}) {
  return (
    <button
      type="button"
      disabled={!slot.available}
      aria-pressed={selected}
      aria-label={`${slot.time}${slot.available ? "" : ", ocupado"}`}
      onClick={() => onSelect?.(slot.time)}
      className={cx(
        "rounded-btn border font-extrabold",
        size === "sm" ? "min-h-11 text-[14px]" : "py-[13px] text-[16px]",
        TRANSITION,
        FOCUS,
        selected
          ? "border-yellow bg-yellow text-ink"
          : slot.available
            ? "border-line-strong bg-transparent text-paper hover:border-text-4"
            : "cursor-default border-line text-line-btn line-through",
      )}
    >
      {slot.time}
    </button>
  );
}

export function TimeSlotGrid({ groups, selected, onSelect, className }: TimeSlotGridProps) {
  const all = groups.flatMap((g) => g.slots);
  return (
    <div className={cx("min-w-0", FONT, className)}>
      {/* Mobile: una grilla de 4 */}
      <div className="grid grid-cols-4 gap-[6px] md:hidden">
        {all.map((s) => (
          <SlotButton key={s.time} slot={s} selected={selected === s.time} onSelect={onSelect} size="sm" />
        ))}
      </div>
      {/* Desktop: Mañana / Tarde */}
      <div className="flex flex-col gap-[14px] max-md:hidden">
        {groups.map((g, i) => (
          <div key={g.label} className={cx("flex flex-col gap-[14px]", i > 0 && "mt-[6px]")}>
            <span className="text-[15px] font-extrabold text-text-2">{g.label}</span>
            {g.slots.length ? (
              <div className="grid grid-cols-3 gap-2">
                {g.slots.map((s) => (
                  <SlotButton key={s.time} slot={s} selected={selected === s.time} onSelect={onSelect} size="md" />
                ))}
              </div>
            ) : (
              <span className="text-[14px] text-text-3">{g.emptyText ?? "Sin horarios."}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
