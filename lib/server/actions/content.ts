"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { content as seedContent } from "@/lib/data/content";
import { TEXTS } from "@/lib/data/texts";
import { requireAdmin } from "@/lib/server/actions/guard";
import { getDb, schema } from "@/lib/server/db";
import { withContentDefaults } from "@/lib/server/queries";
import { invalidatePublic } from "@/lib/server/revalidate";
import type { SiteContent } from "@/lib/types";

/**
 * Contenido editable (jsonb `settings.content`) y textos sueltos (tabla
 * `texts`). Las secciones del admin guardan solas: cada bloque llega
 * completo por `patchContent` (el hero campo a campo, Nosotros/rep/perks
 * enteros) y se pisa solo esa clave.
 */

type Result = { ok: true } | { ok: false; error: string };

const line = (max: number) => z.string().max(max);
const numbered = z.object({ n: line(8), title: line(120), body: line(600) });
const photoUrl = z
  .string()
  .max(500)
  .refine((v) => v.startsWith("/") || v.startsWith("https://"), "URL inválida");

const contentPatchSchema = z
  .object({
    badge: line(80),
    l1: line(60),
    l2: line(60),
    sub: line(400),
    heroProd: z.string().trim().min(1).max(80),
    heroPhoto: z.object({ url: photoUrl, prodId: z.string().max(80) }).nullable(),
    marquee: z.array(line(80)).max(16),
    stats: z.array(z.object({ num: line(12), label: line(40) })).max(3),
    nosotros: z.object({
      title: line(120),
      intro: line(800),
      paras: z.array(line(4000)).max(30),
      pillars: z.array(numbered).max(6),
      localPhoto: photoUrl.nullable(),
    }),
    rep: z.object({
      title: line(120),
      body: line(800),
      services: z.array(line(120)).max(20),
    }),
    perks: z.array(numbered).max(6),
    gallery: z.array(photoUrl.nullable()).max(4),
    test: z.record(
      z.string().max(40),
      z.object({ id: z.string().max(80), why: line(300) }),
    ),
  })
  .partial();

export type ContentPatch = Partial<SiteContent>;

export async function patchContent(patch: unknown): Promise<Result> {
  await requireAdmin();
  const parsed = contentPatchSchema.safeParse(patch);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisá los datos." };
  }
  const db = await getDb();
  const [row] = await db
    .select({ content: schema.settings.content })
    .from(schema.settings)
    .where(eq(schema.settings.id, "main"));
  const current = withContentDefaults(row?.content);
  const p = parsed.data;
  const next: SiteContent = {
    ...current,
    ...p,
    ...(p.marquee ? { marquee: p.marquee.map((m) => m.trim()).filter(Boolean) } : {}),
    ...(p.test ? { test: { ...current.test, ...p.test } } : {}),
    ...(p.gallery
      ? { gallery: [0, 1, 2, 3].map((i) => p.gallery?.[i] ?? null) }
      : {}),
  };
  await db
    .update(schema.settings)
    .set({ content: next, updatedAt: new Date() })
    .where(eq(schema.settings.id, "main"));
  invalidatePublic("content");
  // El hero y el test muestran productos: la home de catálogo también.
  if (p.heroProd !== undefined || p.heroPhoto !== undefined) invalidatePublic("catalog");
  return { ok: true };
}

/** "↺ Restaurar originales" del test: las 11 recomendaciones vuelven al seed. */
export async function resetTest(): Promise<Result> {
  return patchContent({ test: seedContent.test });
}

/* ── Textos (TEXTS + overrides) ───────────────────────────── */

const textKeySchema = z
  .string()
  .max(60)
  .refine((k) => Object.prototype.hasOwnProperty.call(TEXTS, k), "Texto inexistente");

/**
 * Guarda un texto. Si vuelve a ser igual al original, se borra el override
 * (y el badge EDITADO desaparece).
 */
export async function setText(key: unknown, value: unknown): Promise<Result> {
  await requireAdmin();
  const parsed = z
    .object({ key: textKeySchema, value: z.string().max(2000) })
    .safeParse({ key, value });
  if (!parsed.success) return { ok: false, error: "Texto inválido." };
  const { key: k, value: v } = parsed.data;
  const db = await getDb();
  if (v === TEXTS[k]) {
    await db.delete(schema.texts).where(eq(schema.texts.key, k));
  } else {
    await db
      .insert(schema.texts)
      .values({ key: k, value: v })
      .onConflictDoUpdate({ target: schema.texts.key, set: { value: v } });
  }
  invalidatePublic("content");
  return { ok: true };
}

/** "↺ Restaurar textos originales": borra todos los overrides. */
export async function resetTexts(): Promise<Result> {
  await requireAdmin();
  const db = await getDb();
  await db.delete(schema.texts);
  invalidatePublic("content");
  return { ok: true };
}
