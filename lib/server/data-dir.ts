/**
 * Carpeta de los datos locales (sin credenciales): la PGlite, el outbox de
 * mails, las fotos subidas y los comprobantes. `.data/` por defecto;
 * `DATA_DIR` la pisa para que los E2E (`pnpm test:e2e`) corran sobre una
 * base propia sin tocar la de desarrollo.
 */
export const DATA_DIR = process.env.DATA_DIR || ".data";

/** `${DATA_DIR}/<sub>`, con barras normales. */
export function dataPath(sub: string): string {
  return `${DATA_DIR.replace(/\/+$/, "")}/${sub}`;
}
