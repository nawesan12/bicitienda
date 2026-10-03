import Link from "next/link";
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
   2a: caja radio 10 de 580 px (el height del prototipo es content-box) dentro de padding 24/56, padding 44, gap 20,
   degradé .1 → .93, H1 120. 4a: a sangre 540 px (500 + padding), padding 20/16, gap 14,
   degradé .05 → .94, H1 76, CTA a todo el ancho y sin la subline.
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
    <section className="lg:px-14 lg:py-6">
      <div
        className={cx(
          "relative flex h-[540px] flex-col justify-end gap-[14px] overflow-hidden bg-surface px-4 py-5",
          "lg:h-[580px] lg:gap-5 lg:rounded-card lg:p-11",
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary/Pexels ya transformadas */}
        <img
          src={photo}
          alt={photoAlt}
          fetchPriority="high"
          className="absolute inset-0 block h-full w-full object-cover"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,17,16,.05)_20%,rgba(18,17,16,.94))] lg:bg-[linear-gradient(180deg,rgba(18,17,16,.1)_25%,rgba(18,17,16,.93))]"
        />
        <Tag tone="red" size="hero" className="relative self-start">
          {tag}
        </Tag>
        <Display size="hero" className="relative max-w-[760px]">
          {titleLead} <Highlight>{titleHighlight}</Highlight>
        </Display>
        <div className="relative flex items-center gap-3">
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
