import { paymentMethods, store } from "@/lib/config";
import { img, resolveImage } from "@/lib/images";
import { paths } from "@/lib/paths";
import { SEO, absoluteUrl, categoryTerms, ogImagePath } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";
import { variantLabel } from "@/lib/variants";
import type { Category, Product, ProductVariant, StoreConfig } from "@/lib/types";

/**
 * Datos estructurados (JSON-LD) de la web pública, validables en Rich
 * Results. Solo datos reales del catálogo y la configuración: nada de
 * ratings ni reviews, y los placeholders del prototipo ("[… a confirmar]",
 * el WhatsApp 549 223 000-0000) se omiten en vez de publicarse.
 *
 * Uso (server components; `runtime` = await getStore(), o `store` de
 * lib/config.ts — RuntimeStore extiende StoreConfig):
 *
 *   - Layout público / shell:  <JsonLd data={siteLd(runtime)} />
 *     (Organization + WebSite con SearchAction al catálogo ?q=)
 *   - Home y Nosotros:         <JsonLd data={localBusinessLd(runtime, products)} />
 *   - Catálogo / categoría:    <JsonLd data={[
 *                                itemListLd(title, inCat),
 *                                breadcrumbLd([{ name: lexicon.nav.catalog, path: paths.catalog() },
 *                                              { name: category.label, path: paths.catalog(category.pathSlug) }]),
 *                              ]} />
 *   - Ficha:                   <JsonLd data={[
 *                                productLd(p, { brandName, category, runtime }),
 *                                breadcrumbLd([…, { name: p.name, path: paths.catalog(p.slug) }]),
 *                              ]} />
 *   - Turnos / presupuesto:    <JsonLd data={breadcrumbLd([{ name: "Sacar turno", path: "/turnos" }])} />
 */

/* ── Tipos ─────────────────────────────────────────────────── */

/** Nodo schema.org genérico: `@type` obligatorio, el resto libre pero JSON. */
export interface LdNode {
  "@type": string;
  "@id"?: string;
  [key: string]: unknown;
}

/** Documento JSON-LD de primer nivel. */
export type LdDocument = LdNode & { "@context": "https://schema.org" };
export interface LdGraph {
  "@context": "https://schema.org";
  "@graph": LdNode[];
}

/** Lo que el JSON-LD lee de la tienda (StoreConfig o RuntimeStore). */
export type LdStore = Pick<
  StoreConfig,
  | "brandName"
  | "legalName"
  | "whatsapp"
  | "instagram"
  | "tiktok"
  | "address"
  | "city"
  | "mapsUrl"
  | "openingHours"
  | "businessType"
  | "showPrices"
>;

const CONTEXT = "https://schema.org" as const;
const ORG_ID = `${SITE_URL}/#organization`;
const LOCAL_ID = `${SITE_URL}/#local`;
const WEBSITE_ID = `${SITE_URL}/#website`;

/* ── Componente ────────────────────────────────────────────── */

/**
 * <script type="application/ld+json"> escapando "<" (guía de Next). Con un
 * array emite un script por documento.
 */
export function JsonLd({ data }: { data: LdDocument | LdGraph | (LdDocument | LdGraph)[] }) {
  const docs = Array.isArray(data) ? data : [data];
  return (
    <>
      {docs.map((d, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(d).replace(/</g, "\\u003c") }}
        />
      ))}
    </>
  );
}

/* ── Helpers ───────────────────────────────────────────────── */

/** true si es un placeholder del prototipo ("[Dirección a confirmar]"). */
function isPlaceholder(text: string | null | undefined): boolean {
  return !text || /^\s*\[|a confirmar/i.test(text);
}

/** "+5492235551234"; null mientras siga el número inexistente del seed. */
function telephone(whatsapp: string): string | null {
  const digits = whatsapp.replace(/\D/g, "");
  if (digits.length < 10 || /0{7}$/.test(digits)) return null;
  return `+${digits}`;
}

/** schema.org no tiene "BicycleStore": el tipo correcto es "BikeStore". */
function businessType(type: string): string {
  return type === "BicycleStore" ? "BikeStore" : type || "BikeStore";
}

function sameAs(s: LdStore): string[] {
  return [
    ...(s.instagram ? [`https://www.instagram.com/${s.instagram.replace(/^@/, "")}/`] : []),
    ...(s.tiktok ? [`https://www.tiktok.com/@${s.tiktok.replace(/^@/, "")}`] : []),
  ];
}

function logo(): LdNode {
  return {
    "@type": "ImageObject",
    url: absoluteUrl("/brand/logo-bicitiendamdq.png"),
    width: 600,
    height: 600,
  };
}

/** Referencia a la organización con nombre y url inline. */
function orgRef(s: LdStore): LdNode {
  return { "@type": "Organization", "@id": ORG_ID, name: s.brandName, url: SITE_URL };
}

function productImages(images: string[]): string[] {
  return images.map((i) => absoluteUrl(img(resolveImage(i), { w: 1200 })));
}

const DAYS: Record<string, string> = {
  Mo: "Monday",
  Tu: "Tuesday",
  We: "Wednesday",
  Th: "Thursday",
  Fr: "Friday",
  Sa: "Saturday",
  Su: "Sunday",
};
const DAY_ORDER = Object.keys(DAYS);

/** ["Mo-Fr 10:00-13:00", "Sa 10:00-13:00"] → OpeningHoursSpecification[]. */
export function openingHoursSpec(specs: string[]): LdNode[] {
  return specs.flatMap((spec) => {
    const m =
      /^([A-Z][a-z](?:-[A-Z][a-z])?(?:,[A-Z][a-z](?:-[A-Z][a-z])?)*)\s+(\d{2}:\d{2})-(\d{2}:\d{2})$/.exec(
        spec.trim(),
      );
    if (!m) return [];
    const days = m[1].split(",").flatMap((part) => {
      const [from, to] = part.split("-");
      if (!to) return [from];
      const a = DAY_ORDER.indexOf(from);
      const b = DAY_ORDER.indexOf(to);
      return a === -1 || b === -1 ? [] : DAY_ORDER.slice(a, b + 1);
    });
    return [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: days.map((d) => DAYS[d]).filter(Boolean),
        opens: m[2],
        closes: m[3],
      },
    ];
  });
}

/* ── Documentos ────────────────────────────────────────────── */

/** Organization + WebSite (con SearchAction al buscador del catálogo). */
export function siteLd(s: LdStore = store): LdGraph {
  const tel = telephone(s.whatsapp);
  return {
    "@context": CONTEXT,
    "@graph": [
      {
        "@type": "Organization",
        "@id": ORG_ID,
        name: s.brandName,
        legalName: s.legalName,
        url: SITE_URL,
        logo: logo(),
        image: absoluteUrl(ogImagePath("/")),
        sameAs: sameAs(s),
        ...(tel
          ? {
              contactPoint: {
                "@type": "ContactPoint",
                telephone: tel,
                contactType: "customer service",
                areaServed: "AR",
                availableLanguage: "es",
              },
            }
          : {}),
      },
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        url: SITE_URL,
        name: s.brandName,
        inLanguage: SEO.language,
        publisher: { "@id": ORG_ID },
        // El buscador del catálogo lee ?q= (lib/filters.ts).
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${absoluteUrl(paths.catalog())}?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
}

/**
 * LocalBusiness (BikeStore) del local: dirección, horarios, WhatsApp,
 * mapa, medios de pago y rango de precios. Los campos que siguen siendo
 * placeholder del prototipo se omiten.
 */
export function localBusinessLd(
  s: LdStore = store,
  products: Pick<Product, "price">[] = [],
  opts: { photo?: string | null; region?: string; postalCode?: string } = {},
): LdDocument {
  const [street, cityPart] = s.address.split(" · ");
  const locality = cityPart ?? s.city.split(",")[0];
  const tel = telephone(s.whatsapp);
  const prices = s.showPrices
    ? products.map((p) => p.price).filter((p): p is number => p != null)
    : [];
  return {
    "@context": CONTEXT,
    "@type": businessType(s.businessType),
    "@id": LOCAL_ID,
    name: s.brandName,
    url: SITE_URL,
    logo: logo(),
    image: [
      ...(opts.photo ? [absoluteUrl(img(resolveImage(opts.photo), { w: 1200 }))] : []),
      absoluteUrl(ogImagePath("/")),
    ],
    ...(tel ? { telephone: tel } : {}),
    address: {
      "@type": "PostalAddress",
      ...(isPlaceholder(street) ? {} : { streetAddress: street }),
      addressLocality: locality,
      addressRegion: opts.region ?? "Buenos Aires",
      ...(opts.postalCode ? { postalCode: opts.postalCode } : {}),
      addressCountry: "AR",
    },
    areaServed: { "@type": "City", name: locality },
    openingHoursSpecification: openingHoursSpec(s.openingHours),
    ...(s.mapsUrl ? { hasMap: s.mapsUrl } : {}),
    sameAs: sameAs(s),
    parentOrganization: { "@id": ORG_ID },
    currenciesAccepted: "ARS",
    paymentAccepted: paymentMethods.map((p) => p.name).join(", "),
    ...(prices.length
      ? {
          priceRange: `$${Math.min(...prices).toLocaleString("es-AR")} – $${Math.max(...prices).toLocaleString("es-AR")}`,
        }
      : {}),
  };
}

/**
 * Product de la ficha con un Offer por variante activa (talle × color):
 * sku y nombre de la variante, disponibilidad según su stock (o el
 * override "sin_stock" del producto), retiro en el local. Sin precio
 * visible (`showPrices` apagado o precio null) no lleva `offers`.
 */
export function productLd(
  p: Pick<
    Product,
    | "id"
    | "slug"
    | "name"
    | "sku"
    | "price"
    | "images"
    | "description"
    | "chips"
    | "specs"
    | "stockOverride"
    | "variants"
    | "stock"
  >,
  opts: {
    brandName?: string;
    category?: Pick<Category, "slug" | "label"> | null;
    runtime?: LdStore;
  } = {},
): LdDocument {
  const s = opts.runtime ?? store;
  const url = absoluteUrl(paths.catalog(p.slug));
  const terms = categoryTerms(opts.category);
  const forcedOut = p.stockOverride === "sin_stock";
  const priceVisible = s.showPrices && p.price != null;
  // Vigencia del precio: 30 días desde el render (la página se regenera
  // con cada cambio del admin).
  const validUntil = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
  const variants: Pick<ProductVariant, "id" | "size" | "color" | "sku" | "stock" | "active">[] =
    p.variants.filter((v) => v.active);

  const offer = (v: (typeof variants)[number] | null): LdNode => {
    const inStock = !forcedOut && (v ? v.stock > 0 : p.stock > 0);
    const label = v ? variantLabel(v) : "";
    return {
      "@type": "Offer",
      url,
      ...(v ? { sku: v.sku } : {}),
      ...(label ? { name: `${p.name} — ${label}` } : {}),
      priceCurrency: "ARS",
      price: p.price,
      priceValidUntil: validUntil,
      itemCondition: "https://schema.org/NewCondition",
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      availableDeliveryMethod: "http://purl.org/goodrelations/v1#DeliveryModePickUp",
      availableAtOrFrom: { "@id": LOCAL_ID },
      seller: orgRef(s),
    };
  };

  const sizes = [...new Set(variants.map((v) => v.size).filter((x) => x && x !== "Único"))];
  const colors = [...new Set(variants.map((v) => v.color).filter(Boolean))];

  return {
    "@context": CONTEXT,
    "@type": "Product",
    "@id": `${url}#product`,
    name: p.name,
    sku: p.sku ?? p.id,
    url,
    category: terms.singular,
    image: productImages(p.images),
    description:
      p.description.trim() ||
      [p.chips.join(" · "), ...p.specs.map((x) => `${x.label}: ${x.value}`)].filter(Boolean).join(". "),
    ...(opts.brandName ? { brand: { "@type": "Brand", name: opts.brandName } } : {}),
    ...(sizes.length ? { size: sizes.join(", ") } : {}),
    ...(colors.length ? { color: colors.join(", ") } : {}),
    additionalProperty: p.specs.map((x) => ({
      "@type": "PropertyValue",
      name: x.label,
      value: x.value,
    })),
    ...(priceVisible
      ? { offers: variants.length ? variants.map((v) => offer(v)) : [offer(null)] }
      : {}),
  };
}

/** BreadcrumbList a partir de pares nombre/path público (Inicio va solo). */
export function breadcrumbLd(items: { name: string; path: string }[]): LdDocument {
  return {
    "@context": CONTEXT,
    "@type": "BreadcrumbList",
    itemListElement: [{ name: SEO.breadcrumbHome, path: "/" }, ...items].map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/** ItemList (resumen) del catálogo o de una categoría. */
export function itemListLd(
  name: string,
  products: Pick<Product, "name" | "slug">[],
): LdDocument {
  return {
    "@context": CONTEXT,
    "@type": "ItemList",
    name,
    numberOfItems: products.length,
    itemListElement: products.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absoluteUrl(paths.catalog(p.slug)),
      name: p.name,
    })),
  };
}
