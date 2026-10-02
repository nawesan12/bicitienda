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
  const client = new PGlite(".data/pglite");
  return { db: drizzle(client, { schema }), close: () => client.close() };
}

async function main() {
  const { db, close } = await connect();
  const n = await runSeed(db);
  await close();
  console.log(
    `✔ seed: ${n.products} productos, ${n.articles} notas, ${n.events} eventos y settings`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
