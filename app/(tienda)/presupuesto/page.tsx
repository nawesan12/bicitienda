import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { UnderConstruction } from "@/components/store/under-construction";
import { features } from "@/lib/features";
import { paths } from "@/lib/paths";

export const metadata: Metadata = {
  title: "Pedir presupuesto",
};

/** Placeholder de la ola 0: la pantalla real llega en la ola 1. */
export default function Page() {
  if (!features.quotes) notFound();
  return (
    <UnderConstruction
      title="¿Qué estás buscando?"
      description="Muy pronto vas a poder pedir presupuesto de bicis, repuestos e importados desde acá."
      action={{ href: paths.catalog(), label: "Ver el catálogo" }}
    />
  );
}
