"use client";

import { useState, useTransition } from "react";
import {
  CellMono,
  EmptyState,
  FilterChip,
  Pill,
  Table,
  buttonClasses,
  cx,
  type PillTone,
  type TableColumn,
} from "@/components/bt";
import { ResponsiveTopBar } from "@/components/bt/admin-d2/top-bar";
import { useConfirm } from "@/components/admin/confirm";
import { useToast } from "@/components/admin/toast";
import { formatDateTime } from "@/lib/format";
import { deleteLead, markLeadsAttended, setLeadStatus } from "@/lib/server/actions/leads";
import { removeSubscriber } from "@/lib/server/actions/newsletter";
import type { LeadStatus, LeadType } from "@/lib/types";
import { LEAD_FILTERS, isLatePayment, matchesLead } from "./filters";

interface LeadRow {
  id: string;
  ts: string;
  type: LeadType;
  label: string;
  detail: string;
  status: LeadStatus;
}

const TYPE: Partial<Record<LeadType, { label: string; tone: PillTone }>> = {
  producto: { label: "Producto", tone: "line" },
  pedido: { label: "Pedido", tone: "yellow-outline" },
  prueba: { label: "Turno", tone: "paper" },
};

function typeOf(l: LeadRow): { label: string; tone: PillTone } {
  if (isLatePayment(l)) return { label: "Pago tardío", tone: "red" };
  return TYPE[l.type] ?? { label: "Otra", tone: "muted" };
}

/**
 * Consultas con el lenguaje bt: filtros en chips, tabla (cards en el
 * celular), Sin atender ↔ Atendida con un toque, eliminar y CSV. La
 * pestaña Newsletter aparece solo si hay suscriptos.
 */
export function LeadsManager({
  initialFilter,
  leads: initialLeads,
  subs: initialSubs,
}: {
  initialFilter: string;
  leads: LeadRow[];
  subs: { email: string; ts: string }[];
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const [, start] = useTransition();
  const valid = [...LEAD_FILTERS.map(([k]) => k as string), "news"];
  const [filter, setFilter] = useState(valid.includes(initialFilter) ? initialFilter : "todas");
  const [leads, setLeads] = useState(initialLeads);
  const [subs, setSubs] = useState(initialSubs);

  const news = filter === "news";
  const rows = news ? [] : leads.filter((l) => matchesLead(l, filter));
  const pendingInView = rows.filter((l) => l.status !== "atendida");

  const toggle = (l: LeadRow) => {
    const status: LeadStatus = l.status === "atendida" ? "nueva" : "atendida";
    setLeads((all) => all.map((x) => (x.id === l.id ? { ...x, status } : x)));
    start(async () => {
      const r = await setLeadStatus(l.id, status);
      if (!r.ok) toast("No se pudo guardar");
    });
  };

  const remove = async (l: LeadRow) => {
    const ok = await confirm({
      title: "Eliminar consulta",
      message: `“${l.label}” se borra del registro.`,
      label: "Sí, eliminar",
      destructive: true,
    });
    if (!ok) return;
    setLeads((all) => all.filter((x) => x.id !== l.id));
    start(async () => {
      await deleteLead(l.id);
      toast("Consulta eliminada");
    });
  };

  const markAll = () => {
    const ids = pendingInView.map((l) => l.id);
    setLeads((all) => all.map((x) => (ids.includes(x.id) ? { ...x, status: "atendida" } : x)));
    start(async () => {
      await markLeadsAttended(ids);
      toast(`${ids.length} marcadas como atendidas`);
    });
  };

  const exportHref = news ? "/admin/consultas/export?kind=newsletter" : `/admin/consultas/export?filtro=${filter}`;

  const statusBtn = (l: LeadRow) => (
    <button
      type="button"
      onClick={() => toggle(l)}
      aria-label={l.status === "atendida" ? `Marcar sin atender: ${l.label}` : `Marcar atendida: ${l.label}`}
      className="relative z-10 rounded-pill focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow"
    >
      <Pill tone={l.status === "atendida" ? "muted" : "yellow"} size="md">
        {l.status === "atendida" ? "Atendida ✓" : "Sin atender"}
      </Pill>
    </button>
  );
  const delBtn = (l: LeadRow) => (
    <button
      type="button"
      onClick={() => remove(l)}
      aria-label={`Eliminar ${l.label}`}
      className="relative z-10 flex size-11 items-center justify-center rounded-tag text-[14px] font-extrabold text-text-3 transition-colors duration-150 hover:text-red-light focus-visible:outline-2 focus-visible:outline-yellow lg:size-8"
    >
      ✕
    </button>
  );

  const columns: TableColumn<LeadRow>[] = [
    {
      key: "type",
      header: "Tipo",
      width: "120px",
      cell: (l) => {
        const t = typeOf(l);
        return (
          <Pill tone={t.tone} size="md">
            {t.label}
          </Pill>
        );
      },
    },
    {
      key: "label",
      header: "Consulta",
      width: "minmax(0,1fr)",
      cell: (l) => (
        <div className="flex min-w-0 flex-col gap-[3px]">
          <span className={cx("font-bold", l.status === "atendida" && "text-text-2")}>{l.label}</span>
          {l.detail && <span className="text-[13px] leading-[1.4] text-text-3">{l.detail}</span>}
        </div>
      ),
    },
    { key: "ts", header: "Cuándo", width: "136px", cell: (l) => <CellMono size={12} tone="soft">{formatDateTime(new Date(l.ts))}</CellMono> },
    { key: "status", header: "Estado", width: "120px", cell: statusBtn },
    { key: "del", header: "", width: "32px", cell: delBtn },
  ];

  return (
    <>
      <ResponsiveTopBar
        title="Consultas"
        actions={
          <>
            {!news && pendingInView.length > 1 && (
              <button type="button" onClick={markAll} className={buttonClasses({ variant: "secondary", size: "md" })}>
                Marcar atendidas
              </button>
            )}
            <a href={exportHref} download className={buttonClasses({ variant: "secondary", size: "md" })}>
              Exportar
            </a>
          </>
        }
      />

      <div className="flex gap-2 overflow-x-auto px-4 pt-4 [scrollbar-width:none] lg:px-10 lg:pt-[18px] [&::-webkit-scrollbar]:hidden">
        {LEAD_FILTERS.map(([k, label]) => {
          const n = leads.filter((l) => matchesLead(l, k)).length;
          if (k === "pago-tardio" && n === 0) return null;
          return (
            <FilterChip key={k} active={filter === k} count={n} onClick={() => setFilter(k)}>
              {label}
            </FilterChip>
          );
        })}
        {subs.length > 0 && (
          <>
            <span className="min-w-2 flex-1" />
            <FilterChip active={news} count={subs.length} onClick={() => setFilter("news")}>
              Newsletter
            </FilterChip>
          </>
        )}
      </div>

      <div className="px-4 pt-4 pb-10 lg:px-10 lg:pt-[18px]">
        {news ? (
          <ul className="m-0 flex list-none flex-col overflow-hidden rounded-card border border-line p-0">
            {subs.map((s) => (
              <li key={s.email} className="flex items-center justify-between gap-3 border-t border-line px-[22px] py-[14px] first:border-t-0">
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-[14px] font-bold">{s.email}</span>
                  <CellMono size={12} tone="muted">
                    {formatDateTime(new Date(s.ts))}
                  </CellMono>
                </span>
                <button
                  type="button"
                  aria-label={`Quitar ${s.email}`}
                  onClick={() => {
                    setSubs((all) => all.filter((x) => x.email !== s.email));
                    start(async () => {
                      await removeSubscriber(s.email);
                      toast("Suscripto quitado");
                    });
                  }}
                  className="flex size-11 items-center justify-center rounded-tag text-text-3 hover:text-red-light focus-visible:outline-2 focus-visible:outline-yellow"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        ) : rows.length === 0 ? (
          <EmptyState
            title={leads.length ? "Nada en este filtro" : "Todavía no hay consultas"}
            description={
              leads.length
                ? "Probá con otro filtro."
                : "Cada vez que alguien toca un botón de WhatsApp en la tienda queda registrado acá, junto con los avisos de pedidos."
            }
          />
        ) : (
          <>
            <Table className="max-lg:hidden" caption="Consultas" columns={columns} rows={rows} getRowKey={(l) => l.id} gap={20} />
            <ul className="m-0 flex list-none flex-col overflow-hidden rounded-card border border-line p-0 lg:hidden">
              {rows.map((l) => {
                const t = typeOf(l);
                return (
                  <li key={l.id} className="flex flex-col gap-2 border-t border-line p-4 first:border-t-0">
                    <div className="flex items-center justify-between gap-2">
                      <Pill tone={t.tone} size="sm">
                        {t.label}
                      </Pill>
                      <CellMono size={12} tone="muted">
                        {formatDateTime(new Date(l.ts))}
                      </CellMono>
                    </div>
                    <span className={cx("text-[15px] font-bold", l.status === "atendida" && "text-text-2")}>{l.label}</span>
                    {l.detail && <span className="text-[14px] leading-[1.4] text-text-3">{l.detail}</span>}
                    <div className="flex items-center justify-between">
                      {statusBtn(l)}
                      {delBtn(l)}
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </>
  );
}
