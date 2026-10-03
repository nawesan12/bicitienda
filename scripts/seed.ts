/**
 * Puebla la base desde la capa por-tienda. Idempotente.
 *
 *   pnpm db:seed              (con la operación demo, si la base no tiene clientes)
 *   pnpm db:seed --sin-demo   (solo catálogo de ejemplo, settings y plantillas)
 *   pnpm db:seed --vacio      (producción en blanco: estructura sin productos)
 *
 * La lógica vive en lib/server/seed.ts (también la usa el botón
 * "Restablecer" del admin); acá solo se abre y cierra la conexión.
 */
import { sql } from "drizzle-orm";
import * as schema from "@/lib/server/db/schema";
import { runSeed } from "@/lib/server/seed";

/**
 * `--vacio`: deja solo la estructura (settings, categorías, local, servicios,
 * horarios, plantillas de WhatsApp y contadores). Sin productos ni marcas,
 * notas o eventos de ejemplo: el catálogo real se carga desde el admin o
 * importando la planilla.
 */
async function emptyCatalog(db: Awaited<ReturnType<typeof connect>>["db"]) {
  await db.delete(schema.stockAlerts);
  await db.delete(schema.stockMovements);
  await db.delete(schema.productStock);
  await db.delete(schema.productVariants);
  await db.delete(schema.products);
  await db.delete(schema.brands);
  await db.delete(schema.articles);
  await db.delete(schema.agendaEvents);
}

async function connect() {
  const url = process.env.DATABASE_URL;
  if (url?.startsWith("postgres")) {
    const [{ neon }, { drizzle }] = await Promise.all([
      import("@neondatabase/serverless"),
      import("drizzle-orm/neon-http"),
    ]);
    return { db: drizzle(neon(url), { schema }), close: async () => {} };
  }
  const [{ PGlite }, { drizzle }, { mkdirSync }] = await Promise.all([
    import("@electric-sql/pglite"),
    import("drizzle-orm/pglite"),
    import("node:fs"),
  ]);
  mkdirSync(".data/pglite", { recursive: true });
  // Dos procesos sobre la misma carpeta la corrompen: falla si `pnpm dev`
  // (u otro script) la tiene abierta.
  const { acquirePgliteLock } = await import("@/lib/server/db");
  acquirePgliteLock(await import("node:fs"));
  const client = new PGlite(".data/pglite");
  return { db: drizzle(client, { schema }), close: () => client.close() };
}

/** Variables de .env.local (DATABASE_URL, etc.) como hace `next dev`. */
function loadEnvLocal() {
  for (const file of [".env.local", ".env"]) {
    try {
      process.loadEnvFile(file);
    } catch {
      /* no existe: modo local */
    }
  }
}

async function main() {
  loadEnvLocal();
  const { db, close } = await connect();
  const empty = process.argv.includes("--vacio");
  const withDemo = !empty && !process.argv.includes("--sin-demo");
  const n = await runSeed(db, { demo: withDemo });
  if (empty) {
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.orders);
    if (count > 0) throw new Error("--vacio: la base ya tiene pedidos, no se vacía el catálogo.");
    await emptyCatalog(db);
  }
  await close();
  if (empty) {
    console.log("✔ seed vacío: settings, categorías, local, servicios, horarios y plantillas (sin productos)");
    return;
  }
  console.log(`✔ seed: ${n.products} productos, ${n.articles} notas, ${n.events} eventos y settings`);
  if (n.demo)
    console.log(
      `✔ demo: ${n.demo.customers} clientes, ${n.demo.orders} pedidos, ${n.demo.appointments} turnos, ${n.demo.quotes} presupuestos y la cuenta demo`,
    );
  else if (!withDemo) console.log("· demo: omitida (--sin-demo)");
  else console.log("· demo: la base ya tiene clientes, no se carga la operación demo");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
