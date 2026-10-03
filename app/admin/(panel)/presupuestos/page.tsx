import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminTopBar, BackLink, CellStack, cx, Display, EmptyState, FilterChip, QuotePill, SearchInput, Table } from "@/components/bt";
import { features } from "@/lib/features";
import { getQuoteDetail, getQuotesBoard, QUOTE_FILTER_DEFS, type QuoteFilter, type QuoteRowView } from "@/lib/server/screens/admin-d1";
import { getQuoteByNumber } from "@/lib/server/quotes";
import { QuotePanel } from "./quote-panel";

export const metadata: Metadata = { title: "Presupuestos" };

type SP = { estado?: string; q?: string; sel?: string };

function hrefWith(sp: SP, patch: Partial<SP>): string {
  const n = { ...sp, ...patch };
  const qs = new URLSearchParams();
  if (n.estado && n.estado !== "todos") qs.set("estado", n.estado);
  if (n.q) qs.set("q", n.q);
  if (n.sel) qs.set("sel", n.sel);
  const s = qs.toString();
  return s ? `/admin/presupuestos?${s}` : "/admin/presupuestos";
}

/**
 * 5b · Presupuestos: bandeja con filtros por estado (con contadores),
 * tabla y panel de cotización del seleccionado (`?sel=`). En mobile (no
 * diseñado) es lista → detalle.
 */
export default async function AdminQuotesPage({ searchParams }: { searchParams: Promise<SP> }) {
  if (!features.quotes) notFound();
  const sp = await searchParams;
  const filter = (QUOTE_FILTER_DEFS.some((d) => d.key === sp.estado) ? sp.estado : "todos") as QuoteFilter;
  const q = (sp.q ?? "").trim().slice(0, 80);
  const { rows, counts, full, today } = await getQuotesBoard({ filter, q });
  let selFull = full.find((f) => f.quote.number === sp.sel) ?? null;
  // Seleccionado fuera del filtro: se busca solo ese (no la bandeja entera otra vez).
  if (!selFull && sp.sel) selFull = await getQuoteByNumber(sp.sel);
  selFull ??= full[0] ?? null;
  const detail = selFull ? await getQuoteDetail(selFull, today) : null;
  const base: SP = { estado: filter, q };
  const explicit = !!(sp.sel && detail);

  const chips = (
    <nav aria-label="Filtrar presupuestos" className="flex gap-2 max-lg:-mx-4 max-lg:overflow-x-auto max-lg:px-4 max-lg:pb-1 lg:flex-wrap">
      {QUOTE_FILTER_DEFS.map((d) => (
        <FilterChip
          key={d.key}
          active={d.key === filter}
          count={counts[d.key]}
          href={hrefWith(base, { estado: d.key, sel: undefined })}
          className={cx("flex-none", d.key !== filter && "text-text-2")}
        >
          {d.label}
        </FilterChip>
      ))}
    </nav>
  );
  const empty = q ? `No hay presupuestos que coincidan con “${q}”.` : "No hay presupuestos en este filtro.";

  return (
    <>
      {/* ── 5b desktop ── */}
      <div className="max-lg:hidden">
        <AdminTopBar
          title="Presupuestos"
          search={{ action: "/admin/presupuestos", placeholder: "Buscar cliente o producto", width: 280, defaultValue: q }}
        />
        <div className="px-10 pt-[18px]">{chips}</div>
        <div className="grid grid-cols-[minmax(0,1fr)_420px] items-start gap-6 px-10 pb-10 pt-5">
          <Table<QuoteRowView>
            caption="Presupuestos"
            rows={rows}
            getRowKey={(r) => r.number}
            selectedKey={detail?.number}
            rowHref={(r) => hrefWith(base, { sel: r.number })}
            rowLabel={(r) => `Presupuesto #${r.number}: ${r.title}`}
            gap={20}
            empty={empty}
            columns={[
              {
                key: "n",
                header: "Número",
                width: "110px",
                cell: (r) => (
                  <span className="flex flex-col gap-[3px]">
                    <span className="font-mono text-[12px] font-semibold">#{r.number}</span>
                    <span className="whitespace-nowrap text-[12px] text-text-3">{r.when}</span>
                  </span>
                ),
              },
              { key: "t", header: "Qué pide / cliente", width: "minmax(0,1fr)", cell: (r) => <CellStack primary={r.title} secondary={r.customerName} secondarySize={12} /> },
              { key: "k", header: "Tipo", width: "150px", cell: (r) => <span className="text-text-2">{r.kind}</span> },
              { key: "s", header: "Estado", width: "130px", cell: (r) => <QuotePill status={r.status} /> },
            ]}
          />
          {detail ? (
            <QuotePanel key={detail.id + detail.status} quote={detail} />
          ) : (
            <EmptyState size="sm" title="Sin presupuesto" description="Cuando alguien pida un presupuesto desde la web, aparece acá." className="rounded-card border border-line" />
          )}
        </div>
      </div>

      {/* ── mobile: lista → detalle ── */}
      <div className="flex flex-col gap-4 px-4 pb-7 pt-[18px] lg:hidden">
        {explicit && detail ? (
          <>
            <BackLink href={hrefWith(base, { sel: undefined })}>Presupuestos</BackLink>
            <QuotePanel key={detail.id + detail.status} quote={detail} />
          </>
        ) : (
          <>
            <Display size="admin">Presupuestos</Display>
            <SearchInput action="/admin/presupuestos" placeholder="Buscar cliente o producto" defaultValue={q} size="lg" />
            {chips}
            {rows.length ? (
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {rows.map((r) => (
                  <li key={r.number}>
                    <Link
                      href={hrefWith(base, { sel: r.number })}
                      className="flex flex-col gap-2 rounded-box border border-line bg-surface p-3 transition-colors duration-150 hover:border-text-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow"
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[12px] font-semibold text-text-3">
                          #{r.number} · {r.when}
                        </span>
                        <QuotePill status={r.status} size="sm" />
                      </span>
                      <span className="flex min-w-0 flex-col gap-[2px]">
                        <span className="truncate text-[15px] font-extrabold">{r.title}</span>
                        <span className="truncate text-[13px] text-text-3">
                          {r.customerName} · {r.kind}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="m-0 rounded-box border border-line p-4 text-[14px] text-text-3">{empty}</p>
            )}
          </>
        )}
      </div>
    </>
  );
}
