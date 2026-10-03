/**
 * Puebla la base desde la capa por-tienda. Idempotente.
 *
 *   pnpm db:seed
 *
 * La lógica vive en lib/server/seed.ts (también la usa el botón
 * "Restablecer" del admin); acá solo se abre y cierra la conexión.
 */
import * as schema from "@/lib/server/db/schema";
import { runSeed } from "@/lib/server/seed";

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
  const n = await runSeed(db);
  await close();
  console.log(`✔ seed: ${n.products} productos, ${n.articles} notas, ${n.events} eventos y settings`);
  if (n.demo)
    console.log(
      `✔ demo: ${n.demo.customers} clientes, ${n.demo.orders} pedidos, ${n.demo.appointments} turnos, ${n.demo.quotes} presupuestos y la cuenta demo`,
    );
  else console.log("· demo: la base ya tiene clientes, no se carga la operación demo");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
