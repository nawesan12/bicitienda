/**
 * Captura un PNG por artboard del prototipo del handoff
 * (design_handoff_bicitienda_mdq/BiciTienda MDQ.dc.html) y, para las pantallas
 * interactivas, las variantes de estado que se pueden disparar con un click.
 *
 *   pnpm screens:prototype            # todo
 *   pnpm screens:prototype 2d 5b      # solo esos artboards (y sus variantes)
 *
 * Salida: docs/screens/prototype/<id>.png y <id>--<variante>.png
 * El screenshot es del .dv-card de cada artboard (sin la etiqueta del canvas),
 * a tamaño real (1440 / 390 px de ancho, deviceScaleFactor 1).
 *
 * Necesita red: las fotos son de Pexels y las fuentes de Google Fonts.
 */
import { createServer, type Server } from "node:http";
import { readFile, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { chromium, type Page } from "playwright";

const ROOT = path.resolve(__dirname, "../..");
const HANDOFF = path.join(ROOT, "design_handoff_bicitienda_mdq");
const OUT = path.join(ROOT, "docs/screens/prototype");
const CANVAS = "BiciTienda MDQ.dc.html";

const ARTBOARDS = [
  "2a", "2b", "2c", "2d", "2e", "2f", "2g", "2h", "2i",
  "3a", "3b", "3c", "3d", "3e", "3f",
  "4a", "4b", "4c", "4d", "4e", "4f", "4g", "4h", "4i",
  "5a", "5b", "5c", "5d",
];

/**
 * Variantes: `clicks` son textos exactos a clickear (en orden) dentro del
 * artboard `clickIn` (por defecto el mismo). El estado del prototipo es único
 * para todo el canvas (pay, svc, tab, selOrder, qSel, qKind...), así que un
 * click en 2d también cambia 4d: por eso cada variante recarga la página.
 */
type Variant = { id: string; name: string; clicks: string[]; clickIn?: string };
const VARIANTS: Variant[] = [
  // Carrito: medio de pago (default mp)
  { id: "2d", name: "transferencia", clicks: ["Transferencia · 10% off"] },
  { id: "2d", name: "efectivo", clicks: ["Efectivo en el local"] },
  { id: "4d", name: "transferencia", clicks: ["Transferencia · 10% off"] },
  { id: "4d", name: "efectivo", clicks: ["Efectivo en el local"] },
  // Turno: servicio asesoramiento + día sin horario elegido (default prueba, 8, 17:30)
  { id: "2f", name: "asesoramiento-dia9-sin-horario", clicks: ["Asesoramiento", "9"] },
  { id: "4e", name: "asesoramiento-dia9-sin-horario", clicks: ["Asesoramiento", "9"] },
  // Login: pestaña Crear cuenta (default Ingresar)
  { id: "2h", name: "registro", clicks: ["Crear cuenta"] },
  { id: "4g", name: "registro", clicks: ["Crear cuenta"] },
  // Admin pedidos: un pedido por estado (default #BT-10481 Transf. pendiente)
  { id: "3a", name: "pagado", clicks: ["#BT-10482"] },
  { id: "3a", name: "armando", clicks: ["#BT-10480"] },
  { id: "3a", name: "paga-en-local", clicks: ["#BT-10479"] },
  { id: "3a", name: "listo-para-retirar", clicks: ["#BT-10477"] },
  { id: "3a", name: "retirado", clicks: ["#BT-10471"] },
  // 4i avanza el estado del pedido seleccionado con el botón amarillo
  { id: "4i", name: "pagado", clicks: ["Validar transferencia"] },
  { id: "4i", name: "listo-para-retirar", clicks: ["Validar transferencia", "Pasar a armado", "Marcar lista para retirar"] },
  { id: "4i", name: "retirado", clicks: ["Validar transferencia", "Pasar a armado", "Marcar lista para retirar", "Marcar como retirada"] },
  // Admin turnos: turno sin confirmar + asesoramiento (default a9 Juan Pérez prueba)
  { id: "3b", name: "sin-confirmar", clicks: ["Laura Paz"] },
  { id: "3b", name: "asesoramiento", clicks: ["Valentina Ortiz"] },
  // Admin clientes: otro cliente (default Juan Pérez)
  { id: "3e", name: "con-turno-sin-pedidos", clicks: ["Ana Torres"] },
  // Presupuesto: cada tipo (default Producto importado)
  { id: "5a", name: "bicicleta", clicks: ["Bicicleta"] },
  { id: "5a", name: "repuesto", clicks: ["Repuesto"] },
  { id: "5a", name: "otra-consulta", clicks: ["Otra consulta"] },
  { id: "5d", name: "bicicleta", clicks: ["Bicicleta"] },
  { id: "5d", name: "repuesto", clicks: ["Repuesto"] },
  { id: "5d", name: "otra-consulta", clicks: ["Otra consulta"] },
  // Admin presupuestos: un presupuesto por estado (default #P-0213 Nuevo)
  { id: "5b", name: "cotizado", clicks: ["#P-0211"] },
  { id: "5b", name: "aceptado", clicks: ["#P-0210"] },
  { id: "5b", name: "pedido-creado", clicks: ["#P-0209"] },
  { id: "5b", name: "rechazado", clicks: ["#P-0208"] },
];

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".css": "text/css; charset=utf-8",
};

function serve(dir: string): Promise<{ server: Server; base: string }> {
  const server = createServer(async (req, res) => {
    try {
      const rel = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname);
      const file = path.join(dir, rel);
      if (!file.startsWith(dir)) throw new Error("fuera de la carpeta");
      const s = await stat(file);
      if (!s.isFile()) throw new Error("no es archivo");
      res.writeHead(200, { "content-type": MIME[path.extname(file)] ?? "application/octet-stream" });
      res.end(await readFile(file));
    } catch {
      res.writeHead(404).end("not found");
    }
  });
  return new Promise((resolve) =>
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      resolve({ server, base: `http://127.0.0.1:${port}/` });
    }),
  );
}

const card = (page: Page, id: string) => page.locator(`[id="${id}"] > .dv-card`).first();

async function load(page: Page, url: string) {
  await page.goto(url, { waitUntil: "networkidle", timeout: 120_000 });
  await page.waitForSelector('[id="2a"] .dv-card', { timeout: 60_000 });
  await page.evaluate(() => document.fonts.ready);
}

/** Fuerza la carga de las imágenes lazy y espera a que terminen. */
async function settle(page: Page, id: string) {
  const el = card(page, id);
  await el.scrollIntoViewIfNeeded();
  await el.evaluate(async (node) => {
    const imgs = Array.from(node.querySelectorAll("img"));
    imgs.forEach((i) => (i.loading = "eager"));
    await Promise.all(
      imgs.map((i) =>
        i.complete ? null : new Promise((r) => { i.onload = r; i.onerror = r; setTimeout(r, 20_000); }),
      ),
    );
  });
  await page.waitForTimeout(150);
}

async function clickText(page: Page, artboard: string, text: string) {
  const scope = page.locator(`[id="${artboard}"] > .dv-card`);
  const target = scope.getByText(text, { exact: true }).first();
  await target.click({ timeout: 10_000 });
  await page.waitForTimeout(120);
}

async function main() {
  const only = process.argv.slice(2);
  const ids = only.length ? ARTBOARDS.filter((a) => only.includes(a)) : ARTBOARDS;
  const variants = VARIANTS.filter((v) => ids.includes(v.id));

  await mkdir(OUT, { recursive: true });
  const { server, base } = await serve(HANDOFF);
  const url = base + encodeURIComponent(CANVAS);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 }, deviceScaleFactor: 1 });
  const written: string[] = [];
  const failed: string[] = [];

  try {
    await load(page, url);
    for (const id of ids) {
      const file = path.join(OUT, `${id}.png`);
      try {
        await settle(page, id);
        await card(page, id).screenshot({ path: file, animations: "disabled" });
        written.push(path.relative(ROOT, file));
      } catch (e) {
        failed.push(`${id}: ${(e as Error).message.split("\n")[0]}`);
      }
    }
    for (const v of variants) {
      const file = path.join(OUT, `${v.id}--${v.name}.png`);
      try {
        await load(page, url);
        await settle(page, v.id);
        for (const t of v.clicks) await clickText(page, v.clickIn ?? v.id, t);
        await settle(page, v.id);
        await card(page, v.id).screenshot({ path: file, animations: "disabled" });
        written.push(path.relative(ROOT, file));
      } catch (e) {
        failed.push(`${v.id}--${v.name}: ${(e as Error).message.split("\n")[0]}`);
      }
    }
  } finally {
    await browser.close();
    server.close();
  }

  console.log(`PNG escritos (${written.length}):\n  ` + written.join("\n  "));
  if (failed.length) {
    console.error(`Fallaron (${failed.length}):\n  ` + failed.join("\n  "));
    process.exitCode = 1;
  }
}

main();
