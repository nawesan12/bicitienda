import type { Metadata } from "next";
import { AdminTopBar, Button, Display, EmptyState, FilterChip, SearchInput } from "@/components/bt";
import {
  getOrderDetail,
  getOrdersBoard,
  ORDER_FILTERS,
  type OrderFilter,
  type OrderRange,
} from "@/lib/server/screens/admin-d1";
import { OrderDetailPanel } from "./order-detail";
import { OrdersCards, OrdersTable } from "./orders-table";
import { RangeSelect } from "./range-select";

export const metadata: Metadata = { title: "Pedidos" };

type SP = { f?: string; rango?: string; q?: string; sel?: string };

/** Filtros y rango en la URL; `sel` elige el pedido del panel (3a). */
function hrefWith(sp: SP, patch: Partial<SP>): string {
  const next = { ...sp, ...patch };
  const qs = new URLSearchParams();
  if (next.f && next.f !== "todos") qs.set("f", next.f);
  if (next.rango && next.rango !== "7") qs.set("rango", next.rango);
  if (next.q) qs.set("q", next.q);
  if (next.sel) qs.set("sel", next.sel);
  const s = qs.toString();
  return s ? `/admin/pedidos?${s}` : "/admin/pedidos";
}

/**
 * 3a · Pedidos: filtros con contadores, tabla y panel de detalle del
 * seleccionado (`?sel=`). En mobile (< lg) la lista es de tarjetas y cada
 * una abre /admin/pedidos/[numero] (4i).
 */
export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const filter = (ORDER_FILTERS.some((f) => f.key === sp.f) ? sp.f : "todos") as OrderFilter;
  const range = (["7", "30", "todo"].includes(sp.rango ?? "") ? sp.rango : "7") as OrderRange;
  const q = (sp.q ?? "").trim().slice(0, 80);
  const { rows, counts } = await getOrdersBoard({ filter, range, q });
  const selNumber = sp.sel ?? rows[0]?.number;
  const detail = selNumber ? await getOrderDetail(selNumber) : null;
  const base: SP = { f: filter, rango: range, q };

  const chips = ORDER_FILTERS.filter((f) => f.key !== "cancelados" || counts.cancelados > 0 || filter === "cancelados");
  const exportQs = new URLSearchParams({ f: filter, rango: range, ...(q ? { q } : {}) }).toString();

  const chipNav = (
    <nav aria-label="Filtrar pedidos" className="flex gap-2 max-lg:-mx-4 max-lg:overflow-x-auto max-lg:px-4 max-lg:pb-1 lg:flex-wrap">
      {chips.map((c) => (
        <FilterChip key={c.key} active={c.key === filter} count={counts[c.key]} href={hrefWith(base, { f: c.key, sel: undefined })} className="flex-none">
          {c.label}
        </FilterChip>
      ))}
    </nav>
  );

  return (
    <>
      {/* ── 3a desktop ── */}
      <div className="max-lg:hidden">
        <AdminTopBar
          title="Pedidos"
          search={{ action: "/admin/pedidos", placeholder: "Buscar pedido o cliente", width: 280, defaultValue: q }}
          actions={
            <Button variant="secondary" size="md" href={`/admin/pedidos/exportar?${exportQs}`} prefetch={false} className="whitespace-nowrap">
              Exportar
            </Button>
          }
        />
        <div className="flex items-center gap-2 px-10 pt-[18px]">
          {chipNav}
          <div className="flex-1" />
          <RangeSelect
            value={range}
            hrefs={{
              "7": hrefWith(base, { rango: "7", sel: undefined }),
              "30": hrefWith(base, { rango: "30", sel: undefined }),
              todo: hrefWith(base, { rango: "todo", sel: undefined }),
            }}
          />
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_380px] items-start gap-6 px-10 pb-10 pt-[18px]">
          <OrdersTable
            rows={rows}
            selected={detail?.number}
            hrefFor={(r) => hrefWith(base, { sel: r.number })}
            empty={q ? `No hay pedidos que coincidan con “${q}”.` : "No hay pedidos en este filtro."}
          />
          {detail ? (
            <OrderDetailPanel order={detail} variant="panel" />
          ) : (
            <EmptyState size="sm" title="Sin pedido" description="Elegí un pedido de la lista para ver el detalle." className="rounded-card border border-line" />
          )}
        </div>
      </div>

      {/* ── mobile: lista → 4i ── */}
      <div className="flex flex-col gap-4 px-4 pb-7 pt-[18px] lg:hidden">
        <Display size="admin">Pedidos</Display>
        <SearchInput action="/admin/pedidos" placeholder="Buscar pedido o cliente" defaultValue={q} size="lg" />
        {chipNav}
        <OrdersCards rows={rows} empty={q ? `No hay pedidos que coincidan con “${q}”.` : "No hay pedidos en este filtro."} />
        <p className="m-0 text-[13px] text-text-3">
          {range === "todo" ? "Todos los pedidos." : `Pedidos abiertos y cerrados de los últimos ${range} días.`}{" "}
          <a className="font-bold text-yellow" href={hrefWith(base, { rango: range === "todo" ? "7" : "todo", sel: undefined })}>
            {range === "todo" ? "Ver últimos 7 días" : "Ver todos"}
          </a>
        </p>
      </div>
    </>
  );
}
