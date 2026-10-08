import type { Metadata } from "next";
import { ResponsiveTopBar } from "@/components/bt";
import { getAdminCategories } from "@/lib/server/admin-queries";
import { CategoriesEditor, NewCategoryButton } from "./categories-editor";

export const metadata: Metadata = { title: "Categorías" };

/**
 * Categorías (sección de Productos, sin ítem propio en el nav). Respeta la
 * jerarquía de `parentSlug`: los grupos del menú (Bicicletas, Accesorios,
 * Repuestos, Importados) y los tipos de cada uno. Nombre, slug, orden y
 * cantidad de productos; crear, renombrar, reordenar y eliminar (solo sin
 * productos). Las acciones son las de `lib/server/actions/categories.ts`.
 */
export default async function CategoriasPage() {
  const categories = await getAdminCategories();
  return (
    <>
      <ResponsiveTopBar
        title="Categorías"
        back={{ href: "/admin/productos", label: "Productos" }}
        actions={
          <NewCategoryButton
            groups={categories.filter((c) => !c.parentSlug).map((c) => ({ slug: c.slug, label: c.label }))}
          />
        }
      />
      <CategoriesEditor
        categories={categories.map((c) => ({
          slug: c.slug,
          label: c.label,
          pathSlug: c.pathSlug,
          parentSlug: c.parentSlug,
          order: c.order,
          count: c.count,
        }))}
      />
    </>
  );
}
