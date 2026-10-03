import type { Metadata } from "next";
import { getSettingsScreen } from "@/lib/server/screens/admin-d2";
import { SettingsEditor } from "./settings-editor";

export const metadata: Metadata = { title: "Ajustes" };

/** 3f · Ajustes: local, turnos, pagos y mensajes de WhatsApp. */
export default async function AdminAjustesPage() {
  const data = await getSettingsScreen();
  // key: al guardar o restaurar una plantilla, router.refresh() rearma el editor con lo guardado.
  return <SettingsEditor key={JSON.stringify(data)} data={data} />;
}
