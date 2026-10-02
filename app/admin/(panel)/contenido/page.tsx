import type { Metadata } from "next";
import {
  getAdminContent,
  getAdminProducts,
  getAdminTexts,
} from "@/lib/server/admin-queries";
import { ContentEditor } from "./content-editor";

export const metadata: Metadata = { title: "Contenido" };

export default async function AdminContenidoPage() {
  const [{ content }, products, texts] = await Promise.all([
    getAdminContent(),
    getAdminProducts(),
    getAdminTexts(),
  ]);
  return (
    <ContentEditor
      content={content}
      overrides={texts}
      products={products
        .filter((p) => !p.hidden)
        .map((p) => ({
          id: p.id,
          label: `${p.name} · ${p.categoryLabel}`,
          images: p.images,
        }))}
    />
  );
}
