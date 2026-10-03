import type { Metadata } from "next";
import Link from "next/link";
import {
  Button,
  CellMono,
  CellStack,
  CellThumb,
  EmptyState,
  FilterChip,
  ProductPill,
  Table,
  cx,
  formatMoney,
  type TableColumn,
} from "@/components/bt";
import { ResponsiveTopBar } from "@/components/bt/admin-d2/top-bar";
import { COPY } from "@/lib/data/demo/copy";
import { features } from "@/lib/features";
import { img } from "@/lib/images";
import { getProductList, type ProductListRow } from "@/lib/server/screens/admin-d2";
import { NewProductButton, TestRideToggle } from "./product-list-client";
import { NO_PHOTO } from "./product-utils";

export const metadata: Metadata = { title: "Productos" };

const T = COPY.admin.products;

const thumb = (src: string | null) => (src ? img(src, { w: 160 }) : NO_PHOTO);
const price = (n: number | null) => (n == null ? "A consultar" : formatMoney(n));

/** Link de la lista conservando la búsqueda. */
function hrefFor(filter: string | undefined, q: string | undefined) {
  const sp = new URLSearchParams();
  if (filter) sp.set("filtro", filter);
  if (q) sp.set("q", q);
  const s = sp.toString();
  return `/admin/productos${s ? `?${s}` : ""}`;
}

/**
 * 3c · Productos: listado con stock por talle, "Prueba" editable en la
 * fila y filtros por grupo del menú (Bicicletas · Accesorios · Repuestos ·
 * Importados) + "Sin stock". La fila entera abre la edición (3d).
 */
export default async function AdminProductosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filtro?: string }>;
}) {
  const { q, filtro } = await searchParams;
  const data = await getProductList({ q, filter: filtro });

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
      key: "test",
      header: T.columns[4],
      width: "64px",
      cell: (r) => <TestRideToggle id={r.id} name={r.name} initial={r.testRide} />,
    },
    {
      key: "status",
      header: T.columns[5],
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
            {features.csvImport && (
              <Button variant="secondary" size="md" href="/admin/productos/importar">
                {T.import}
              </Button>
            )}
            <NewProductButton label={T.create} />
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
                    <div className="flex items-center justify-between gap-3">
                      <span className={cx("min-w-0 font-mono text-[12px] font-semibold leading-[1.5]", r.stock <= 0 ? "text-red-light" : "text-text-2")}>
                        {r.stockLabel}
                      </span>
                      <span className="flex flex-none items-center gap-2 text-[11px] font-bold uppercase tracking-[.08em] text-text-3">
                        Prueba
                        <TestRideToggle id={r.id} name={r.name} initial={r.testRide} />
                      </span>
                    </div>
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
