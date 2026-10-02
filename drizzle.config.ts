import { defineConfig } from "drizzle-kit";

/**
 * drizzle-kit genera las migraciones desde el schema. `dbCredentials` solo
 * hace falta para `db:studio`/push contra Postgres real; para generar SQL
 * alcanza con el dialecto.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/server/db/schema.ts",
  out: "./lib/server/db/migrations",
  ...(process.env.DATABASE_URL
    ? { dbCredentials: { url: process.env.DATABASE_URL } }
    : {}),
});
