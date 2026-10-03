import Link from "next/link";
import { CellMono, CellStack, OrderPill, Table, formatMoney, cx } from "@/components/bt";
import type { OrderRow } from "@/lib/server/screens/admin-d1";

/**
 * Tabla de pedidos del handoff (2i y 3a): 96 | 1fr | 168 | 104, gap 24.
 * `hrefFor` decide adónde va la fila (?sel= en 3a, al detalle en 2i).
 */
export function OrdersTable({
  rows,
  selected,
  hrefFor,
  empty = "No hay pedidos en este filtro.",
  className,
}: {
  rows: OrderRow[];
  selected?: string;
  hrefFor: (r: OrderRow) => string;
  empty?: string;
  className?: string;
}) {
  return (
    <Table
      caption="Pedidos"
      className={className}
      rows={rows}
      getRowKey={(r) => r.number}
      selectedKey={selected}
      rowHref={hrefFor}
      rowLabel={(r) => `Pedido #${r.number} de ${r.customerName}`}
      gap={24}
      empty={empty}
      columns={[
        { key: "n", header: "Pedido", width: "96px", cell: (r) => <CellMono>#{r.number}</CellMono> },
        {
          key: "c",
          header: "Cliente y productos",
          width: "minmax(0,1fr)",
          cell: (r) => <CellStack primary={r.customerName} secondary={r.itemsLabel || "—"} />,
        },
        { key: "s", header: "Estado", width: "168px", cell: (r) => <OrderPill status={r.pill} /> },
        {
          key: "t",
          header: "Total",
          width: "104px",
          align: "right",
          cell: (r) => <span className="whitespace-nowrap text-[15px] font-extrabold">{formatMoney(r.total)}</span>,
        },
      ]}
    />
  );
}

/** Lista de pedidos en mobile (< lg): tarjetas que llevan al detalle 4i. */
export function OrdersCards({ rows, empty = "No hay pedidos en este filtro." }: { rows: OrderRow[]; empty?: string }) {
  if (!rows.length) return <p className="m-0 rounded-box border border-line p-4 text-[14px] text-text-3">{empty}</p>;
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {rows.map((r) => (
        <li key={r.number}>
          <Link
            href={`/admin/pedidos/${r.number}`}
            className={cx(
              "flex flex-col gap-2 rounded-box border border-line bg-surface p-3 transition-colors duration-150 hover:border-text-4",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow",
            )}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="font-mono text-[12px] font-semibold text-text-3">#{r.number}</span>
              <OrderPill status={r.pill} size="sm" />
            </span>
            <span className="flex items-baseline justify-between gap-3">
              <span className="flex min-w-0 flex-col gap-[2px]">
                <span className="truncate text-[15px] font-extrabold">{r.customerName}</span>
                <span className="truncate text-[13px] text-text-3">{r.itemsLabel || "—"}</span>
              </span>
              <span className="whitespace-nowrap text-[15px] font-extrabold">{formatMoney(r.total)}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
