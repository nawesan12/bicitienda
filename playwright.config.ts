import { defineConfig, devices } from "@playwright/test";

/**
 * E2E de BiciTienda (Ola 3): `pnpm test:e2e`.
 *
 * Levanta `next dev` en el puerto 3100 sobre una base PROPIA
 * (`DATA_DIR=.data/e2e`: PGlite, outbox de mails y archivos), recién
 * migrada y con el seed demo. Nunca toca `.data/pglite`. Como el dev server
 * es uno solo por proyecto, cerrá `pnpm dev` antes de correrlos.
 *
 * Los tests corren en serie (un solo worker): comparten la base y el
 * stock, y PGlite atiende un request a la vez.
 *
 * Chromium: usa el de Playwright; `PW_CHROMIUM` apunta a otro ejecutable
 * (p. ej. el preinstalado de un contenedor).
 */
export const E2E_DATA_DIR = ".data/e2e";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3100",
    locale: "es-AR",
    timezoneId: "America/Argentina/Buenos_Aires",
    trace: "retain-on-failure",
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } }],
  webServer: {
    command: `rm -rf ${E2E_DATA_DIR} && pnpm db:migrate && pnpm db:seed && next dev --port 3100`,
    env: { DATA_DIR: E2E_DATA_DIR },
    url: "http://localhost:3100/robots.txt",
    timeout: 240_000,
    reuseExistingServer: process.env.E2E_REUSE === "1",
    stdout: "ignore",
    stderr: "pipe",
  },
});
