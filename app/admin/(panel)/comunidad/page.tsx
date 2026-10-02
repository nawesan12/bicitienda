import { features } from "@/lib/features";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAdminAgenda, getAdminContent } from "@/lib/server/admin-queries";
import { CommunityManager } from "./community-manager";

export const metadata: Metadata = { title: "Comunidad" };

export default async function AdminComunidadPage() {
  if (!(features.community || features.agenda)) notFound();
  const [agenda, { settings, content }] = await Promise.all([
    getAdminAgenda(),
    getAdminContent(),
  ]);
  return (
    <CommunityManager
      agenda={agenda}
      perks={content.perks}
      gallery={content.gallery}
      groupUrl={settings.whatsappGroupUrl ?? ""}
    />
  );
}
