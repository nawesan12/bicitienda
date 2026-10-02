import type { Metadata } from "next";
import { getAdminSettings } from "@/lib/server/admin-queries";
import { getInstagramConnection } from "@/lib/server/instagram";
import { SettingsEditor } from "./settings-editor";

export const metadata: Metadata = { title: "Ajustes" };

export default async function AdminAjustesPage({
  searchParams,
}: {
  searchParams: Promise<{ ig?: string; motivo?: string }>;
}) {
  const [s, ig, { ig: igResult, motivo }] = await Promise.all([
    getAdminSettings(),
    getInstagramConnection(),
    searchParams,
  ]);
  return (
    <SettingsEditor
      instagram={{
        connected: ig.connected,
        source: ig.source,
        username: ig.username,
        expiresAt: ig.expiresAt ? ig.expiresAt.toISOString() : null,
        canConnect: ig.canConnect,
        result: igResult ?? null,
        reason: motivo ?? null,
      }}
      settings={{
        whatsapp: s.whatsapp,
        address: s.address,
        hours: s.hours,
        showPrices: s.showPrices,
        ventaOnline: s.ventaOnline,
        r3: s.r3,
        r6: s.r6,
        transferDiscount: s.transferDiscount,
        instagram: s.instagram,
        tiktok: s.tiktok ?? "",
        mapsUrl: s.mapsUrl,
        transferAlias: s.transferAlias,
        depositPct: Math.round(s.depositRate * 10000) / 100,
        depositMinTotal: s.depositMinTotal,
        reservationHours: s.reservationHours,
        localShippingCost: s.localShippingCost,
      }}
    />
  );
}
