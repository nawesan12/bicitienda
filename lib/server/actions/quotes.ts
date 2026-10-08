"use server";

import { z } from "zod";
import { store } from "@/lib/config";
import { isValidArPhone } from "@/lib/phone";
import { requireAdmin } from "@/lib/server/actions/guard";
import { getCurrentAccount } from "@/lib/server/customer-auth";
import {
  advanceQuote,
  createQuoteRequest,
  QuoteError,
  rejectQuote,
  setQuoteLines,
  updateQuote,
  type AdvanceQuoteResult,
} from "@/lib/server/quotes";
import { withinRateLimit } from "@/lib/server/rate-limit";
import { invalidateAdmin } from "@/lib/server/revalidate";
import { readPrivateUpload, savePrivateUpload } from "@/lib/server/uploads";

/**
 * Presupuestos: el pedido público (5a, con fotos) y la cotización del
 * admin (5b: ítems, demora, validez, avanzar, rechazar, crear pedido).
 */

const MAX_PHOTOS = 4;

const requestSchema = z.object({
  kind: z.enum(["bici", "rep", "imp", "otro"], { message: "Elegí qué necesitás." }),
  detail: z.string().trim().min(10, "Contanos un poco más (al menos 10 caracteres).").max(4000),
  forBike: z.string().trim().max(200).optional(),
  budget: z.string().trim().max(100).optional(),
  name: z.string().trim().min(2, "Completá tu nombre.").max(120),
  phone: z
    .string()
    .trim()
    .max(30)
    .refine(isValidArPhone, "Revisá el WhatsApp: 10 dígitos con la característica (ej. 223 555-0182)."),
  email: z.union([z.literal(""), z.string().trim().toLowerCase().email("Revisá el email.").max(200)]).optional(),
});

/**
 * "Enviar pedido de presupuesto". FormData: kind, detail, forBike, budget,
 * name, phone, email y hasta 4 `photos` (imágenes ≤ 4 MB). Con sesión,
 * nombre/WhatsApp/email pueden venir de la cuenta.
 */
export async function submitQuoteRequest(
  formData: FormData,
): Promise<{ ok: true; number: string } | { ok: false; error: string }> {
  if (store.features.quotes === false) return { ok: false, error: "Los presupuestos no están disponibles." };
  if (!(await withinRateLimit("quote-request", 4)))
    return { ok: false, error: "Demasiados pedidos seguidos. Esperá un minuto." };
  const account = await getCurrentAccount();
  const field = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v : undefined;
  };
  const parsed = requestSchema.safeParse({
    kind: field("kind"),
    detail: field("detail"),
    forBike: field("forBike"),
    budget: field("budget"),
    name: field("name") || account?.name,
    phone: field("phone") || account?.phone,
    email: field("email") ?? account?.email,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisá los datos." };

  const files = formData.getAll("photos").filter((f) => f instanceof File && f.size > 0);
  if (files.length > MAX_PHOTOS) return { ok: false, error: `Hasta ${MAX_PHOTOS} fotos.` };
  const photos: string[] = [];
  for (const f of files) {
    const upload = await readPrivateUpload(f, { allowPdf: false });
    if (!upload.ok) return upload;
    try {
      photos.push(await savePrivateUpload("presupuestos", upload.bytes, upload.mime));
    } catch (err) {
      console.error("[presupuestos] error subiendo foto:", err);
      return { ok: false, error: "No pudimos subir las fotos. Probá sin fotos o mandalas por WhatsApp." };
    }
  }

  try {
    const row = await createQuoteRequest({
      ...parsed.data,
      email: parsed.data.email || null,
      photos,
      accountId: account?.id ?? null,
    });
    invalidateAdmin();
    return { ok: true, number: row.number };
  } catch (err) {
    if (err instanceof QuoteError) return { ok: false, error: err.message };
    console.error("[presupuestos]", err);
    return { ok: false, error: "No pudimos enviar el pedido. Probá de nuevo." };
  }
}

/* ── Admin ────────────────────────────────────────────────── */

const idSchema = z.string().uuid();
type Result = { ok: true } | { ok: false; error: string };

async function guarded(fn: () => Promise<void>): Promise<Result> {
  try {
    await fn();
    invalidateAdmin();
    return { ok: true };
  } catch (err) {
    if (err instanceof QuoteError) return { ok: false, error: err.message };
    throw err;
  }
}

/** Título, demora ("30 a 45 días") y válido hasta (YYYY-MM-DD). */
export async function adminPatchQuote(id: unknown, patch: unknown): Promise<Result> {
  await requireAdmin();
  const i = idSchema.safeParse(id);
  const p = z
    .object({
      title: z.string().max(120),
      eta: z.string().max(80),
      validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    })
    .partial()
    .safeParse(patch);
  if (!i.success || !p.success) return { ok: false, error: "Revisá los datos." };
  return guarded(() => updateQuote(i.data, p.data));
}

/** Ítems de la cotización (reemplaza todos; "+ Agregar ítem" del panel). */
export async function adminSetQuoteLines(id: unknown, lines: unknown): Promise<Result> {
  await requireAdmin();
  const i = idSchema.safeParse(id);
  const p = z
    .array(
      z.object({
        name: z.string().trim().min(1).max(160),
        price: z.number().int().min(0).max(1_000_000_000),
        quantity: z.number().int().min(1).max(99).optional(),
        productSlug: z.string().trim().max(80).nullable().optional(),
        variantId: z.string().trim().max(80).nullable().optional(),
      }),
    )
    .max(40)
    .safeParse(lines);
  if (!i.success || !p.success) return { ok: false, error: "Cada ítem necesita nombre y precio." };
  return guarded(() => setQuoteLines(i.data, p.data));
}

/**
 * Botón amarillo: Enviar por WhatsApp (devuelve `whatsappUrl` para abrir)
 * → Marcar aceptado → Crear pedido (devuelve `orderNumber`).
 */
export async function adminAdvanceQuote(id: unknown, opts?: unknown): Promise<AdvanceQuoteResult> {
  await requireAdmin();
  const i = idSchema.safeParse(id);
  const o = z
    .object({
      expectedFrom: z.enum(["nuevo", "cotizado", "aceptado", "pedido_creado", "rechazado"]).optional(),
      paymentMethod: z.enum(["transferencia", "efectivo"]).optional(),
    })
    .optional()
    .safeParse(opts);
  if (!i.success || !o.success) return { ok: false, error: "Presupuesto inválido." };
  const result = await advanceQuote(i.data, o.data ?? {});
  if (result.ok) invalidateAdmin();
  return result;
}

export async function adminRejectQuote(id: unknown): Promise<Result> {
  await requireAdmin();
  const i = idSchema.safeParse(id);
  if (!i.success) return { ok: false, error: "Presupuesto inválido." };
  const ok = await rejectQuote(i.data);
  if (!ok) return { ok: false, error: "El presupuesto ya está cerrado." };
  invalidateAdmin();
  return { ok: true };
}
