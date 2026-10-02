"use server";

import { and, eq, gt, or, sql } from "drizzle-orm";
import { invalidatePublic } from "@/lib/server/revalidate";
import { z } from "zod";
import { requireAdmin } from "@/lib/server/actions/guard";
import { getDb, schema } from "@/lib/server/db";

/**
 * CRUD de sucursales (/admin/sucursales). Reglas duras:
 *  - siempre queda al menos una sucursal activa;
 *  - una sucursal con stock o con pedidos asociados no se borra: se
 *    transfiere el stock y se desactiva.
 * Toda mutación invalida 'locations' (footer, home, checkout, emails) y
 * 'catalog' (la disponibilidad por sucursal de las fichas).
 */

const idSchema = z.string().trim().min(1).max(60);

const locationSchema = z.object({
  name: z.string().trim().min(1, "Poné un nombre para la sucursal.").max(120),
  shortName: z.string().trim().max(60),
  address: z.string().trim().max(200),
  hours: z.string().trim().max(120),
  mapsUrl: z
    .string()
    .trim()
    .max(500)
    .refine(
      (v) => v === "" || v.startsWith("https://"),
      "El link del mapa debe ser https.",
    ),
  order: z.number().int().min(0).max(999).catch(0),
});

export type LocationPatch = z.infer<typeof locationSchema>;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

type Result = { ok: true } | { ok: false; error: string };

export async function createLocation(patch: LocationPatch): Promise<Result> {
  await requireAdmin();
  const parsed = locationSchema.safeParse(patch);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Revisá los datos.",
    };
  }
  patch = parsed.data;
  const name = patch.name;
  const db = await getDb();

  const base = slugify(name) || "sucursal";
  const existing = await db.select({ id: schema.locations.id }).from(schema.locations);
  const taken = new Set(existing.map((l) => l.id));
  let id = base;
  for (let i = 2; taken.has(id); i++) id = `${base}-${i}`;

  await db.insert(schema.locations).values({
    id,
    name,
    shortName: patch.shortName.trim() || name,
    address: patch.address.trim(),
    hours: patch.hours.trim(),
    mapsUrl: patch.mapsUrl.trim(),
    order: Math.trunc(patch.order) || existing.length,
    active: true,
  });
  invalidatePublic("locations");
  invalidatePublic("catalog");
  return { ok: true };
}

export async function updateLocation(
  id: string,
  patch: LocationPatch,
): Promise<Result> {
  await requireAdmin();
  const parsedId = idSchema.safeParse(id);
  const parsed = locationSchema.safeParse(patch);
  if (!parsedId.success || !parsed.success) {
    return {
      ok: false,
      error: parsed.success
        ? "Sucursal inválida."
        : (parsed.error.issues[0]?.message ?? "Revisá los datos."),
    };
  }
  id = parsedId.data;
  patch = parsed.data;
  const name = patch.name;
  const db = await getDb();
  await db
    .update(schema.locations)
    .set({
      name,
      shortName: patch.shortName.trim() || name,
      address: patch.address.trim(),
      hours: patch.hours.trim(),
      mapsUrl: patch.mapsUrl.trim(),
      order: Math.trunc(patch.order) || 0,
    })
    .where(eq(schema.locations.id, id));
  invalidatePublic("locations");
  invalidatePublic("catalog");
  return { ok: true };
}

export async function setLocationActive(
  id: string,
  active: boolean,
): Promise<Result> {
  await requireAdmin();
  const db = await getDb();
  if (!active) {
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)`.mapWith(Number) })
      .from(schema.locations)
      .where(
        and(eq(schema.locations.active, true), sql`${schema.locations.id} <> ${id}`),
      );
    if (n === 0)
      return { ok: false, error: "Tiene que quedar al menos una sucursal activa." };
  }
  await db
    .update(schema.locations)
    .set({ active })
    .where(eq(schema.locations.id, id));
  invalidatePublic("locations");
  invalidatePublic("catalog");
  return { ok: true };
}

/**
 * Borra una sucursal solo si no tiene stock ni pedidos que la referencien
 * — si los tiene, la salida correcta es transferir el stock y desactivar.
 */
export async function deleteLocation(id: string): Promise<Result> {
  await requireAdmin();
  const db = await getDb();

  const [{ n: activeOthers }] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(schema.locations)
    .where(
      and(eq(schema.locations.active, true), sql`${schema.locations.id} <> ${id}`),
    );
  if (activeOthers === 0)
    return { ok: false, error: "Tiene que quedar al menos una sucursal activa." };

  const [{ n: withStock }] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(schema.productStock)
    .where(
      and(eq(schema.productStock.locationId, id), gt(schema.productStock.qty, 0)),
    );
  if (withStock > 0)
    return {
      ok: false,
      error: "Todavía tiene stock: transferilo a otra sucursal antes de borrarla.",
    };

  const [{ n: withOrders }] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(schema.orders)
    .where(
      or(
        eq(schema.orders.pickupLocationId, id),
        eq(schema.orders.fulfillmentLocationId, id),
      ),
    );
  if (withOrders > 0)
    return {
      ok: false,
      error: "Tiene pedidos asociados: desactivala en lugar de borrarla.",
    };

  // Filas de stock en cero y movimientos históricos: las primeras se van
  // con la sucursal; el libro conserva su historia (sin FK a propósito).
  await db.delete(schema.productStock).where(eq(schema.productStock.locationId, id));
  await db.delete(schema.locations).where(eq(schema.locations.id, id));
  invalidatePublic("locations");
  invalidatePublic("catalog");
  return { ok: true };
}
