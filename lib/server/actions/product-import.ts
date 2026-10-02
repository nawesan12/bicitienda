"use server";

import { store } from "@/lib/config";
import { requireAdmin } from "@/lib/server/actions/guard";
import {
  commitProductImport,
  MAX_IMPORT_BYTES,
  previewProductImport,
  type ImportPreview,
} from "@/lib/server/product-import";
import { invalidateAdmin } from "@/lib/server/revalidate";

/**
 * Importar planilla (Productos → Importar): el admin sube el CSV/XLSX,
 * ve la preview con los errores por fila y confirma. La confirmación
 * reenvía el MISMO archivo y se vuelve a validar todo antes de escribir.
 *
 * FormData: `file`.
 */

type ImportResult = { ok: true; preview: ImportPreview } | { ok: false; error: string };

async function readFile(formData: FormData): Promise<Buffer | string> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return "Elegí la planilla (CSV o Excel).";
  if (file.size > MAX_IMPORT_BYTES) return "La planilla supera los 4 MB.";
  return Buffer.from(await file.arrayBuffer());
}

export async function previewImport(formData: FormData): Promise<ImportResult> {
  await requireAdmin();
  if (store.features.csvImport === false) return { ok: false, error: "La importación no está disponible." };
  const bytes = await readFile(formData);
  if (typeof bytes === "string") return { ok: false, error: bytes };
  return { ok: true, preview: await previewProductImport(bytes) };
}

/** Aplica la planilla. Si tiene errores no escribe nada (preview.ok = false). */
export async function commitImport(formData: FormData): Promise<ImportResult> {
  const { actor } = await requireAdmin();
  if (store.features.csvImport === false) return { ok: false, error: "La importación no está disponible." };
  const bytes = await readFile(formData);
  if (typeof bytes === "string") return { ok: false, error: bytes };
  const preview = await commitProductImport(bytes, { actor });
  if (preview.ok) invalidateAdmin();
  return { ok: true, preview };
}
