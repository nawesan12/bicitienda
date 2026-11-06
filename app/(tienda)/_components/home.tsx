import Link from "next/link";
import { Logo, Wordmark } from "@/components/bt/brand";
import { Button } from "@/components/bt/button";
import { Chip, ChipScroller } from "@/components/bt/chip";
import { cx } from "@/components/bt/cx";
import { FOCUS, FONT, MONO, TRANSITION } from "@/components/bt/styles";
import { Tag } from "@/components/bt/tag";
import { Display, Highlight } from "@/components/bt/typography";

/**
 * Bloques del home (2a / 4a) que bt no tiene: hero con foto, tira de
 * categorías y "Cómo funciona". Server components; desktop desde `lg`
 * (donde aparece el Header), mobile debajo.
 */

/* ── HomeHero ─────────────────────────────────────────────────
   Partido (pedido del cliente: marca grande y hero más bajo).
   Desktop: 2 columnas 1.15fr / 1fr de 440 px. Izquierda: logo
   min(17vw,240) + wordmark apilado min(6.6vw,93) (3 líneas ≈ alto del
   logo), y debajo Tag + H1 hero-split + CTA con la subline. Derecha:
   la foto, radio 10. Mobile: logo 38vw + wordmark 14.7vw en fila (≈ el
   ancho a 360), la foto 16:10 con Tag + H1 encima sobre degradé y el
   CTA a todo el ancho. Grilla con celdas explícitas para no duplicar
   el H1 entre los dos órdenes.
   ──────────────────────────────────────────────────────────── */

export function HomeHero({
  photo,
  photoAlt,
  tag,
  titleLead,
  titleHighlight,
  cta,
  subline,
}: {
  photo: string;
  photoAlt: string;
  tag: string;
  titleLead: string;
  titleHighlight: string;
  cta: { href: string; label: string };
  subline?: string;
}) {
  return (
    <section className="px-4 py-4 lg:px-14 lg:py-6">
      <div
        className={cx(
          "grid grid-cols-1 gap-3",
          "lg:h-[440px] lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)_auto_auto] lg:gap-x-10 lg:gap-y-5",
        )}
      >
        <div className="row-start-1 flex items-center gap-4 lg:col-start-1 lg:gap-5">
          <Logo size="fluid" decorative className="size-[min(38vw,220px)] lg:size-[min(17vw,240px)]" />
          <Wordmark size="hero" stacked />
        </div>

        <div className="relative row-start-2 aspect-[16/10] overflow-hidden rounded-card bg-surface lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:aspect-auto">
          {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary/Pexels ya transformadas */}
          <img
            src={photo}
            alt={photoAlt}
            fetchPriority="high"
            className="absolute inset-0 block h-full w-full object-cover"
          />
          {/* Degradé solo en mobile, donde el título va encima de la foto. */}
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,17,16,0)_25%,rgba(18,17,16,.9))] lg:hidden"
          />
        </div>

        <div className="relative z-10 row-start-2 flex flex-col items-start gap-[10px] self-end p-4 lg:col-start-1 lg:row-start-2 lg:gap-3 lg:p-0">
          <Tag tone="red" size="hero">
            {tag}
          </Tag>
          <Display size="hero-split">
            {titleLead} <Highlight>{titleHighlight}</Highlight>
          </Display>
        </div>

        <div className="row-start-3 flex items-center gap-3 lg:col-start-1">
          <Button href={cta.href} variant="primary" size="lg" className="max-lg:w-full">
            {cta.label}
          </Button>
          {subline && (
            <span className={cx("text-[16px] font-medium text-text-2 max-lg:hidden", FONT)}>
              {subline}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

/* ── CategoryStrip ────────────────────────────────────────────
   2a: 7 celdas con divisores de 1 px (índice mono 12 + nombre 800 20 @80).
   4a: chips scrolleables de 44 px (bt Chip).
   ──────────────────────────────────────────────────────────── */

export function CategoryStrip({
  cells,
}: {
  cells: { index: string; name: string; href: string }[];
}) {
  return (
    <>
      <nav
        aria-label="Categorías"
        className="mx-14 my-6 grid gap-px overflow-hidden rounded-card border border-line bg-line max-lg:hidden"
        style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}
      >
        {cells.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className={cx(
              "flex min-w-0 flex-col gap-[6px] bg-ink px-[18px] py-[22px] text-paper hover:bg-surface",
              FONT,
              TRANSITION,
              FOCUS,
              "focus-visible:-outline-offset-2",
            )}
          >
            <span className={cx("text-[12px] font-semibold text-text-3", MONO)}>{c.index}</span>
            <span className="text-[20px] leading-[1.1] font-extrabold uppercase stretch-80">{c.name}</span>
          </Link>
        ))}
      </nav>
      <ChipScroller className="px-4 pt-1 pb-2 lg:hidden">
        {cells.map((c) => (
          <Chip key={c.href} href={c.href}>
            {c.name}
          </Chip>
        ))}
      </ChipScroller>
    </>
  );
}

/* ── HowItWorks ───────────────────────────────────────────────
   2a: 3 columnas con divisores (n.º 900 56 @66 amarillo, título 900 28
   @72, texto 15/1.5). 4a: lista con columna de 52 px (n.º 40, título 20,
   texto 14/1.4) y textos cortos.
   ──────────────────────────────────────────────────────────── */

export interface HowStep {
  n: string;
  title: string;
  text: string;
  /** Texto corto de 4a; por defecto el mismo. */
  textMobile?: string;
}

export function HowItWorks({ steps }: { steps: HowStep[] }) {
  return (
    <section aria-label="Cómo funciona" className={FONT}>
      <ol className="m-0 mx-14 mb-[72px] grid list-none grid-cols-3 gap-px overflow-hidden rounded-card border border-line bg-line p-0 max-lg:hidden">
        {steps.map((s) => (
          <li key={s.n} className="flex flex-col gap-[10px] bg-ink p-8 text-paper">
            <span className="text-[56px] leading-none font-black text-yellow stretch-66">{s.n}</span>
            <span className="text-[28px] leading-none font-black uppercase stretch-72">{s.title}</span>
            <span className="text-[15px] leading-[1.5] text-text-2">{s.text}</span>
          </li>
        ))}
      </ol>
      <ol className="m-0 mx-4 mb-7 flex list-none flex-col overflow-hidden rounded-box border border-line p-0 lg:hidden">
        {steps.map((s, i) => (
          <li
            key={s.n}
            className={cx(
              "grid grid-cols-[52px_1fr] items-center gap-3 p-4 text-paper",
              i < steps.length - 1 && "border-b border-line",
            )}
          >
            <span className="text-[40px] leading-none font-black text-yellow stretch-66">{s.n}</span>
            <span className="flex min-w-0 flex-col gap-1">
              <span className="text-[20px] leading-none font-black uppercase stretch-72">{s.title}</span>
              <span className="text-[14px] leading-[1.4] text-text-2">{s.textMobile ?? s.text}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
