import { features } from "@/lib/features";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAdminContent, getAdminProducts } from "@/lib/server/admin-queries";
import { TestEditor } from "./test-editor";

export const metadata: Metadata = { title: "Test" };

export default async function AdminTestPage() {
  if (!features.advisor) notFound();
  const [{ content }, products] = await Promise.all([getAdminContent(), getAdminProducts()]);
  return (
    <TestEditor
      picks={content.test}
      products={products
        .filter((p) => !p.hidden)
        .map((p) => ({ id: p.id, name: p.name, images: p.images }))}
    />
  );
}
