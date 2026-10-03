"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/lib/server/actions/guard";
import { getDb, schema } from "@/lib/server/db";
import { invalidatePublic } from "@/lib/server/revalidate";
import { runSeed } from "@/lib/server/seed";

/**
 * Ajustes (/admin/ajustes y el link del grupo en /admin/comunidad). Cada
 * campo se guarda solo (autosave): llega uno o varios por `patchSettings`,
 * validados y normalizados acá. Los % van enteros o con decimales como en
 * el handoff (5 = 5%); la seña se guarda como fracción.
 */

type Result = { ok: true } | { ok: false; error: string };

const httpsOrEmpty = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || v.startsWith("https://"), "El link debe empezar con https://");

/** "@rodarmdq", "rodarmdq" o el link del perfil → "rodarmdq". */
function handleFrom(value: string, host: "instagram" | "tiktok"): string {
  const v = value.trim();
  const m = new RegExp(`${host}\\.com/@?([A-Za-z0-9._]+)`, "i").exec(v);
  return (m ? m[1] : v).replace(/^@/, "").replace(/\/+$/, "");
}

const pct = (max: number) => z.number().min(0).max(max);

const settingsPatchSchema = z
  .object({
    whatsapp: z
      .string()
      .trim()
      .max(30)
      .refine((v) => {
        const d = v.replace(/\D/g, "");
        return d.length >= 8 && d.length <= 15;
      }, "Revisá el número de WhatsApp."),
    whatsappGroupUrl: httpsOrEmpty,
    instagram: z.string().trim().max(200),
    tiktok: z.string().trim().max(200),
    address: z.string().trim().max(160),
    hours: z.string().trim().max(120),
    mapsUrl: httpsOrEmpty,
    showPrices: z.boolean(),
    ventaOnline: z.boolean(),
    r3: pct(300),
    r6: pct(300),
    transferDiscount: pct(90),
    transferAlias: z.string().trim().max(60),
    /** CBU (22 dígitos) o CVU; se guarda sin espacios ni guiones. "" = sin dato. */
    transferCbu: z
      .string()
      .trim()
      .max(40)
      .refine((v) => {
        const d = v.replace(/[\s-]/g, "");
        return d === "" || /^\d{22}$/.test(d) || /^\[.*\]$/.test(v);
      }, "El CBU/CVU tiene 22 números."),
    transferHolder: z.string().trim().max(120),
    transferBank: z.string().trim().max(80),
    /** Efectivo en el local habilitado en el checkout. */
    cashEnabled: z.boolean(),
    /** Tope de cuotas de Mercado Pago (1 = sin cuotas). */
    maxInstallments: z.number().int().min(1).max(24),
    /** Horas que se guarda una reserva en efectivo. null = no vence. */
    cashReservationHours: z.number().int().min(1).max(24 * 30).nullable(),
    /** Minutos que un pago online pendiente reserva el stock. */
    onlineReservationMinutes: z.number().int().min(10).max(24 * 60),
    /** Seña en % (10 = 10%). */
    depositPct: pct(90),
    depositMinTotal: z.number().int().min(0).max(1_000_000_000),
    reservationHours: z.number().int().min(1).max(24 * 14),
    localShippingCost: z.number().int().min(0).max(100_000_000),
  })
  .partial();

export type SettingsPatch = z.infer<typeof settingsPatchSchema>;

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function patchSettings(patch: unknown): Promise<Result> {
  await requireAdmin();
  const parsed = settingsPatchSchema.safeParse(patch);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisá los datos." };
  }
  const p = parsed.data;
  const set: Partial<typeof schema.settings.$inferInsert> = {};
  if (p.whatsapp !== undefined) set.whatsapp = p.whatsapp.replace(/\D/g, "");
  if (p.whatsappGroupUrl !== undefined) set.whatsappGroupUrl = p.whatsappGroupUrl || null;
  if (p.instagram !== undefined) set.instagram = handleFrom(p.instagram, "instagram");
  if (p.tiktok !== undefined) set.tiktok = handleFrom(p.tiktok, "tiktok") || null;
  if (p.address !== undefined) set.address = p.address;
  if (p.hours !== undefined) set.hours = p.hours;
  if (p.mapsUrl !== undefined) set.mapsUrl = p.mapsUrl;
  if (p.showPrices !== undefined) set.showPrices = p.showPrices;
  if (p.ventaOnline !== undefined) set.ventaOnline = p.ventaOnline;
  if (p.r3 !== undefined) set.r3 = round2(p.r3);
  if (p.r6 !== undefined) set.r6 = round2(p.r6);
  if (p.transferDiscount !== undefined) set.transferDiscount = round2(p.transferDiscount);
  if (p.transferAlias !== undefined) set.transferAlias = p.transferAlias;
  if (p.transferCbu !== undefined)
    set.transferCbu = /^\[.*\]$/.test(p.transferCbu) ? p.transferCbu : p.transferCbu.replace(/[\s-]/g, "");
  if (p.transferHolder !== undefined) set.transferHolder = p.transferHolder;
  if (p.transferBank !== undefined) set.transferBank = p.transferBank;
  if (p.cashEnabled !== undefined) set.cashEnabled = p.cashEnabled;
  if (p.maxInstallments !== undefined) set.maxInstallments = p.maxInstallments;
  if (p.cashReservationHours !== undefined) set.cashReservationHours = p.cashReservationHours;
  if (p.onlineReservationMinutes !== undefined) set.onlineReservationMinutes = p.onlineReservationMinutes;
  if (p.depositPct !== undefined) set.depositRate = round2(p.depositPct) / 100;
  if (p.depositMinTotal !== undefined) set.depositMinTotal = p.depositMinTotal;
  if (p.reservationHours !== undefined) set.reservationHours = p.reservationHours;
  if (p.localShippingCost !== undefined) set.localShippingCost = p.localShippingCost;
  if (!Object.keys(set).length) return { ok: true };

  const db = await getDb();
  await db
    .update(schema.settings)
    .set({ ...set, updatedAt: new Date() })
    .where(eq(schema.settings.id, "main"));
  // Contacto, precios visibles, venta online y recargos atraviesan toda la
  // web (layout, tarjetas, fichas, checkout).
  invalidatePublic(["settings", "catalog"]);
  return { ok: true };
}

/**
 * "Restablecer todo a los valores originales": catálogo, categorías,
 * notas, agenda, textos, contenido y ajustes vuelven al seed. Los datos
 * OPERATIVOS no se tocan: pedidos, pagos, clientes, consultas, suscriptos
 * e inventario (las cantidades son mercadería real, no edición).
 */
export async function resetToSeed(): Promise<Result> {
  await requireAdmin();
  const db = await getDb();
  await runSeed(db, { reset: true, keepOperational: true });
  invalidatePublic(["catalog", "content", "settings"]);
  return { ok: true };
}
