import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { UnderConstruction } from "@/components/store/under-construction";
import { features } from "@/lib/features";
import { paths } from "@/lib/paths";

export const metadata: Metadata = {
  title: "Sacar turno",
};

/** Placeholder de la ola 0: la pantalla real llega en la ola 1. */
export default function Page() {
  if (!features.appointments) notFound();
  return (
    <UnderConstruction
      title="Reservá tu turno"
      description="Muy pronto vas a poder reservar una prueba de bici o un asesoramiento desde acá."
      action={{ href: paths.catalog(), label: "Ver el catálogo" }}
    />
  );
}
