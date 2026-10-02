import type { Metadata } from "next";
import { CatalogView } from "@/components/store/catalog-view";
import { StoreShell } from "@/components/store/store-shell";
import { lexicon } from "@/lib/data/content";
import { paths } from "@/lib/paths";

/**
 * ISR: se regenera on-demand por tag desde el admin (invalidatePublic);
 * 1 día es solo el respaldo (literal: la segment config no admite imports).
 */
export const revalidate = 86400;

export const metadata: Metadata = {
  title: lexicon.catalog.metaTitle,
  description: lexicon.catalog.metaDescription,
  alternates: { canonical: paths.catalog() },
};

export default function VehiclesPage() {
  return (
    <StoreShell>
      <CatalogView category={null} />
    </StoreShell>
  );
}
