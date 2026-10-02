import { AdvisorProvider } from "@/components/store/advisor-modals";
import { CartDrawer } from "@/components/store/cart-drawer";
import { CompareTray } from "@/components/store/compare-button";
import { features } from "@/lib/features";
import { NewsletterBand } from "@/components/store/newsletter-band";
import { SiteFooter } from "@/components/store/site-footer";
import { SiteHeader } from "@/components/store/site-header";
import { WhatsappFab } from "@/components/store/whatsapp-fab";
import { toCartProduct } from "@/lib/cart-view";
import { cuotasDefault } from "@/lib/data/content";
import { paths } from "@/lib/paths";
import { isBuyable, ratesOf } from "@/lib/pricing";
import { toCardProduct } from "@/lib/product-view";
import {
  getBrands,
  getCategories,
  getStore,
  getTexts,
  getVisibleProducts,
} from "@/lib/server/queries";

/**
 * Chrome común de toda la web pública: nav + contenido + newsletter +
 * footer + flotantes (WhatsApp, bandeja del comparador, carrito) y los
 * modales del asesor. Server component: lee catálogo, settings y textos
 * (cacheados por tag) y les pasa vistas mínimas a los client components.
 */
export async function StoreShell({ children }: { children: React.ReactNode }) {
  const [products, brands, categories, runtime, texts] = await Promise.all([
    getVisibleProducts(),
    getBrands(),
    getCategories(),
    getStore(),
    getTexts(),
  ]);
  const rates = ratesOf(runtime);
  const cards = products.map((p) => toCardProduct(p, brands, categories));
  const listPaths = [
    paths.catalog(),
    ...categories.map((c) => paths.catalog(c.pathSlug)),
  ];
  const cartProducts = runtime.ventaOnline
    ? products
        .filter((p) => isBuyable(rates, p))
        .map((p) => toCartProduct(p))
        .filter((p) => p !== null)
    : [];

  return (
    <AdvisorProvider
      products={cards}
      picks={runtime.content.test}
      rates={rates}
      whatsapp={runtime.whatsapp}
      cuotasDefault={cuotasDefault}
    >
      <SiteHeader
        whatsapp={runtime.whatsapp}
        ventaOnline={runtime.ventaOnline}
        listPaths={listPaths}
      />
      <main>{children}</main>
      <NewsletterBand
        title={texts.news_title}
        body={texts.news_body}
        done={texts.news_done}
      />
      <SiteFooter runtime={runtime} categories={categories} texts={texts} />
      {features.compare && (
        <CompareTray
          items={cards.map((c) => ({ slug: c.slug, name: c.name, image: c.image }))}
          listPaths={listPaths}
          catalogBase={`${paths.catalog()}/`}
        />
      )}
      <WhatsappFab whatsapp={runtime.whatsapp} label={texts.float_btn} />
      {runtime.ventaOnline && (
        <CartDrawer products={cartProducts} rates={rates} />
      )}
    </AdvisorProvider>
  );
}
