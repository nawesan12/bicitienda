/**
 * Aplica las migraciones de lib/server/db/migrations con el driver que
 * corresponda al entorno (Neon si hay DATABASE_URL, PGlite si no).
 *
 *   pnpm db:migrate
 */
const MIGRATIONS = { migrationsFolder: "lib/server/db/migrations" };

async function main() {
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
  const client = new PGlite(".data/pglite");
  await migrate(drizzle(client), MIGRATIONS);
  await client.close();
  console.log("✔ migraciones aplicadas (PGlite en .data/pglite)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
