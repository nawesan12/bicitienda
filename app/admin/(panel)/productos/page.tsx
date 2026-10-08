import type { Metadata } from "next";
import Link from "next/link";
import { Button, CellMono, CellStack, CellThumb, cx, EmptyState, FilterChip, formatMoney, ProductPill, ResponsiveTopBar, Table, type TableColumn } from "@/components/bt";
import { COPY } from "@/lib/data/demo/copy";
import { features } from "@/lib/features";
import { img } from "@/lib/images";
import { getAdminBrandNames, getAdminCategories, type AdminCategory } from "@/lib/server/admin-queries";
import { getProductList, type ProductListRow } from "@/lib/server/screens/admin-d2";
import { NewProductButton, type NewProductCategory } from "./product-list-client";
import { NO_PHOTO } from "./product-utils";

export const metadata: Metadata = { title: "Productos" };

const T = COPY.admin.products;

const thumb = (src: string | null) => (src ? img(src, { w: 160 }) : NO_PHOTO);
const price = (n: number | null) => (n == null ? "A consultar" : formatMoney(n));

/**
 * Opciones de categoría del modal "+ Nuevo producto": solo hojas (las que
 * agrupan no llevan productos), en el orden del menú y con su grupo
 * adelante. La primera es la misma que elige `createProduct` por defecto.
 */
function productCategories(cats: AdminCategory[]): NewProductCategory[] {
  const bySlug = new Map(cats.map((c) => [c.slug, c]));
  const parents = new Set(cats.map((c) => c.parentSlug).filter(Boolean));
  const leaves = cats.filter((c) => !parents.has(c.slug));
  const key = (c: AdminCategory) => {
    const parent = c.parentSlug ? bySlug.get(c.parentSlug) : undefined;
    return parent ? [parent.order, c.order] : [c.order, -1];
  };
  return [...(leaves.length ? leaves : cats)]
    .sort((a, b) => {
      const [a1, a2] = key(a);
      const [b1, b2] = key(b);
      return a1 - b1 || a2 - b2 || a.slug.localeCompare(b.slug);
    })
    .map((c) => {
      const parent = c.parentSlug ? bySlug.get(c.parentSlug) : undefined;
      return { slug: c.slug, label: parent ? `${parent.label} · ${c.label}` : c.label };
    });
}

/** Link de la lista conservando la búsqueda. */
function hrefFor(filter: string | undefined, q: string | undefined) {
  const sp = new URLSearchParams();
  if (filter) sp.set("filtro", filter);
  if (q) sp.set("q", q);
  const s = sp.toString();
  return `/admin/productos${s ? `?${s}` : ""}`;
}

/**
 * 3c · Productos: listado con stock por talle (sin columna "Prueba": la
 * tienda ya no ofrece pruebas de bici, el foco es el taller) y filtros por grupo del menú (Bicicletas · Accesorios · Repuestos ·
 * Importados) + "Sin stock". La fila entera abre la edición (3d).
 */
export default async function AdminProductosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filtro?: string }>;
}) {
  const { q, filtro } = await searchParams;
  const [data, cats, brands] = await Promise.all([
    getProductList({ q, filter: filtro }),
    getAdminCategories(),
    getAdminBrandNames(),
  ]);
  const newCategories = productCategories(cats);

  const columns: TableColumn<ProductListRow>[] = [
    { key: "thumb", header: "", width: "64px", cell: (r) => <CellThumb src={thumb(r.image)} /> },
    {
      key: "name",
      header: T.columns[0],
      width: "minmax(0,1fr)",
      cell: (r) => <CellStack primary={r.name} secondary={<CellMono size={12} tone="muted">{r.sku ?? "Sin SKU"}</CellMono>} />,
    },
    {
      key: "cat",
      header: T.columns[1],
      width: "110px",
      cell: (r) => <span className="block truncate text-text-2">{r.categoryLabel}</span>,
    },
    {
      key: "price",
      header: T.columns[2],
      width: "110px",
      cell: (r) => <span className="block truncate font-extrabold">{price(r.price)}</span>,
    },
    {
      key: "stock",
      header: T.columns[3],
      width: "190px",
      cell: (r) => (
        <span className={cx("block truncate font-mono text-[12px] font-semibold", r.stock <= 0 ? "text-red-light" : "text-text-2")}>
          {r.stockLabel}
        </span>
      ),
    },
    {
      key: "status",
      header: T.columns[4],
      width: "112px",
      cell: (r) => <ProductPill status={r.status} size="md" />,
    },
  ];

  const filters = [
    { key: undefined, label: "Todos", count: data.total },
    ...data.groups.map((g) => ({ key: g.slug, label: g.label, count: g.count })),
  ];

  return (
    <>
      <ResponsiveTopBar
        title={T.title}
        search={{ action: "/admin/productos", placeholder: T.searchPlaceholder, width: 280, defaultValue: q }}
        actions={
          <>
            <Button variant="secondary" size="md" href="/admin/productos/categorias">
              Categorías
            </Button>
            {features.csvImport && (
              <Button variant="secondary" size="md" href="/admin/productos/importar">
                {T.import}
              </Button>
            )}
            <NewProductButton label={T.create} categories={newCategories} brands={brands} />
          </>
        }
        mobileActions={
          <>
            <Button variant="secondary" size="md" href="/admin/productos/categorias">
              Categorías
            </Button>
            {features.csvImport && (
              <Button variant="secondary" size="md" href="/admin/productos/importar">
                {T.import}
              </Button>
            )}
            <NewProductButton label={T.create} categories={newCategories} brands={brands} className="col-span-2" />
          </>
        }
      />

      <div className="flex gap-2 overflow-x-auto px-4 pt-4 [scrollbar-width:none] lg:px-10 lg:pt-[18px] [&::-webkit-scrollbar]:hidden">
        {filters.map((f) => (
          <FilterChip key={f.label} href={hrefFor(f.key, q)} active={filtro === f.key || (!filtro && !f.key)} count={f.count}>
            {f.label}
          </FilterChip>
        ))}
        <span className="min-w-2 flex-1" />
        <FilterChip href={hrefFor("sin-stock", q)} active={filtro === "sin-stock"} count={data.outOfStock}>
          Sin stock
        </FilterChip>
      </div>

      <div className="px-4 pt-4 pb-10 lg:px-10 lg:pt-[18px]">
        {data.rows.length === 0 ? (
          <EmptyState
            title={q ? "Sin resultados" : "No hay productos acá"}
            description={
              q
                ? `Nada coincide con "${q}". Probá con otra parte del nombre o el SKU.`
                : "Cargá uno con “+ Nuevo producto” o importá la planilla."
            }
            action={
              <Button variant="secondary" size="md" href="/admin/productos">
                Ver todos
              </Button>
            }
          />
        ) : (
          <>
            <Table
              className="max-xl:hidden"
              caption="Productos"
              columns={columns}
              rows={data.rows}
              getRowKey={(r) => r.id}
              rowHref={(r) => `/admin/productos/${r.id}`}
              rowLabel={(r) => `Editar ${r.name}`}
              gap={24}
            />
            <ul className="m-0 flex list-none flex-col overflow-hidden rounded-card border border-line p-0 xl:hidden">
              {data.rows.map((r) => (
                <li key={r.id} className="relative flex gap-3 border-t border-line p-4 first:border-t-0 hover:bg-paper/4">
                  <Link
                    href={`/admin/productos/${r.id}`}
                    aria-label={`Editar ${r.name}`}
                    className="absolute inset-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-yellow"
                  />
                  <CellThumb src={thumb(r.image)} />
                  <div className="flex min-w-0 flex-1 flex-col gap-[6px]">
                    <CellStack
                      primary={r.name}
                      secondary={<CellMono size={12} tone="muted">{`${r.sku ?? "Sin SKU"} · ${r.categoryLabel}`}</CellMono>}
                    />
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[15px] font-extrabold">{price(r.price)}</span>
                      <ProductPill status={r.status} size="sm" />
                    </div>
                    <span className={cx("min-w-0 font-mono text-[12px] font-semibold leading-[1.5]", r.stock <= 0 ? "text-red-light" : "text-text-2")}>
                      {r.stockLabel}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  );
}
