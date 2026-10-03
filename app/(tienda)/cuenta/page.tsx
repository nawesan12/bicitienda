import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { UnderConstruction } from "@/components/store/under-construction";
import { features } from "@/lib/features";
import { paths } from "@/lib/paths";
import { getCurrentAccount } from "@/lib/server/customer-auth";

export const metadata: Metadata = {
  title: "Mi cuenta",
  robots: { index: false },
};

/**
 * Mi cuenta (2g). Placeholder de la ola 0: el gate ya es el real (sin
 * features.accounts → 404; sin sesión → login). La pantalla con turnos,
 * pedidos y datos llega en la ola 1. Sin cuenta, el seguimiento de un
 * pedido sigue en /seguimiento.
 */
export default async function AccountPage() {
  if (!features.accounts) notFound();
  const account = await getCurrentAccount();
  if (!account) redirect(paths.login());
  return (
    <UnderConstruction
      title={`Hola, ${account.name.trim().split(/\s+/)[0]}`}
      description="Muy pronto vas a ver acá tus turnos, tus pedidos y tus datos."
      action={{ href: paths.tracking(), label: "Seguir un pedido" }}
    />
  );
}
