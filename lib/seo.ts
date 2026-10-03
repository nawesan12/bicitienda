import type { Metadata } from "next";
import { store } from "@/lib/config";
import { PAYMENT_SETTINGS } from "@/lib/data/demo/settings";
import { SITE_URL } from "@/lib/site";
import type { Category } from "@/lib/types";

/**
 * ── SEO TÉCNICO DE BICITIENDA ────────────────────────────────
 * Metadata por página (canonical, Open Graph, Twitter), recorte de títulos
 * y descripciones sin cortar oraciones, robots de las privadas y el copy de
 * SEO de la tienda (`SEO`, en voseo, orientado a búsqueda local en Mar del
 * Plata). El léxico de la tienda (lib/data/content.ts) no tiene bloque de
 * SEO: el copy vive acá.
 *
 * Piezas relacionadas:
 *   - lib/og/render.tsx        → imágenes OG 1200×630 (next/og).
 *   - components/bt/json-ld.tsx → datos estructurados (JSON-LD).
 *   - app/manifest.ts           → web app manifest.
 *   - next.config.ts            → X-Robots-Tag de las privadas + tracing de
 *                                 assets/fonts para las OG.
 *
 * ── CÓMO SE CABLEA (por ruta) ─────────────────────────────────
 *
 * app/layout.tsx — metadata base del sitio (metadataBase, template, OG por
 * defecto). Las páginas después solo pisan lo suyo:
 *
 *     import { rootMetadata } from "@/lib/seo";
 *     export const metadata = rootMetadata();
 *
 * Home (app/page.tsx) — título absoluto (sin template):
 *
 *     export const metadata = pageMetadata({
 *       title: SEO.defaultTitle, absolute: true,
 *       description: SEO.defaultDescription, path: "/",
 *     });
 *
 * Portada del catálogo (app/catalogo/page.tsx):
 *
 *     export const metadata = pageMetadata({
 *       ...SEO.sections.catalog.meta,
 *       path: paths.catalog(),
 *       image: { path: ogImagePath(paths.catalog()), alt: SEO.sections.catalog.meta.title },
 *     });
 *
 * Categoría o ficha (app/catalogo/[slug]/page.tsx, generateMetadata):
 *
 *     // categoría
 *     const { title, description } = categorySeo(category, inCat.length, brandNames);
 *     return pageMetadata({
 *       title, description, path: paths.catalog(category.pathSlug),
 *       image: { path: ogImagePath(paths.catalog(category.pathSlug)), alt: SEO.og.categoryAlt(title) },
 *     });
 *
 *     // ficha
 *     const { title, description } = productSeo({
 *       name: p.name, brand: brand?.name ?? "", category,
 *       price: v.hasPrice ? p.price : null,           // priceView(ratesOf(runtime), card)
 *       installments: runtime.maxInstallments,
 *       outOfStock: isOutOfStock(p),
 *       keySpecs: p.chips.join(" · "),
 *     });
 *     return pageMetadata({
 *       title, absolute: true, description, path: paths.catalog(p.slug),
 *       image: { path: ogImagePath(paths.catalog(p.slug)), alt: SEO.og.productAlt(p.name) },
 *     });
 *
 * Turnos (app/turnos/page.tsx) y presupuesto (app/presupuesto/page.tsx):
 *
 *     export const metadata = pageMetadata({
 *       ...SEO.sections.appointments.meta,          // o .quote / .about
 *       path: paths.appointments(),                 // o paths.quote() / "/nosotros"
 *       image: { path: ogImagePath(paths.appointments()), alt: SEO.sections.appointments.meta.title },
 *     });
 *
 * Privadas (checkout, confirmación, cuenta, seguimiento, admin, gestión de
 * turnos por link): sin canonical ni OG, solo
 *
 *     export const metadata: Metadata = { title: "Carrito", robots: NOINDEX };
 *
 * 404 (app/not-found.tsx):
 *
 *     export const metadata: Metadata = { title: SEO.notFoundTitle, robots: NOINDEX };
 *
 * Imágenes OG: cada página indexable declara `openGraph.images` explícito
 * con `ogImagePath(<path público>)` (lo hace pageMetadata con `image`), así
 * la URL es la pública aunque la ruta sirva por rewrite. Los
 * `opengraph-image.tsx` de cada ruta llaman a los helpers de
 * lib/og/render.tsx (ver la cabecera de ese archivo).
 */

/* ── Constantes ────────────────────────────────────────────── */

/** Tamaño de todas las imágenes Open Graph (1.91:1). */
export const OG_SIZE = { width: 1200, height: 630 } as const;

/** Largo recomendado de <title> y de la meta description. */
export const TITLE_MAX = 65;
export const DESCRIPTION_MIN = 140;
export const DESCRIPTION_MAX = 160;

const CITY = "Mar del Plata";

/** Cuotas sin interés por defecto (las reales: `runtime.maxInstallments`). */
const DEFAULT_INSTALLMENTS: number = PAYMENT_SETTINGS.maxInstallments;

/** Términos "buscables" de una categoría: plural para títulos, singular para fichas. */
export interface SeoCategoryTerms {
  plural: string;
  singular: string;
}

/**
 * Partes de una meta description, en orden. Cada parte es un texto o una
 * lista de alternativas de la más larga a la más corta.
 */
export type DescriptionParts = (string | string[])[];

/* ── Copy de SEO (voseo rioplatense) ───────────────────────── */

export const SEO = {
  ogLocale: "es_AR",
  language: "es-AR",
  titleTemplate: `%s · ${store.brandName}`,
  defaultTitle: `${store.brandName} · Bicis, accesorios y repuestos en ${CITY}`,
  defaultDescription:
    "Bicicletas MTB, de ruta, urbanas e infantiles, accesorios y repuestos en Mar del Plata. Comprá online en 6 cuotas sin interés y retirá en el local.",
  keywords: [
    "bicicletería Mar del Plata",
    "bicicletas Mar del Plata",
    "bicicletas MTB Mar del Plata",
    "bicicletas de ruta",
    "bicicletas urbanas",
    "bicicletas infantiles",
    "accesorios para bicicleta",
    "repuestos de bicicleta",
    "cascos de bicicleta",
    "bicicletas en cuotas sin interés",
    store.brandName,
  ],

  /** Términos por slug de categoría (fallback: el label de la categoría). */
  categoryTerms: {
    bicicletas: { plural: "Bicicletas", singular: "bicicleta" },
    mtb: { plural: "Bicicletas MTB", singular: "bicicleta MTB" },
    "ruta-gravel": { plural: "Bicicletas de ruta y gravel", singular: "bicicleta de ruta" },
    urbanas: { plural: "Bicicletas urbanas", singular: "bicicleta urbana" },
    infantiles: { plural: "Bicicletas infantiles", singular: "bicicleta infantil" },
    accesorios: { plural: "Accesorios para bicicleta", singular: "accesorio para bicicleta" },
    cascos: { plural: "Cascos de bicicleta", singular: "casco de bicicleta" },
    indumentaria: { plural: "Indumentaria de ciclismo", singular: "indumentaria de ciclismo" },
    repuestos: { plural: "Repuestos de bicicleta", singular: "repuesto de bicicleta" },
    importados: { plural: "Productos importados", singular: "producto importado" },
  } as Record<string, SeoCategoryTerms>,

  categoryTitle: (t: SeoCategoryTerms) => `${t.plural} en ${CITY}`,

  categoryDescription: (
    t: SeoCategoryTerms,
    count: number,
    brands: string[],
    installments = DEFAULT_INSTALLMENTS,
  ): DescriptionParts => {
    const models = `${count} ${count === 1 ? "modelo" : "modelos"}`;
    const brandList =
      brands.length > 1
        ? `${brands.slice(0, -1).join(", ")} y ${brands[brands.length - 1]}`
        : (brands[0] ?? "");
    return [
      [
        ...(brandList && count ? [`${t.plural} en ${CITY}: ${models} de ${brandList}.`] : []),
        ...(count ? [`${t.plural} en ${CITY}: ${models} para elegir.`] : []),
        `${t.plural} en ${CITY}.`,
      ],
      [
        `Comprá online en ${installments} cuotas sin interés o con 10% off por transferencia y retirá en el local.`,
        `Comprá online en ${installments} cuotas sin interés y retirá en el local.`,
        `${installments} cuotas sin interés y retiro en el local.`,
      ],
      ["Si no lo encontrás, pedí presupuesto.", "Pedí presupuesto."],
    ];
  },

  productTitles: (name: string, t: SeoCategoryTerms) => [
    `${name} — ${t.singular} en ${CITY} | ${store.brandName}`,
    `${name} — ${t.singular} en ${CITY}`,
    `${name} — ${t.singular} | ${store.brandName}`,
    `${name} — ${t.singular}`,
    `${name} | ${store.brandName}`,
  ],

  productDescription: (p: {
    name: string;
    brand: string;
    terms: SeoCategoryTerms;
    keySpecs?: string;
    price: string | null;
    installment: string | null;
    installments: number;
    outOfStock: boolean;
  }): DescriptionParts => {
    const intro = `${p.name}${p.brand && !p.name.startsWith(p.brand) ? ` de ${p.brand}` : ""}`;
    return [
      [`${intro}, ${p.terms.singular} en ${CITY}.`, `${p.name}, ${p.terms.singular} en ${CITY}.`],
      p.outOfStock
        ? ["Sin stock por ahora: escribinos y te avisamos cuándo vuelve.", "Consultá el ingreso."]
        : p.price
          ? [
              ...(p.installment
                ? [`${p.price} o ${p.installments} cuotas sin interés de ${p.installment}.`]
                : []),
              `${p.price}.`,
            ]
          : ["Consultá precio y disponibilidad por WhatsApp.", "Consultá precio."],
      ...(p.keySpecs ? [[`${p.keySpecs}.`]] : []),
      [
        "Comprá online y retirá en el local.",
        "Retiro en el local.",
      ],
    ];
  },

  /** Alt de la foto de un producto. */
  productAlt: (name: string, t: SeoCategoryTerms) => `${name} — ${t.singular}`,

  breadcrumbHome: "Inicio",
  notFoundTitle: "Página no encontrada",

  /** Textos de las imágenes Open Graph (lib/og/render.tsx). */
  og: {
    /** Titular del hero del handoff: "Salí a rodar por" + "La Feliz." en amarillo. */
    taglineLead: "Salí a rodar por",
    taglineAccent: "La Feliz.",
    categoriesLine: "MTB · Ruta · Urbanas · Infantiles · Accesorios · Repuestos",
    footer: `bicitiendamdq.com.ar · ${CITY}`,
    defaultAlt: `${store.brandName} — bicicletas, accesorios y repuestos en ${CITY}`,
    installments: (n: number, cuota: string) => `${n} cuotas sin interés de ${cuota}`,
    installmentsShort: (n: number) => `${n} cuotas sin interés`,
    transfer: (pct: number, price: string) => `${price} con ${pct}% off por transferencia`,
    consult: "Consultá el precio",
    consultSub: "Te respondemos por WhatsApp",
    outOfStock: "Sin stock · consultá ingreso",
    pickup: "Retiro sin cargo en el local",
    categoryKicker: (n: number) => `CATÁLOGO · ${n} ${n === 1 ? "MODELO" : "MODELOS"}`,
    categoryLocation: `en ${CITY}`,
    categorySub: "Cuotas sin interés · 10% off transferencia · Retiro en el local",
    productAlt: (name: string) => `${name} en ${store.brandName}: precio, cuotas y talles`,
    categoryAlt: (plural: string) => `${plural} en ${store.brandName}, ${CITY}`,
  },

  /**
   * Secciones con imagen OG tipográfica (`sectionOgImage`) y su metadata.
   * `meta` va directo a `pageMetadata({ ...meta, path })`.
   */
  sections: {
    catalog: {
      kicker: "CATÁLOGO",
      title: "Bicis, accesorios y repuestos",
      sub: "MTB, ruta, urbanas e infantiles · cuotas sin interés · retiro en el local",
      meta: {
        title: `Bicicletas, accesorios y repuestos en ${CITY}`,
        description:
          "Catálogo de BiciTienda MDQ: bicicletas MTB, de ruta, urbanas e infantiles, cascos, indumentaria y repuestos. 6 cuotas sin interés y retiro en el local.",
      },
    },
    appointments: {
      kicker: "SACAR TURNO",
      title: "Probala antes de comprarla",
      sub: "Prueba de bici o asesoramiento · 30 min · se paga en el local",
      meta: {
        title: `Sacá turno: prueba de bici o asesoramiento en ${CITY}`,
        description:
          "Reservá un turno en BiciTienda MDQ para probar una bici o para que te asesoremos con talle, rodado y uso. 30 minutos, sin cargo online. Elegí día y horario.",
      },
    },
    quote: {
      kicker: "PRESUPUESTO SIN CARGO",
      title: "¿Qué estás buscando?",
      sub: "Bicis, repuestos o productos importados · te respondemos por WhatsApp en 24 hs",
      meta: {
        title: "Pedí presupuesto: bicis, repuestos e importados",
        description:
          "¿No encontrás lo que buscás? Contanos qué necesitás —una bici, un repuesto o un producto importado— y BiciTienda MDQ te pasa presupuesto por WhatsApp en 24 hs.",
      },
    },
    about: {
      kicker: "NOSOTROS",
      title: "La bicicletería de La Feliz",
      sub: "Vendemos, armamos y asesoramos en Mar del Plata",
      meta: {
        title: `Nosotros: bicicletería en ${CITY}`,
        description:
          "Conocé BiciTienda MDQ, bicicletería en Mar del Plata: bicis, accesorios y repuestos, asesoramiento en el local y tu bici armada y lista para retirar.",
      },
    },
  },
} as const;

export type SeoSectionKey = keyof typeof SEO.sections;

/* ── URLs ──────────────────────────────────────────────────── */

/** Path público → URL absoluta del sitio (las absolutas vuelven igual). */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Path de la imagen OG generada para una página (`<path>/opengraph-image`). */
export function ogImagePath(pagePath: string): string {
  return pagePath === "/" ? "/opengraph-image" : `${pagePath.replace(/\/$/, "")}/opengraph-image`;
}

/* ── Robots ────────────────────────────────────────────────── */

/** Tags robots de las páginas privadas (checkout, cuenta, seguimiento, admin). */
export const NOINDEX: Metadata["robots"] = {
  index: false,
  follow: false,
  googleBot: { index: false, follow: false },
};

/* ── Recorte de textos ─────────────────────────────────────── */

/** Recorta en el último espacio antes de `max`, con "…". */
export function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.·—-]+$/, "")}…`;
}

/** Primer candidato que entra en `max` caracteres (o el último, recortado). */
export function fitTitle(candidates: string[], max = TITLE_MAX): string {
  const fit = candidates.find((c) => c.length <= max);
  return fit ?? truncate(candidates[candidates.length - 1] ?? "", max);
}

/**
 * Meta description de hasta `max` caracteres sin cortar oraciones: recorre
 * las partes en orden y de cada una toma la alternativa más larga que
 * todavía entra (o ninguna). Solo si la primera parte sola no entra se
 * recorta con "…".
 */
export function fitDescription(parts: DescriptionParts, max = DESCRIPTION_MAX): string {
  let out = "";
  parts.forEach((part, i) => {
    const options = (Array.isArray(part) ? part : [part])
      .map((o) => o.replace(/\s+/g, " ").trim())
      .filter(Boolean);
    const pick = options.find((o) => (out ? `${out} ${o}` : o).length <= max);
    if (pick) out = out ? `${out} ${pick}` : pick;
    else if (i === 0 && options[0]) out = truncate(options[0], max);
  });
  return out;
}

/* ── Categorías y productos ────────────────────────────────── */

/** Términos SEO de una categoría (con fallback al label visible). */
export function categoryTerms(
  category: Pick<Category, "slug" | "label"> | undefined | null,
): SeoCategoryTerms {
  if (!category) return { plural: "Bicicletas y accesorios", singular: "producto" };
  return (
    SEO.categoryTerms[category.slug] ?? {
      plural: category.label,
      singular: category.label.toLowerCase(),
    }
  );
}

/** Alt de la foto de un producto: "<Modelo> — bicicleta MTB". */
export function productImageAlt(
  name: string,
  category: Pick<Category, "slug" | "label"> | undefined | null,
): string {
  return SEO.productAlt(name, categoryTerms(category));
}

/** Formato del handoff: "$ 489.900" (es-AR, sin decimales). */
export function formatPriceSeo(n: number): string {
  return `$ ${Math.round(n).toLocaleString("es-AR")}`;
}

/** Título y description de una categoría del catálogo. */
export function categorySeo(
  category: Pick<Category, "slug" | "label">,
  count: number,
  brands: string[] = [],
  installments: number = DEFAULT_INSTALLMENTS,
): { title: string; description: string; terms: SeoCategoryTerms } {
  const terms = categoryTerms(category);
  return {
    terms,
    title: fitTitle([SEO.categoryTitle(terms), terms.plural]),
    description: fitDescription(SEO.categoryDescription(terms, count, brands, installments)),
  };
}

/**
 * Título (absoluto, ya con la marca si entra) y description de una ficha.
 * `price` es el precio VISIBLE (null si no se muestra: sin precio, modo
 * vidriera o sin stock).
 */
export function productSeo(p: {
  name: string;
  brand?: string;
  category: Pick<Category, "slug" | "label"> | undefined | null;
  price: number | null;
  /** Cuotas sin interés (runtime.maxInstallments). 0/1 = no se mencionan. */
  installments?: number;
  outOfStock: boolean;
  /** Destacados cortos ("Rodado 29 · 21 velocidades"). */
  keySpecs?: string;
}): { title: string; description: string; terms: SeoCategoryTerms } {
  const terms = categoryTerms(p.category);
  const n = p.installments ?? DEFAULT_INSTALLMENTS;
  const price = p.price != null ? formatPriceSeo(p.price) : null;
  const installment = p.price != null && n > 1 ? formatPriceSeo(Math.round(p.price / n)) : null;
  return {
    terms,
    title: fitTitle(SEO.productTitles(p.name, terms)),
    description: fitDescription(
      SEO.productDescription({
        name: p.name,
        brand: p.brand ?? "",
        terms,
        keySpecs: p.keySpecs,
        price,
        installment,
        installments: n,
        outOfStock: p.outOfStock,
      }),
    ),
  };
}

/* ── Metadata ──────────────────────────────────────────────── */

export interface PageSeo {
  /**
   * Título de la página. Con `absolute` va tal cual; si no, Next le agrega
   * `SEO.titleTemplate` (la marca).
   */
  title: string;
  absolute?: boolean;
  description: string;
  /** Path PÚBLICO de la página (canonical y og:url). */
  path: string;
  /** Imagen OG: path público y alt. Por defecto, la del sitio. */
  image?: { path: string; alt: string };
  type?: "website" | "article";
}

/** Metadata completa de una página pública indexable. */
export function pageMetadata(seo: PageSeo): Metadata {
  const fullTitle = seo.absolute ? seo.title : SEO.titleTemplate.replace("%s", seo.title);
  const image = {
    url: seo.image?.path ?? ogImagePath("/"),
    ...OG_SIZE,
    alt: seo.image?.alt ?? SEO.og.defaultAlt,
    type: "image/png",
  };
  return {
    title: seo.absolute ? { absolute: seo.title } : seo.title,
    description: seo.description,
    alternates: { canonical: seo.path },
    openGraph: {
      type: seo.type ?? "website",
      siteName: store.brandName,
      locale: SEO.ogLocale,
      url: seo.path,
      title: fullTitle,
      description: seo.description,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: seo.description,
      images: [image],
    },
  };
}

/**
 * Metadata base del sitio para app/layout.tsx: metadataBase (resuelve los
 * paths relativos de canonical/OG), template del título y OG por defecto.
 */
export function rootMetadata(): Metadata {
  return {
    metadataBase: new URL(SITE_URL),
    applicationName: store.brandName,
    title: { default: SEO.defaultTitle, template: SEO.titleTemplate },
    description: SEO.defaultDescription,
    keywords: [...SEO.keywords],
    // Sin canonical acá: se heredaría a todas las páginas. Cada página
    // indexable lo declara con pageMetadata.
    formatDetection: { telephone: false, email: false, address: false },
    openGraph: {
      type: "website",
      siteName: store.brandName,
      locale: SEO.ogLocale,
      url: "/",
      title: SEO.defaultTitle,
      description: SEO.defaultDescription,
    },
    twitter: {
      card: "summary_large_image",
      title: SEO.defaultTitle,
      description: SEO.defaultDescription,
    },
    robots: { index: true, follow: true },
  };
}
