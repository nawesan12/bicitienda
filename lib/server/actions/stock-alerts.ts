"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/lib/server/actions/guard";
import { getDb, schema } from "@/lib/server/db";
import { sendBackInStockEmail } from "@/lib/server/mail";
import { withinRateLimit } from "@/lib/server/rate-limit";
import { getStockTotals } from "@/lib/server/stock";

const alertSchema = z.object({
  productSlug: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().email().max(200),
});

/**
 * "Avisame cuando vuelva": el interesado deja su email en la ficha sin
 * stock, y cuando el admin repone puede disparar el aviso a todos los que
 * esperaban (una sola vez por interesado — quedan marcados notified).
 */

/** Alta pública desde la ficha de un producto agotado. */
export async function requestStockAlert(
  productSlug: unknown,
  email: unknown,
): Promise<{ ok: boolean }> {
  if (!(await withinRateLimit("stock-alert", 10))) return { ok: false };
  const parsed = alertSchema.safeParse({ productSlug, email });
  if (!parsed.success) return { ok: false };
  const db = await getDb();
  const [product] = await db
    .select({ slug: schema.products.slug })
    .from(schema.products)
    .where(eq(schema.products.slug, parsed.data.productSlug));
  const totals = await getStockTotals(db);
  if (!product || (totals.get(product.slug) ?? 0) > 0) return { ok: false };
  await db
    .insert(schema.stockAlerts)
    .values({ productSlug: product.slug, email: parsed.data.email })
    .onConflictDoNothing();
  return { ok: true };
}

/** Envía el aviso a los interesados sin notificar de un producto repuesto. */
export async function sendStockAlerts(
  productId: string,
): Promise<{ sent: number }> {
  await requireAdmin();
  const db = await getDb();
  const [product] = await db
    .select()
    .from(schema.products)
    .where(eq(schema.products.id, productId));
  const totals = await getStockTotals(db);
  if (!product || (totals.get(product.slug) ?? 0) <= 0 || product.hidden)
    return { sent: 0 };

  const waiting = await db
    .select()
    .from(schema.stockAlerts)
    .where(
      and(
        eq(schema.stockAlerts.productSlug, product.slug),
        eq(schema.stockAlerts.notified, false),
      ),
    );

  let sent = 0;
  for (const alert of waiting) {
    await sendBackInStockEmail(product, alert.email);
    await db
      .update(schema.stockAlerts)
      .set({ notified: true })
      .where(eq(schema.stockAlerts.id, alert.id));
    sent++;
  }
  return { sent };
}
