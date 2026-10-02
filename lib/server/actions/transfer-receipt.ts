"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/server/db";
import { contactMatches, normalizeOrderNumber } from "@/lib/server/order-queries";
import { appendEvent, makeEvent } from "@/lib/server/orders";
import { withinRateLimit } from "@/lib/server/rate-limit";
import { invalidateAdmin } from "@/lib/server/revalidate";
import { readPrivateUpload, savePrivateUpload } from "@/lib/server/uploads";

/**
 * Comprobante de transferencia desde la confirmación (o el seguimiento):
 * el cliente prueba que el pedido es suyo con número + email o WhatsApp
 * del pedido, y sube una imagen o un PDF (≤ 6 MB, validado por firma de
 * bytes). Va a Cloudinary (carpeta privada, nombre aleatorio) o, en local,
 * a .data/private/ servido solo al admin. Se puede reemplazar mientras la
 * transferencia siga pendiente.
 *
 * FormData: `number`, `contact`, `file`.
 */
export async function uploadTransferReceipt(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await withinRateLimit("transfer-receipt", 5)))
    return { ok: false, error: "Demasiados intentos. Esperá un minuto." };
  const parsed = z
    .object({
      number: z.string().trim().min(1).max(30),
      contact: z.string().trim().min(3).max(200),
    })
    .safeParse({ number: formData.get("number"), contact: formData.get("contact") });
  if (!parsed.success) return { ok: false, error: "Completá el número de pedido y tu email o WhatsApp." };

  const db = await getDb();
  const [row] = await db
    .select({ order: schema.orders, customer: schema.customers })
    .from(schema.orders)
    .innerJoin(schema.customers, eq(schema.orders.customerId, schema.customers.id))
    .where(eq(schema.orders.number, normalizeOrderNumber(parsed.data.number)));
  // Mismo mensaje si no existe o no coincide el contacto: sin enumeración.
  if (!row || !contactMatches(row.customer, parsed.data.contact))
    return { ok: false, error: "No encontramos ese pedido con ese email o WhatsApp." };
  if (row.order.paymentMethod !== "transferencia" || row.order.status !== "PENDIENTE_PAGO")
    return { ok: false, error: "Este pedido no espera un comprobante de transferencia." };

  const upload = await readPrivateUpload(formData.get("file"), { allowPdf: true });
  if (!upload.ok) return upload;

  let url: string;
  try {
    url = await savePrivateUpload("comprobantes", upload.bytes, upload.mime);
  } catch (err) {
    console.error("[comprobante] error subiendo:", err);
    return { ok: false, error: "No pudimos subir el archivo. Probá de nuevo o mandalo por WhatsApp." };
  }
  const updated = await db
    .update(schema.orders)
    .set({ transferReceiptUrl: url })
    .where(and(eq(schema.orders.id, row.order.id), eq(schema.orders.status, "PENDIENTE_PAGO")))
    .returning();
  if (!updated.length) return { ok: false, error: "Este pedido ya no espera un comprobante." };
  await appendEvent(row.order.id, makeEvent("PAGO", "Comprobante de transferencia recibido"));
  invalidateAdmin();
  return { ok: true };
}
