/**
 * Aplica las migraciones de lib/server/db/migrations con el driver que
 * corresponda al entorno (Neon si hay DATABASE_URL, PGlite si no).
 *
 *   pnpm db:migrate
 */
const MIGRATIONS = { migrationsFolder: "lib/server/db/migrations" };

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
  const url = process.env.DATABASE_URL;

  if (url?.startsWith("postgres")) {
    const [{ neon }, { drizzle }, { migrate }] = await Promise.all([
      import("@neondatabase/serverless"),
      import("drizzle-orm/neon-http"),
      import("drizzle-orm/neon-http/migrator"),
    ]);
    await migrate(drizzle(neon(url)), MIGRATIONS);
    console.log("✔ migraciones aplicadas (Neon)");
    return;
  }

  const [{ PGlite }, { drizzle }, { migrate }, { mkdirSync }] =
    await Promise.all([
      import("@electric-sql/pglite"),
      import("drizzle-orm/pglite"),
      import("drizzle-orm/pglite/migrator"),
      import("node:fs"),
    ]);
  mkdirSync(".data/pglite", { recursive: true });
  // Dos procesos sobre la misma carpeta la corrompen: falla si `pnpm dev`
  // (u otro script) la tiene abierta.
  const { acquirePgliteLock } = await import("@/lib/server/db");
  acquirePgliteLock(await import("node:fs"));
  const client = new PGlite(".data/pglite");
  await migrate(drizzle(client), MIGRATIONS);
  await client.close();
  console.log("✔ migraciones aplicadas (PGlite en .data/pglite)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
