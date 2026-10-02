"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAdvisor } from "@/components/store/advisor-modals";
import { CartButton } from "@/components/store/cart-drawer";
import { NavCompareButton } from "@/components/store/compare-button";
import { WaLink } from "@/components/store/wa-link";
import { useCatalogFilters } from "@/lib/catalog-store";
import { lexicon } from "@/lib/data/content";
import { img, resolveImage } from "@/lib/images";
import { features } from "@/lib/features";
import { paths } from "@/lib/paths";
import { wa } from "@/lib/whatsapp";

/** Debajo de este ancho el nav pasa a hamburguesa (como el prototipo). */
const DESKTOP_MIN = 1140;

type NavItem =
  | { label: string; href: string; accent?: boolean; modal?: never }
  | { label: string; modal: "test" | "cuotas"; href?: never; accent?: never };

/**
 * Buscador del nav (y del menú mobile): comparte el texto con la grilla
 * del catálogo y filtra en vivo. Al enfocarlo fuera del catálogo lleva a
 * Vehículos; en una categoría se queda ahí (el `goVehiculosKeep`).
 */
function SearchInput({
  className,
  listPaths,
}: {
  className: string;
  listPaths: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useCatalogFilters((s) => s.search);
  const set = useCatalogFilters((s) => s.set);

  return (
    <input
      type="search"
      aria-label={lexicon.nav.searchPlaceholder}
      placeholder={lexicon.nav.searchPlaceholder}
      value={search}
      onChange={(e) => set({ search: e.target.value })}
      onFocus={() => {
        if (!listPaths.includes(pathname)) router.push(paths.catalog());
      }}
      className={`box-border rounded-full border border-white/[.14] bg-white/[.08] px-[18px] text-cream outline-none placeholder:text-[#757575] [&::-webkit-search-cancel-button]:hidden ${className}`}
    />
  );
}

export function SiteHeader({
  whatsapp,
  ventaOnline,
  listPaths,
}: {
  whatsapp: string;
  /** false = la web es 100% WhatsApp: sin botón del carrito. */
  ventaOnline: boolean;
  /** Paths del catálogo (portada y categorías) para el buscador. */
  listPaths: string[];
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { open: openAdvisor } = useAdvisor();
  const logo = img(resolveImage("/brand/logo-white.png"), { w: 400 });

  // Al pasar a desktop el menú se cierra solo, como el prototipo.
  useEffect(() => {
    if (!menuOpen) return;
    const mq = window.matchMedia(`(min-width: ${DESKTOP_MIN}px)`);
    const onChange = () => mq.matches && setMenuOpen(false);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [menuOpen]);

  // Solo los módulos prendidos (lib/features.ts).
  const desktop: NavItem[] = [
    { label: lexicon.nav.catalog, href: paths.catalog() },
    ...(features.repairs ? [{ label: lexicon.nav.repairs, href: "/reparaciones" }] : []),
    ...(features.blog ? [{ label: lexicon.nav.blog, href: "/novedades" }] : []),
    ...(features.advisor ? [{ label: lexicon.nav.test, modal: "test" as const }] : []),
    { label: lexicon.nav.about, href: "/nosotros" },
    ...(features.community
      ? [{ label: lexicon.nav.community, href: paths.community(), accent: true }]
      : []),
  ];
  const mobile: NavItem[] = [
    { label: lexicon.nav.catalog, href: paths.catalog() },
    ...(features.repairs ? [{ label: lexicon.nav.repairs, href: "/reparaciones" }] : []),
    ...(features.blog ? [{ label: lexicon.nav.blog, href: "/novedades" }] : []),
    ...(features.advisor
      ? [
          { label: lexicon.nav.test, modal: "test" as const },
          { label: lexicon.nav.cuotas, modal: "cuotas" as const },
        ]
      : []),
    { label: lexicon.nav.about, href: "/nosotros" },
    ...(features.community
      ? [{ label: lexicon.nav.communityLong, href: paths.community(), accent: true }]
      : []),
  ];

  const desktopLink = (accent?: boolean) =>
    accent ? "text-brand hover:text-brand-hover" : "text-cream/75 hover:text-brand";
  const mobileLink = (accent?: boolean, last?: boolean) =>
    `px-1 py-3 text-left font-sans text-[17px] font-bold ${
      last ? "" : "border-b border-white/[.08]"
    } ${accent ? "text-brand hover:text-brand-hover" : "text-cream hover:text-brand"}`;

  return (
    <>
      <header className="no-scrollbar fixed inset-x-0 top-0 z-[80] flex h-[66px] items-center gap-[18px] overflow-x-auto border-b border-white/[.08] bg-[rgba(12,14,11,.88)] px-[clamp(12px,3vw,28px)] backdrop-blur-[14px]">
        <Link href="/" className="flex flex-none items-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- logo en Cloudinary/public, sin optimizador */}
          <img src={logo} alt={lexicon.nav.logoAlt} className="block h-[34px]" />
        </Link>

        <nav className="hidden flex-none items-center gap-[18px] whitespace-nowrap font-sans text-[12.5px] font-semibold min-[1140px]:flex">
          {desktop.map((l) =>
            l.modal ? (
              <button
                key={l.label}
                type="button"
                onClick={() => openAdvisor(l.modal)}
                className={desktopLink()}
              >
                {l.label}
              </button>
            ) : (
              <Link key={l.label} href={l.href} className={desktopLink(l.accent)}>
                {l.label}
              </Link>
            ),
          )}
        </nav>
        <div className="hidden min-w-[110px] flex-1 justify-center min-[1140px]:flex">
          <SearchInput
            listPaths={listPaths}
            className="w-full min-w-[100px] max-w-[320px] py-[9px] text-[13px]"
          />
        </div>
        <span className="flex-1 min-[1140px]:hidden" />

        <div className="flex flex-none items-center gap-3">
          {features.compare && <NavCompareButton />}
          {ventaOnline && <CartButton />}
          <button
            type="button"
            aria-label="Menú"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
            className="-mx-[6px] flex flex-col gap-1 px-3 py-[15px] min-[1140px]:hidden"
          >
            <span className="block h-[2px] w-5 bg-cream" />
            <span className="block h-[2px] w-5 bg-cream" />
            <span className="block h-[2px] w-5 bg-brand" />
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-[95]">
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setMenuOpen(false)}
            className="animate-backdrop absolute inset-0 cursor-default bg-[rgba(12,14,11,.6)] backdrop-blur-[3px]"
          />
          <div className="animate-slide-in absolute inset-y-0 right-0 box-content flex w-[300px] max-w-[86vw] flex-col gap-1 overflow-y-auto border-l border-[rgba(94,184,56,.3)] bg-night p-6">
            {/* eslint-disable-next-line @next/next/no-img-element -- logo en Cloudinary/public */}
            <img src={logo} alt={lexicon.nav.logoAlt} className="mb-[18px] w-[170px]" />
            <SearchInput
              listPaths={listPaths}
              className="mb-[14px] w-full py-[11px] text-[14px]"
            />
            {mobile.map((l, i) => {
              const last = !ventaOnline && i === mobile.length - 1;
              return l.modal ? (
                <button
                  key={l.label}
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    openAdvisor(l.modal);
                  }}
                  className={mobileLink(false, last)}
                >
                  {l.label}
                </button>
              ) : (
                <Link
                  key={l.label}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className={mobileLink(l.accent, last)}
                >
                  {l.label}
                </Link>
              );
            })}
            {ventaOnline && (
              <CartButton
                variant="menu"
                onOpen={() => setMenuOpen(false)}
                className={mobileLink(false, true)}
              />
            )}
            <span className="flex-1" />
            <WaLink
              whatsapp={whatsapp}
              {...wa.general()}
              className="rounded-full bg-brand p-[14px] text-center font-sans text-[14px] font-bold text-night hover:bg-brand-hover"
            >
              {lexicon.nav.advisor}
            </WaLink>
          </div>
        </div>
      )}

      {/* Compensa la altura del header fijo. */}
      <div className="h-[66px]" />
    </>
  );
}
