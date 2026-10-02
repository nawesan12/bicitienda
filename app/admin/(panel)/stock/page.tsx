import type { Metadata } from "next";
import {
  getAdminLocations,
  getAdminProducts,
  getStockLedger,
} from "@/lib/server/admin-queries";
import { StockManager } from "./stock-manager";

export const metadata: Metadata = { title: "Stock" };

export default async function AdminStockPage() {
  const [products, locations, ledger] = await Promise.all([
    getAdminProducts(),
    getAdminLocations(),
    getStockLedger(),
  ]);
  return (
    <StockManager
      products={products}
      locations={locations
        .filter((l) => l.active)
        .map((l) => ({ id: l.id, name: l.shortName }))}
      ledger={ledger.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }))}
    />
  );
}
