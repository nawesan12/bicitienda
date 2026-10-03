import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Button, buttonClasses, CellMono, CellStack, EmptyState, formatMoney, Panel, ResponsiveTopBar, Table, type TableColumn } from "@/components/bt";
import { HistoryList, KpiCell } from "./history-list";
import { store } from "@/lib/config";
import { COPY } from "@/lib/data/demo/copy";
import { getCustomersScreen, type CustomerCard, type CustomerListRow } from "@/lib/server/screens/admin-d2";

export const metadata: Metadata = { title: "Clientes" };

const T = COPY.admin.customers;

function href(c: string | undefined, q: string | undefined, anchor = "") {
  const sp = new URLSearchParams();
  if (q) sp.set("q", q);
  if (c) sp.set("c", c);
  const s = sp.toString();
  return `/admin/clientes${s ? `?${s}` : ""}${anchor}`;
}

/**
 * 3e · Clientes: listado (uno por WhatsApp) y ficha con KPIs e historial
 * de pedidos, turnos y presupuestos. La selección va por `?c=`; en el
 * celular la ficha queda arriba de la lista.
 */
export default async function AdminClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; c?: string }>;
}) {
  if (!store.features.admin?.customers) notFound();
  const { q, c } = await searchParams;
  const { rows, total, card } = await getCustomersScreen({ q, c });

  const columns: TableColumn<CustomerListRow>[] = [
    {
      key: "name",
      header: T.columns[0],
      width: "minmax(0,1fr)",
      cell: (r) => <CellStack primary={r.name} secondary={r.email ?? "Sin email"} secondarySize={12} />,
    },
    { key: "wa", header: T.columns[1], width: "124px", cell: (r) => <CellMono size={12} tone="soft">{r.phoneLabel}</CellMono> },
    { key: "orders", header: T.columns[2], width: "72px", cell: (r) => <span className="font-extrabold">{r.ordersCount}</span> },
    {
      key: "last",
      header: T.columns[3],
      width: "112px",
      cell: (r) => <span className="block truncate text-text-2">{r.lastContactLabel}</span>,
    },
    {
      key: "spent",
      header: T.columns[4],
      width: "104px",
      align: "right",
      cell: (r) => <span className="font-extrabold">{formatMoney(r.totalSpent)}</span>,
    },
  ];

  const exportHref = `/admin/clientes/exportar${q ? `?q=${encodeURIComponent(q)}` : ""}`;

  return (
    <>
      <ResponsiveTopBar
        title={T.title}
        search={{ action: "/admin/clientes", placeholder: T.searchPlaceholder, width: 280, defaultValue: q }}
        actions={
          total > 0 ? (
            <a href={exportHref} download className={buttonClasses({ variant: "secondary", size: "md" })}>
              {T.export}
            </a>
          ) : undefined
        }
      />

      {total === 0 ? (
        <div className="px-4 pt-5 pb-10 lg:px-10 lg:pt-6">
          <EmptyState
            title="Todavía no hay clientes"
            description="Aparecen solos con el primer pedido, turno o presupuesto: uno por WhatsApp."
          />
        </div>
      ) : (
        <div className="grid items-start gap-5 px-4 pt-5 pb-10 lg:gap-6 lg:px-10 lg:pt-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 max-xl:order-2">
            {rows.length === 0 ? (
              <EmptyState
                size="md"
                title="Sin resultados"
                description={`Nadie coincide con "${q}". Probá con el nombre, el email o parte del WhatsApp.`}
                action={
                  <Button variant="secondary" size="md" href="/admin/clientes">
                    Ver todos
                  </Button>
                }
              />
            ) : (
              <>
                <Table
                  className="max-lg:hidden"
                  caption="Clientes"
                  columns={columns}
                  rows={rows}
                  getRowKey={(r) => r.id}
                  selectedKey={card?.id}
                  rowHref={(r) => href(r.id, q)}
                  rowLabel={(r) => `Ver ficha de ${r.name}`}
                  gap={20}
                />
                <ul className="m-0 flex list-none flex-col overflow-hidden rounded-card border border-line p-0 lg:hidden">
                  {rows.map((r) => (
                    <li key={r.id} className="border-t border-line first:border-t-0">
                      <a
                        href={href(r.id, q, "#ficha")}
                        aria-current={r.id === card?.id ? "true" : undefined}
                        className="flex items-center justify-between gap-3 p-4 aria-[current]:selected-row"
                      >
                        <span className="flex min-w-0 flex-col gap-[2px]">
                          <span className="truncate text-[15px] font-bold">{r.name}</span>
                          <span className="truncate font-mono text-[12px] font-semibold text-text-2">
                            {r.phoneLabel} · {r.lastContactLabel}
                          </span>
                        </span>
                        <span className="flex flex-none flex-col items-end gap-[2px]">
                          <span className="text-[15px] font-extrabold">{formatMoney(r.totalSpent)}</span>
                          <span className="text-[12px] text-text-3">
                            {r.ordersCount} {r.ordersCount === 1 ? "pedido" : "pedidos"}
                          </span>
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          {card && <CustomerPanel card={card} />}
        </div>
      )}
    </>
  );
}

function CustomerPanel({ card }: { card: CustomerCard }) {
  return (
    <Panel surface="surface" padding="lg" as="aside" className="scroll-mt-20 max-xl:order-1 xl:sticky xl:top-6" >
      <div id="ficha" className="flex flex-col gap-1">
        <h2 className="m-0 text-[40px] font-black uppercase leading-[.95] stretch-70 [overflow-wrap:anywhere]">{card.name}</h2>
        <span className="text-[14px] text-text-3">
          {card.since}
          {card.hasAccount && " · con cuenta"}
        </span>
      </div>
      <div className="flex flex-col gap-1 text-[14px] text-text-2">
        {card.email && <span className="[overflow-wrap:anywhere]">{card.email}</span>}
        <span>WhatsApp {card.phoneLabel}</span>
      </div>
      <Button variant="primary" size="full" href={card.whatsappUrl} external>
        {T.writeWhatsApp}
      </Button>
      <div className="grid grid-cols-3 gap-px overflow-hidden rounded-box border border-line bg-line">
        <KpiCell label="Pedidos" value={card.orders} />
        <KpiCell label="Turnos" value={card.appointments} />
        <KpiCell label="Gastado" value={formatMoney(card.spent)} tone="yellow" small />
      </div>
      {card.appointmentsOnly && (
        <p className="m-0 rounded-box border border-dashed border-line-strong px-[14px] py-3 text-[14px] leading-[1.45] text-text-2">
          Vino por un turno y todavía no compró: buen momento para escribirle.
        </p>
      )}
      <HistoryList title={T.history} items={card.history} />
    </Panel>
  );
}
