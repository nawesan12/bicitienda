import type { ReactNode } from "react";
import { Footer } from "@/components/bt/footer";
import type { StoreHrefs, StoreNavKey } from "@/components/bt/header";
import { StoreChrome } from "@/components/store/store-chrome";
import { STORE_INFO } from "@/lib/data/demo/settings";
import { WHATSAPP_PENDING } from "@/lib/config";
import { features } from "@/lib/features";
import { paths } from "@/lib/paths";
import { formatArPhone } from "@/lib/phone";
import { getCategories, getStore, getVisibleProducts } from "@/lib/server/queries";
import type { Category, Product } from "@/lib/types";
import { waUrl } from "@/lib/whatsapp";

/** Grupos del nav que son categorías (los otros dos son turnos y presupuesto). */
const NAV_GROUPS = ["bicicletas", "accesorios", "repuestos", "importados"] as const;

/** Links del chrome de la tienda: salen de `routes` (lib/paths.ts). */
export function storeHrefs(): StoreHrefs {
  return {
    home: "/",
    cart: paths.cart(),
    // Sin cuentas, "Cuenta" lleva al seguimiento de pedidos.
    account: features.accounts ? paths.account() : paths.tracking(),
    search: paths.catalog(),
    nav: {
      bicicletas: paths.catalog("bicicletas"),
      accesorios: paths.catalog("accesorios"),
      repuestos: paths.catalog("repuestos"),
      importados: paths.catalog("importados"),
      presupuesto: paths.quote(),
      turnos: paths.appointments(),
    },
  };
}

/**
 * Path → grupo del nav que se marca activo: cada categoría (y sus tipos)
 * y cada ficha de producto (por la categoría del producto: una MTB marca
 * "Bicicletas"). También devuelve los paths de categoría, que son los
 * únicos de /catalogo/* que llevan buscador en mobile.
 */
function navMaps(categories: Category[], products: Product[]) {
  const bySlug = new Map(categories.map((c) => [c.slug, c]));
  const groupOf = (slug: string): StoreNavKey | undefined => {
    let root: Category | undefined = bySlug.get(slug);
    while (root?.parentSlug) root = bySlug.get(root.parentSlug);
    return NAV_GROUPS.find((g) => g === root?.slug);
  };
  const activeByPath: Record<string, StoreNavKey> = {};
  const categoryPaths: string[] = [];
  for (const c of categories) {
    categoryPaths.push(paths.catalog(c.pathSlug));
    const key = groupOf(c.slug);
    if (key) activeByPath[paths.catalog(c.pathSlug)] = key;
  }
  for (const p of products) {
    const key = groupOf(p.category);
    if (key) activeByPath[paths.catalog(p.slug)] = key;
  }
  return { activeByPath, categoryPaths };
}

/**
 * Chrome común de la tienda pública (sistema bt): header (isla cliente
 * con carrito y cuenta) + contenido + footer. Server component, estático:
 * lee settings y categorías cacheados por tag. Lo usan
 * app/(tienda)/layout.tsx y app/not-found.tsx.
 */
export async function StoreFrame({ children }: { children: ReactNode }) {
  const [runtime, categories, products] = await Promise.all([getStore(), getCategories(), getVisibleProducts()]);
  const nav = navMaps(categories, products);
  const pending = runtime.whatsapp === WHATSAPP_PENDING;
  const whatsapp = pending ? STORE_INFO.whatsapp : formatArPhone(runtime.whatsapp);
  const hrefs = storeHrefs();

  return (
    <div className="flex min-h-dvh flex-col bg-ink text-paper">
      <StoreChrome
        hrefs={hrefs}
        activeByPath={nav.activeByPath}
        categoryPaths={nav.categoryPaths}
        noSearchPrefixes={[paths.cart(), paths.appointments(), paths.quote(), paths.account()]}
        menuInfo={`WhatsApp ${whatsapp} · ${runtime.hours}`}
        accounts={features.accounts}
        accountPrefix={paths.account()}
      />
      <main id="contenido" className="flex-1">
        {children}
      </main>
      <Footer
        homeHref={hrefs.home}
        address={runtime.address}
        hours={runtime.hours}
        whatsapp={whatsapp}
        whatsappHref={pending ? undefined : waUrl(runtime.whatsapp)}
        socials={[
          { label: "Instagram", href: `https://www.instagram.com/${runtime.instagram}` },
          { label: "Facebook" },
        ]}
        transferDiscountPct={runtime.transferDiscount}
      />
    </div>
  );
}
