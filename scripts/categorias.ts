/**
 * Deja las categorías de la base como las del catálogo, sin perder
 * productos (lib/server/category-sync.ts). Pensado para producción:
 *
 *   pnpm db:categorias            (muestra qué haría, no escribe nada)
 *   pnpm db:categorias --aplicar  (lo aplica)
 *
 * Usa DATABASE_URL de .env.local (`vercel env pull .env.local`); sin esa
 * variable trabaja sobre la base local (PGlite).
 */
import { syncCategories } from "@/lib/server/category-sync";
import * as schema from "@/lib/server/db/schema";

function loadEnvLocal() {
  for (const file of [".env.local", ".env"]) {
    try {
      process.loadEnvFile(file);
    } catch {
      /* no existe: modo local */
    }
  }
}

async function connect() {
  const url = process.env.DATABASE_URL;
  if (url?.startsWith("postgres")) {
    const [{ neon }, { drizzle }] = await Promise.all([
      import("@neondatabase/serverless"),
      import("drizzle-orm/neon-http"),
    ]);
    return { db: drizzle(neon(url), { schema }), where: "Neon (DATABASE_URL)", close: async () => {} };
  }
  const [{ PGlite }, { drizzle }, fs] = await Promise.all([
    import("@electric-sql/pglite"),
    import("drizzle-orm/pglite"),
    import("node:fs"),
  ]);
  fs.mkdirSync(".data/pglite", { recursive: true });
  const { acquirePgliteLock } = await import("@/lib/server/db");
  acquirePgliteLock(fs);
  const client = new PGlite(".data/pglite");
  return { db: drizzle(client, { schema }), where: "PGlite local (.data/pglite)", close: () => client.close() };
}

async function main() {
  loadEnvLocal();
  const apply = process.argv.includes("--aplicar");
  const { db, where, close } = await connect();
  console.log(`Base: ${where}\n`);
  const plan = await syncCategories(db, { apply });
  await close();

  const list = (title: string, items: string[]) => {
    if (items.length) console.log(`${title}:\n${items.map((i) => `  · ${i}`).join("\n")}\n`);
  };
  list("Se crean", plan.created);
  list("Se actualizan", plan.updated);
  list("Se borran (sus productos pasan a otra)", plan.removed.map((r) => `${r.label} → ${plan.labels[r.into] ?? r.into}`));
  list("Productos que cambian de categoría", plan.moved.map((m) => `${m.product} → ${plan.labels[m.to] ?? m.to}`));
  list("Creadas a mano que quedan como están", plan.kept);
  const nothing = !plan.created.length && !plan.updated.length && !plan.removed.length && !plan.moved.length;
  if (nothing) console.log("✔ Las categorías ya están al día.");
  else if (apply) console.log("✔ Aplicado. Ningún producto se borró.");
  else console.log("Nada se escribió. Para aplicarlo: pnpm db:categorias --aplicar");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
