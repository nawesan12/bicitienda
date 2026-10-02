import { eq, sql } from "drizzle-orm";
import type { Db } from "@/lib/server/db";
import * as schema from "@/lib/server/db/schema";

/**
 * Contadores atómicos (números de pedido, turno, presupuesto):
 * `UPDATE … value = value + 1 RETURNING` es atómico en Postgres y PGlite,
 * sin transacciones interactivas. Si la fila no existe se crea con
 * `first − 1` (ON CONFLICT DO NOTHING: dos procesos no la pisan) y se
 * vuelve a incrementar.
 */
export async function nextCounter(db: Db, id: string, first: number): Promise<number> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const [row] = await db
      .update(schema.counters)
      .set({ value: sql`${schema.counters.value} + 1` })
      .where(eq(schema.counters.id, id))
      .returning();
    if (row) return row.value;
    await db
      .insert(schema.counters)
      .values({ id, value: first - 1 })
      .onConflictDoNothing({ target: schema.counters.id });
  }
  throw new Error(`No se pudo incrementar el contador ${id}.`);
}

export const COUNTERS = {
  order: "order_number",
  quote: "quote_number",
  appointment: "appointment_number",
} as const;
