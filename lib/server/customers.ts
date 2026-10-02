import { sql } from "drizzle-orm";
import type { Db } from "@/lib/server/db";
import * as schema from "@/lib/server/db/schema";

/**
 * Clientes (CRM): uno por WhatsApp normalizado. Los pedidos, turnos y
 * presupuestos los crean o actualizan con `upsertCustomer`, que es atómico
 * (INSERT … ON CONFLICT sobre el índice único del teléfono): dos pedidos
 * simultáneos del mismo cliente no duplican la fila.
 */

export type CustomerRow = typeof schema.customers.$inferSelect;

export async function upsertCustomer(
  db: Db,
  input: {
    name: string;
    /** Ya normalizado (lib/phone.ts). */
    phone: string;
    /** null/"" = no pisa el email que ya tenía. */
    email?: string | null;
    address?: string | null;
    city?: string | null;
  },
): Promise<CustomerRow> {
  const email = input.email?.trim().toLowerCase() || null;
  const [row] = await db
    .insert(schema.customers)
    .values({
      name: input.name.trim(),
      phone: input.phone,
      email,
      address: input.address?.trim() || null,
      city: input.city ?? null,
    })
    .onConflictDoUpdate({
      target: schema.customers.phone,
      set: {
        name: input.name.trim(),
        email: sql`coalesce(excluded.email, ${schema.customers.email})`,
        address: sql`coalesce(excluded.address, ${schema.customers.address})`,
        city: sql`coalesce(excluded.city, ${schema.customers.city})`,
      },
    })
    .returning();
  return row;
}
