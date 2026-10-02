import type { Metadata } from "next";
import { lexicon } from "@/lib/data/content";
import {
  getAdminCategories,
  getAdminProducts,
} from "@/lib/server/admin-queries";
import { getBrands } from "@/lib/server/queries";
import { ProductsManager } from "./products-manager";

export const metadata: Metadata = { title: "Productos" };

export default async function AdminProductosPage({
  searchParams,
}: {
  searchParams: Promise<{ editar?: string; vista?: string }>;
}) {
  const [{ editar, vista }, products, categories, brands] = await Promise.all([
    searchParams,
    getAdminProducts(),
    getAdminCategories(),
    getBrands(),
  ]);

  // Sugerencias de marca: las del local + las cargadas en la base.
  const brandNames = [
    ...new Set([...(lexicon.admin.brandSuggestions ?? []), ...brands.map((b) => b.name)]),
  ];

  return (
    <ProductsManager
      products={products}
      categories={categories}
      brandNames={brandNames}
      initialOpen={editar ?? null}
      initialView={vista === "categorias" ? "cats" : "list"}
    />
  );
}
