import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Panel, PanelTitle } from "@/components/bt";
import { ResponsiveTopBar } from "@/components/bt/admin-d2/top-bar";
import { features } from "@/lib/features";
import { IMPORT_COLUMNS } from "@/lib/server/product-import";
import { ImportFlow } from "./import-flow";

export const metadata: Metadata = { title: "Importar planilla" };

/** Columnas con la ayuda que ve el dueño (la plantilla trae ejemplos). */
const HELP: Partial<Record<(typeof IMPORT_COLUMNS)[number], string>> = {
  sku_producto: "Obligatorio. Clave del producto: si ya existe se actualiza.",
  nombre: "Obligatorio en productos nuevos.",
  categoria: "Obligatorio: mtb, ruta-gravel, urbanas, infantiles, cascos, indumentaria, accesorios…",
  precio: "Sin puntos ni $ (489900). Vacío = no se toca.",
  talle: "Una fila por talle × color. Vacío = producto sin talles.",
  altura: "Altura sugerida del talle: 1,65 – 1,75 m.",
  stock: "Stock absoluto del local para esa variante.",
  se_puede_probar: "si / no",
  ocultar_sin_stock: "si / no",
  estado: "publicado / borrador",
  fotos: "URLs separadas por espacio o coma.",
};

/**
 * Importar planilla (sin diseño en el handoff): descargar la plantilla,
 * subir el CSV/XLSX, revisar la vista previa con los errores por fila y
 * confirmar. La confirmación reenvía el mismo archivo y el server vuelve
 * a validar todo (upsert por SKU).
 */
export default function ImportarPage() {
  if (!features.csvImport) notFound();
  return (
    <>
      <ResponsiveTopBar title="Importar planilla" back={{ href: "/admin/productos", label: "Productos" }} />
      <div className="grid items-start gap-5 px-4 pt-5 pb-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6 lg:px-10 lg:pt-6">
        <ImportFlow />
        <Panel surface="surface" padding="lg" gap="md" as="aside">
          <PanelTitle>Columnas</PanelTitle>
          <p className="m-0 text-[14px] leading-[1.5] text-text-2">
            Una fila por variante. Las filas con el mismo <span className="font-mono text-[13px]">sku_producto</span> son
            el mismo producto; nombre, precio y el resto se toman de la primera. Celda vacía en un producto existente = no se
            toca.
          </p>
          <ul className="m-0 flex list-none flex-col p-0">
            {IMPORT_COLUMNS.map((c) => (
              <li key={c} className="flex flex-col gap-[2px] border-t border-line py-[10px]">
                <span className="font-mono text-[12px] font-semibold text-paper">{c}</span>
                {HELP[c] && <span className="text-[13px] text-text-3">{HELP[c]}</span>}
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
