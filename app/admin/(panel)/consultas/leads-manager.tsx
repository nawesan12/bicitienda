"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useConfirm } from "@/components/admin/confirm";
import { useToast } from "@/components/admin/toast";
import {
  btnDark,
  btnGhost,
  btnGreen,
  btnX,
  EmptyState,
  Lead as Intro,
  statePill,
  tabPill,
} from "@/components/admin/ui";
import { cx as cn } from "@/components/admin/cx";
import { leadTypeLabels } from "@/lib/data/content";
import { formatDateTime } from "@/lib/format";
import {
  clearLeads,
  deleteLead,
  loadSampleLeads,
  setLeadStatus,
} from "@/lib/server/actions/leads";
import { removeSubscriber } from "@/lib/server/actions/newsletter";
import type { LeadStatus, LeadType } from "@/lib/types";

interface LeadRow {
  id: string;
  ts: string;
  type: LeadType;
  label: string;
  detail: string;
  status: LeadStatus;
}

/** Pill de tipo: [fondo, texto] por tipo, los del prototipo (`LT`) + pedido. */
const TYPE_COLORS: Record<LeadType, [string, string]> = {
  producto: ["#15170f", "#f4f3ee"],
  reparacion: ["#5eb838", "#0c0e0b"],
  financiacion: ["#dff0d4", "#2f7a17"],
  prueba: ["#fff", "#15170f"],
  comunidad: ["#0c0e0b", "#5eb838"],
  general: ["#f1f0e9", "rgba(21,23,15,.7)"],
  nota: ["#f1f0e9", "rgba(21,23,15,.7)"],
  pedido: ["#2f7a17", "#f4f3ee"],
};

const MAIN: LeadType[] = ["producto", "reparacion", "financiacion"];

const TABS: [key: string, label: string][] = [
  ["todas", "Todas"],
  ["nuevas", "Nuevas"],
  ["producto", "Productos"],
  ["reparacion", "Reparaciones"],
  ["financiacion", "Financiación"],
  ["otras", "Otras"],
  ["news", "Newsletter"],
];

function match(l: LeadRow, k: string): boolean {
  if (k === "todas") return true;
  if (k === "nuevas") return l.status !== "atendida";
  if (k === "otras") return !MAIN.includes(l.type);
  return l.type === k;
}

/**
 * Consultas: cada botón de WhatsApp de la web queda registrado. Filtros,
 * Nueva ↔ Atendida, eliminar, export CSV, vaciar y datos de ejemplo; la
 * pestaña Newsletter lista los suscriptos.
 */
export function LeadsManager({
  initialTab,
  leads: initialLeads,
  subs: initialSubs,
}: {
  initialTab: string;
  leads: LeadRow[];
  subs: { email: string; ts: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState(TABS.some(([k]) => k === initialTab) ? initialTab : "todas");
  // Estado local optimista: la fila cambia al toque y la action confirma.
  const [leads, setLeads] = useState(initialLeads);
  const [subs, setSubs] = useState(initialSubs);
  const [prevLeads, setPrevLeads] = useState(initialLeads);
  const [prevSubs, setPrevSubs] = useState(initialSubs);
  if (initialLeads !== prevLeads) {
    setPrevLeads(initialLeads);
    setLeads(initialLeads);
  }
  if (initialSubs !== prevSubs) {
    setPrevSubs(initialSubs);
    setSubs(initialSubs);
  }

  const rows = tab === "news" ? [] : leads.filter((l) => match(l, tab));
  const empty = tab === "news" ? subs.length === 0 : rows.length === 0;
  const emptyTitle =
    tab === "news"
      ? "Todavía no hay suscriptos"
      : leads.length
        ? "No hay consultas en este filtro"
        : "Todavía no hay consultas registradas";

  function toggle(l: LeadRow) {
    const status: LeadStatus = l.status === "atendida" ? "nueva" : "atendida";
    setLeads((all) => all.map((x) => (x.id === l.id ? { ...x, status } : x)));
    startTransition(async () => {
      await setLeadStatus(l.id, status);
    });
  }

  async function askDelete(l: LeadRow) {
    const ok = await confirm({
      icon: "✕",
      title: "Eliminar consulta",
      message: `“${l.label}” sale de la lista de consultas.`,
      label: "Sí, eliminar",
      destructive: true,
    });
    if (!ok) return;
    setLeads((all) => all.filter((x) => x.id !== l.id));
    startTransition(async () => {
      await deleteLead(l.id);
      toast("Consulta eliminada");
    });
  }

  async function askDeleteSub(email: string) {
    const ok = await confirm({
      icon: "✕",
      title: "Eliminar suscripto",
      message: `${email} deja de recibir el newsletter.`,
      label: "Sí, eliminar",
      destructive: true,
    });
    if (!ok) return;
    setSubs((all) => all.filter((x) => x.email !== email));
    startTransition(async () => {
      await removeSubscriber(email);
      toast("Suscripto eliminado");
    });
  }

  async function askClear() {
    const ok = await confirm({
      icon: "!",
      title: "Vaciar consultas",
      message: "Se borran todas las consultas registradas. Los suscriptos al newsletter se mantienen.",
      label: "Sí, vaciar",
      destructive: true,
    });
    if (!ok) return;
    setLeads([]);
    startTransition(async () => {
      await clearLeads();
      toast("Consultas vaciadas");
    });
  }

  const exportHref =
    tab === "news"
      ? "/admin/consultas/export?kind=newsletter"
      : `/admin/consultas/export?filtro=${tab}`;

  return (
    <div className="animate-fade-in">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Intro>
          Cada vez que alguien toca un botón de WhatsApp en la web queda
          registrado acá: qué modelo, qué servicio y cuándo. La charla sigue en
          WhatsApp.
        </Intro>
        <div className="flex flex-wrap gap-[10px]">
          <a href={exportHref} onClick={() => toast("CSV descargado")} className={btnDark}>
            Exportar CSV
          </a>
          <button type="button" onClick={askClear} className={btnGhost}>
            Vaciar
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={cn(tabPill(tab === k, true), "gap-2")}
          >
            {label}
            <span className="font-sans text-[10.5px] font-bold opacity-60">
              {k === "news" ? subs.length : leads.filter((l) => match(l, k)).length}
            </span>
          </button>
        ))}
      </div>

      {empty && (
        <EmptyState title={emptyTitle}>
          <div className="mt-[6px] font-sans text-[13px] text-ink/55">
            Abrí la web en otra pestaña y tocá “Consultar” en un modelo — aparece
            acá al instante.
          </div>
          <button
            type="button"
            disabled={pending}
            className={cn(btnGreen, "mt-4 px-4 py-[9px]")}
            onClick={() =>
              startTransition(async () => {
                await loadSampleLeads();
                setTab("todas");
                toast("Datos de ejemplo cargados");
                router.refresh();
              })
            }
          >
            Ver con datos de ejemplo
          </button>
        </EmptyState>
      )}

      {rows.length > 0 && (
        <div className="flex flex-col gap-2">
          {rows.map((l) => {
            const done = l.status === "atendida";
            const [bg, color] = TYPE_COLORS[l.type] ?? TYPE_COLORS.general;
            return (
              <div
                key={l.id}
                className={cn(
                  "flex flex-wrap items-center gap-[14px] rounded-[14px] border-[1.5px] px-4 py-3 transition-colors hover:border-brand",
                  done ? "border-ink/6 bg-cream-3" : "border-ink/12 bg-white",
                )}
              >
                <span
                  className="min-w-[96px] flex-none rounded-full px-[10px] py-[6px] text-center font-sans text-[10px] font-bold tracking-[.12em]"
                  style={{ background: bg, color }}
                >
                  {leadTypeLabels[l.type] ?? leadTypeLabels.general}
                </span>
                <div className="min-w-[200px] flex-1">
                  <div className="font-sans text-sm font-bold">{l.label}</div>
                  {l.detail && (
                    <div className="mt-[2px] font-sans text-[12.5px] leading-[1.5] text-ink/60">
                      {l.detail}
                    </div>
                  )}
                </div>
                <span className="whitespace-nowrap font-sans text-xs font-medium text-ink/45">
                  {formatDateTime(l.ts)}
                </span>
                <button
                  type="button"
                  onClick={() => toggle(l)}
                  className={statePill(
                    cn(
                      "px-[13px] py-[7px]",
                      done
                        ? "border-ink/15 bg-white text-ink/50"
                        : "border-brand bg-brand-pastel text-brand-deeper",
                    ),
                  )}
                >
                  {done ? "✓ ATENDIDA" : "NUEVA"}
                </button>
                <button
                  type="button"
                  title="Eliminar"
                  aria-label="Eliminar"
                  onClick={() => askDelete(l)}
                  className={btnX}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      {tab === "news" && subs.length > 0 && (
        <div className="flex flex-col gap-2">
          {subs.map((s) => (
            <div
              key={s.email}
              className="flex flex-wrap items-center gap-[14px] rounded-[14px] border-[1.5px] border-ink/10 bg-white px-4 py-3"
            >
              <span className="min-w-[96px] flex-none rounded-full bg-brand-pastel px-[10px] py-[6px] text-center font-sans text-[10px] font-bold tracking-[.12em] text-brand-deeper">
                NEWSLETTER
              </span>
              <div className="min-w-[200px] flex-1 font-sans text-sm font-bold">{s.email}</div>
              <span className="font-sans text-xs font-medium text-ink/45">
                {formatDateTime(s.ts)}
              </span>
              <button
                type="button"
                title="Eliminar"
                aria-label="Eliminar"
                onClick={() => askDeleteSub(s.email)}
                className={btnX}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
