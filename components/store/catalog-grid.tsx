"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ProductCard } from "@/components/store/product-card";
import { WaLink } from "@/components/store/wa-link";
import { useCatalogFilters } from "@/lib/catalog-store";
import { lexicon } from "@/lib/data/content";
import {
  applyFilters,
  filtersFromQuery,
  filtersToQuery,
  type SortKey,
} from "@/lib/filters";
import { paths } from "@/lib/paths";
import type { PricingRates } from "@/lib/pricing";
import type { CardProduct } from "@/lib/product-view";
import { wa } from "@/lib/whatsapp";

const select =
  "rounded-xl border-[1.5px] border-ink/[.18] bg-white px-[14px] py-[10px] font-sans text-[13px] font-semibold text-ink outline-none";

/**
 * Vista Vehículos del prototipo: título y contador, pills de categoría
 * (cada una es su ruta, prerenderizada), select de marca (las marcas
 * cargadas), orden y la grilla. Marca, orden y búsqueda se aplican en el
 * cliente sobre la lista completa del server y se reflejan en la URL con
 * history.replaceState (sin pedir nada al server).
 */
export function CatalogGrid({
  title,
  products,
  categories,
  activeCategory,
  brands,
  rates,
  whatsapp,
}: {
  title: string;
  products: CardProduct[];
  categories: { slug: string; label: string; pathSlug: string }[];
  /** Slug de la categoría de la ruta; null = todas. */
  activeCategory: string | null;
  /** Marcas presentes en el catálogo visible, en orden de aparición. */
  brands: { id: string; name: string }[];
  rates: PricingRates;
  whatsapp: string;
}) {
  const filters = useCatalogFilters();
  const { brand, sort, search, set } = filters;
  const imported = useRef(false);

  // Al entrar: lo que traiga la URL (link compartido, chip de marca de
  // Nosotros) pisa el estado; lo que no traiga se conserva (lo tipeado en
  // el buscador del nav antes de llegar).
  useEffect(() => {
    set(filtersFromQuery(window.location.search));
    imported.current = true;
  }, [set]);

  useEffect(() => {
    if (!imported.current) return;
    const qs = filtersToQuery({ brand, sort, search });
    if (qs !== window.location.search) {
      window.history.replaceState(null, "", `${window.location.pathname}${qs}`);
    }
  }, [brand, sort, search]);

  const list = applyFilters(products, activeCategory, { brand, sort, search });
  const pill = (on: boolean) =>
    `hit relative rounded-full border-[1.5px] px-[18px] py-[10px] font-sans text-[13px] font-bold hover:border-ink hover:text-ink ${
      on ? "border-ink bg-ink text-brand" : "border-ink/[.18] bg-white text-ink/65"
    }`;

  return (
    <section className="animate-fade-in box-content min-h-screen bg-cream px-[clamp(16px,4vw,40px)] pb-[90px] pt-10">
      <div className="mx-auto max-w-wide">
        <div className="flex flex-wrap items-baseline justify-between gap-[14px]">
          <h1 className="font-display m-0 text-[clamp(34px,4vw,56px)]">{title}</h1>
          <div className="font-sans text-[13px] text-ink/55">
            {list.length} {lexicon.unitPlural} · {lexicon.catalog.countSuffix}
          </div>
        </div>

        <div className="mt-[26px] flex flex-wrap items-center gap-[10px]">
          <Link href={paths.catalog()} scroll={false} className={pill(!activeCategory)}>
            {lexicon.catalog.allLabel}
          </Link>
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={paths.catalog(c.pathSlug)}
              scroll={false}
              className={pill(activeCategory === c.slug)}
            >
              {c.label}
            </Link>
          ))}
          <span className="flex-1" />
          <select
            aria-label={lexicon.catalog.allBrands}
            className={select}
            value={brand}
            onChange={(e) => set({ brand: e.target.value })}
          >
            <option value="">{lexicon.catalog.allBrands}</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <select
            aria-label={lexicon.catalog.sortRel}
            className={select}
            value={sort}
            onChange={(e) => set({ sort: e.target.value as SortKey })}
          >
            <option value="rel">{lexicon.catalog.sortRel}</option>
            <option value="asc">{lexicon.catalog.sortAsc}</option>
            <option value="desc">{lexicon.catalog.sortDesc}</option>
          </select>
        </div>

        {list.length === 0 && (
          <div className="px-5 py-[90px] text-center font-sans text-[15px] text-ink/50">
            {lexicon.catalog.emptyBefore}
            <WaLink
              whatsapp={whatsapp}
              {...wa.general()}
              className="text-brand-deep hover:text-brand-deeper"
            >
              {lexicon.catalog.emptyLink}
            </WaLink>
            .
          </div>
        )}
        <div className="mt-[34px] grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-[18px]">
          {list.map((p) => (
            <ProductCard key={p.slug} product={p} rates={rates} whatsapp={whatsapp} />
          ))}
        </div>
      </div>
    </section>
  );
}
