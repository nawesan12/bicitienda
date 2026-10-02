"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/lib/server/actions/guard";
import { getDb, schema } from "@/lib/server/db";
import { withinRateLimit } from "@/lib/server/rate-limit";
import { invalidateAdmin } from "@/lib/server/revalidate";

const emailSchema = z.string().trim().toLowerCase().email().max(200);

/** Alta pública de la banda de newsletter. Idempotente por email. */
export async function subscribeNewsletter(
  email: unknown,
): Promise<{ ok: boolean }> {
  if (!(await withinRateLimit("newsletter", 10))) return { ok: false };
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return { ok: false };
  const db = await getDb();
  await db
    .insert(schema.newsletterSubscribers)
    .values({ email: parsed.data })
    .onConflictDoNothing({ target: schema.newsletterSubscribers.email });
  return { ok: true };
}

/** Baja manual desde /admin/consultas (pestaña Newsletter). */
export async function removeSubscriber(email: unknown): Promise<{ ok: boolean }> {
  await requireAdmin();
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return { ok: false };
  const db = await getDb();
  await db
    .delete(schema.newsletterSubscribers)
    .where(eq(schema.newsletterSubscribers.email, parsed.data));
  invalidateAdmin();
  return { ok: true };
}
