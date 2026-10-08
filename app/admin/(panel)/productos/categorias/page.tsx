import type { Metadata } from "next";
import { ResponsiveTopBar } from "@/components/bt";
import { getAdminCategories } from "@/lib/server/admin-queries";
import { syncCategories } from "@/lib/server/category-sync";
import { getDb } from "@/lib/server/db";
import { CategoriesEditor, CategorySyncBanner, NewCategoryButton } from "./categories-editor";
import { NAV_GROUPS } from "./nav-groups";

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
  // Solo calcula (apply: false): el aviso aparece si la base no está al día.
  const plan = await syncCategories(await getDb(), { apply: false });
  return (
    <>
      <ResponsiveTopBar
        title="Categorías"
        back={{ href: "/admin/productos", label: "Productos" }}
        actions={
          <NewCategoryButton
            groups={NAV_GROUPS.flatMap((g) => categories.filter((c) => c.slug === g && !c.parentSlug)).map((c) => ({
              slug: c.slug,
              label: c.label,
            }))}
          />
        }
      />
      {plan.outdated && (
        <div className="px-4 pt-4 lg:px-10 lg:pt-6">
          <CategorySyncBanner
            created={plan.created}
            removed={plan.removed.map((r) => r.label)}
            moved={plan.moved.length}
          />
        </div>
      )}
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
