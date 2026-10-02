import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { store } from "@/lib/config";
import { getAdminLocations } from "@/lib/server/admin-queries";
import { LocationsManager } from "./locations-manager";

export const metadata: Metadata = { title: "Sucursales" };

export default async function AdminSucursalesPage() {
  // Módulo del core: solo para tiendas que lo prenden en features.admin.
  if (!store.features.admin?.locations) notFound();
  const locations = await getAdminLocations();

  return (
    <div className="animate-fade-in">
      <LocationsManager locations={locations} />
    </div>
  );
}
