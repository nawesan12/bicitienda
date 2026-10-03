import type { Metadata } from "next";
import { getLeads, getNewsletterSubscribers } from "@/lib/server/admin-queries";
import { LeadsManager } from "./leads-manager";

export const metadata: Metadata = { title: "Consultas" };

/**
 * Consultas: cada botón de WhatsApp de la web queda registrado, más un
 * aviso por pedido y el de "Pago tardío" (pago acreditado sobre un pedido
 * cancelado). Se filtran, se marcan atendidas y se exportan.
 */
export default async function AdminConsultasPage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string }>;
}) {
  const [{ filtro }, leads, subs] = await Promise.all([searchParams, getLeads(), getNewsletterSubscribers()]);
  return (
    <LeadsManager
      initialFilter={filtro ?? "todas"}
      leads={leads.map((l) => ({ id: l.id, type: l.type, label: l.label, detail: l.detail, status: l.status, ts: l.ts.toISOString() }))}
      subs={subs.map((s) => ({ email: s.email, ts: s.createdAt.toISOString() }))}
    />
  );
}
