import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { UnderConstruction } from "@/components/store/under-construction";
import { features } from "@/lib/features";
import { paths } from "@/lib/paths";

export const metadata: Metadata = {
  title: "Recuperar contraseña",
  robots: { index: false },
};

/** Placeholder de la ola 0: la pantalla real llega en la ola 1. */
export default function Page() {
  if (!features.accounts) notFound();
  return (
    <UnderConstruction
      title="Recuperar contraseña"
      description="Muy pronto vas a poder cambiar tu contraseña desde acá."
      action={{ href: paths.catalog(), label: "Ver el catálogo" }}
    />
  );
}
