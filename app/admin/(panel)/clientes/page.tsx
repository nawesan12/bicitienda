import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { store } from "@/lib/config";
import { formatARS } from "@/lib/format";
import { getAdminCustomers } from "@/lib/server/admin-queries";

export const metadata: Metadata = { title: "Clientes" };

/** Lista derivada de los pedidos, ordenada por lo gastado. */
export default async function AdminCustomersPage() {
  // Módulo del core: solo para tiendas que lo prenden en features.admin.
  if (!store.features.admin?.customers) notFound();
  const customers = await getAdminCustomers();

  return (
    <div className="animate-fade-in">

      {customers.length === 0 ? (
        <div className="rounded-[18px] border border-ink/10 bg-white p-10 text-center font-sans text-sm text-ink/50">
          Los clientes aparecen automáticamente con su primer pedido.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[18px] border border-ink/10 bg-white">
          <table className="w-full min-w-[560px] border-collapse font-sans text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left font-sans text-[11px] font-bold tracking-[.14em] text-ink/45">
                <th className="px-5 py-3">CLIENTE</th>
                <th className="px-5 py-3">CONTACTO</th>
                <th className="px-5 py-3 text-right">PEDIDOS</th>
                <th className="px-5 py-3 text-right">PAGADO</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.email} className="border-b border-ink/5 last:border-b-0">
                  <td className="px-5 py-3 font-semibold text-ink">{c.name}</td>
                  <td className="px-5 py-3 text-ink/60">
                    {c.email}
                    <br />
                    {c.phone}
                  </td>
                  <td className="px-5 py-3 text-right text-ink/80">
                    {c.ordersCount}
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-ink">
                    {formatARS(c.totalSpent)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
