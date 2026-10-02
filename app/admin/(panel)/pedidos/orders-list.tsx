"use client";

import Link from "next/link";
import { useState } from "react";
import { EmptyState, Lead as Intro, tabPill } from "@/components/admin/ui";
import { cx as cn } from "@/components/admin/cx";
import { formatARS, formatDateTime } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";
import {
  DELIVERY_LABEL,
  ORDER_GROUPS,
  orderGroup,
  paymentLabel,
  statusPillClass,
} from "./order-ui";

interface Row {
  id: string;
  number: string;
  status: OrderStatus;
  statusLabel: string;
  customerName: string;
  itemsLabel: string;
  total: number;
  balanceDue: number;
  createdAt: string;
  expiry: string | null;
  paymentMethod: string;
  deliveryMethod: string;
  installments: number;
}

/** Pedidos: filtros por etapa y filas con el lenguaje del panel. */
export function OrdersList({ orders }: { orders: Row[] }) {
  const [tab, setTab] = useState<string>(
    orders.some((o) => orderGroup(o.status) === "pago") ? "pago" : "todos",
  );
  const rows = tab === "todos" ? orders : orders.filter((o) => orderGroup(o.status) === tab);

  return (
    <div className="animate-fade-in">
      <div className="mb-4">
        <Intro>
          Las compras de la web. Las transferencias y el efectivo se confirman a mano;
          los pagos con Payway entran solos. Tocá un pedido para ver el detalle y
          avanzarlo.
        </Intro>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {ORDER_GROUPS.map(([k, label]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={cn(tabPill(tab === k, true), "gap-2")}>
            {label}
            <span className="font-sans text-[10.5px] font-bold opacity-60">
              {k === "todos" ? orders.length : orders.filter((o) => orderGroup(o.status) === k).length}
            </span>
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState title={orders.length ? "No hay pedidos en este filtro" : "Todavía no hay pedidos"}>
          <div className="mt-[6px] font-sans text-[13px] text-ink/55">
            Cuando alguien compre desde la web, el pedido aparece acá al instante.
          </div>
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((o) => (
            <Link
              key={o.id}
              href={`/admin/pedidos/${o.number}`}
              className="flex flex-wrap items-center gap-[14px] rounded-[14px] border-[1.5px] border-ink/12 bg-white px-4 py-3 transition-[border-color,box-shadow] hover:border-brand hover:shadow-[0_10px_26px_rgba(21,23,15,.08)]"
            >
              <span className="min-w-[64px] font-display text-[17px] tracking-normal">#{o.number}</span>
              <span
                className={cn(
                  "min-w-[130px] flex-none rounded-full px-[10px] py-[6px] text-center font-sans text-[10px] font-bold tracking-[.12em]",
                  statusPillClass(o.status),
                )}
              >
                {o.statusLabel.toUpperCase()}
              </span>
              <div className="min-w-[200px] flex-1">
                <div className="font-sans text-sm font-bold">{o.customerName}</div>
                <div className="mt-[2px] line-clamp-1 font-sans text-[12.5px] text-ink/60">
                  {o.itemsLabel}
                </div>
              </div>
              <div className="text-right">
                <div className="font-sans text-sm font-bold">{formatARS(o.total)}</div>
                <div className="font-sans text-[11.5px] text-ink/50">
                  {paymentLabel(o.paymentMethod, o.installments)} ·{" "}
                  {DELIVERY_LABEL[o.deliveryMethod] ?? o.deliveryMethod}
                </div>
              </div>
              <span className="whitespace-nowrap font-sans text-xs font-medium text-ink/45">
                {formatDateTime(o.createdAt)}
              </span>
              {o.status === "SEÑADO" && o.balanceDue > 0 && (
                <span className="rounded-full bg-brand-pastel px-[10px] py-1 font-sans text-[10.5px] font-bold text-brand-deeper">
                  SALDO {formatARS(o.balanceDue)}
                </span>
              )}
              {o.expiry && (
                <span className="rounded-full bg-danger-bg px-[10px] py-1 font-sans text-[10.5px] font-bold text-danger">
                  RESERVA {o.expiry.toUpperCase()}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
