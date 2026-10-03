import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { PAYMENT_SETTINGS } from "@/lib/data/demo/settings";
import { resolveImage } from "@/lib/images";
import { OG_SIZE, SEO, formatPriceSeo, type SeoSectionKey } from "@/lib/seo";

/**
 * Imágenes Open Graph (1200×630) en el lenguaje visual del handoff de
 * BiciTienda: negro #121110 domina, amarillo #ffd21f = acción/selección,
 * rojo #d7261e = ofertas/urgencia. Display en Archivo 900 extra condensada
 * en mayúsculas (el `font-stretch: 66%` del handoff), datos en JetBrains
 * Mono, wordmark "Bici" + "Tienda" (rojo) + "MDQ" y el logo redondo.
 *
 * Satori no entiende fuentes variables ni `font-stretch`: se usan
 * instancias estáticas de Archivo bajadas de Google Fonts a assets/fonts
 * (ExtraCondensed 900, Condensed 800, SemiCondensed 700, Regular 400) y
 * JetBrains Mono 600. Fuentes y logo se leen del repo una sola vez; lo
 * único que se descarga es la foto del producto/hero, y solo al generar.
 * Satori no decodifica WebP/AVIF: las fotos de Cloudinary se piden con
 * `f_jpg` y las de Pexels ya son JPEG; un path local que no sea PNG/JPEG
 * cae al placeholder (logo).
 *
 * ── USO (un `opengraph-image.tsx` por ruta) ──────────────────
 * Todas devuelven `Promise<ImageResponse>`. Cada archivo exporta además
 * `size = OG_SIZE`, `contentType = "image/png"` y su `alt`:
 *
 *   app/opengraph-image.tsx (home y fallback del sitio)
 *     export const alt = SEO.og.defaultAlt;
 *     export default async function Image() {
 *       const products = await getVisibleProducts();
 *       return siteOgImage({ photoUrl: heroPhotoUrl ?? products[0]?.images[0] ?? null });
 *     }
 *
 *   app/catalogo/opengraph-image.tsx
 *     export default () => sectionOgImage("catalog");
 *
 *   app/catalogo/[slug]/opengraph-image.tsx (categoría o ficha, como la página)
 *     categoryOgImage({ title: categoryTerms(cat).plural, count, photoUrl })
 *     productOgImage({
 *       name: p.name,
 *       kicker: `${cat.label} / ${brand}`,       // mono, se pasa a mayúsculas
 *       photoUrl: p.images[0] ?? null,
 *       price: v.hasPrice ? p.price : null,      // null → "Consultá el precio"
 *       oldPrice: p.oldPrice,
 *       transferDiscount: runtime.transferDiscount,
 *       outOfStock: isOutOfStock(p),
 *       sizes: sizesOf(p.variants.filter((x) => x.active && x.stock > 0)),
 *       tag: p.tag,
 *     })
 *
 *   app/turnos/opengraph-image.tsx      → appointmentsOgImage()
 *   app/presupuesto/opengraph-image.tsx → quoteOgImage()
 *   app/nosotros/opengraph-image.tsx    → sectionOgImage("about")
 *
 * Con datos de la DB conviene `export const revalidate = 86400` y, en
 * [slug], `generateStaticParams` con los mismos params que la página.
 * next.config.ts incluye assets/fonts y public/brand en el tracing de
 * las rutas opengraph-image.
 */

const C = {
  ink: "#121110",
  surface: "#1f1d1a",
  line: "#2b2824",
  lineStrong: "#3a362f",
  paper: "#f4efe4",
  text2: "#cfc8bb",
  text3: "#8d867a",
  yellow: "#ffd21f",
  red: "#d7261e",
  redLight: "#ff6a5c",
  white: "#ffffff",
};

/** Familias registradas en Satori (una por instancia estática). */
const F = {
  display: "Archivo XC", // 900, extra condensada (titulares, wordmark, precios)
  strong: "Archivo C", // 800, condensada (botones, pills)
  label: "Archivo SC", // 700, semi condensada (eyebrows, nav)
  body: "Archivo", // 400
  mono: "JetBrains Mono", // 600
} as const;

const root = process.cwd();
const [xc900, c800, sc700, r400, mono600, logoPng] = await Promise.all([
  readFile(join(root, "assets/fonts/Archivo-ExtraCondensed-900.ttf")),
  readFile(join(root, "assets/fonts/Archivo-Condensed-800.ttf")),
  readFile(join(root, "assets/fonts/Archivo-SemiCondensed-700.ttf")),
  readFile(join(root, "assets/fonts/Archivo-400.ttf")),
  readFile(join(root, "assets/fonts/JetBrainsMono-600.ttf")),
  readFile(join(root, "public/brand/logo-bicitiendamdq-320.png"), "base64"),
]);

const FONTS = [
  { name: F.display, data: xc900, weight: 900 as const, style: "normal" as const },
  { name: F.strong, data: c800, weight: 800 as const, style: "normal" as const },
  { name: F.label, data: sc700, weight: 700 as const, style: "normal" as const },
  { name: F.body, data: r400, weight: 400 as const, style: "normal" as const },
  { name: F.mono, data: mono600, weight: 600 as const, style: "normal" as const },
];

const LOGO = `data:image/png;base64,${logoPng}`;

/* ── Fotos ─────────────────────────────────────────────────── */

const CLOUDINARY_UPLOAD = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.*)$/;

/**
 * URL decodificable por Satori: Cloudinary → JPEG acotado a la caja;
 * Pexels (`pexels:<id>` o su URL) → JPEG; local PNG/JPEG → archivo de
 * public/. null si no hay forma de obtener PNG/JPEG.
 */
function ogPhotoSource(raw: string, box: { w: number; h: number }): { url?: string; file?: string } | null {
  const pexels = /^pexels:(\d+)$/.exec(raw);
  if (pexels) {
    const id = pexels[1];
    return { url: `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${box.w}` };
  }
  const url = resolveImage(raw);
  const m = CLOUDINARY_UPLOAD.exec(url);
  if (m) {
    const clean = m[2].replace(/^f_auto,q_auto[^/]*\//, "");
    return { url: `${m[1]}f_jpg,q_85,c_limit,w_${box.w},h_${box.h}/${clean}` };
  }
  if (/^https:\/\/images\.pexels\.com\//.test(url)) return { url };
  if (/^https?:\/\//.test(url)) return /\.(png|jpe?g)(\?|$)/i.test(url) ? { url } : null;
  if (url.startsWith("/") && /\.(png|jpe?g)$/i.test(url)) return { file: join(root, "public", url) };
  return null;
}

/** Foto como data URI; null si no hay o falla (la plantilla usa el logo). */
async function loadPhoto(raw: string | null | undefined, box: { w: number; h: number }) {
  if (!raw) return null;
  const src = ogPhotoSource(raw, box);
  if (!src) return null;
  try {
    let buf: Buffer;
    let type = "image/jpeg";
    if (src.file) {
      buf = await readFile(src.file);
      if (src.file.toLowerCase().endsWith(".png")) type = "image/png";
    } else {
      const res = await fetch(src.url!, { cache: "force-cache", signal: AbortSignal.timeout(15_000) });
      if (!res.ok) return null;
      type = res.headers.get("content-type")?.split(";")[0] || type;
      if (!/^image\/(png|jpeg)$/.test(type)) return null;
      buf = Buffer.from(await res.arrayBuffer());
    }
    return `data:${type};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

/* ── Utilidades ────────────────────────────────────────────── */

/** Tamaño del título según el largo. */
function titleSize(text: string, sizes: [number, number][]): number {
  for (const [maxLen, size] of sizes) if (text.length <= maxLen) return size;
  return sizes[sizes.length - 1][1];
}

function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.·—/-]+$/, "")}…`;
}

function render(node: React.ReactElement) {
  return new ImageResponse(node, { ...OG_SIZE, fonts: FONTS });
}

/* ── Piezas ────────────────────────────────────────────────── */

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        background: C.ink,
        color: C.paper,
        fontFamily: F.body,
      }}
    >
      {children}
    </div>
  );
}

/** Logo redondo + wordmark "Bici" + "Tienda" (rojo) + "MDQ". */
function Brand({ logo = 64, word = 40 }: { logo?: number; word?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: Math.round(logo * 0.25) }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- Satori, no DOM */}
      <img src={LOGO} alt="" width={logo} height={logo} />
      <div
        style={{
          display: "flex",
          fontFamily: F.display,
          fontWeight: 900,
          fontSize: word,
          lineHeight: 1,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        <span style={{ color: C.paper }}>Bici</span>
        <span style={{ color: C.red }}>Tienda</span>
        <span style={{ color: C.paper }}>MDQ</span>
      </div>
    </div>
  );
}

/** Eyebrow: Archivo 700 en mayúsculas espaciadas (amarillo por defecto). */
function Eyebrow({ text, color = C.yellow, size = 22 }: { text: string; color?: string; size?: number }) {
  return (
    <div
      style={{
        display: "flex",
        fontFamily: F.label,
        fontWeight: 700,
        fontSize: size,
        letterSpacing: size * 0.1,
        textTransform: "uppercase",
        color,
      }}
    >
      {text}
    </div>
  );
}

/** Dato en mono (SKU, categoría / marca, horarios). */
function Mono({ text, color = C.text3, size = 20 }: { text: string; color?: string; size?: number }) {
  return (
    <div
      style={{
        display: "flex",
        fontFamily: F.mono,
        fontWeight: 600,
        fontSize: size,
        letterSpacing: 1,
        textTransform: "uppercase",
        color,
      }}
    >
      {text}
    </div>
  );
}

/** Titular display: Archivo 900 extra condensada, mayúsculas, interlineado .9. */
function Display({
  children,
  size,
  color = C.paper,
  maxWidth,
}: {
  children: React.ReactNode;
  size: number;
  color?: string;
  maxWidth?: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        fontFamily: F.display,
        fontWeight: 900,
        fontSize: size,
        lineHeight: 0.9,
        textTransform: "uppercase",
        color,
        // Satori no tolera claves con undefined.
        ...(maxWidth ? { maxWidth } : {}),
      }}
    >
      {children}
    </div>
  );
}

function Pill({ text, bg, fg, size = 22 }: { text: string; bg: string; fg: string; size?: number }) {
  return (
    <div
      style={{
        display: "flex",
        padding: `${Math.round(size * 0.42)}px ${Math.round(size * 0.9)}px`,
        borderRadius: 999,
        background: bg,
        color: fg,
        fontFamily: F.strong,
        fontWeight: 800,
        fontSize: size,
        letterSpacing: size * 0.06,
        textTransform: "uppercase",
      }}
    >
      {text}
    </div>
  );
}

/** Tag rectangular de radio 4 (Oferta, Nuevo, Temporada de rodar). */
function Tag({ text, bg = C.red, fg = C.white }: { text: string; bg?: string; fg?: string }) {
  return (
    <div
      style={{
        display: "flex",
        padding: "8px 14px",
        borderRadius: 4,
        background: bg,
        color: fg,
        fontFamily: F.strong,
        fontWeight: 800,
        fontSize: 20,
        letterSpacing: 1.6,
        textTransform: "uppercase",
      }}
    >
      {text}
    </div>
  );
}

/** Tira de beneficios del footer (3 celdas, la de transferencia en amarillo; sin cuotas). */
function BenefitStrip({ transferPct }: { transferPct: number }) {
  const cells = [
    { text: SEO.og.mercadoPago, hi: false },
    { text: `${transferPct}% off transferencia`, hi: true },
    { text: "Retiro en el local", hi: false },
  ];
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: 72,
        display: "flex",
        borderTop: `2px solid ${C.line}`,
        background: C.ink,
      }}
    >
      {cells.map((c, i) => (
        <div
          key={c.text}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderLeft: i ? `2px solid ${C.line}` : "none",
            fontFamily: F.label,
            fontWeight: 700,
            fontSize: 20,
            letterSpacing: 1.6,
            textTransform: "uppercase",
            color: c.hi ? C.yellow : C.text2,
          }}
        >
          {c.text}
        </div>
      ))}
    </div>
  );
}

/** Caja con la foto (fondo blanco, radio 10 como las cards) o el logo grande. */
function PhotoCard({
  photo,
  tag,
  dim = false,
  fit = "contain",
}: {
  photo: string | null;
  tag?: string | null;
  dim?: boolean;
  /** "contain" para fotos de producto sobre blanco; "cover" para ambiente. */
  fit?: "contain" | "cover";
}) {
  return (
    <div
      style={{
        position: "absolute",
        right: 48,
        top: 48,
        width: 500,
        height: 534,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 10,
        background: photo ? C.white : C.surface,
        border: photo ? "none" : `2px solid ${C.line}`,
        overflow: "hidden",
      }}
    >
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- Satori, no DOM
        <img
          src={photo}
          alt=""
          width={500}
          height={534}
          style={{ objectFit: fit, opacity: dim ? 0.55 : 1 }}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- Satori, no DOM
        <img src={LOGO} alt="" width={300} height={300} />
      )}
      {tag ? (
        <div style={{ position: "absolute", left: 20, top: 20, display: "flex" }}>
          <Tag text={tag} />
        </div>
      ) : null}
    </div>
  );
}

const PHOTO_BOX = { w: 1000, h: 1068 };
const HERO_BOX = { w: 1600, h: 840 };

/* ── Plantillas ────────────────────────────────────────────── */

/**
 * Home y fallback del sitio: foto del hero a sangre con el degradé del
 * handoff, tag rojo "Temporada de rodar" y "Salí a rodar por LA FELIZ."
 */
export async function siteOgImage({
  photoUrl,
  transferDiscount = PAYMENT_SETTINGS.transferDiscountPct,
}: {
  photoUrl: string | null;
  transferDiscount?: number;
}) {
  const photo = await loadPhoto(photoUrl, HERO_BOX);
  const og = SEO.og;
  return render(
    <Frame>
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- Satori, no DOM
        <img
          src={photo}
          alt=""
          width={1200}
          height={630}
          style={{ position: "absolute", left: 0, top: 0, objectFit: "cover" }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0, bottom: 0,
          display: "flex",
          backgroundImage: photo
            ? "linear-gradient(180deg, rgba(18,17,16,.15) 10%, rgba(18,17,16,.93) 72%)"
            : "radial-gradient(640px 420px at 85% 30%, rgba(255,210,31,.10), transparent 70%)",
        }}
      />
      {photo ? (
        // Segundo velo de izquierda a derecha: el titular va sobre la foto.
        <div
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0, bottom: 0,
            display: "flex",
            backgroundImage: "linear-gradient(90deg, rgba(18,17,16,.8) 0%, rgba(18,17,16,.2) 75%)",
          }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          right: 0,
          bottom: 72,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "44px 56px 40px",
        }}
      >
        <Brand logo={76} word={44} />
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex" }}>
            <Tag text="Temporada de rodar" />
          </div>
          {/* Una línea por div: Satori pierde los espacios entre <span> hermanos. */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <Display size={128} maxWidth={1080}>
              {og.taglineLead}
            </Display>
            <Display size={128} color={C.yellow} maxWidth={1080}>
              {og.taglineAccent}
            </Display>
          </div>
          <Eyebrow text={og.categoriesLine} color={C.text2} size={24} />
        </div>
      </div>
      <BenefitStrip transferPct={transferDiscount} />
    </Frame>,
  );
}

/**
 * Ficha de producto: foto a la derecha; a la izquierda categoría / marca
 * en mono, nombre, precio "$ 489.900" y precio por transferencia en rojo. Sin precio visible:
 * "Consultá el precio" (o "Sin stock").
 */
export async function productOgImage(p: {
  name: string;
  /** "MTB / VENZO": va en mono, en mayúsculas. */
  kicker: string;
  photoUrl: string | null;
  /** Precio VISIBLE; null → "Consultá el precio". */
  price: number | null;
  /** Precio de lista tachado (solo si es mayor que `price`). */
  oldPrice?: number | null;
  /** % off por transferencia (runtime.transferDiscount). 0 = no se muestra. */
  transferDiscount?: number;
  outOfStock?: boolean;
  /** Talles con stock, en orden ("S", "M", "L"). Vacío o ["Único"] = no se muestran. */
  sizes?: string[];
  /** Tag sobre la foto ("Oferta", "Más vendida", "Nuevo"). */
  tag?: string | null;
}) {
  const photo = await loadPhoto(p.photoUrl, PHOTO_BOX);
  const og = SEO.og;
  const pct = p.transferDiscount ?? PAYMENT_SETTINGS.transferDiscountPct;
  const name = clip(p.name, 56);
  const size = titleSize(name, [
    [12, 112],
    [18, 96],
    [26, 82],
    [38, 68],
    [56, 58],
  ]);
  const sizes = (p.sizes ?? []).filter((s) => s && s !== "Único");
  const onSale = p.price != null && p.oldPrice != null && p.oldPrice > p.price;
  const tag = p.tag ?? (onSale ? "Oferta" : null);

  return render(
    <Frame>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "44px 0 44px 56px",
          width: 620,
        }}
      >
        <Brand logo={56} word={34} />
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Mono text={clip(p.kicker, 40)} color={C.text3} size={20} />
          <Display size={size} maxWidth={580}>
            {name}
          </Display>
          {p.price != null && !p.outOfStock ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 10 }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 18 }}>
                <div
                  style={{
                    display: "flex",
                    fontFamily: F.display,
                    fontWeight: 900,
                    fontSize: 76,
                    lineHeight: 1,
                    color: C.paper,
                  }}
                >
                  {formatPriceSeo(p.price)}
                </div>
                {onSale ? (
                  <div
                    style={{
                      display: "flex",
                      fontFamily: F.strong,
                      fontWeight: 800,
                      fontSize: 28,
                      color: C.text3,
                      textDecoration: "line-through",
                      marginBottom: 8,
                    }}
                  >
                    {formatPriceSeo(p.oldPrice!)}
                  </div>
                ) : null}
              </div>
              {pct > 0 ? (
                <div
                  style={{
                    display: "flex",
                    fontFamily: F.strong,
                    fontWeight: 800,
                    fontSize: 24,
                    color: C.redLight,
                  }}
                >
                  {og.transfer(pct, formatPriceSeo(Math.round(p.price * (1 - pct / 100))))}
                </div>
              ) : null}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
              <div
                style={{
                  display: "flex",
                  fontFamily: F.display,
                  fontWeight: 900,
                  fontSize: 56,
                  lineHeight: 1,
                  textTransform: "uppercase",
                  color: p.outOfStock ? C.redLight : C.paper,
                }}
              >
                {p.outOfStock ? og.outOfStock : og.consult}
              </div>
              <div style={{ display: "flex", fontSize: 24, color: C.text2 }}>{og.consultSub}</div>
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {sizes.length ? (
            <Mono text={`Talles ${sizes.slice(0, 6).join(" · ")}`} color={C.text2} size={18} />
          ) : null}
          <Mono text={og.pickup} color={C.text3} size={18} />
        </div>
      </div>
      <PhotoCard photo={photo} tag={tag} dim={p.outOfStock} />
    </Frame>,
  );
}

/** Categoría (o grupo) del catálogo: plural "buscable", contador y una foto. */
export async function categoryOgImage(c: {
  /** Plural de búsqueda: categoryTerms(category).plural. */
  title: string;
  count: number;
  photoUrl: string | null;
}) {
  const photo = await loadPhoto(c.photoUrl, PHOTO_BOX);
  const og = SEO.og;
  const title = clip(c.title, 48);
  const size = titleSize(title, [
    [12, 120],
    [20, 100],
    [30, 84],
    [48, 68],
  ]);
  return render(
    <Frame>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "44px 0 44px 56px",
          width: 620,
        }}
      >
        <Brand logo={56} word={34} />
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Mono text={og.categoryKicker(c.count)} color={C.yellow} size={20} />
          <Display size={size} maxWidth={580}>
            {title}
          </Display>
          <Display size={44} color={C.yellow}>
            {og.categoryLocation}
          </Display>
        </div>
        <Eyebrow text={og.categorySub} color={C.text2} size={18} />
      </div>
      <PhotoCard photo={photo} fit="cover" />
    </Frame>,
  );
}

/**
 * Sección tipográfica (catálogo, nosotros…): eyebrow amarillo, titular
 * enorme, bajada y la tira de beneficios. Acepta la clave de
 * `SEO.sections` o textos propios.
 */
export async function sectionOgImage(
  s: SeoSectionKey | { kicker: string; title: string; sub: string },
  aside?: React.ReactNode,
) {
  const { kicker, title, sub } = typeof s === "string" ? SEO.sections[s] : s;
  const width = aside ? 640 : 1088;
  const size = titleSize(title, aside
    ? [
        [14, 120],
        [22, 100],
        [32, 84],
      ]
    : [
        [18, 150],
        [28, 124],
        [40, 104],
      ]);
  return render(
    <Frame>
      <div
        style={{
          position: "absolute",
          right: -150,
          bottom: 92,
          display: "flex",
          opacity: aside ? 0 : 0.07,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- Satori, no DOM */}
        <img src={LOGO} alt="" width={460} height={460} />
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          right: 0,
          bottom: 72,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "44px 56px 40px",
        }}
      >
        <Brand logo={64} word={38} />
        <div style={{ display: "flex", flexDirection: "column", gap: 20, width }}>
          <Eyebrow text={kicker} />
          <Display size={size} maxWidth={width}>
            {title}
          </Display>
          <div style={{ display: "flex", fontSize: 26, lineHeight: 1.35, color: C.text2, maxWidth: width }}>
            {sub}
          </div>
        </div>
      </div>
      {aside ? (
        <div
          style={{
            position: "absolute",
            right: 56,
            top: 56,
            bottom: 112,
            width: 420,
            display: "flex",
            alignItems: "center",
          }}
        >
          {aside}
        </div>
      ) : null}
      <BenefitStrip transferPct={PAYMENT_SETTINGS.transferDiscountPct} />
    </Frame>,
  );
}

/** Panel lateral de las plantillas de turnos y presupuesto. */
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        padding: 26,
        borderRadius: 10,
        background: C.surface,
        border: `2px solid ${C.line}`,
      }}
    >
      <Mono text={title} color={C.text3} size={16} />
      {children}
    </div>
  );
}

/**
 * Turnos: la sección con una grilla de horarios del handoff (2f) —
 * 30 min cada uno, uno tachado (ocupado) y uno elegido en amarillo.
 */
export async function appointmentsOgImage(opts: { slots?: string[] } = {}) {
  const slots = opts.slots ?? ["10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "16:00", "16:30", "17:00"];
  const taken = 2;
  const picked = 6;
  return sectionOgImage(
    "appointments",
    <Panel title="Elegí día y horario">
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1, display: "flex" }}>
          <Pill text="Reparación / service" bg={C.yellow} fg={C.ink} size={17} />
        </div>
        <div style={{ display: "flex" }}>
          <Pill text="Asesoramiento" bg={C.lineStrong} fg={C.paper} size={17} />
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {slots.map((t, i) => (
          <div
            key={t}
            style={{
              width: 112,
              height: 52,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 6,
              border: `2px solid ${i === picked ? C.yellow : C.lineStrong}`,
              background: i === picked ? C.yellow : "transparent",
              color: i === picked ? C.ink : i === taken ? C.text3 : C.paper,
              textDecoration: i === taken ? "line-through" : "none",
              fontFamily: F.mono,
              fontWeight: 600,
              fontSize: 20,
            }}
          >
            {t}
          </div>
        ))}
      </div>
      <Mono text="30 min · se paga en el local" color={C.text2} size={16} />
    </Panel>,
  );
}

/**
 * Presupuesto: la sección con las 4 opciones de "Qué necesitás" (5a),
 * "Producto importado" elegida en amarillo como en el handoff.
 */
export async function quoteOgImage() {
  const kinds = ["Bicicleta", "Repuesto", "Producto importado", "Otra consulta"];
  const selected = 2;
  return sectionOgImage(
    "quote",
    <Panel title="1 · Qué necesitás">
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {kinds.map((k, i) => (
          <div
            key={k}
            style={{
              height: 64,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 22px",
              borderRadius: 8,
              border: `2px solid ${i === selected ? C.yellow : C.lineStrong}`,
              background: i === selected ? C.yellow : "transparent",
              color: i === selected ? C.ink : C.paper,
              fontFamily: F.display,
              fontWeight: 900,
              fontSize: 32,
              textTransform: "uppercase",
            }}
          >
            <span>{k}</span>
            <span style={{ fontFamily: F.body, fontSize: 26 }}>→</span>
          </div>
        ))}
      </div>
      <Mono text="Te respondemos en 24 hs hábiles" color={C.text2} size={16} />
    </Panel>,
  );
}

/** Portada del catálogo (atajo de `sectionOgImage("catalog")`). */
export function catalogOgImage() {
  return sectionOgImage("catalog");
}
