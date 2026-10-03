import type { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import type { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { dataPath } from "../data-dir";
import * as schema from "./schema";

/**
 * Conexión a la base con switch de driver:
 *
 *   - `DATABASE_URL` postgres…  → Neon serverless por HTTP (producción).
 *   - sin `DATABASE_URL`        → PGlite embebido en `.data/pglite` (o `$DATA_DIR/pglite`; dev
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
  fs.mkdirSync(dataPath("pglite"), { recursive: true });
  acquirePgliteLock(fs);
  return drizzle(new PGlite(dataPath("pglite")), { schema });
}

/**
 * Lock de proceso para PGlite. Dos procesos sobre el mismo directorio de
 * datos lo CORROMPEN (PGlite no tiene protección multi-proceso): pasa al
 * correr `pnpm build` con `pnpm dev` abierto, o cualquier script suelto
 * con el server levantado. Mejor fallar ruidoso acá que perder la base.
 */
export function acquirePgliteLock(fs: typeof import("node:fs")) {
  const lockPath = dataPath("pglite.lock");
  try {
    const holder = Number(fs.readFileSync(lockPath, "utf8"));
    if (holder && holder !== process.pid) {
      try {
        process.kill(holder, 0); // ¿sigue vivo?
        throw new Error(
          `La base PGlite (${dataPath("pglite")}) ya está abierta por el proceso ${holder}. ` +
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

const MIGRATIONS_FOLDER = "lib/server/db/migrations";
const MIGRATIONS_JOURNAL = `${MIGRATIONS_FOLDER}/meta/_journal.json`;

/**
 * Migraciones pendientes sobre la PGlite local, SOLO en `next dev` sin
 * `DATABASE_URL` postgres (nunca toca Neon ni corre en build/producción;
 * los tests migran su base temporal ellos mismos). Con el dev server
 * abierto `pnpm db:migrate` no puede tomar el lock de PGlite (y abrirla dos
 * veces la corrompe), así que el propio server las aplica en el primer
 * request después de que cambia `meta/_journal.json` (una migración nueva).
 *
 * Seguridad:
 *   - Estado en globalThis (no en el módulo): Next puede evaluar este
 *     archivo en varias capas (RSC, route handlers, actions) y con HMR; todas
 *     comparten la misma corrida para la misma versión del journal.
 *   - Serializado: cada corrida se encadena a la anterior, así dos
 *     requests concurrentes nunca migran a la vez (si no, ambos leerían la
 *     misma "última migración" y el segundo fallaría con columnas
 *     duplicadas).
 *   - Idempotente: el migrator de drizzle salta las ya aplicadas.
 *   - Si falla, se loguea (no tumba el server) y se reintenta en el
 *     próximo request.
 */
type MigrationState = { key: string; done: Promise<void> };
const globalForMigrations = globalThis as unknown as { __storeDbMigrations?: MigrationState };

async function migrateLocal(db: Db): Promise<boolean> {
  try {
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    await migrate(db as ReturnType<typeof drizzlePglite<typeof schema>>, {
      migrationsFolder: MIGRATIONS_FOLDER,
    });
    return true;
  } catch (err) {
    // No tumbar el dev server: la query que falte columna lo va a decir.
    console.error("[db] no se pudieron aplicar las migraciones locales:", err);
    return false;
  }
}

async function ensureLocalMigrations(db: Db): Promise<void> {
  const { statSync } = await import("node:fs");
  let key: string;
  try {
    const st = statSync(MIGRATIONS_JOURNAL);
    key = `${st.mtimeMs}:${st.size}`;
  } catch {
    key = "sin-journal";
  }
  // Desde acá hasta asignar el estado no hay await: chequeo y alta atómicos.
  const prev = globalForMigrations.__storeDbMigrations;
  if (prev?.key === key) return prev.done;
  const state: MigrationState = {
    key,
    done: (prev?.done ?? Promise.resolve()).then(async () => {
      const ok = await migrateLocal(db);
      if (!ok && globalForMigrations.__storeDbMigrations === state)
        globalForMigrations.__storeDbMigrations = undefined;
    }),
  };
  globalForMigrations.__storeDbMigrations = state;
  return state.done;
}

/** La conexión (promesa compartida). Usar: `const db = await getDb()`. */
export function getDb(): Promise<Db> {
  globalForDb.__storeDb ??= connect();
  const db = globalForDb.__storeDb;
  const local = !process.env.DATABASE_URL?.startsWith("postgres");
  if (!local || process.env.NODE_ENV !== "development") return db;
  return db.then(async (conn) => {
    await ensureLocalMigrations(conn);
    return conn;
  });
}

export { schema };
