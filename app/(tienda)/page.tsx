import Link from "next/link";
import { AdvisorTrigger } from "@/components/store/advisor-modals";
import { Bolt, BoltDot } from "@/components/store/bolt";
import { InstagramFeed } from "@/components/store/instagram-feed";
import { JsonLd, localBusinessLd } from "@/components/store/json-ld";
import { LocalPhoto } from "@/components/store/local-photo";
import { Marquee } from "@/components/store/marquee";
import { ProductCard } from "@/components/store/product-card";
import { WaLink } from "@/components/store/wa-link";
import { heroGhost, igSlots, lexicon } from "@/lib/data/content";
import { img } from "@/lib/images";
import { features } from "@/lib/features";
import { paths } from "@/lib/paths";
import { ratesOf } from "@/lib/pricing";
import { toCardProduct } from "@/lib/product-view";
import {
  getAgenda,
  getArticles,
  getBrands,
  getCategories,
  getStore,
  getTexts,
  getVisibleProducts,
} from "@/lib/server/queries";
import { wa } from "@/lib/whatsapp";

/**
 * ISR: se regenera on-demand por tag desde el admin (invalidatePublic);
 * 1 día es solo el respaldo (literal: la segment config no admite imports).
 */
export const revalidate = 86400;

/** Fondo del hero: glow verde a la derecha y blanco a la izquierda. */
const HERO_GLOW = {
  background:
    "radial-gradient(760px 460px at 74% 52%,rgba(94,184,56,.16),transparent 66%),linear-gradient(90deg,#fff 0%,rgba(255,255,255,.85) 35%,rgba(255,255,255,0) 62%)",
};

const SECTION = "px-[clamp(16px,4vw,40px)] py-20";
const H2 = "font-display m-0 text-[clamp(34px,3.6vw,52px)] leading-[1.02]";
const H2_SM = "font-display text-[clamp(32px,3.4vw,48px)] leading-[1.05]";
const KICKER = "font-sans text-[12px] font-bold tracking-[.26em] text-brand-deep";
const BTN_DARK =
  "rounded-full bg-ink px-[26px] py-[14px] font-sans text-[14px] font-bold text-cream hover:bg-brand hover:text-night";
const BTN_OUTLINE =
  "box-border rounded-full border-[1.5px] border-brand px-[26px] py-[14px] font-sans text-[14px] font-bold text-brand-deep hover:bg-brand hover:text-night";

export default async function HomePage() {
  const [visible, brands, categories, articles, agenda, runtime, texts] =
    await Promise.all([
      getVisibleProducts(),
      getBrands(),
      getCategories(),
      getArticles(),
      getAgenda(),
      getStore(),
      getTexts(),
    ]);
  const { content } = runtime;
  const rates = ratesOf(runtime);
  const cards = visible.map((p) => toCardProduct(p, brands, categories));
  const featured = cards.filter((_, i) => visible[i].featured);

  // Vehículo del hero: el elegido en el admin, o el primero visible. La
  // foto HD subida se usa solo mientras sea de ese mismo vehículo.
  const hero = cards.find((p) => p.slug === content.heroProd) ?? cards[0];
  const heroImage =
    content.heroPhoto && content.heroPhoto.prodId === hero?.slug
      ? content.heroPhoto.url
      : hero?.image;

  const homeCategories = categories
    .filter((c) => c.home)
    .map((c) => {
      const inCat = cards.filter((p) => p.category === c.slug);
      const pick = cards.find((p) => p.slug === c.imgProductId) ?? inCat[0];
      return {
        ...c,
        image: pick?.image ?? null,
        countLabel:
          c.sub ||
          `${inCat.length} ${inCat.length === 1 ? lexicon.unit : lexicon.unitPlural}`,
      };
    });
  const localPhoto = content.nosotros.localPhoto;

  return (
    <>
      <JsonLd data={localBusinessLd(runtime)} />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="bg-grid-light relative overflow-hidden border-b border-ink/[.08] bg-white">
        <div className="absolute inset-0" style={HERO_GLOW} />
        <div className="relative mx-auto box-content grid max-w-wide grid-cols-[repeat(auto-fit,minmax(min(420px,100%),1fr))] items-center gap-5 px-[clamp(16px,4vw,40px)] pb-12 pt-14">
          <div>
            <div className="mb-[26px] inline-flex items-center gap-2 rounded-full border border-[rgba(63,156,34,.45)] bg-white px-[14px] py-[7px] font-sans text-[11px] font-semibold tracking-[.24em] text-brand-deeper">
              <svg width="9" height="12" viewBox="0 0 12 16" fill="none" aria-hidden="true">
                <path d="M7 1 2 9.2h3.2L4 15l6-8.2H6.8L8 1z" fill="#5eb838" />
              </svg>
              {content.badge}
            </div>
            <h1 className="font-display m-0 text-[clamp(50px,5.8vw,82px)] leading-[.98] text-ink [text-wrap:balance]">
              {content.l1}
              <br />
              <span className="text-brand-deep">{content.l2}</span>
            </h1>
            <p className="mb-0 mt-[26px] max-w-[46ch] text-[17px] leading-[1.6] text-ink/65">
              {content.sub}
            </p>
            <div className="mt-[34px] flex flex-wrap gap-[14px]">
              <Link
                href={paths.catalog()}
                className="rounded-full bg-brand px-7 py-4 font-sans text-[15px] font-bold text-night hover:bg-ink hover:text-cream"
              >
                {lexicon.home.catalogCta}
              </Link>
              {features.advisor && (
                <AdvisorTrigger
                  modal="test"
                  className="rounded-full border-[1.5px] border-ink/25 bg-white px-7 py-4 font-sans text-[15px] font-bold text-ink hover:border-ink"
                >
                  {lexicon.home.testCta}
                </AdvisorTrigger>
              )}
            </div>
            <div className="mt-11 flex flex-wrap gap-[clamp(18px,3vw,34px)]">
              {content.stats.map((st) => (
                <div key={st.label}>
                  <div className="font-display text-[26px] font-extrabold tracking-normal text-ink">
                    {st.num}
                  </div>
                  <div className="font-sans text-[11px] font-medium tracking-[.14em] text-ink/50">
                    {st.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {hero && (
            <div className="relative">
              <div
                aria-hidden="true"
                className="font-display absolute inset-x-0 top-[4%] select-none overflow-hidden whitespace-nowrap text-center text-[clamp(72px,9vw,130px)] leading-none tracking-[.02em] text-[rgba(94,184,56,.14)]"
              >
                {heroGhost(hero.name)}
              </div>
              <Link href={paths.catalog(hero.slug)} className="relative block">
                {heroImage && (
                  // eslint-disable-next-line @next/next/no-img-element -- Cloudinary transforma (img())
                  <img
                    src={img(heroImage, { w: 1160 })}
                    alt={hero.name}
                    fetchPriority="high"
                    className="mx-auto block w-full max-w-[580px] mix-blend-multiply"
                  />
                )}
              </Link>
              <Link
                href={paths.catalog(hero.slug)}
                className="absolute bottom-[2%] right-[2%] flex items-center gap-[14px] rounded-2xl border border-ink/[.12] bg-white py-3 pl-[18px] pr-[14px] text-ink shadow-[0_14px_34px_rgba(21,23,15,.12)] hover:border-brand"
              >
                <div>
                  <div className="font-display text-[14px] font-extrabold tracking-normal">
                    {hero.name}
                  </div>
                  <div className="mt-[2px] font-sans text-[11.5px] text-ink/60">
                    {hero.chips.join(" · ")}
                  </div>
                </div>
                <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-ink text-[14px] text-brand">
                  →
                </span>
              </Link>
            </div>
          )}
        </div>
      </section>

      <Marquee messages={content.marquee} />

      {/* ── Categorías ───────────────────────────────────────── */}
      <section className={`bg-cream ${SECTION}`}>
        <div className="mx-auto max-w-wide">
          <div className="flex flex-wrap items-baseline justify-between gap-5">
            <h2 className={`${H2} whitespace-pre-line`}>{texts.cat_title}</h2>
            <p className="m-0 max-w-[38ch] text-[15px] leading-[1.6] text-ink/60">
              {texts.cat_sub}
            </p>
          </div>
          <div className="mt-11 grid grid-cols-[repeat(auto-fit,minmax(min(230px,100%),1fr))] gap-[18px]">
            {homeCategories.map((c) => (
              <Link
                key={c.slug}
                href={paths.catalog(c.pathSlug)}
                className="flex flex-col overflow-hidden rounded-[20px] border border-ink/10 bg-white text-ink hover:-translate-y-[6px] hover:border-brand hover:shadow-[0_20px_44px_rgba(21,23,15,.14)]"
              >
                <div className="stripes-card box-border flex h-[210px] flex-none items-center justify-center p-[18px]">
                  {c.image && (
                    // eslint-disable-next-line @next/next/no-img-element -- Cloudinary transforma (img())
                    <img
                      src={img(c.image, { w: 520 })}
                      alt={c.label}
                      loading="lazy"
                      className="max-h-full max-w-[88%] object-contain mix-blend-multiply"
                    />
                  )}
                </div>
                <div className="mt-auto flex items-center justify-between border-t border-ink/[.08] px-5 py-4">
                  <div>
                    <div className="font-display text-[17px] font-extrabold tracking-normal">
                      {c.label}
                    </div>
                    <div className="font-sans text-[12px] text-ink/55">{c.countLabel}</div>
                  </div>
                  <span className="box-content flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full border-[1.5px] border-ink text-[15px]">
                    →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Destacados ───────────────────────────────────────── */}
      <section className={`bg-white ${SECTION}`}>
        <div className="mx-auto max-w-wide">
          <div className="flex items-baseline gap-4">
            <span className={KICKER}>{texts.feat_kicker}</span>
            <span className="h-px flex-1 bg-ink/[.12]" />
            <Link
              href={paths.catalog()}
              className="font-sans text-[13px] font-bold text-brand-deep hover:text-brand-deeper"
            >
              {lexicon.home.seeAll}
            </Link>
          </div>
          <h2 className={`${H2} mt-[14px]`}>{texts.feat_title}</h2>
          <div className="mt-11 grid grid-cols-[repeat(auto-fill,minmax(min(290px,100%),1fr))] gap-[18px]">
            {featured.map((p) => (
              <ProductCard
                key={p.slug}
                product={p}
                rates={rates}
                whatsapp={runtime.whatsapp}
                variant="featured"
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Herramientas ─────────────────────────────────────── */}
      {features.advisor && (
      <section className={`bg-night text-cream ${SECTION}`}>
        <div className="mx-auto max-w-wide">
          <div className="flex flex-wrap items-baseline justify-between gap-5">
            <h2 className={`${H2_SM} m-0`}>
              {texts.tools_t1}
              <br />
              <span className="text-brand">{texts.tools_t2}</span>
            </h2>
            <p className="m-0 max-w-[44ch] text-[15px] leading-[1.6] text-cream/60">
              {texts.tools_sub}
            </p>
          </div>
          <div className="mt-11 grid grid-cols-[repeat(auto-fit,minmax(min(280px,100%),1fr))] gap-4">
            <AdvisorTrigger modal="test" className={TOOL}>
              <ToolBody
                kicker={lexicon.home.toolsTestKicker}
                title={texts.test_t}
                body={texts.test_d}
                cta={lexicon.home.toolsTestCta}
              />
            </AdvisorTrigger>
            <AdvisorTrigger modal="cuotas" className={TOOL}>
              <ToolBody
                kicker={lexicon.home.toolsCuotasKicker}
                title={texts.cuotas_t}
                body={texts.cuotas_d}
                cta={lexicon.home.toolsCuotasCta}
              />
            </AdvisorTrigger>
            <Link href={paths.catalog()} className={TOOL}>
              <ToolBody
                kicker={lexicon.home.toolsCompareKicker}
                title={texts.cmp_t}
                body={texts.cmp_d}
                cta={lexicon.home.toolsCompareCta}
              />
            </Link>
          </div>
        </div>
      </section>
      )}

      {/* ── Reparaciones ─────────────────────────────────────── */}
      {features.repairs && (
      <section className={`bg-white ${SECTION}`}>
        <div className="mx-auto grid max-w-wide grid-cols-[repeat(auto-fit,minmax(min(380px,100%),1fr))] items-center gap-[clamp(28px,4vw,56px)]">
          <div>
            <div className={KICKER}>{lexicon.home.repairsKicker}</div>
            <h2 className={`${H2_SM} mb-0 mt-[14px] [text-wrap:balance]`}>
              {content.rep.title}
            </h2>
            <p className="mb-0 mt-[18px] max-w-[48ch] text-[15px] leading-[1.65] text-ink/60">
              {content.rep.body}
            </p>
            <div className="mt-[26px] flex flex-wrap gap-3">
              <Link href="/reparaciones" className={BTN_DARK}>
                {lexicon.home.repairsCta}
              </Link>
              <WaLink whatsapp={runtime.whatsapp} {...wa.repair()} className={BTN_OUTLINE}>
                {lexicon.home.repairsWaCta}
              </WaLink>
            </div>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-[10px]">
            {content.rep.services.filter(Boolean).map((s) => (
              <div
                key={s}
                className="flex items-center gap-3 rounded-[14px] border border-ink/[.08] bg-cream px-[18px] py-4 font-sans text-[14px] font-semibold leading-[1.35]"
              >
                <BoltDot />
                <span>{s}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* ── Novedades ────────────────────────────────────────── */}
      {features.blog && (
      <section className={`bg-cream ${SECTION}`}>
        <div className="mx-auto max-w-wide">
          <div className="flex items-baseline gap-4">
            <span className={KICKER}>{texts.blog_kicker}</span>
            <span className="h-px flex-1 bg-ink/[.12]" />
            <Link
              href="/novedades"
              className="font-sans text-[13px] font-bold text-brand-deep hover:text-brand-deeper"
            >
              {lexicon.home.seeAllArticles}
            </Link>
          </div>
          <h2 className={`${H2} mt-[14px]`}>{texts.blog_title}</h2>
          <div className="mt-11 grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-[18px]">
            {articles.slice(0, 3).map((a) => (
              <Link
                key={a.id}
                href={`/novedades/${a.slug}`}
                className="flex flex-col gap-3 rounded-[20px] border border-ink/10 bg-white p-7 text-ink hover:-translate-y-[5px] hover:border-brand hover:shadow-[0_20px_44px_rgba(21,23,15,.12)]"
              >
                <div className="flex items-center gap-[10px]">
                  <span className="rounded-full bg-brand-pastel px-[10px] py-[5px] font-sans text-[10.5px] font-bold tracking-[.16em] text-brand-deeper">
                    {a.tag}
                  </span>
                  <span className="font-sans text-[11.5px] text-ink/45">{a.date}</span>
                </div>
                <div className="font-display text-[20px] font-extrabold leading-[1.25] tracking-[-.01em] [text-wrap:pretty]">
                  {a.title}
                </div>
                <div className="font-sans text-[13.5px] leading-[1.55] text-ink/60">
                  {a.excerpt}
                </div>
                <div className="mt-auto font-sans text-[13px] font-bold text-brand-deep">
                  {lexicon.home.readArticle}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* ── Comunidad (verde) ────────────────────────────────── */}
      {features.community && (
      <section className="relative overflow-hidden bg-brand px-[clamp(16px,4vw,40px)] py-[70px]">
        <Bolt
          width={300}
          height={400}
          strokeWidth={0.6}
          className="absolute -bottom-[120px] -right-10 opacity-[.12]"
        />
        <div className="relative mx-auto grid max-w-wide grid-cols-[repeat(auto-fit,minmax(min(340px,100%),1fr))] items-center gap-10">
          <div>
            <div className="font-sans text-[12px] font-bold tracking-[.3em] text-night/60">
              {texts.er_kicker}
            </div>
            <h2 className="font-display mb-0 mt-2 text-[clamp(30px,3.2vw,46px)] text-night">
              {texts.er_title}
            </h2>
            <p className="mb-0 mt-3 max-w-[52ch] text-[15px] leading-[1.6] text-night/75">
              {texts.er_body}
            </p>
            <Link
              href={paths.community()}
              className="mt-[22px] inline-block whitespace-nowrap rounded-full bg-night px-[30px] py-4 font-sans text-[15px] font-bold text-brand hover:-translate-y-[2px] hover:text-brand-hover"
            >
              {texts.er_btn}
            </Link>
          </div>
          {features.agenda && (
          <div className="flex flex-col gap-[10px]">
            <div className="font-sans text-[11px] font-bold tracking-[.26em] text-night/55">
              {lexicon.home.agendaKicker}
            </div>
            {agenda.slice(0, 2).map((ev) => (
              <div
                key={ev.id}
                className="flex items-center gap-4 rounded-2xl bg-[rgba(12,14,11,.92)] px-5 py-4 text-cream"
              >
                <div className="min-w-[52px] flex-none text-center">
                  <div className="font-display text-[22px] tracking-normal text-brand">
                    {ev.day}
                  </div>
                  <div className="font-sans text-[10px] font-bold tracking-[.18em] text-cream/55">
                    {ev.month}
                  </div>
                </div>
                <div>
                  <div className="font-display text-[15px] font-extrabold tracking-normal">
                    {ev.title}
                  </div>
                  <div className="font-sans text-[12.5px] text-cream/55">{ev.meta}</div>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      </section>
      )}

      {/* ── El local ─────────────────────────────────────────── */}
      <section className={`bg-white ${SECTION}`}>
        <div className="mx-auto grid max-w-wide grid-cols-[repeat(auto-fit,minmax(min(380px,100%),1fr))] items-center gap-[clamp(24px,4vw,50px)]">
          <div>
            <div className={KICKER}>{texts.local_kicker}</div>
            <h2 className={`${H2_SM} mb-0 mt-[14px] whitespace-pre-line`}>
              {texts.local_title}
            </h2>
            <p className="mb-0 mt-[18px] max-w-[46ch] text-[15px] leading-[1.65] text-ink/60">
              {texts.local_body}
            </p>
            <div className="mt-[26px] flex flex-col gap-3 font-sans text-[14px] font-medium">
              {[
                [lexicon.contact.address, runtime.address],
                [lexicon.contact.hours, runtime.hours],
                [
                  lexicon.contact.whatsapp,
                  `+${runtime.whatsapp} — ${lexicon.contact.waSuffix}`,
                ],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-3">
                  <span className="min-w-[86px] font-bold text-brand-deep">{k}</span>
                  <span>{v}</span>
                </div>
              ))}
            </div>
            <div className="mt-[26px] flex flex-wrap gap-3">
              <a href={runtime.mapsUrl} target="_blank" rel="noopener" className={BTN_DARK}>
                {lexicon.contact.maps}
              </a>
              <WaLink
                whatsapp={runtime.whatsapp}
                {...wa.testRide()}
                className={BTN_OUTLINE}
              >
                {lexicon.home.testRideCta}
              </WaLink>
            </div>
            <Link
              href="/nosotros"
              className="mt-[22px] inline-block font-sans text-[13px] font-bold text-brand-deep hover:text-brand-deeper"
            >
              {lexicon.home.aboutLink}
            </Link>
          </div>
          <LocalPhoto
            photo={localPhoto}
            address={runtime.address}
            className="aspect-[4/3]"
            titleSize="text-[17px]"
          />
        </div>
      </section>

      {/* ── Instagram ────────────────────────────────────────── */}
      <section className="bg-cream px-[clamp(16px,4vw,40px)] pb-10 pt-20">
        <div className="mx-auto max-w-wide">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <h3 className="font-display m-0 text-[26px] tracking-normal">{texts.ig_handle}</h3>
            <div className="flex gap-[18px] font-sans text-[13px] font-bold">
              <a
                href={`https://www.instagram.com/${runtime.instagram}/`}
                target="_blank"
                rel="noopener"
                className="text-brand-deep hover:text-brand-deeper"
              >
                {lexicon.home.instagramLink}
              </a>
              {runtime.tiktok && (
                <a
                  href={`https://www.tiktok.com/@${runtime.tiktok}`}
                  target="_blank"
                  rel="noopener"
                  className="text-brand-deep hover:text-brand-deeper"
                >
                  {lexicon.home.tiktokLink}
                </a>
              )}
            </div>
          </div>
          {/* Feed en el cliente: su ISR de 1 h no arrastra a la home. */}
          <InstagramFeed slots={igSlots} altFallback={texts.ig_handle} />
        </div>
      </section>
    </>
  );
}

const TOOL =
  "flex flex-col gap-[10px] rounded-[20px] border border-white/[.12] bg-white/[.03] p-[30px] text-left text-cream hover:-translate-y-1 hover:border-[rgba(94,184,56,.7)]";

function ToolBody({
  kicker,
  title,
  body,
  cta,
}: {
  kicker: string;
  title: string;
  body: string;
  cta: string;
}) {
  return (
    <>
      <div className="font-sans text-[11px] font-semibold tracking-[.26em] text-brand">
        {kicker}
      </div>
      <div className="font-display text-[22px] font-extrabold tracking-normal">{title}</div>
      <div className="font-sans text-[13.5px] leading-[1.55] text-cream/55">{body}</div>
      <div className="mt-auto font-sans text-[13px] font-bold text-brand">{cta}</div>
    </>
  );
}
