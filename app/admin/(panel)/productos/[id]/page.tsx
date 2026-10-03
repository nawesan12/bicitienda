import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductEditor } from "@/lib/server/screens/admin-d2";
import { ProductEditor } from "./product-editor";

export const metadata: Metadata = { title: "Editar producto" };

/** 3d · Editar producto (también destino de "+ Nuevo producto"). */
export default async function EditarProductoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getProductEditor(decodeURIComponent(id));
  if (!data) notFound();
  // key: al guardar, router.refresh() trae datos nuevos y el editor se rearma.
  return <ProductEditor key={JSON.stringify([data.images, data.variants])} data={data} />;
}
