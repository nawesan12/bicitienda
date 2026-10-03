import { sql } from "drizzle-orm";
import type { Db } from "@/lib/server/db";
import * as schema from "@/lib/server/db/schema";

/**
 * Clientes (CRM): uno por WhatsApp normalizado. Los pedidos, turnos y
 * presupuestos los crean o actualizan con `upsertCustomer`, que es atómico
 * (INSERT … ON CONFLICT sobre el índice único del teléfono): dos pedidos
 * simultáneos del mismo cliente no duplican la fila.
 *
 * Nombre: cada pedido/turno/presupuesto guarda el nombre que se cargó en
 * ESE formulario (`customer_name`), y las lecturas lo ponen en
 * `customer.name` con `withSnapshotName` — así un pedido viejo no cambia de
 * nombre si después alguien reserva con el mismo WhatsApp.
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
  // Criterio de actualización de la ficha existente:
  //   - sin cuenta vinculada: el último dato cargado manda (nombre, y email
  //     si vino uno nuevo; vacío no pisa).
  //   - con cuenta: la cuenta es la fuente de verdad del nombre y el email
  //     (un checkout con otro email no desvía los mails de la cuenta); solo
  //     se completa el email si la ficha no tenía.
  const c = schema.customers;
  const [row] = await db
    .insert(c)
    .values({
      name: input.name.trim(),
      phone: input.phone,
      email,
      address: input.address?.trim() || null,
      city: input.city ?? null,
    })
    .onConflictDoUpdate({
      target: c.phone,
      set: {
        name: sql`case when ${c.accountId} is null then excluded.name else ${c.name} end`,
        email: sql`case when ${c.accountId} is null then coalesce(excluded.email, ${c.email}) else coalesce(${c.email}, excluded.email) end`,
        address: sql`coalesce(excluded.address, ${c.address})`,
        city: sql`coalesce(excluded.city, ${c.city})`,
      },
    })
    .returning();
  return row;
}

/**
 * La ficha con el nombre guardado en el pedido/turno/presupuesto (si lo
 * tiene: los previos a la migración 0011 usan el de la ficha).
 */
export function withSnapshotName<C extends { name: string }>(
  customer: C,
  snapshot: string | null | undefined,
): C {
  const name = snapshot?.trim();
  return name && name !== customer.name ? { ...customer, name } : customer;
}
