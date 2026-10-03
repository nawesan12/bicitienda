"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cx } from "../cx";
import { FOCUS, FONT, MONO, TRANSITION } from "../styles";
import { Toggle } from "../toggle";
import { COMPACT_INPUT } from "./fields";

/* ── SettingsSubNav ───────────────────────────────────────────
   3f: columna de 200 px, gap 4. Ítem padding 11×14, radio 6, 14 px
   uppercase .06em. Activo: fondo #1f1d1a, 800, barra inset amarilla 3 px,
   paper; resto 700 #cfc8bb. Son anclas a cada sección; el activo sigue
   al scroll. En mobile es una fila con scroll horizontal (sticky).
   ──────────────────────────────────────────────────────────── */

export function SettingsSubNav({
  items,
  className,
}: {
  items: { id: string; label: string }[];
  className?: string;
}) {
  const [active, setActive] = useState(items[0]?.id);
  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter(Boolean) as HTMLElement[];
    const obs = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActive(top.target.id);
      },
      { rootMargin: "-20% 0px -60% 0px" },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [items]);
  return (
    <nav
      aria-label="Secciones de ajustes"
      className={cx(
        "flex gap-1 overflow-x-auto [scrollbar-width:none] lg:sticky lg:top-6 lg:flex-col lg:overflow-visible [&::-webkit-scrollbar]:hidden",
        FONT,
        className,
      )}
    >
      {items.map((i) => {
        const on = i.id === active;
        return (
          <a
            key={i.id}
            href={`#${i.id}`}
            onClick={() => setActive(i.id)}
            aria-current={on ? "true" : undefined}
            className={cx(
              "flex-none whitespace-nowrap rounded-btn px-[14px] py-[11px] text-[14px] uppercase tracking-[.06em] max-lg:min-h-11",
              on ? "bg-surface font-extrabold text-paper shadow-[inset_3px_0_0_var(--color-yellow)]" : "font-bold text-text-2 hover:text-paper",
              TRANSITION,
              FOCUS,
            )}
          >
            {i.label}
          </a>
        );
      })}
    </nav>
  );
}

/* ── ScheduleDayRow ───────────────────────────────────────────
   3f "Horarios para turnos": grilla 48 | 110 | 1fr | 1fr, gap 10,
   padding 8×0, borde superior. Switch + día 800 (paper abierto, #8d867a
   cerrado) + rango de mañana y de tarde en inputs compactos (8×10, 13 px).
   Un rango vacío o con el día apagado se ve "Cerrado".
   ──────────────────────────────────────────────────────────── */

export function ScheduleDayRow({
  day,
  open,
  am,
  pm,
  onOpen,
  onAm,
  onPm,
  closedLabel = "Cerrado",
  invalid,
}: {
  day: string;
  open: boolean;
  am: string;
  pm: string;
  onOpen: (v: boolean) => void;
  onAm: (v: string) => void;
  onPm: (v: string) => void;
  closedLabel?: string;
  invalid?: { am?: boolean; pm?: boolean };
}) {
  const range = (v: string, set: (v: string) => void, label: string, bad?: boolean) => (
    <input
      className={cx(COMPACT_INPUT, !open && "text-text-3", bad && "border-red-light")}
      value={open ? v : ""}
      placeholder={closedLabel}
      disabled={!open}
      aria-label={`${day}, ${label}`}
      aria-invalid={bad || undefined}
      onChange={(e) => set(e.target.value)}
    />
  );
  return (
    <div className={cx("grid grid-cols-[48px_minmax(0,1fr)_minmax(0,1fr)] items-center gap-x-[10px] gap-y-2 border-t border-line py-2 text-[14px] sm:grid-cols-[48px_110px_minmax(0,1fr)_minmax(0,1fr)]", FONT)}>
      <Toggle aria-label={`Abre el ${day.toLowerCase()}`} checked={open} onChange={(e) => onOpen(e.target.checked)} />
      <span className={cx("font-extrabold max-sm:col-span-2", open ? "text-paper" : "text-text-3")}>{day}</span>
      <span className="max-sm:col-start-2">{range(am, onAm, "mañana", invalid?.am)}</span>
      <span>{range(pm, onPm, "tarde", invalid?.pm)}</span>
    </div>
  );
}

/* ── WhatsAppTemplateCard ─────────────────────────────────────
   3f: caja #121110, borde #3a362f, radio 8, padding 16, gap 10. Nombre
   800 15 px + "cuándo" mono 600 11 px uppercase #8d867a. La burbuja es
   un textarea #26231f, radio 8/8/8/2, padding 12, 14/1.5 #cfc8bb.
   Sin switch: nada se manda solo (el admin abre WhatsApp con el texto).
   ──────────────────────────────────────────────────────────── */

export function WhatsAppTemplateCard({
  name,
  when,
  value,
  onChange,
  footer,
}: {
  name: ReactNode;
  when: ReactNode;
  value: string;
  onChange: (v: string) => void;
  footer?: ReactNode;
}) {
  return (
    <div className={cx("flex min-w-0 flex-col gap-[10px] rounded-box border border-line-strong bg-ink p-4", FONT)}>
      <div className="flex flex-col gap-[2px]">
        <span className="text-[15px] font-extrabold">{name}</span>
        <span className={cx("text-[11px] font-semibold uppercase text-text-3", MONO)}>{when}</span>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        maxLength={1000}
        aria-label={`Mensaje: ${typeof name === "string" ? name : "plantilla"}`}
        className={cx(
          "block min-h-[110px] w-full resize-y rounded-[8px_8px_8px_2px] border border-transparent bg-surface-3 p-3 text-[14px] leading-[1.5] text-text-2 outline-none focus:border-yellow max-md:text-[16px]",
          TRANSITION,
        )}
      />
      {footer}
    </div>
  );
}
