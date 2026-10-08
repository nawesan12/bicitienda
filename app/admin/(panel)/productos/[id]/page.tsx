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
  // key: al guardar, la action invalida y Next re-renderiza la página en la misma respuesta;
  // con variantes nuevas (ids reales) el editor se rearma. Las fotos no van en la key: subir
  // una también invalida, y rearmar el editor ahí borraba lo que se estaba escribiendo
  // (el editor ya suma la foto subida a su estado).
  return <ProductEditor key={JSON.stringify(data.variants)} data={data} />;
}
