import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminTopBar, EmptyState } from "@/components/bt";
import { features } from "@/lib/features";

export const metadata: Metadata = { title: "Turnos" };

/** Placeholder de la ola 0: la pantalla real llega en la ola 1. */
export default function Page() {
  if (!features.appointments) notFound();
  return (
    <>
      <AdminTopBar title="Turnos" />
      <div className="px-4 py-10 lg:px-10">
        <EmptyState eyebrow="En construcción" title="Turnos" description="La agenda semanal, la vista del día y los turnos manuales llegan en la ola 1." />
      </div>
    </>
  );
}
