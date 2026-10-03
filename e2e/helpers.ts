import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, type Page } from "@playwright/test";

/** Carpeta de datos del server de los E2E (playwright.config.ts). */
const DATA_DIR = process.env.E2E_REUSE === "1" ? (process.env.DATA_DIR ?? ".data") : ".data/e2e";

/** Mails que el server dejó en el outbox (sin RESEND_API_KEY). */
export function outbox(): string[] {
  try {
    return readdirSync(path.join(DATA_DIR, "outbox"));
  } catch {
    return [];
  }
}

export function readMail(file: string): string {
  return readFileSync(path.join(DATA_DIR, "outbox", file), "utf8");
}

/** Datos únicos por corrida (el seed ya trae clientes demo). */
export function uniqueCustomer(tag: string) {
  const n = `${Date.now()}`.slice(-7);
  return {
    name: `E2E ${tag} ${n}`,
    email: `e2e-${tag}-${n}@example.com`,
    phone: `223 ${n.slice(0, 3)}-${n.slice(3)}`,
  };
}

/** Agrega un producto al carrito desde su ficha y queda en /checkout. */
export async function addToCart(page: Page, slug: string) {
  await page.goto(`/catalogo/${slug}`);
  await page.getByRole("button", { name: "Agregar al carrito" }).click();
  await expect(page).toHaveURL(/\/checkout$/);
}

/** Completa "Tus datos" del carrito. */
export async function fillCheckoutData(page: Page, c: { name: string; email: string; phone: string }) {
  await page.locator("#co-name").fill(c.name);
  await page.locator("#co-phone").fill(c.phone);
  await page.locator("#co-email").fill(c.email);
}

/** Entra al admin con el PIN de desarrollo. */
export async function adminLogin(page: Page) {
  await page.goto("/admin/ingresar");
  await page.getByLabel("PIN de acceso").fill("000000");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/admin(\?|$)/);
}
