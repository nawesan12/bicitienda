import type { Metadata } from "next";
import Link from "next/link";
import { CompareView, type CompareProduct } from "@/components/store/compare-table";
import { StoreShell } from "@/components/store/store-shell";
import { cmpPresets, lexicon } from "@/lib/data/content";
import { paths } from "@/lib/paths";
import { ratesOf } from "@/lib/pricing";
import { toCardProduct } from "@/lib/product-view";
import {
  getBrands,
  getCategories,
  getStore,
  getVisibleProducts,
} from "@/lib/server/queries";
import { sortSpecs } from "@/lib/specs";

/**
 * ISR estática: la selección (?ids=) se resuelve en el cliente. Se regenera
 * on-demand por tag desde el admin (invalidatePublic);
 * 1 día es solo el respaldo (literal: la segment config no admite imports).
 */
export const revalidate = 86400;

export const metadata: Metadata = {
  title: lexicon.compare.title,
  description: lexicon.compare.metaDescription,
  alternates: { canonical: "/comparador" },
};

export default async function ComparadorPage() {
  const [visible, brands, categories, runtime] = await Promise.all([
    getVisibleProducts(),
    getBrands(),
    getCategories(),
    getStore(),
  ]);
  const products: CompareProduct[] = visible.map((p) => ({
    ...toCardProduct(p, brands, categories),
    specs: sortSpecs(p.specs),
    catName: categories.find((c) => c.slug === p.category)?.label ?? "",
  }));

  return (
    <StoreShell>
      <section className="animate-fade-in box-content min-h-screen bg-cream px-[clamp(16px,4vw,40px)] pb-[110px] pt-10">
        <div className="mx-auto max-w-wide">
          <Link
            href={paths.catalog()}
            className="hit relative font-sans text-[13px] font-bold text-ink/55 hover:text-ink"
          >
            {lexicon.catalog.backLink}
          </Link>
          <CompareView
            products={products}
            presets={cmpPresets}
            rates={ratesOf(runtime)}
            whatsapp={runtime.whatsapp}
          />
        </div>
      </section>
    </StoreShell>
  );
}
