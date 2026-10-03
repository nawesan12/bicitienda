"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button, TextLink } from "@/components/bt/button";
import { OptionChip, RemovableChip } from "@/components/bt/chip";
import { cx } from "@/components/bt/cx";
import { EmptyState } from "@/components/bt/empty-state";
import { formatMoney } from "@/components/bt/format";
import { Breadcrumb } from "@/components/bt/navigation";
import { FOCUS, FONT, MONO, TRANSITION } from "@/components/bt/styles";
import { Checkbox } from "@/components/bt/toggle";
import type { CatalogItem, Pricing } from "@/lib/server/screens/tienda-a";
import { CatalogCard } from "@/components/bt/catalog-card";
import { PriceRangeSlider } from "./price-range";

/**
 * Catálogo 2b / 4b (isla cliente). La página es estática/ISR: el server
 * pasa todos los productos del grupo y acá se filtran, ordenan y paginan.
 * El estado vive en la URL (`?tipo=mtb&rodado=29&talle=M&min=…&max=…&
 * orden=…&q=…&pagina=2`): se escribe con history.replaceState
 * (sin ir al server) y se lee con useSearchParams dentro de un Suspense
 * chico (`SearchSync`), así el HTML estático trae la grilla sin filtros
 * y los links con filtros funcionan igual.
 *
 * Desktop (≥ lg): aside de 280 px, chips amarillos + "Limpiar", "Ordenar
 * por", grilla de 3 columnas con 9 por página y paginación. Mobile: botón
 * "Filtros · N" que abre un drawer (sin diseño en el handoff: panel a
 * pantalla completa con los mismos grupos), chips paper, grilla de 2
 * columnas con 6 y "Ver más modelos".
 */

/* ── Tipos y URL ───────────────────────────────────────────── */

export type SortKey = "vendidas" | "precio-asc" | "precio-desc" | "nuevos";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "vendidas", label: "Más vendidas" },
  { key: "precio-asc", label: "Menor precio" },
  { key: "precio-desc", label: "Mayor precio" },
  { key: "nuevos", label: "Más nuevos" },
];

interface Filters {
  tipo: string[];
  rodado: string[];
  talle: string[];
  min: number | null;
  max: number | null;
  orden: SortKey;
  q: string;
  pagina: number;
}

const EMPTY: Filters = {
  tipo: [],
  rodado: [],
  talle: [],
  min: null,
  max: null,
  orden: "vendidas",
  q: "",
  pagina: 1,
};

const list = (v: string | null) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : []);
const num = (v: string | null) => {
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
};

function parse(sp: URLSearchParams): Filters {
  const orden = sp.get("orden") as SortKey | null;
  return {
    tipo: list(sp.get("tipo")),
    rodado: list(sp.get("rodado")),
    talle: list(sp.get("talle")),
    min: num(sp.get("min")),
    max: num(sp.get("max")),
    orden: orden && SORTS.some((s) => s.key === orden) ? orden : "vendidas",
    q: sp.get("q")?.trim() ?? "",
    pagina: Math.max(1, Math.floor(num(sp.get("pagina")) ?? 1)),
  };
}

function serialize(f: Filters): string {
  const sp = new URLSearchParams();
  if (f.q) sp.set("q", f.q);
  if (f.tipo.length) sp.set("tipo", f.tipo.join(","));
  if (f.rodado.length) sp.set("rodado", f.rodado.join(","));
  if (f.talle.length) sp.set("talle", f.talle.join(","));
  if (f.min != null) sp.set("min", String(f.min));
  if (f.max != null) sp.set("max", String(f.max));
  if (f.orden !== "vendidas") sp.set("orden", f.orden);
  if (f.pagina > 1) sp.set("pagina", String(f.pagina));
  const s = sp.toString().replace(/%2C/g, ",");
  return s ? `?${s}` : "";
}

function SearchSync({ onChange }: { onChange: (f: Filters) => void }) {
  const sp = useSearchParams();
  const key = sp.toString();
  useEffect(() => {
    onChange(parse(new URLSearchParams(key)));
  }, [key, onChange]);
  return null;
}

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/* ── Props ─────────────────────────────────────────────────── */

export interface TypeOption {
  slug: string;
  label: string;
  count: number;
  /** Categorías que cubre (el tipo y sus descendientes). */
  match: string[];
}

export interface CatalogBrowserProps {
  title: string;
  breadcrumb: { label: string; href?: string }[];
  items: CatalogItem[];
  pricing: Pricing;
  types: TypeOption[];
  /** Rodado y talle (solo grupos de bicis). */
  bikeFilters: boolean;
  rodados: { value: string; enabled: boolean }[];
  sizes: { value: string; enabled: boolean }[];
  priceBounds: { min: number; max: number };
  /** Grupo sin productos (Repuestos, Importados): CTA a presupuesto. */
  quoteHref: string;
  copy: {
    count: string;
    type: string;
    rodado: string;
    price: string;
    size: string;
    clear: string;
    mobileButton: string;
    sortLabel: string;
    next: string;
    loadMore: string;
  };
}

const PER_PAGE = 9;
const PER_LOAD = 6;

/* ── Componente ────────────────────────────────────────────── */

export function CatalogBrowser(props: CatalogBrowserProps) {
  const { title, breadcrumb, items, pricing, types, bikeFilters, rodados, sizes, priceBounds, quoteHref, copy } = props;
  const pathname = usePathname() ?? "";
  const [f, setF] = useState<Filters>(EMPTY);
  const [mobileCount, setMobileCount] = useState(PER_LOAD);
  const [drawer, setDrawer] = useState(false);
  const urlTimer = useRef<number | undefined>(undefined);
  const resultsRef = useRef<HTMLDivElement>(null);

  const onUrl = useCallback((next: Filters) => {
    setF((prev) => (serialize(prev) === serialize(next) ? prev : next));
  }, []);

  /** Cambia filtros: estado ya, URL con un pequeño debounce (slider). */
  const update = useCallback(
    (patch: Partial<Filters>, opts: { keepPage?: boolean } = {}) => {
      setF((prev) => {
        const next = { ...prev, ...patch, ...(opts.keepPage ? {} : { pagina: 1 }) };
        window.clearTimeout(urlTimer.current);
        urlTimer.current = window.setTimeout(() => {
          window.history.replaceState(null, "", `${pathname}${serialize(next)}`);
        }, 200);
        return next;
      });
      if (!opts.keepPage) setMobileCount(PER_LOAD);
    },
    [pathname],
  );

  const toggleIn = (key: "tipo" | "rodado" | "talle", value: string) => {
    const cur = f[key];
    update({ [key]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value] });
  };

  const results = useMemo(() => {
    const q = fold(f.q);
    const tipoMatch = new Set(types.filter((t) => f.tipo.includes(t.slug)).flatMap((t) => t.match));
    const lo = f.min ?? -Infinity;
    const hi = f.max ?? Infinity;
    const out = items.filter(
      (it) =>
        (!q || fold(`${it.name} ${it.category}`).includes(q)) &&
        (!f.tipo.length || tipoMatch.has(it.categorySlug)) &&
        (!f.rodado.length || (it.rodado != null && f.rodado.includes(it.rodado))) &&
        (!f.talle.length || it.sizes.some((s) => s.stock > 0 && f.talle.includes(s.size))) &&
        it.price >= lo &&
        it.price <= hi,
    );
    const sorted = [...out];
    if (f.orden === "precio-asc") sorted.sort((a, b) => a.price - b.price || a.rank - b.rank);
    else if (f.orden === "precio-desc") sorted.sort((a, b) => b.price - a.price || a.rank - b.rank);
    else if (f.orden === "nuevos")
      sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.rank - b.rank);
    else sorted.sort((a, b) => a.rank - b.rank);
    return sorted;
  }, [items, types, f]);

  const totalPages = Math.max(1, Math.ceil(results.length / PER_PAGE));
  const page = Math.min(f.pagina, totalPages);
  const deskFrom = (page - 1) * PER_PAGE;
  const deskTo = deskFrom + PER_PAGE;

  /* Chips de filtros activos. */
  const chips: { key: string; label: string; remove: Partial<Filters> }[] = [
    ...(f.q ? [{ key: "q", label: `“${f.q}”`, remove: { q: "" } }] : []),
    ...f.tipo.map((t) => ({
      key: `t-${t}`,
      label: types.find((x) => x.slug === t)?.label ?? t,
      remove: { tipo: f.tipo.filter((x) => x !== t) },
    })),
    ...f.rodado.map((r) => ({
      key: `r-${r}`,
      label: `Rodado ${r}`,
      remove: { rodado: f.rodado.filter((x) => x !== r) },
    })),
    ...f.talle.map((s) => ({
      key: `s-${s}`,
      label: `Talle ${s}`,
      remove: { talle: f.talle.filter((x) => x !== s) },
    })),
    ...(f.min != null || f.max != null
      ? [
          {
            key: "precio",
            label: `${formatMoney(f.min ?? priceBounds.min)} – ${formatMoney(f.max ?? priceBounds.max)}`,
            remove: { min: null, max: null },
          },
        ]
      : []),
  ];
  const clearAll = () => update({ ...EMPTY, orden: f.orden });
  const nFilters = chips.length;

  const goPage = (p: number) => {
    update({ pagina: p }, { keepPage: true });
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /* Drawer: Escape cierra y el fondo no scrollea. */
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [drawer]);

  const countLabel = copy.count.replace("{n}", String(results.length));
  const sortSelect = (cls: string, id: string) => (
    <span className="relative block min-w-0">
      <select
        id={id}
        aria-label={copy.sortLabel}
        value={f.orden}
        onChange={(e) => update({ orden: e.target.value as SortKey })}
        className={cx(
          "block w-full cursor-pointer appearance-none rounded-btn border border-line-strong bg-surface font-semibold text-paper outline-none focus:border-yellow",
          FONT,
          TRANSITION,
          cls,
          "pr-9",
        )}
      >
        {SORTS.map((s) => (
          <option key={s.key} value={s.key}>
            {s.label}
          </option>
        ))}
      </select>
      <span aria-hidden className="pointer-events-none absolute top-1/2 right-[14px] -translate-y-1/2 text-[13px] text-paper">
        ▾
      </span>
    </span>
  );

  const filters = (prefix: string) => (
    <FilterGroups
      prefix={prefix}
      f={f}
      types={types}
      bikeFilters={bikeFilters}
      rodados={rodados}
      sizes={sizes}
      priceBounds={priceBounds}
      copy={copy}
      toggleIn={toggleIn}
      update={update}
    />
  );

  return (
    <div className={FONT}>
      <Suspense fallback={null}>
        <SearchSync onChange={onUrl} />
      </Suspense>

      {/* Cabecera */}
      <header className="flex flex-col gap-2 px-4 pt-[18px] lg:gap-[14px] lg:px-14 lg:pt-8">
        <Breadcrumb items={breadcrumb} />
        <div className="flex items-end gap-3 lg:justify-between">
          <h1 className="m-0 min-w-0 text-[64px] leading-[.88] font-black uppercase stretch-66 break-words md:text-[96px] md:leading-[.86]">
            {title}
          </h1>
          <span
            className={cx(
              "w-min flex-none pb-[6px] text-[11px] font-semibold uppercase text-text-3 lg:w-auto lg:pb-0 lg:text-[13px]",
              MONO,
            )}
            aria-live="polite"
          >
            {countLabel}
          </span>
        </div>
      </header>

      {/* Mobile: Filtros + orden */}
      <div className="grid grid-cols-2 gap-2 px-4 pt-4 lg:hidden">
        <button
          type="button"
          onClick={() => setDrawer(true)}
          aria-haspopup="dialog"
          aria-expanded={drawer}
          className={cx(
            "min-h-12 rounded-btn bg-yellow px-3 text-[14px] font-extrabold tracking-[.06em] text-ink uppercase hover:bg-brand-hover",
            TRANSITION,
            FOCUS,
          )}
        >
          {nFilters ? copy.mobileButton.replace("{n}", String(nFilters)) : copy.mobileButton.replace(" · {n}", "")}
        </button>
        {sortSelect("min-h-12 px-3 text-center text-[14px] max-md:text-[16px] [text-align-last:center]", "orden-m")}
      </div>
      {chips.length > 0 && (
        <div className="flex gap-[6px] overflow-x-auto px-4 pt-3 [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden">
          {chips.map((c) => (
            <span key={c.key} onClickCapture={(e) => (e.preventDefault(), update(c.remove))} className="flex">
              <RemovableChip href={`${pathname}${serialize({ ...f, ...c.remove, pagina: 1 })}`} tone="paper">
                {c.label}
              </RemovableChip>
            </span>
          ))}
        </div>
      )}

      {/* Cuerpo */}
      <div className="grid grid-cols-1 gap-10 p-4 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-14 lg:pt-8 lg:pb-[72px]">
        <aside aria-label="Filtros" className="max-lg:hidden">
          {filters("d")}
        </aside>

        <div ref={resultsRef} className="flex min-w-0 scroll-mt-6 flex-col gap-5">
          {/* Barra desktop */}
          <div className="flex flex-wrap items-center gap-[10px] max-lg:hidden">
            {chips.map((c) => (
              <span key={c.key} onClickCapture={(e) => (e.preventDefault(), update(c.remove))} className="flex">
                <RemovableChip href={`${pathname}${serialize({ ...f, ...c.remove, pagina: 1 })}`} tone="yellow">
                  {c.label}
                </RemovableChip>
              </span>
            ))}
            {chips.length > 0 && (
              <span onClickCapture={(e) => (e.preventDefault(), clearAll())} className="flex">
                <TextLink href={pathname} tone="muted" underline className="text-[13px] font-semibold">
                  {copy.clear}
                </TextLink>
              </span>
            )}
            <span className="flex-1" />
            <label htmlFor="orden-d" className="text-[14px] font-medium text-text-3">
              {copy.sortLabel}
            </label>
            <span className="w-[180px]">{sortSelect("px-[14px] py-[10px] text-[14px]", "orden-d")}</span>
          </div>

          {items.length === 0 ? (
            <EmptyState
              title="Lo conseguimos por presupuesto"
              description="Todavía no hay modelos publicados acá. Contanos qué necesitás y te pasamos precio y demora por WhatsApp."
              action={
                <Button href={quoteHref} variant="primary" size="md">
                  Pedir presupuesto
                </Button>
              }
            />
          ) : results.length === 0 ? (
            <EmptyState
              title="No hay modelos con esos filtros"
              description="Probá sacando alguno, o pedinos presupuesto y lo conseguimos."
              action={
                <Button variant="secondary" size="md" onClick={clearAll}>
                  {copy.clear}
                </Button>
              }
            />
          ) : (
            <ul className="m-0 grid list-none grid-cols-2 gap-[10px] p-0 md:grid-cols-3 md:gap-4">
              {results.map((it, i) => {
                const onDesk = i >= deskFrom && i < deskTo;
                const onMobile = i < mobileCount;
                if (!onDesk && !onMobile) return null;
                return (
                  <li key={it.slug} className={cx("min-w-0", !onDesk && "lg:hidden", !onMobile && "max-lg:hidden")}>
                    <CatalogCard item={it} pricing={pricing} />
                  </li>
                );
              })}
            </ul>
          )}

          {/* Paginación desktop */}
          {totalPages > 1 && (
            <nav aria-label="Paginación" className="mt-5 flex flex-wrap justify-center gap-2 max-lg:hidden">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => goPage(p)}
                  aria-current={p === page ? "page" : undefined}
                  aria-label={`Página ${p}`}
                  className={cx(
                    "flex h-11 min-w-11 items-center justify-center rounded-btn text-[15px]",
                    p === page
                      ? "bg-yellow font-extrabold text-ink"
                      : "border border-line-strong font-bold text-paper hover:border-text-4",
                    TRANSITION,
                    FOCUS,
                  )}
                >
                  {p}
                </button>
              ))}
              {page < totalPages && (
                <button
                  type="button"
                  onClick={() => goPage(page + 1)}
                  className={cx(
                    "flex h-11 items-center rounded-btn border border-line-strong px-4 text-[14px] font-bold tracking-[.06em] text-paper uppercase hover:border-text-4",
                    TRANSITION,
                    FOCUS,
                  )}
                >
                  {copy.next}
                </button>
              )}
            </nav>
          )}

          {/* Ver más mobile */}
          {mobileCount < results.length && (
            <div className="pt-1 pb-7 lg:hidden">
              <Button variant="secondary" size="full" onClick={() => setMobileCount((n) => n + PER_LOAD)}>
                {copy.loadMore}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Drawer de filtros (mobile) */}
      {drawer && (
        <div role="dialog" aria-modal="true" aria-labelledby="filtros-titulo" className="fixed inset-0 z-50 flex flex-col bg-ink lg:hidden">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <span id="filtros-titulo" className="text-[30px] leading-none font-black uppercase stretch-70">
              Filtros
            </span>
            <button
              type="button"
              onClick={() => setDrawer(false)}
              aria-label="Cerrar filtros"
              className={cx("flex size-11 items-center justify-center rounded-btn bg-paper text-[22px] leading-none font-bold text-ink", FOCUS)}
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-5">{filters("m")}</div>
          <div className="grid grid-cols-[auto_1fr] gap-2 border-t border-line px-4 py-3">
            <Button variant="secondary" size="md" onClick={clearAll} disabled={!nFilters}>
              {copy.clear}
            </Button>
            <Button variant="primary" size="md" onClick={() => setDrawer(false)}>
              Ver {results.length} {results.length === 1 ? "modelo" : "modelos"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Grupos de filtros (aside y drawer) ────────────────────── */

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
      <legend className="mb-3 p-0 text-[13px] font-bold tracking-[.08em] text-text-3 uppercase">{title}</legend>
      {children}
    </fieldset>
  );
}

function FilterGroups({
  prefix,
  f,
  types,
  bikeFilters,
  rodados,
  sizes,
  priceBounds,
  copy,
  toggleIn,
  update,
}: {
  prefix: string;
  f: Filters;
  types: TypeOption[];
  bikeFilters: boolean;
  rodados: { value: string; enabled: boolean }[];
  sizes: { value: string; enabled: boolean }[];
  priceBounds: { min: number; max: number };
  copy: CatalogBrowserProps["copy"];
  toggleIn: (key: "tipo" | "rodado" | "talle", value: string) => void;
  update: (patch: Partial<Filters>) => void;
}) {
  const lo = f.min ?? priceBounds.min;
  const hi = f.max ?? priceBounds.max;
  return (
    <div className="flex flex-col gap-7">
      {types.length > 1 && (
        <Group title={copy.type}>
          <div className="flex flex-col gap-1">
            {types.map((t) => (
              <Checkbox
                key={t.slug}
                label={t.label}
                count={t.count}
                checked={f.tipo.includes(t.slug)}
                onChange={() => toggleIn("tipo", t.slug)}
              />
            ))}
          </div>
        </Group>
      )}

      {bikeFilters && rodados.length > 0 && (
        <Group title={copy.rodado}>
          <div className="flex flex-wrap gap-2">
            {rodados.map((r) => (
              <OptionChip
                key={r.value}
                label={r.value}
                name={`${prefix}-rodado`}
                checked={f.rodado.includes(r.value)}
                disabled={!r.enabled && !f.rodado.includes(r.value)}
                onChange={() => toggleIn("rodado", r.value)}
              />
            ))}
          </div>
        </Group>
      )}

      {priceBounds.max > priceBounds.min && (
        <Group title={copy.price}>
          <PriceRangeSlider
            idPrefix={`${prefix}-precio`}
            min={priceBounds.min}
            max={priceBounds.max}
            value={[lo, hi]}
            onChange={([a, b]) =>
              update({
                min: a <= priceBounds.min ? null : a,
                max: b >= priceBounds.max ? null : b,
              })
            }
          />
        </Group>
      )}

      {bikeFilters && sizes.length > 0 && (
        <Group title={copy.size}>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => (
              <OptionChip
                key={s.value}
                wide
                label={s.value}
                name={`${prefix}-talle`}
                checked={f.talle.includes(s.value)}
                disabled={!s.enabled && !f.talle.includes(s.value)}
                onChange={() => toggleIn("talle", s.value)}
              />
            ))}
          </div>
        </Group>
      )}
    </div>
  );
}
