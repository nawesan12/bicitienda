"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { lexicon } from "@/lib/data/content";
import { img } from "@/lib/images";
import { useCompare } from "@/lib/compare-store";

/** URL del comparador con la selección: /comparador?ids=a,b,c */
export function compareHref(slugs: string[]): string {
  return slugs.length ? `/comparador?ids=${slugs.join(",")}` : "/comparador";
}

/** true cuando el modelo está en el comparador (falso hasta hidratar). */
function useInCompare(slug: string) {
  const { slugs, hydrated, toggle } = useCompare();
  return { on: hydrated && slugs.includes(slug), toggle: () => toggle(slug) };
}

/**
 * Pill "+ VS" / "✓ VS" de las tarjetas del catálogo (arriba a la derecha).
 * Con 3 elegidos, tocar uno nuevo no hace nada, como el prototipo.
 */
export function CompareToggle({ slug }: { slug: string }) {
  const { on, toggle } = useInCompare(slug);
  return (
    <button
      type="button"
      title={lexicon.product.compareTitle}
      aria-pressed={on}
      onClick={toggle}
      className={`hit absolute right-3 top-3 z-[2] rounded-full border-[1.5px] px-[11px] py-[6px] font-sans text-[11px] font-bold hover:border-ink hover:text-ink ${
        on
          ? "border-brand bg-brand-pastel text-brand-deeper"
          : "border-ink/[.18] bg-white text-ink/55"
      }`}
    >
      {on ? lexicon.product.compareShortIn : lexicon.product.compareShortAdd}
    </button>
  );
}

/** "+ Agregar al comparador" / "✓ En el comparador · quitar" de la ficha. */
export function CompareToggleLong({ slug }: { slug: string }) {
  const { on, toggle } = useInCompare(slug);
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={toggle}
      className="mt-[10px] box-border block w-full rounded-full border-[1.5px] border-dashed border-ink/25 p-[11px] text-center font-sans text-[13px] font-bold text-ink hover:border-brand hover:text-brand-deeper"
    >
      {on ? lexicon.product.compareIn : lexicon.product.compareAdd}
    </button>
  );
}

/** "Comparar (n)" del nav: solo desktop y con algo elegido. */
export function NavCompareButton() {
  const { slugs, hydrated } = useCompare();
  if (!hydrated || slugs.length === 0) return null;
  return (
    <Link
      href={compareHref(slugs)}
      className="hidden rounded-full bg-cream px-[14px] py-2 font-sans text-[12px] font-bold text-night hover:bg-brand hover:text-night min-[1140px]:block"
    >
      {lexicon.nav.compare} ({slugs.length})
    </Link>
  );
}

/**
 * Bandeja flotante del comparador: solo en el catálogo y la ficha, con
 * algo elegido. En desktop muestra los lugares vacíos punteados; debajo de
 * 1140px sube a 84px del borde (sobre el botón de WhatsApp) y los oculta.
 */
export function CompareTray({
  items,
  listPaths,
  catalogBase,
}: {
  /** slug → nombre y foto de todo el catálogo visible. */
  items: { slug: string; name: string; image: string | null }[];
  /** Paths del catálogo (portada y categorías). */
  listPaths: string[];
  /** Prefijo de las fichas: "/vehiculos/". */
  catalogBase: string;
}) {
  const pathname = usePathname();
  const { slugs, hydrated } = useCompare();
  const onCatalog =
    listPaths.includes(pathname) ||
    items.some((p) => pathname === `${catalogBase}${p.slug}`);
  if (!hydrated || slugs.length === 0 || !onCatalog) return null;

  const selected = slugs
    .map((s) => items.find((p) => p.slug === s))
    .filter((p) => p != null);
  const empty = Math.max(0, 3 - selected.length);

  return (
    <div className="animate-pop-in-fast fixed inset-x-0 bottom-[84px] z-[85] mx-auto box-content flex w-fit max-w-[calc(100vw-32px)] items-center gap-[10px] rounded-full border border-[rgba(94,184,56,.45)] bg-night py-2 pl-[18px] pr-2 shadow-[0_16px_40px_rgba(0,0,0,.3)] min-[1140px]:bottom-[22px]">
      <span className="font-sans text-[11px] font-bold tracking-[.18em] text-cream/55">
        {lexicon.compare.trayLabel}
      </span>
      {selected.map((p) => (
        <div
          key={p.slug}
          className="box-border flex h-10 w-[54px] items-center justify-center rounded-[10px] bg-white p-[3px]"
        >
          {p.image && (
            // eslint-disable-next-line @next/next/no-img-element -- Cloudinary transforma (img())
            <img
              src={img(p.image, { w: 120 })}
              alt={p.name}
              className="max-h-full max-w-full object-contain"
            />
          )}
        </div>
      ))}
      {Array.from({ length: empty }).map((_, i) => (
        <div
          key={i}
          className="box-border hidden h-10 w-[54px] rounded-[10px] border-[1.5px] border-dashed border-cream/25 min-[1140px]:block"
        />
      ))}
      <Link
        href={compareHref(slugs)}
        className="whitespace-nowrap rounded-full bg-brand px-[18px] py-3 font-sans text-[13px] font-bold text-night hover:bg-brand-hover"
      >
        {lexicon.nav.compare} ({slugs.length}) →
      </Link>
    </div>
  );
}
