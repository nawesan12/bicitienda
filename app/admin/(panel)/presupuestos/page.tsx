import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminTopBar, EmptyState } from "@/components/bt";
import { features } from "@/lib/features";

export const metadata: Metadata = { title: "Presupuestos" };

/** Placeholder de la ola 0: la pantalla real llega en la ola 1. */
export default function Page() {
  if (!features.quotes) notFound();
  return (
    <>
      <AdminTopBar title="Presupuestos" />
      <div className="px-4 py-10 lg:px-10">
        <EmptyState eyebrow="En construcción" title="Presupuestos" description="La cotización por ítems y el paso a pedido llegan en la ola 1." />
      </div>
    </>
  );
}
