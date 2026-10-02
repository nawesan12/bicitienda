"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { WaLink } from "@/components/store/wa-link";
import { COMPARE_LIMIT, useCompare } from "@/lib/compare-store";
import { lexicon } from "@/lib/data/content";
import { img } from "@/lib/images";
import { paths } from "@/lib/paths";
import type { PricingRates } from "@/lib/pricing";
import { priceView, type CardProduct } from "@/lib/product-view";
import { compareMetrics, SPEC_KEYS } from "@/lib/specs";
import type { ComparePreset, Spec } from "@/lib/types";
import { wa } from "@/lib/whatsapp";

/** Producto del comparador: la tarjeta + sus specs ya ordenadas. */
export type CompareProduct = CardProduct & {
  specs: Spec[];
  /** Nombre plural de la categoría para el select ("Bicicletas"). */
  catName: string;
};

const STD: readonly string[] = SPEC_KEYS;
const cellB = "border-b border-ink/[.06]";
const cellL = "border-l border-ink/[.06]";

/**
 * Comparador del prototipo: hasta 3 modelos, select para sumar sin salir,
 * comparaciones armadas si está vacío, "Lo esencial" con barras y MEJOR,
 * y la ficha técnica completa con "Solo diferencias". La selección vive en
 * el store (compartida con "+ VS") y se refleja en ?ids= para compartir.
 */
export function CompareView({
  products,
  presets,
  rates,
  whatsapp,
}: {
  products: CompareProduct[];
  presets: ComparePreset[];
  rates: PricingRates;
  whatsapp: string;
}) {
  const { slugs, hydrated, remove, replace } = useCompare();
  const [diff, setDiff] = useState(false);
  const imported = useRef(false);

  // ?ids= manda sobre lo guardado (es un link compartido).
  useEffect(() => {
    if (!hydrated || imported.current) return;
    imported.current = true;
    const ids = new URLSearchParams(window.location.search)
      .get("ids")
      ?.split(",")
      .filter((s) => products.some((p) => p.slug === s));
    if (ids?.length) replace(ids);
  }, [hydrated, products, replace]);

  useEffect(() => {
    if (!hydrated || !imported.current) return;
    const qs = slugs.length ? `?ids=${slugs.join(",")}` : "";
    if (qs !== window.location.search)
      window.history.replaceState(null, "", `${window.location.pathname}${qs}`);
  }, [slugs, hydrated]);

  const items = hydrated
    ? slugs
        .map((s) => products.find((p) => p.slug === s))
        .filter((p) => p != null)
    : [];
  const n = items.length;

  const labels: string[] = [];
  for (const p of items)
    for (const s of p.specs) if (!labels.includes(s.label)) labels.push(s.label);
  const ordered = [
    ...STD.filter((k) => labels.includes(k)),
    ...labels.filter((k) => !STD.includes(k)),
  ];
  let rows = ordered.map((label) => {
    const vals = items.map(
      (p) => p.specs.find((s) => s.label === label)?.value ?? "—",
    );
    return { label, same: vals.every((v) => v === vals[0]), vals };
  });
  if (diff && n > 1) {
    rows = rows.filter((r) => !r.same);
    if (!rows.length)
      rows = [
        {
          label: lexicon.compare.diffRow,
          same: false,
          vals: items.map(() => lexicon.compare.diffSame),
        },
      ];
  }
  const metrics = compareMetrics(items);
  const presetCards = presets
    .map((pr) => {
      const its = pr.ids
        .map((id) => products.find((p) => p.slug === id))
        .filter((p) => p != null);
      return { label: pr.label, its };
    })
    .filter((x) => x.its.length);

  return (
    <>
      <div className="mt-[14px] flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display m-0 text-[clamp(34px,4vw,54px)]">
            {lexicon.compare.title}
          </h1>
          <p className="mb-0 mt-2 font-sans text-[14.5px] text-ink/60">
            {lexicon.compare.sub}
          </p>
        </div>
        {n < COMPARE_LIMIT && (
          <select
            aria-label={lexicon.compare.addPlaceholder}
            value=""
            onChange={(e) => {
              const id = e.target.value;
              if (id && slugs.length < COMPARE_LIMIT && !slugs.includes(id))
                replace([...slugs, id]);
            }}
            className="min-w-[260px] max-w-full rounded-xl border-[1.5px] border-ink bg-white px-[14px] py-3 font-sans text-[13.5px] font-semibold text-ink outline-none"
          >
            <option value="">{lexicon.compare.addPlaceholder}</option>
            {products
              .filter((p) => !slugs.includes(p.slug))
              .map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.catName} · {p.name}
                </option>
              ))}
          </select>
        )}
      </div>

      {hydrated && n === 0 && (
        <div className="mt-7 rounded-[20px] border border-ink/10 bg-white p-7">
          <div className="font-display text-[18px] font-extrabold tracking-normal">
            {lexicon.compare.emptyTitle}
          </div>
          <div className="mt-1 font-sans text-[13.5px] text-ink/55">
            {lexicon.compare.emptySub[0]}
            <strong>{lexicon.compare.emptySub[1]}</strong>
            {lexicon.compare.emptySub[2]}
          </div>
          <div className="mt-[18px] grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-3">
            {presetCards.map((pr) => (
              <button
                key={pr.label}
                type="button"
                onClick={() => replace(pr.its.map((p) => p.slug))}
                className="flex flex-col gap-[6px] rounded-2xl border-[1.5px] border-ink/[.12] bg-cream-3 p-[18px] text-left text-ink hover:border-brand"
              >
                <span className="font-sans text-[10.5px] font-bold tracking-[.18em] text-brand-deep">
                  {pr.label}
                </span>
                <span className="font-sans text-[14px] font-bold leading-[1.4]">
                  {pr.its.map((p) => p.name).join(" vs ")}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {n > 0 && (
        <>
          <div className="mt-[26px] overflow-x-auto rounded-[20px]">
            <div
              className="grid min-w-fit overflow-hidden rounded-[20px] border border-ink/[.12] bg-white"
              style={{ gridTemplateColumns: `150px repeat(${n}, minmax(220px, 1fr))` }}
            >
              <div className="flex items-end border-b border-ink/[.08] p-[18px] font-sans text-[11px] font-bold tracking-[.2em] text-ink/45">
                {lexicon.compare.countLabel(n)}
              </div>
              {items.map((p) => {
                const v = priceView(rates, p);
                const href = paths.catalog(p.slug);
                return (
                  <div
                    key={p.slug}
                    className={`flex flex-col gap-[5px] border-b border-ink/[.08] p-[18px] ${cellL}`}
                  >
                    <Link
                      href={href}
                      className="relative box-border block aspect-[4/3] rounded-[14px] bg-cream-4"
                    >
                      {p.image && (
                        // eslint-disable-next-line @next/next/no-img-element -- Cloudinary transforma (img())
                        <img
                          src={img(p.image, { w: 480 })}
                          alt={p.name}
                          className="absolute inset-2 block h-[calc(100%-16px)] w-[calc(100%-16px)] object-contain mix-blend-multiply"
                        />
                      )}
                    </Link>
                    <div className="mt-2 font-sans text-[10.5px] font-semibold tracking-[.16em] text-ink/45">
                      {p.catLabel}
                    </div>
                    <Link
                      href={href}
                      className="font-display text-[17px] font-extrabold tracking-normal text-ink hover:text-brand-deep"
                    >
                      {p.name}
                    </Link>
                    <div className="font-display text-[16px] font-extrabold tracking-normal">
                      {v.priceF}
                    </div>
                    <div className="font-sans text-[11.5px] text-brand-deep">{v.sub}</div>
                    <div className="mt-2 flex items-center gap-2">
                      <WaLink
                        whatsapp={whatsapp}
                        {...wa.product(p.name)}
                        className="flex-1 rounded-full bg-ink px-3 py-[10px] text-center font-sans text-[12px] font-bold text-cream hover:bg-brand hover:text-night"
                      >
                        {lexicon.product.consult}
                      </WaLink>
                      <button
                        type="button"
                        title={lexicon.compare.remove}
                        aria-label={lexicon.compare.remove}
                        onClick={() => remove(p.slug)}
                        className="hit relative rounded-full border-[1.5px] border-ink/15 px-3 py-2 font-sans text-[12px] font-bold text-ink/50 hover:border-[rgba(204,51,51,.4)] hover:text-danger"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}

              <div className="col-span-full bg-night px-[18px] py-3 font-sans text-[11px] font-bold tracking-[.24em] text-brand">
                {lexicon.compare.essentials}
              </div>
              {metrics.map((row) => (
                <div key={row.label} className="contents">
                  <div
                    className={`bg-cream-3 px-[18px] py-[14px] font-sans text-[12.5px] font-semibold leading-[1.35] text-ink/60 ${cellB}`}
                  >
                    {row.label}
                    <div className="mt-[2px] font-sans text-[10.5px] font-normal leading-normal text-ink/40">
                      {row.hint}
                    </div>
                  </div>
                  {row.cells.map((c, i) => (
                    <div key={i} className={`px-[18px] py-[14px] ${cellB} ${cellL}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-[16px] font-extrabold tracking-normal">
                          {c.txt}
                        </span>
                        {c.isBest && (
                          <span className="rounded-full bg-brand-pastel px-2 py-[3px] font-sans text-[9.5px] font-bold tracking-[.14em] text-brand-deeper">
                            MEJOR
                          </span>
                        )}
                      </div>
                      <div className="mt-[9px] h-[6px] overflow-hidden rounded-[99px] bg-cream-5">
                        <div
                          className={`h-full rounded-[99px] ${c.isBest ? "bg-brand" : "bg-ink/70"}`}
                          style={{ width: `${c.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ))}

              <div className="col-span-full flex items-center justify-between gap-3 bg-night py-[9px] pl-[18px] pr-3">
                <span className="font-sans text-[11px] font-bold tracking-[.24em] text-brand">
                  {lexicon.compare.specsSheet}
                </span>
                <button
                  type="button"
                  aria-pressed={diff}
                  onClick={() => setDiff(!diff)}
                  className={`rounded-full border-[1.5px] px-[14px] py-[7px] font-sans text-[11.5px] font-bold hover:border-brand ${
                    diff
                      ? "border-brand bg-brand text-night"
                      : "border-cream/30 bg-transparent text-cream"
                  }`}
                >
                  {diff ? lexicon.compare.diffOn : lexicon.compare.diffOff}
                </button>
              </div>
              {rows.map((row) => (
                <div key={row.label} className="contents">
                  <div
                    className={`bg-cream-3 px-[18px] py-3 font-sans text-[12.5px] font-semibold text-ink/55 ${cellB}`}
                  >
                    {row.label}
                  </div>
                  {row.vals.map((val, i) => (
                    <div
                      key={i}
                      className={`px-[18px] py-3 font-sans text-[13px] leading-[1.45] ${cellB} ${cellL} ${
                        val === "—" ? "text-ink/35" : row.label === lexicon.compare.diffRow ? "text-ink/50" : "text-ink"
                      }`}
                    >
                      {val}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 font-sans text-[11.5px] text-ink/45">
            {lexicon.compare.footnote}
          </div>
        </>
      )}
    </>
  );
}
