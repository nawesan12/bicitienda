import { expect, test } from "@playwright/test";
import { addToCart, adminLogin, fillCheckoutData, outbox, uniqueCustomer } from "./helpers";

/**
 * Compra con retiro en el local, con los 3 medios de pago, y el pedido
 * en el admin. Mercado Pago pasa por el sandbox local
 * (/checkout/pago-simulado) porque los E2E corren sin credenciales.
 */

const PRODUCT = "kit-luces-delantera-trasera";

test("efectivo: reserva, confirmación y pedido en el admin", async ({ page }) => {
  const c = uniqueCustomer("efectivo");
  await addToCart(page, PRODUCT);
  await page.getByRole("radio", { name: /Efectivo en el local/ }).check();
  await fillCheckoutData(page, c);
  await page.getByRole("button", { name: "Reservar y pagar en el local" }).click();

  await expect(page).toHaveURL(/\/checkout\/confirmacion\/BT-\d+/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Reservado/i);
  await expect(page.getByText("Pagás al retirar.")).toBeVisible();
  const number = page.url().match(/BT-\d+/)![0];
  expect(outbox().some((f) => f.includes(number))).toBe(true);

  await adminLogin(page);
  await page.goto(`/admin/pedidos/${number}`);
  await expect(page.getByText(c.name).first()).toBeVisible();
});

test("transferencia: datos bancarios, 10% off y comprobante", async ({ page }) => {
  const c = uniqueCustomer("transfer");
  await addToCart(page, PRODUCT);
  await page.getByRole("radio", { name: /Transferencia/ }).check();
  await expect(page.getByText(/10% off/).first()).toBeVisible();
  await fillCheckoutData(page, c);
  await page.getByRole("button", { name: "Confirmar y ver datos bancarios" }).click();

  await expect(page).toHaveURL(/\/checkout\/confirmacion\/BT-\d+/);
  await expect(page.getByText("Falta pagar.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Datos para transferir" }).first()).toBeVisible();

  // Comprobante: un PNG mínimo.
  await page.locator('input[type="file"]:visible').first().setInputFiles({
    name: "comprobante.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    ),
  });
  await page.getByRole("button", { name: "Enviar comprobante" }).click();
  await expect(page.getByText("¡Listo! Recibimos el comprobante.")).toBeVisible();
});

test("Mercado Pago: sandbox, rechazo y aprobación", async ({ page }) => {
  const c = uniqueCustomer("mp");
  await addToCart(page, PRODUCT);
  await page.getByRole("radio", { name: /Mercado Pago/ }).check();
  await fillCheckoutData(page, c);
  await page.getByRole("button", { name: "Pagar con Mercado Pago" }).click();

  await expect(page).toHaveURL(/\/checkout\/pago-simulado/);
  await page.getByRole("button", { name: "Simular rechazo" }).click();
  await expect(page.getByText(/Pago rechazado \(simulado\)/)).toBeVisible();

  await page.getByRole("button", { name: /Aprobar pago de/ }).click();
  await expect(page).toHaveURL(/\/checkout\/confirmacion\/BT-\d+/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Listo/i);
  await expect(page.getByText("Pago aprobado").first()).toBeVisible();
});
