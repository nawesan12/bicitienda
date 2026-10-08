import type { Metadata } from "next";
import { getLeads, getNewsletterSubscribers } from "@/lib/server/admin-queries";
import { LEAD_FILTERS } from "./filters";
import { LeadsManager } from "./leads-manager";

export const metadata: Metadata = { title: "Consultas" };

/** Consultas por tanda ("Ver más" trae otra). */
const LEADS_PAGE = 100;

/**
 * Consultas: cada botón de WhatsApp de la web queda registrado, más un
 * aviso por pedido y el de "Pago tardío" (pago acreditado sobre un pedido
 * cancelado). Se filtran, se marcan atendidas y se exportan.
 */
export default async function AdminConsultasPage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string; n?: string }>;
}) {
  const sp = await searchParams;
  const filter = sp.filtro === "news" || LEAD_FILTERS.some(([k]) => k === sp.filtro) ? sp.filtro! : "todas";
  // Filtro y tope en SQL; "Ver más" suma otra tanda (?n=).
  const limit = Math.min(Math.max(Number(sp.n) || LEADS_PAGE, LEADS_PAGE), 2000);
  const [{ leads, hasMore, counts }, subs] = await Promise.all([
    getLeads({ filter: filter === "news" ? "todas" : filter, limit }),
    getNewsletterSubscribers(),
  ]);
  return (
    <LeadsManager
      key={`${filter}:${limit}`}
      filter={filter}
      counts={counts}
      moreHref={hasMore ? `/admin/consultas?${new URLSearchParams({ ...(filter !== "todas" ? { filtro: filter } : {}), n: String(limit + LEADS_PAGE) })}` : null}
      leads={leads.map((l) => ({ id: l.id, type: l.type, label: l.label, detail: l.detail, status: l.status, ts: l.ts.toISOString() }))}
      subs={subs.map((s) => ({ email: s.email, ts: s.createdAt.toISOString() }))}
    />
  );
}
