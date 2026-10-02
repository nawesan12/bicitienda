import type { Metadata } from "next";
import { getLeads, getNewsletterSubscribers } from "@/lib/server/admin-queries";
import { LeadsManager } from "./leads-manager";

export const metadata: Metadata = { title: "Consultas" };

export default async function AdminConsultasPage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string }>;
}) {
  const [{ filtro }, leads, subs] = await Promise.all([
    searchParams,
    getLeads(),
    getNewsletterSubscribers(),
  ]);
  return (
    <LeadsManager
      initialTab={filtro ?? "todas"}
      leads={leads.map((l) => ({ ...l, ts: l.ts.toISOString() }))}
      subs={subs.map((s) => ({ email: s.email, ts: s.createdAt.toISOString() }))}
    />
  );
}
