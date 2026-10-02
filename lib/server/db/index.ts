import type { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import type { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import * as schema from "./schema";

/**
 * Conexión a la base con switch de driver:
 *
 *   - `DATABASE_URL` postgres…  → Neon serverless por HTTP (producción).
 *   - sin `DATABASE_URL`        → PGlite embebido en `.data/pglite` (dev
 *     y builds locales), mismo dialecto Postgres, cero servicios.
 *
 * Los drivers se cargan con import() dinámico para que cada modo arrastre
 * solo el suyo, y la instancia se cachea en globalThis: en dev el
 * hot-reload reimporta módulos y sin esto PGlite abriría el mismo
 * directorio de datos N veces.
 */

export type Db =
  | ReturnType<typeof drizzleNeon<typeof schema>>
  | ReturnType<typeof drizzlePglite<typeof schema>>;

async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL;

  if (url?.startsWith("postgres")) {
    const [{ neon }, { drizzle }] = await Promise.all([
      import("@neondatabase/serverless"),
      import("drizzle-orm/neon-http"),
    ]);
    return drizzle(neon(url), { schema });
  }

  const [{ PGlite }, { drizzle }, fs] = await Promise.all([
    import("@electric-sql/pglite"),
    import("drizzle-orm/pglite"),
    import("node:fs"),
  ]);
  // PGlite no crea directorios anidados por sí solo.
  fs.mkdirSync(".data/pglite", { recursive: true });
  acquirePgliteLock(fs);
  return drizzle(new PGlite(".data/pglite"), { schema });
}

/**
 * Lock de proceso para PGlite. Dos procesos sobre el mismo directorio de
 * datos lo CORROMPEN (PGlite no tiene protección multi-proceso): pasa al
 * correr `pnpm build` con `pnpm dev` abierto, o cualquier script suelto
 * con el server levantado. Mejor fallar ruidoso acá que perder la base.
 */
function acquirePgliteLock(fs: typeof import("node:fs")) {
  const lockPath = ".data/pglite.lock";
  try {
    const holder = Number(fs.readFileSync(lockPath, "utf8"));
    if (holder && holder !== process.pid) {
      try {
        process.kill(holder, 0); // ¿sigue vivo?
        throw new Error(
          `La base PGlite (.data/pglite) ya está abierta por el proceso ${holder}. ` +
            "Cerrá el otro server/script antes de seguir — abrirla dos veces la corrompe.",
        );
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== "ESRCH") throw err;
        // El dueño del lock murió: lock viejo, se pisa.
      }
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
  fs.writeFileSync(lockPath, String(process.pid));
  process.on("exit", () => {
    try {
      if (fs.readFileSync(lockPath, "utf8") === String(process.pid))
        fs.unlinkSync(lockPath);
    } catch {
      /* el lock viejo lo pisa el próximo proceso */
    }
  });
}

const globalForDb = globalThis as unknown as { __storeDb?: Promise<Db> };

/** La conexión (promesa compartida). Usar: `const db = await getDb()`. */
export function getDb(): Promise<Db> {
  globalForDb.__storeDb ??= connect();
  return globalForDb.__storeDb;
}

export { schema };
