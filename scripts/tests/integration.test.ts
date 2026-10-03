/**
 * Tests de integración de la fase B0 contra una PGlite TEMPORAL (nunca la
 * de .data/ del proyecto):
 *
 *   pnpm test:integration
 *
 * Corre con `tsx --require ./scripts/tests/preload.cjs` (stubs de
 * next/cache y next/headers). Cada suite usa la lógica real de lib/server:
 * migraciones, seed, stock por variante, pedidos y su máquina de estados,
 * los tres medios de pago, turnos (disponibilidad y concurrencia),
 * cuentas y recupero, presupuestos → pedido, importación CSV/XLSX.
 */
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { deflateRawSync } from "node:zlib";

const ROOT = path.resolve(__dirname, "../..");
const MIGRATIONS = path.join(ROOT, "lib/server/db/migrations");
const TMP = mkdtempSync(path.join(tmpdir(), "bicitienda-test-"));
process.chdir(TMP); // .data/ (outbox, uploads privados) queda en el temporal

type Suite = { name: string; fn: () => Promise<void> };
const suites: Suite[] = [];
const test = (name: string, fn: () => Promise<void>) => suites.push({ name, fn });

/* eslint-disable @typescript-eslint/no-explicit-any */

async function main() {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const { eq, and, sql } = await import("drizzle-orm");
  const schema = await import("@/lib/server/db/schema");

  /* ── Migración con datos viejos (backfill de variantes) ─── */
  {
    const partial = path.join(TMP, "migrations-0008");
    cpSync(MIGRATIONS, partial, { recursive: true });
    const journalPath = path.join(partial, "meta/_journal.json");
    const journal = JSON.parse(readFileSync(journalPath, "utf8"));
    journal.entries = journal.entries.filter((e: { idx: number }) => e.idx <= 8);
    writeFileSync(journalPath, JSON.stringify(journal));
    rmSync(path.join(partial, "0009_bicitienda.sql"));
    const old = new PGlite();
    await migrate(drizzle(old), { migrationsFolder: partial });
    await old.exec(`
      INSERT INTO categories (slug, label, path_slug) VALUES ('c', 'C', 'c');
      INSERT INTO brands (id, name) VALUES ('b', 'B');
      INSERT INTO products (id, slug, name, brand_id, category, price, created_at) VALUES ('p1','p1','P1','b','c',100,'2026-01-01');
      INSERT INTO locations (id, name, short_name, address, hours) VALUES ('central','C','C','a','h');
      INSERT INTO product_stock (product_slug, location_id, qty) VALUES ('p1','central',4);
      INSERT INTO stock_movements (product_slug, location_id, delta, qty_after, reason) VALUES ('p1','central',4,4,'seed');
    `);
    await migrate(drizzle(old), { migrationsFolder: MIGRATIONS });
    const v = await old.query<{ id: string; sku: string }>("SELECT id, sku FROM product_variants");
    const s = await old.query<{ variant_id: string; qty: number }>("SELECT variant_id, qty FROM product_stock");
    const m = await old.query<{ variant_id: string }>("SELECT variant_id FROM stock_movements");
    assert.deepEqual(v.rows, [{ id: "p1--u", sku: "P1-U" }]);
    assert.deepEqual(s.rows, [{ variant_id: "p1--u", qty: 4 }]);
    assert.equal(m.rows[0].variant_id, "p1--u");
    await old.close();
    console.log("✔ migración 0009 sobre datos existentes (backfill a variante Único)");
  }

  /* ── Migración 0012 (taller): sale la prueba de bici ───────── */
  {
    const partial = path.join(TMP, "migrations-0011");
    cpSync(MIGRATIONS, partial, { recursive: true });
    const journalPath = path.join(partial, "meta/_journal.json");
    const journal = JSON.parse(readFileSync(journalPath, "utf8"));
    journal.entries = journal.entries.filter((e: { idx: number }) => e.idx <= 11);
    writeFileSync(journalPath, JSON.stringify(journal));
    rmSync(path.join(partial, "0012_taller.sql"));
    const old = new PGlite();
    await migrate(drizzle(old), { migrationsFolder: partial });
    await old.exec(`
      INSERT INTO appointment_services (id, name, allows_product, active, "order") VALUES
        ('prueba', 'Prueba de bici', true, true, 0), ('asesoramiento', 'Asesoramiento', false, true, 1);
      INSERT INTO categories (slug, label, path_slug) VALUES ('c', 'C', 'c');
      INSERT INTO brands (id, name) VALUES ('b', 'B');
      INSERT INTO products (id, slug, name, brand_id, category, price, created_at, test_ride) VALUES ('p1','p1','P1','b','c',100,'2026-01-01',true);
    `);
    await migrate(drizzle(old), { migrationsFolder: MIGRATIONS });
    const svc = await old.query<{ id: string; active: boolean; order: number; allows_product: boolean }>(
      `SELECT id, active, "order", allows_product FROM appointment_services ORDER BY "order", id`,
    );
    assert.deepEqual(svc.rows, [
      { id: "reparacion", active: true, order: 0, allows_product: false },
      { id: "asesoramiento", active: true, order: 1, allows_product: false },
      { id: "prueba", active: false, order: 2, allows_product: false },
    ]);
    const tr = await old.query<{ test_ride: boolean }>("SELECT test_ride FROM products");
    assert.deepEqual(tr.rows, [{ test_ride: false }]);
    await old.close();
    console.log("✔ migración 0012: prueba inactiva, reparación primero, sin test_ride");
  }

  /* ── Seed con la operación demo del prototipo ────────────── */
  {
    const demoClient = new PGlite();
    const demoDb = drizzle(demoClient, { schema });
    await migrate(demoDb, { migrationsFolder: MIGRATIONS });
    const { runSeed } = await import("@/lib/server/seed");
    const first = await runSeed(demoDb as any);
    assert.ok(first.demo, "base nueva: carga la demo");
    assert.equal(first.demo.orders, 9);
    assert.equal(first.demo.quotes, 6);
    assert.ok(first.demo.appointments >= 6);
    // Idempotente: con clientes cargados no vuelve a sembrar la demo.
    const again = await runSeed(demoDb as any);
    assert.equal(again.demo, null);
    const q = async <T,>(text: string) => (await demoClient.query<T>(text)).rows;
    // Todos los estados de pedido y de presupuesto del prototipo.
    const st = (await q<{ status: string }>("SELECT DISTINCT status FROM orders")).map((r) => r.status).sort();
    assert.deepEqual(st, ["CANCELADO", "EN_PREPARACION", "LISTO_RETIRO", "PAGADO", "PENDIENTE_PAGO", "RETIRADO"]);
    const qs = (await q<{ status: string }>("SELECT DISTINCT status FROM quote_requests")).map((r) => r.status);
    assert.equal(qs.length, 5);
    // El stock disponible es el del prototipo (3c) aunque haya reservas.
    const [g] = await q<{ qty: number }>("SELECT qty FROM product_stock WHERE variant_id = 'gravel-700c-2x9-vel--l'");
    assert.equal(g.qty, 0);
    const [m] = await q<{ n: number }>(
      "SELECT sum(qty)::int AS n FROM product_stock WHERE product_slug = 'mtb-rodado-29-21-vel-aluminio' AND variant_id LIKE '%--m-%'",
    );
    assert.equal(m.n, 3);
    // Cuenta demo enlazada a sus pedidos; numeración sigue después de la demo.
    const [acct] = await q<{ n: number }>(
      "SELECT count(*)::int AS n FROM orders o JOIN customer_accounts a ON a.id = o.account_id WHERE a.email = 'juanperez@gmail.com'",
    );
    assert.equal(acct.n, 2);
    const [c] = await q<{ value: number }>("SELECT value FROM counters WHERE id = 'order_number'");
    assert.equal(c.value, 10482);
    // Sábado solo a la mañana.
    const sat = await q<{ end_time: string }>("SELECT end_time FROM schedule_rules WHERE weekday = 6");
    assert.deepEqual(sat.map((r) => r.end_time), ["13:00"]);
    await demoClient.close();
    console.log("✔ seed demo: pedidos, turnos, presupuestos, stock y cuenta demo (idempotente)");
  }

  /* ── Base de los tests: migrada y sembrada (sin la demo) ──── */
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS });
  (globalThis as any).__storeDb = Promise.resolve(db);
  const { runSeed } = await import("@/lib/server/seed");
  await runSeed(db as any, { demo: false });
  // Idempotente.
  await runSeed(db as any, { demo: false });

  const stock = await import("@/lib/server/stock");
  const variants = await import("@/lib/server/variants");
  const orders = await import("@/lib/server/orders");
  const payments = await import("@/lib/server/payments");
  const flow = await import("@/lib/order-flow");
  const appts = await import("@/lib/server/appointments");
  const accounts = await import("@/lib/server/accounts");
  const accountActions = await import("@/lib/server/actions/account");
  const quotes = await import("@/lib/server/quotes");
  const importer = await import("@/lib/server/product-import");
  const receipt = await import("@/lib/server/actions/transfer-receipt");
  const waT = await import("@/lib/wa-templates");
  const waS = await import("@/lib/server/whatsapp-templates");
  const zoned = await import("@/lib/zoned-time");
  const phone = await import("@/lib/phone");
  const { store } = await import("@/lib/config");
  const cookies: Map<string, string> = (globalThis as any).__testCookies ?? new Map();
  (globalThis as any).__testCookies = cookies;

  const LOC = store.locations[0].id;
  const TZ = store.timeZone;

  // Producto de prueba con talles: MTB S/M/L.
  // (El seed ya trae la categoría MTB: el insert es por si cambia.)
  await db
    .insert(schema.categories)
    .values({ slug: "mtb", label: "MTB", pathSlug: "mtb", parentSlug: null })
    .onConflictDoNothing();
  await db.insert(schema.brands).values({ id: "venzo", name: "Venzo" }).onConflictDoNothing();
  await db.insert(schema.products).values({
    id: "mtb-29",
    slug: "mtb-29",
    name: "MTB rodado 29",
    brandId: "venzo",
    category: "mtb",
    price: 489900,
    sku: "MTB29",
    rodado: "29",
    createdAt: "2026-10-01",
  });
  const vS = await variants.createVariant(db as any, "mtb-29", { size: "S", heightRange: "1,55 – 1,65 m" });
  const vM = await variants.createVariant(db as any, "mtb-29", { size: "M", color: "Negro/amarillo" });
  const vL = await variants.createVariant(db as any, "mtb-29", { size: "L" });
  for (const [v, q] of [[vS, 1], [vM, 20], [vL, 2]] as const)
    await stock.setStockLevel(db as any, { variantId: v.id, locationId: LOC, qty: q });

  const qty = (variantId: string) => stock.qtyAt(db as any, variantId, LOC);
  const order = async (id: string) =>
    (await db.select().from(schema.orders).where(eq(schema.orders.id, id)))[0];
  const orderByNumber = async (n: string) =>
    (await db.select().from(schema.orders).where(eq(schema.orders.number, n)))[0];
  const checkout = (over: Partial<Parameters<typeof orders.createOrder>[0]> = {}) =>
    orders.createOrder({
      items: [{ productSlug: "mtb-29", variantId: vM.id, quantity: 1 }],
      name: "Juan Pérez",
      phone: "223 555-0182",
      email: "juan@example.com",
      deliveryMethod: "retiro",
      paymentMethod: "transferencia",
      ...over,
    });

  /* ── Teléfonos y zona horaria ─────────────────────────────── */
  test("teléfonos AR normalizados", async () => {
    assert.equal(phone.normalizeArPhone("223 555-0182"), "5492235550182");
    assert.equal(phone.normalizeArPhone("0223 15 555-0182"), "5492235550182");
    assert.equal(phone.normalizeArPhone("+54 9 223 555 0182"), "5492235550182");
    assert.equal(phone.normalizeArPhone("11 15 5555 0182"), "5491155550182");
    assert.equal(phone.normalizeArPhone("555-0182"), null);
    assert.equal(phone.formatArPhone("5492235550182"), "223 555-0182");
    const t = zoned.localToUtc("2026-10-08", "17:30", TZ);
    assert.equal(t.toISOString(), "2026-10-08T20:30:00.000Z");
    assert.equal(zoned.toLocalParts(t, TZ).time, "17:30");
  });

  /* ── Variantes y pedido ───────────────────────────────────── */
  test("pedido con variante descuenta el stock de ESA variante", async () => {
    const r = await checkout({ items: [{ productSlug: "mtb-29", variantId: vM.id, quantity: 2 }] });
    assert.ok(r.ok, JSON.stringify(r));
    assert.match(r.number, /^BT-10482$/);
    assert.equal(await qty(vM.id), 18);
    assert.equal(await qty(vS.id), 1);
    const o = await orderByNumber(r.number);
    const items = await db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, o.id));
    assert.equal(items[0].variantId, vM.id);
    assert.equal(items[0].variantLabel, "Talle M · Negro/amarillo");
    const [c] = await db.select().from(schema.customers).where(eq(schema.customers.id, o.customerId));
    assert.equal(c.phone, "5492235550182");
  });

  test("sin talle elegido o sin stock suficiente: falla sin dejar movimientos", async () => {
    const r1 = await checkout({ items: [{ productSlug: "mtb-29", quantity: 1 }] });
    assert.equal(r1.ok, false);
    assert.match((r1 as any).error, /talle/);
    const before = await db.select().from(schema.stockMovements);
    const r2 = await checkout({
      items: [
        { productSlug: "mtb-29", variantId: vL.id, quantity: 1 },
        { productSlug: "mtb-29", variantId: vS.id, quantity: 5 },
      ],
    });
    assert.equal(r2.ok, false);
    assert.equal(await qty(vL.id), 2, "la línea que sí entró se compensa");
    const after = await db.select().from(schema.stockMovements);
    const net = after.slice(before.length).reduce((s, m) => s + m.delta, 0);
    assert.equal(net, 0);
  });

  test("email opcional y WhatsApp obligatorio", async () => {
    const bad = await checkout({ phone: "123" });
    assert.equal(bad.ok, false);
    const r = await checkout({ email: null, phone: "2235550199", name: "Sin Mail" });
    assert.ok(r.ok);
    const o = await orderByNumber(r.number);
    const [c] = await db.select().from(schema.customers).where(eq(schema.customers.id, o.customerId));
    assert.equal(c.email, null);
    await orders.cancelOrder(o.id);
  });

  /* ── Pagos y máquina de estados ───────────────────────────── */
  test("transferencia: 10% off, reserva 24 h y máquina completa", async () => {
    const before = await qty(vM.id);
    const r = await checkout();
    assert.ok(r.ok);
    let o = await orderByNumber(r.number);
    assert.equal(o.discount, Math.round(489900 * 0.1));
    assert.equal(o.total, 489900 - Math.round(489900 * 0.1));
    const hours = (o.expiresAt!.getTime() - Date.now()) / 3600_000;
    assert.ok(hours > 23.9 && hours <= 24, `vence en ${hours} h`);
    assert.equal(flow.orderStageLabel(o), "Transf. pendiente");
    const steps = ["Validar transferencia", "Pasar a armado", "Marcar lista para retirar", "Marcar como retirada"];
    const stages = ["Pagado", "Armando", "Listo para retirar", "Retirado"];
    for (let i = 0; i < steps.length; i++) {
      assert.equal(flow.nextTransition(o)!.label, steps[i]);
      const res = await orders.advanceOrder(o.id, o.status);
      assert.ok(res.ok, JSON.stringify(res));
      o = await order(o.id);
      assert.equal(flow.orderStageLabel(o), stages[i]);
    }
    assert.equal((await orders.advanceOrder(o.id)).ok, false, "Retirado no avanza");
    assert.equal(o.paidAmount, o.total);
    const pays = await db.select().from(schema.payments).where(eq(schema.payments.orderId, o.id));
    assert.equal(pays.length, 1);
    assert.equal(await qty(vM.id), before - 1);
    assert.equal(await orders.cancelOrder(o.id), false, "Retirado no se cancela");
    const outbox = readdirSync(path.join(TMP, ".data/outbox"));
    assert.ok(outbox.includes(`${o.number}-listo.html`), "mail de listo para retirar");
  });

  test("doble clic: dos avances simultáneos solo avanzan uno", async () => {
    const r = await checkout();
    const o = await orderByNumber((r as any).number);
    const res = await Promise.all([orders.advanceOrder(o.id, "PENDIENTE_PAGO"), orders.advanceOrder(o.id, "PENDIENTE_PAGO")]);
    assert.equal(res.filter((x) => x.ok).length, 1);
    const pays = await db.select().from(schema.payments).where(eq(schema.payments.orderId, o.id));
    assert.equal(pays.length, 1, "un solo cobro");
    await orders.cancelOrder(o.id);
  });

  test("efectivo: Paga en local → Registrar pago y retiro → Retirado; vencimiento configurable", async () => {
    const r = await checkout({ paymentMethod: "efectivo" });
    assert.ok(r.ok);
    let o = await orderByNumber(r.number);
    assert.equal(o.expiresAt, null, "cashReservationHours null = no vence");
    assert.equal(o.discount, 0);
    assert.equal(flow.orderStageLabel(o), "Paga en local");
    assert.equal(flow.nextTransition(o)!.label, "Registrar pago y retiro");
    assert.ok((await orders.advanceOrder(o.id)).ok);
    o = await order(o.id);
    assert.equal(o.status, "RETIRADO");
    assert.equal(o.paidAmount, o.total);
    await db.update(schema.settings).set({ cashReservationHours: 48 });
    const r2 = await checkout({ paymentMethod: "efectivo" });
    const o2 = await orderByNumber((r2 as any).number);
    assert.ok(o2.expiresAt && Math.round((o2.expiresAt.getTime() - Date.now()) / 3600_000) === 48);
    await db.update(schema.settings).set({ cashReservationHours: null });
    await orders.cancelOrder(o2.id);
  });

  test("Mercado Pago: sandbox, cuotas reales del pago, webhook idempotente", async () => {
    const r = await checkout({ paymentMethod: "mercadopago" });
    assert.ok(r.ok);
    assert.match(r.redirect, /^\/checkout\/pago-simulado\?order=/);
    let o = await orderByNumber(r.number);
    assert.equal(o.discount, 0);
    assert.ok(o.expiresAt, "el pago online pendiente también vence");
    assert.equal(flow.nextTransition(o), null, "MP pendiente no tiene botón");
    const pay = { provider: "mp" as const, providerPaymentId: "mp-1", status: "approved" as const, amount: o.total, orderNumber: o.number, installments: 6 };
    assert.deepEqual(await payments.applyPaymentResult(pay), { ok: true });
    assert.deepEqual(await payments.applyPaymentResult(pay), { ok: true, already: true });
    o = await order(o.id);
    assert.equal(o.status, "PAGADO");
    assert.equal(o.paidInstallments, 6, "cuotas reales del pago");
    assert.equal(flow.orderInstallments(o), 6);
    assert.equal(o.expiresAt, null);
  });

  test("CANCELADO devuelve el stock también de un pedido pagado", async () => {
    const before = await qty(vL.id);
    const r = await checkout({ items: [{ productSlug: "mtb-29", variantId: vL.id, quantity: 1 }], paymentMethod: "transferencia" });
    const o = await orderByNumber((r as any).number);
    await orders.advanceOrder(o.id); // Pagado
    await orders.advanceOrder(o.id); // Armando
    assert.equal(await qty(vL.id), before - 1);
    assert.equal(await orders.cancelOrder(o.id), true);
    assert.equal((await order(o.id)).status, "CANCELADO");
    assert.equal(await qty(vL.id), before);
    assert.equal(await orders.cancelOrder(o.id), false, "no cancela dos veces");
    assert.equal(await qty(vL.id), before, "ni devuelve dos veces");
  });

  test("reserva vencida devuelve stock; pago tardío de MP la reactiva", async () => {
    const before = await qty(vM.id);
    const r = await checkout({ paymentMethod: "mercadopago" });
    const o = await orderByNumber((r as any).number);
    await db.update(schema.orders).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(schema.orders.id, o.id));
    assert.equal(await orders.expireStaleOrders(), 1);
    assert.equal((await order(o.id)).status, "VENCIDO");
    assert.equal(await qty(vM.id), before);
    await payments.applyPaymentResult({ provider: "mp", providerPaymentId: "mp-late", status: "approved", amount: o.total, orderNumber: o.number, installments: 3 });
    assert.equal((await order(o.id)).status, "PAGADO");
    assert.equal(await qty(vM.id), before - 1);
    await orders.cancelOrder(o.id);
    assert.equal(await qty(vM.id), before, "el saldo neto vuelve exacto");
  });

  test("pago aprobado sobre un pedido CANCELADO: no se reactiva, queda evento y aviso", async () => {
    const before = await qty(vM.id);
    const r = await checkout({ paymentMethod: "mercadopago" });
    const o = await orderByNumber((r as any).number);
    assert.equal(await orders.cancelOrder(o.id), true);
    await payments.applyPaymentResult({ provider: "mp", providerPaymentId: "mp-cancelado", status: "approved", amount: o.total, orderNumber: o.number });
    const after = await order(o.id);
    assert.equal(after.status, "CANCELADO");
    assert.equal(await qty(vM.id), before, "no re-reserva stock");
    assert.ok(after.timeline.some((e: any) => /cancelado/.test(e.label) && e.key === "PAGO"));
    const leads = await db.select().from(schema.leads).where(eq(schema.leads.label, `Pago tardío — pedido ${o.number}`));
    assert.equal(leads.length, 1);
  });

  test("contadores del sidebar del admin", async () => {
    const { getAdminNavCounts } = await import("@/lib/server/admin-queries");
    const c = await getAdminNavCounts();
    for (const k of ["ordersToAct", "appointmentsWeek", "quotesNew", "products", "leads"] as const)
      assert.equal(typeof c[k], "number", k);
    assert.ok(c.products > 0);
  });

  test("sandbox de pago: nunca en un deploy de producción", async () => {
    const { isPaymentSandboxAllowed } = await import("@/lib/server/payment-availability");
    const env = process.env as Record<string, string | undefined>;
    const prev = { NODE_ENV: env.NODE_ENV, PAYMENT_SANDBOX: env.PAYMENT_SANDBOX, VERCEL_ENV: env.VERCEL_ENV };
    try {
      env.NODE_ENV = "production";
      env.PAYMENT_SANDBOX = "1";
      env.VERCEL_ENV = undefined;
      assert.equal(isPaymentSandboxAllowed(), true, "build local con PAYMENT_SANDBOX=1");
      env.VERCEL_ENV = "production";
      assert.equal(isPaymentSandboxAllowed(), false);
    } finally {
      for (const [k, v] of Object.entries(prev)) {
        if (v === undefined) delete env[k];
        else env[k] = v;
      }
    }
  });

  test("comprobante de transferencia: validación de pedido + contacto, imagen o PDF", async () => {
    const r = await checkout({ email: "lucia@example.com", phone: "2235550144", name: "Lucía Gómez" });
    const o = await orderByNumber((r as any).number);
    const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64)]);
    const form = (contact: string, bytes: Buffer, name = "c.png") => {
      const f = new FormData();
      f.set("number", o.number.replace("BT-", "")); // sin prefijo también vale
      f.set("contact", contact);
      f.set("file", new File([new Uint8Array(bytes)], name));
      return f;
    };
    const wrong = await receipt.uploadTransferReceipt(form("otro@example.com", png));
    assert.equal(wrong.ok, false);
    const txt = await receipt.uploadTransferReceipt(form("lucia@example.com", Buffer.from("hola")));
    assert.equal(txt.ok, false);
    const big = await receipt.uploadTransferReceipt(form("lucia@example.com", Buffer.alloc(7 * 1024 * 1024)));
    assert.equal(big.ok, false);
    const okPhone = await receipt.uploadTransferReceipt(form("223 555-0144", png));
    assert.ok(okPhone.ok, JSON.stringify(okPhone));
    const pdf = await receipt.uploadTransferReceipt(form("lucia@example.com", Buffer.from("%PDF-1.4 test"), "c.pdf"));
    assert.ok(pdf.ok);
    const url = (await order(o.id)).transferReceiptUrl!;
    assert.match(url, /^\/admin\/archivos\/comprobantes\/[a-f0-9]{32}\.pdf$/);
    await orders.cancelOrder(o.id);
  });

  /* ── Turnos ───────────────────────────────────────────────── */
  const today = zoned.toLocalParts(new Date(), TZ).date;
  /** Próxima fecha local con ese día de semana, al menos `minDays` adelante. */
  const nextWeekday = (wd: number, minDays = 2) => {
    for (let i = minDays; i < minDays + 8; i++) {
      const d = zoned.addDays(today, i);
      if (zoned.weekdayOf(d) === wd) return d;
    }
    throw new Error("sin fecha");
  };

  test("disponibilidad: reglas, sábado sin tarde, domingo cerrado, bloqueos, anticipación y horizonte", async () => {
    const mon = nextWeekday(1);
    const sat = nextWeekday(6);
    const sun = nextWeekday(0);
    const { days } = await appts.getAvailability({ from: today, days: 31 });
    const day = (d: string) => days.find((x) => x.date === d)!;
    assert.deepEqual(day(mon).slots.map((s) => s.time), [
      "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
      "16:00", "16:30", "17:00", "17:30", "18:00", "18:30",
    ]);
    assert.deepEqual(day(sat).slots.map((s) => s.time), ["10:00", "10:30", "11:00", "11:30", "12:00", "12:30"]);
    assert.equal(day(sun).open, false);
    await appts.blockSchedule({ date: mon, from: "16:00", to: "17:00", reason: "Trámite" });
    const after = (await appts.getAvailability({ from: mon, days: 1 })).days[0];
    assert.deepEqual(after.slots.filter((s) => s.state === "bloqueado").map((s) => s.time), ["16:00", "16:30"]);
    // Anticipación: con "ahora" = el lunes 11:15, 12:30 todavía no (120 min) y 13:30… no hay; 16:00 bloqueado.
    const now = zoned.localToUtc(mon, "11:15", TZ);
    const withNow = (await appts.getAvailability({ from: mon, days: 1, now })).days[0];
    const state = (t: string) => withNow.slots.find((s) => s.time === t)!.state;
    assert.equal(state("11:00"), "pasado");
    assert.equal(state("12:30"), "anticipacion");
    assert.equal(state("17:00"), "libre");
    // Horizonte: más de 30 días → fuera de rango.
    const far = (await appts.getAvailability({ from: zoned.addDays(today, 31), days: 7 })).days;
    assert.ok(far.every((d) => d.slots.every((s) => s.state === "fuera_de_rango")));
  });

  test("dos reservas simultáneas al mismo slot: una falla", async () => {
    const tue = nextWeekday(2);
    const book = (name: string, ph: string) =>
      appts.createAppointment({ serviceId: "reparacion", date: tue, time: "10:30", name, phone: ph, source: "web", note: "Frenos que no frenan · MTB R29" });
    const res = await Promise.allSettled([book("Ana Torres", "2235550107"), book("Ramiro Luna", "2235550114")]);
    assert.equal(res.filter((r) => r.status === "fulfilled").length, 1);
    const rejected = res.find((r) => r.status === "rejected") as PromiseRejectedResult;
    assert.equal(rejected.reason.code, "SLOT");
    const slot = (await appts.getAvailability({ from: tue, days: 1 })).days[0].slots.find((s) => s.time === "10:30")!;
    assert.equal(slot.state, "ocupado");
    // Con capacidad 2 entra el segundo.
    await db.update(schema.settings).set({ slotCapacity: 2 });
    const second = await book("Ramiro Luna", "2235550114");
    assert.equal(second.status, "confirmado");
    await db.update(schema.settings).set({ slotCapacity: 1 });
  });

  test("taller: la prueba inactiva no se reserva por web; el producto se ignora", async () => {
    // Base vieja: la fila "prueba" queda inactiva (la 0012 no la borra).
    await db
      .insert(schema.appointmentServices)
      .values({ id: "prueba", name: "Prueba de bici", allowsProduct: true, active: false, order: 2 })
      .onConflictDoUpdate({ target: schema.appointmentServices.id, set: { active: false } });
    const thu = nextWeekday(4);
    await assert.rejects(
      appts.createAppointment({ serviceId: "prueba", date: thu, time: "10:00", name: "Ana Torres", phone: "2235550107", source: "web", productSlug: "mtb-29", variantId: vM.id }),
      (e: any) => e.code === "SERVICE",
    );
    const active = (await appts.getAppointmentServices({ activeOnly: true })).map((s) => s.id);
    assert.deepEqual(active, ["reparacion", "asesoramiento"]);
    // Reparación: aunque llegue un producto (UI vieja), el turno no lo guarda.
    const a = await appts.createAppointment({ serviceId: "reparacion", date: thu, time: "10:00", name: "Ana Torres", phone: "2235550107", source: "web", note: "Pinchadura trasera", productSlug: "mtb-29", variantId: vM.id });
    const [row] = await db.select().from(schema.appointments).where(eq(schema.appointments.id, a.id));
    assert.equal(row.productSlug, null);
    assert.equal(row.variantId, null);
    await appts.cancelAppointment(a.id, "admin");
  });

  test("turno: fuera de agenda falla; reprogramar y cancelar por el cliente; Vino/No vino; link sin cuenta", async () => {
    const wed = nextWeekday(3);
    const sun = nextWeekday(0);
    await assert.rejects(
      appts.createAppointment({ serviceId: "asesoramiento", date: sun, time: "10:00", name: "X Y", phone: "2235550100", source: "web" }),
      (e: any) => e.code === "SLOT",
    );
    const a = await appts.createAppointment({ serviceId: "asesoramiento", date: wed, time: "17:00", name: "Marta Ríos", phone: "2235550128", email: "marta@example.com", note: "Bici para su hijo", source: "web" });
    assert.match(a.number, /^T-\d{4}$/);
    assert.ok(readdirSync(path.join(TMP, ".data/outbox")).includes(`turno-${a.number}.html`), "mail de turno confirmado");
    const moved = await appts.rescheduleAppointment(a.id, { date: wed, time: "18:00" }, "cliente");
    const [old] = await db.select().from(schema.appointments).where(eq(schema.appointments.id, a.id));
    assert.equal(old.status, "reprogramado");
    assert.equal(moved.rescheduledFromId, a.id);
    const day = (await appts.getAvailability({ from: wed, days: 1 })).days[0];
    assert.equal(day.slots.find((s) => s.time === "17:00")!.state, "libre", "liberó el viejo");
    assert.equal(day.slots.find((s) => s.time === "18:00")!.state, "ocupado");
    const guest = await appts.getAppointmentForGuest(a.number, a.manageToken);
    assert.equal(guest!.appointment.id, moved.id, "el link viejo lleva al turno vigente");
    assert.equal(await appts.getAppointmentForGuest(a.number, "mal"), null);
    // Anticipación: "ahora" 1 h antes del turno → el cliente no puede.
    const near = new Date(moved.startsAt.getTime() - 60 * 60_000);
    await assert.rejects(appts.cancelAppointment(moved.id, "cliente", { now: near }), (e: any) => e.code === "TOO_LATE");
    const cancelled = await appts.cancelAppointment(moved.id, "cliente");
    assert.equal(cancelled.status, "cancelado");
    // Admin: manual fuera de la agenda + Vino.
    const manual = await appts.createAppointment({ serviceId: "reparacion", date: sun, time: "11:00", name: "Hernán Costa", phone: "2235550191", source: "manual" });
    assert.equal(manual.status, "confirmado");
    assert.equal((await appts.markAttendance(manual.id, true)).status, "asistio");
    await assert.rejects(appts.markAttendance(manual.id, false), (e: any) => e.code === "STATE");
    const wa = await waS.appointmentWhatsApp(manual.id);
    assert.match(wa!.url, /^https:\/\/wa\.me\/5492235550191\?text=/);
    assert.match(wa!.text, /Hernán/);
  });

  /* ── Cuentas ──────────────────────────────────────────────── */
  test("cuenta: registro vincula lo previo, login, recupero de un solo uso", async () => {
    // Pedido previo como invitado con el mismo WhatsApp y sin email.
    const prev = await checkout({ name: "Sofía Díaz", phone: "223 555-0163", email: null, paymentMethod: "efectivo" });
    const reg = await accountActions.registerAccount({ name: "Sofía Díaz", phone: "2235550163", email: "Sofi@Example.com", password: "clave-segura-1" });
    assert.ok(reg.ok, JSON.stringify(reg));
    assert.equal((reg as any).linked, 1);
    assert.ok(cookies.get("customer_session"), "deja la cookie de cliente");
    assert.equal(cookies.has("admin_session"), false);
    const me = await accountActions.getMyAccount();
    assert.equal(me!.email, "sofi@example.com");
    const { getMyOrders } = await import("@/lib/server/account-queries");
    const mine = await getMyOrders();
    assert.deepEqual(mine!.map((o) => o.order.number), [(prev as any).number]);
    const dup = await accountActions.registerAccount({ name: "Otra", phone: "2235550999", email: "sofi@example.com", password: "clave-segura-2" });
    assert.equal(dup.ok, false);
    assert.equal((await accountActions.loginAccount({ email: "sofi@example.com", password: "mal-mal-mal" })).ok, false);
    assert.ok((await accountActions.loginAccount({ email: "SOFI@example.com", password: "clave-segura-1" })).ok);
    const oldCookie = cookies.get("customer_session")!;

    // Recupero por mail (outbox) y token de un solo uso.
    assert.deepEqual(await accountActions.requestPasswordReset({ email: "sofi@example.com" }), { ok: true });
    assert.deepEqual(await accountActions.requestPasswordReset({ email: "nadie@example.com" }), { ok: true }, "sin enumeración");
    const mail = readFileSync(path.join(TMP, ".data/outbox/reset-sofi_example_com.html"), "utf8");
    const token = decodeURIComponent(/token=([A-Za-z0-9_%-]+)/.exec(mail)![1]);
    assert.ok((await accountActions.checkResetToken(token)).valid);
    const reset = await accountActions.resetPassword({ token, password: "nueva-clave-99" });
    assert.ok(reset.ok, JSON.stringify(reset));
    const reused = await accountActions.resetPassword({ token, password: "otra-clave-99" });
    assert.equal(reused.ok, false, "token reusado falla");
    assert.equal((await accountActions.checkResetToken(token)).valid, false);
    // La sesión vieja quedó revocada (sessionVersion).
    cookies.set("customer_session", oldCookie);
    assert.equal(await accountActions.getMyAccount(), null);
    await accountActions.loginAccount({ email: "sofi@example.com", password: "nueva-clave-99" });
    assert.ok(await accountActions.getMyAccount());
    // Token vencido.
    const t2 = await accounts.createPasswordReset("sofi@example.com");
    await db.update(schema.passwordResets).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(schema.passwordResets.accountId, t2!.account.id));
    await assert.rejects(accounts.consumePasswordReset(t2!.token, "x-clave-123"), (e: any) => e.code === "TOKEN");
    await accountActions.logoutAccount();
    assert.equal(cookies.has("customer_session"), false);
  });

  /* ── Presupuestos ─────────────────────────────────────────── */
  test("presupuesto → cotizado → aceptado → pedido con las líneas", async () => {
    await assert.rejects(quotes.createQuoteRequest({ kind: "imp", detail: "corto", name: "Lu B", phone: "2235550144" }));
    await assert.rejects(quotes.createQuoteRequest({ kind: "imp", detail: "Busco un rodillo smart para Zwift", name: "Lu B", phone: "555" }));
    const q = await quotes.createQuoteRequest({ kind: "imp", detail: "Busco un rodillo smart compatible con Zwift, eje 12 mm.", forBike: "Ruta · eje 12 mm", budget: "Hasta $ 900.000", name: "Lucía Benítez", phone: "2235550145" });
    assert.equal(q.number, "P-0213");
    assert.equal((await quotes.advanceQuote(q.id)).ok, false, "sin ítems no se cotiza");
    await quotes.setQuoteLines(q.id, [
      { name: "Rodillo smart (importado)", price: 849000 },
      { name: "MTB rodado 29 · talle S", price: 489900, variantId: vS.id },
    ]);
    await quotes.updateQuote(q.id, { eta: "30 a 45 días", validUntil: "2026-10-08" });
    const sent = await quotes.advanceQuote(q.id);
    assert.ok(sent.ok && sent.status === "cotizado");
    assert.match((sent as any).whatsappUrl, /^https:\/\/wa\.me\/5492235550145\?text=/);
    assert.match(decodeURIComponent((sent as any).whatsappUrl), /Total: \$1\.338\.900/);
    assert.equal((await quotes.advanceQuote(q.id)).ok, true); // aceptado
    const sBefore = await qty(vS.id);
    const created = await Promise.all([quotes.advanceQuote(q.id), quotes.advanceQuote(q.id)]);
    assert.equal(created.filter((c) => c.ok).length, 1, "doble clic no crea dos pedidos");
    const ok = created.find((c) => c.ok) as any;
    const o = await orderByNumber(ok.orderNumber);
    const items = await db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, o.id));
    assert.equal(items.length, 2);
    assert.equal(items.find((i) => i.name.startsWith("Rodillo"))!.productSlug, null);
    assert.equal(o.total, 849000 + 489900);
    assert.equal(o.quoteId, q.id);
    assert.equal(await qty(vS.id), sBefore - 1, "la línea del catálogo reserva stock");
    const full = await quotes.getQuote(q.id);
    assert.equal(full!.quote.status, "pedido_creado");
    assert.equal(full!.quote.orderId, o.id);
    assert.equal(await quotes.rejectQuote(q.id), false, "cerrado no se rechaza");
    const q2 = await quotes.createQuoteRequest({ kind: "rep", detail: "Cadena y cassette 11v para Deore", name: "Martín Sosa", phone: "2235550161" });
    assert.equal(q2.number, "P-0214");
    assert.equal(await quotes.rejectQuote(q2.id), true);
  });

  /* ── Ajustes de pago (Ola 1 · G) ──────────────────────────── */
  const asAdmin = async <T,>(fn: () => Promise<T>): Promise<T> => {
    const { createSessionToken, sessionSecret, ADMIN_COOKIE } = await import("@/lib/server/admin-session");
    cookies.set(ADMIN_COOKIE, (await createSessionToken(sessionSecret()!)).token);
    try {
      return await fn();
    } finally {
      cookies.delete(ADMIN_COOKIE);
    }
  };
  const outboxFile = (name: string) => readFileSync(path.join(TMP, ".data/outbox", name), "utf8");
  const outboxHas = (name: string) => readdirSync(path.join(TMP, ".data/outbox")).includes(name);

  test("ajustes: CBU/titular/banco, efectivo y cuotas por patchSettings", async () => {
    const settingsActions = await import("@/lib/server/actions/settings");
    const { getStore } = await import("@/lib/server/queries");
    const { paymentOptions } = await import("@/lib/server/checkout-options");
    // Seed: placeholders "[… a confirmar]".
    let rt = await getStore();
    assert.equal(rt.transferCbu, "[CBU a confirmar]");
    assert.equal(rt.transferHolder, "[Titular a confirmar]");
    assert.equal(rt.transferBank, "[Banco a confirmar]");
    // Sin sesión de admin no guarda.
    await assert.rejects(settingsActions.patchSettings({ transferBank: "X" }));
    await asAdmin(async () => {
      const ok = await settingsActions.patchSettings({
        transferCbu: "0000003100 0123-4567 8901",
        transferHolder: "  BiciTienda MDQ SRL ",
        transferBank: "Banco Nación",
        maxInstallments: 3,
      });
      assert.deepEqual(ok, { ok: true });
      assert.equal((await settingsActions.patchSettings({ transferCbu: "123" })).ok, false, "CBU corto");
      assert.equal((await settingsActions.patchSettings({ maxInstallments: 0 })).ok, false, "cuotas ≥ 1");
      assert.equal((await settingsActions.patchSettings({ cashEnabled: "no" })).ok, false);
      assert.deepEqual(await settingsActions.patchSettings({ cashEnabled: false }), { ok: true });
    });
    rt = await getStore();
    assert.equal(rt.transferCbu, "0000003100012345678901", "sin espacios ni guiones");
    assert.equal(rt.transferHolder, "BiciTienda MDQ SRL");
    assert.equal(rt.transferBank, "Banco Nación");
    assert.equal(rt.maxInstallments, 3);
    assert.equal(rt.cashEnabled, false);
    const opts = paymentOptions(rt);
    assert.ok(!opts.some((o) => o.id === "efectivo"), "efectivo apagado no se ofrece");
    assert.match(opts.find((o) => o.id === "mercadopago")!.note, /Hasta 3 cuotas/);
    assert.equal((await checkout({ paymentMethod: "efectivo" })).ok, false, "efectivo apagado no se acepta");
    await asAdmin(() => settingsActions.patchSettings({ cashEnabled: true, maxInstallments: 6 }));
    assert.equal((await getStore()).cashEnabled, true);
  });

  test("mails: transferencia con datos bancarios y texto plano, cancelado, vencido", async () => {
    const r = await checkout({ email: "datos@example.com", phone: "2235550170" });
    assert.ok(r.ok);
    const n = (r as any).number as string;
    const html = outboxFile(`${n}-confirmacion.html`);
    assert.match(html, /0000003100012345678901/, "CBU desde Ajustes");
    assert.match(html, /BiciTienda MDQ SRL/);
    assert.match(html, /Banco Nación/);
    assert.match(html, /#comprobante/, "receiptUrl a la sección del comprobante");
    // Fuera de producción los links van al dev server (se siguen desde
    // .data/outbox); en producción nunca localhost.
    assert.match(html, /http:\/\/localhost:3100\/seguimiento\//, "links al dev server en desarrollo");
    {
      const { runtimeSiteUrl } = await import("@/lib/site");
      const env = process.env as Record<string, string | undefined>;
      const prev = { node: env.NODE_ENV, site: env.NEXT_PUBLIC_SITE_URL, dev: env.DEV_SITE_URL };
      try {
        env.NEXT_PUBLIC_SITE_URL = "";
        env.DEV_SITE_URL = "http://localhost:4000";
        assert.equal(runtimeSiteUrl(), "http://localhost:4000");
        env.NODE_ENV = "production";
        assert.equal(runtimeSiteUrl(), store.siteUrl, "producción sin NEXT_PUBLIC_SITE_URL: la pública");
        assert.doesNotMatch(runtimeSiteUrl(), /localhost/);
        env.NEXT_PUBLIC_SITE_URL = "https://otra.example/";
        assert.equal(runtimeSiteUrl(), "https://otra.example");
      } finally {
        env.NODE_ENV = prev.node;
        env.NEXT_PUBLIC_SITE_URL = prev.site;
        env.DEV_SITE_URL = prev.dev;
        if (prev.site === undefined) delete env.NEXT_PUBLIC_SITE_URL;
        if (prev.dev === undefined) delete env.DEV_SITE_URL;
        if (prev.node === undefined) delete env.NODE_ENV;
      }
    }
    const text = outboxFile(`${n}-confirmacion.txt`);
    assert.match(text, /0000003100012345678901/);
    assert.doesNotMatch(text, /<[a-z]/i, "texto plano sin HTML");
    // Variante aparte del nombre (talle en su propia línea).
    assert.match(html, /Talle M|M · Negro/);
    // Placeholder "[… a confirmar]": no se muestra.
    await db.update(schema.settings).set({ transferBank: "[Banco a confirmar]" });
    const r2 = await checkout({ email: "datos2@example.com", phone: "2235550171" });
    assert.doesNotMatch(outboxFile(`${(r2 as any).number}-confirmacion.html`), /Banco a confirmar/);
    await db.update(schema.settings).set({ transferBank: "Banco Nación" });
    // Cancelado desde el admin → mail; vencido → mail.
    const o2 = await orderByNumber((r2 as any).number);
    assert.equal(await orders.cancelOrder(o2.id), true);
    assert.match(outboxFile(`${o2.number}-cancelado.html`), /cancelad/i);
    const r3 = await checkout({ email: "vence@example.com", phone: "2235550172" });
    const o3 = await orderByNumber((r3 as any).number);
    await db.update(schema.orders).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(schema.orders.id, o3.id));
    await orders.expireStaleOrders();
    assert.ok(outboxHas(`${o3.number}-vencido.html`), "mail de reserva vencida");
    // Listo para retirar en efectivo: lo que falta pagar.
    const r4 = await checkout({ email: "listo@example.com", phone: "2235550173", paymentMethod: "efectivo" });
    const { sendOrderEmail } = await import("@/lib/server/mail");
    await sendOrderEmail((await orderByNumber((r4 as any).number)).id, "listo");
    assert.match(outboxFile(`${(r4 as any).number}-listo.txt`), /\$\s?[\d.]+/);
  });

  test("mails: turno reprogramado y cancelado por el local; presupuesto recibido y cotizado", async () => {
    const thu = nextWeekday(4);
    const a = await appts.createAppointment({ serviceId: "asesoramiento", date: thu, time: "10:00", name: "Pía Ruiz", phone: "2235550174", email: "pia@example.com", source: "web" });
    const moved = await appts.rescheduleAppointment(a.id, { date: thu, time: "11:30" }, "admin");
    const mv = outboxFile(`turno-${moved.number}.html`);
    assert.match(mv, /Turno reprogramado/);
    assert.match(mv, /10:00/, "muestra el horario anterior");
    assert.match(mv, /http:\/\/localhost:3100\/turnos\//, "link de gestión al dev server en desarrollo");
    await appts.cancelAppointment(moved.id, "admin", { reason: "feriado, el local está cerrado." });
    const cx = outboxFile(`turno-${moved.number}-cancelado.html`);
    assert.match(cx, /feriado/);
    assert.ok(outboxHas(`turno-${moved.number}-cancelado.txt`));

    const q = await quotes.createQuoteRequest({ kind: "imp", detail: "Rodillo smart para Zwift, eje pasante 12 mm.", name: "Carla Méndez", phone: "2235550175", email: "carla@example.com" });
    assert.match(outboxFile(`presupuesto-${q.number}-recibido.html`), /Producto importado/);
    await quotes.setQuoteLines(q.id, [{ name: "Rodillo smart directo 12 mm", price: 629900 }]);
    await quotes.updateQuote(q.id, { eta: "30 a 45 días", validUntil: "2026-10-08" });
    assert.ok((await quotes.advanceQuote(q.id)).ok);
    const sent = outboxFile(`presupuesto-${q.number}-cotizado.html`);
    assert.match(sent, /629\.900/);
    assert.match(sent, /8 oct/);
    // Sin email: no se manda nada (ni falla).
    const q2 = await quotes.createQuoteRequest({ kind: "rep", detail: "Pastillas de freno para Shimano MT200", name: "Sin Mail", phone: "2235550176" });
    assert.ok(!outboxHas(`presupuesto-${q2.number}-recibido.html`));
  });

  /* ── Plantillas de WhatsApp ───────────────────────────────── */
  test("plantillas de WhatsApp: render y pedido listo", async () => {
    assert.equal(
      waT.renderTemplate("¡Hola {nombre}! {dia} {hora} {número} {otro}", { nombre: "Ana", día: "lunes 5", hora: "10:00", número: "T-0001" }),
      "¡Hola Ana! lunes 5 10:00 T-0001 {otro}",
    );
    const r = await checkout({ name: "Diego Sosa", phone: "2235550190" });
    const o = await orderByNumber((r as any).number);
    const msg = await waS.orderReadyWhatsApp(o.id);
    assert.equal(msg!.text, `¡Diego, tu pedido #${o.number} ya está listo para retirar! Pasá a buscarlo con tu DNI.`);
    await waS.saveWhatsAppTemplate("pedido_listo", "Listo {número}");
    assert.equal((await waS.orderReadyWhatsApp(o.id))!.text, `Listo ${o.number}`);
    await waS.resetWhatsAppTemplate("pedido_listo");
    await orders.cancelOrder(o.id);
  });

  /* ── Importación ──────────────────────────────────────────── */
  test("importación CSV: errores por fila, sin escritura; luego idempotente", async () => {
    const bad = [
      "sku_producto;nombre;categoria;marca;precio;talle;color;stock",
      "CASCO-1;Casco urbano;mtb;Venzo;54.900;M;Negro;4",
      "CASCO-1;;;;;M;Negro;2",
      "LUZ-1;Kit luces;no-existe;;24900;;;12",
      "X;Mal SKU;mtb;;abc;;;1",
    ].join("\n");
    const pv = await importer.previewProductImport(Buffer.from(bad));
    assert.equal(pv.ok, false);
    const rows = [...new Set(pv.errors.map((e) => e.row))].sort();
    assert.deepEqual(rows, [3, 4, 5]);
    const productsBefore = (await db.select().from(schema.products)).length;
    const res = await importer.commitProductImport(Buffer.from(bad));
    assert.equal(res.ok, false);
    assert.equal((await db.select().from(schema.products)).length, productsBefore, "con errores no escribe nada");

    // "se_puede_probar" (planillas viejas) se ignora sin error, valga lo que valga.
    const good = [
      "﻿sku_producto;nombre;categoria;marca;precio;rodado;talle;color;altura;stock;se_puede_probar;estado",
      "CASCO-1;Casco urbano;mtb;Venzo;$ 54.900;;M/L;Negro;;4;tal vez;publicado",
      "CASCO-1;;;;;;S;Negro;;1;;",
      "LUZ-1;Kit luces USB;mtb;Genérica;24900;;;;;12;;",
      "MTB29;;;;499900;;M;Negro/amarillo;1,65 – 1,75 m;7;;",
    ].join("\r\n");
    const p1 = await importer.commitProductImport(Buffer.from(good));
    assert.ok(p1.ok, JSON.stringify(p1.errors));
    assert.deepEqual(p1.summary, { productsNew: 2, productsUpdated: 1, variantsNew: 3, variantsUpdated: 1, stockChanges: 4 });
    const [casco] = await db.select().from(schema.products).where(eq(schema.products.sku, "CASCO-1"));
    const cv = await db.select().from(schema.productVariants).where(and(eq(schema.productVariants.productSlug, casco.slug), eq(schema.productVariants.active, true)));
    assert.deepEqual(cv.map((v) => v.size).sort(), ["M/L", "S"]);
    assert.equal(await qty(cv.find((v) => v.size === "M/L")!.id), 4);
    const [mtb] = await db.select().from(schema.products).where(eq(schema.products.sku, "MTB29"));
    assert.equal(mtb.price, 499900);
    assert.equal(await qty(vM.id), 7);
    const [luz] = await db.select().from(schema.products).where(eq(schema.products.sku, "LUZ-1"));
    const lv = await db.select().from(schema.productVariants).where(eq(schema.productVariants.productSlug, luz.slug));
    assert.deepEqual(lv.map((v) => [v.size, v.sku]), [["Único", "LUZ-1-U"]]);

    const movesBefore = (await db.select().from(schema.stockMovements)).length;
    const p2 = await importer.commitProductImport(Buffer.from(good));
    assert.ok(p2.ok);
    assert.deepEqual(p2.summary, { productsNew: 0, productsUpdated: 0, variantsNew: 0, variantsUpdated: 0, stockChanges: 0 });
    assert.equal((await db.select().from(schema.stockMovements)).length, movesBefore, "re-import idempotente");
    const imp = await db.select().from(schema.stockMovements).where(eq(schema.stockMovements.reason, "importacion"));
    assert.equal(imp.length, 4);
  });

  test("importación XLSX (mismo formato)", async () => {
    const xlsx = buildXlsx([
      ["sku_producto", "nombre", "categoria", "precio", "talle", "stock"],
      ["REM-1", "Remera de ciclismo", "mtb", "42900", "L", "3"],
      ["REM-1", "", "", "", "XL", "1"],
    ]);
    const pv = await importer.previewProductImport(xlsx);
    assert.ok(pv.ok, JSON.stringify(pv.errors));
    assert.equal(pv.summary.variantsNew, 2);
    const done = await importer.commitProductImport(xlsx);
    assert.ok(done.ok);
    const [rem] = await db.select().from(schema.products).where(eq(schema.products.sku, "REM-1"));
    assert.equal(rem.price, 42900);
  });

  test("importación masiva (300 filas): en lote, slugs únicos, idempotente y la 'Único' vacía se desactiva", async () => {
    const rows = ["sku_producto;nombre;categoria;marca;precio;talle;color;stock"];
    let withStock = 0;
    for (let i = 0; i < 100; i++)
      for (const [j, t] of ["S", "M", "L"].entries()) {
        const n = (i + j) % 4;
        if (n) withStock++;
        rows.push(j === 0 ? `LOTE-${i};Lote ${i % 40};mtb;Marca lote ${i % 3};${1000 + i};${t};;${n}` : `LOTE-${i};;;;;${t};;${n}`);
      }
    const csv = Buffer.from(rows.join("\n"));
    const p1 = await importer.commitProductImport(csv);
    assert.ok(p1.ok, JSON.stringify(p1.errors));
    assert.deepEqual(p1.summary, { productsNew: 100, productsUpdated: 0, variantsNew: 300, variantsUpdated: 0, stockChanges: withStock });
    const lote = await client.query<{ slug: string }>("SELECT slug FROM products WHERE sku LIKE 'LOTE-%'");
    assert.equal(new Set(lote.rows.map((r) => r.slug)).size, 100);
    assert.ok(lote.rows.some((r) => r.slug === "lote-0-2") && lote.rows.some((r) => r.slug === "lote-0-3"));
    const [brands] = (await client.query<{ n: number }>("SELECT count(*)::int AS n FROM brands WHERE name LIKE 'Marca lote %'")).rows;
    assert.equal(brands.n, 3);
    const movesOf = async () =>
      (await client.query<{ n: number }>("SELECT count(*)::int AS n FROM stock_movements WHERE reason = 'importacion' AND product_slug LIKE 'lote-%'")).rows[0].n;
    assert.equal(await movesOf(), withStock);
    const [units] = (await client.query<{ n: number }>("SELECT sum(qty)::int AS n FROM product_stock WHERE product_slug LIKE 'lote-%'")).rows;
    assert.equal(units.n, rows.slice(1).reduce((s, r) => s + Number(r.split(";").pop()), 0));
    const p2 = await importer.commitProductImport(csv);
    assert.deepEqual(p2.summary, { productsNew: 0, productsUpdated: 0, variantsNew: 0, variantsUpdated: 0, stockChanges: 0 });
    assert.equal(await movesOf(), withStock, "re-import idempotente");

    // Sin talles → con talles: la "Único" vacía se desactiva; con stock queda.
    const head = "sku_producto;nombre;categoria;precio;talle;stock\n";
    assert.ok((await importer.commitProductImport(Buffer.from(`${head}UNI-1;Uni uno;mtb;100;;0\nUNI-2;Uni dos;mtb;100;;2`))).ok);
    assert.ok((await importer.commitProductImport(Buffer.from(`${head}UNI-1;;;;M;1\nUNI-2;;;;M;1`))).ok);
    const defs = await client.query<{ sku: string; active: boolean }>(
      "SELECT sku, active FROM product_variants WHERE sku IN ('UNI-1-U', 'UNI-2-U') ORDER BY sku",
    );
    assert.deepEqual(defs.rows, [{ sku: "UNI-1-U", active: false }, { sku: "UNI-2-U", active: true }]);
    await client.query("UPDATE products SET hidden = true WHERE sku LIKE 'LOTE-%' OR sku LIKE 'UNI-%'");
  });

  /* ── Cierre Ola 1 · core ──────────────────────────────────── */
  test("nombre del checkout: el pedido/turno guarda el suyo; la ficha se actualiza", async () => {
    const { getOrderById } = await import("@/lib/server/order-queries");
    const ph = "2235550401";
    const r1 = await checkout({ name: "Laura Gómez", phone: ph, email: "laura@example.com" });
    assert.ok(r1.ok, JSON.stringify(r1));
    const o1 = await orderByNumber((r1 as any).number);
    assert.equal(o1.customerName, "Laura Gómez");
    // Mismo WhatsApp, otro nombre y otro email (p. ej. la pareja).
    const r2 = await checkout({ name: "Martín Gómez", phone: ph, email: "martin@example.com" });
    const o2 = await orderByNumber((r2 as any).number);
    assert.equal(o2.customerId, o1.customerId, "una ficha por WhatsApp");
    assert.equal((await getOrderById(o1.id))!.customer.name, "Laura Gómez", "el pedido viejo no cambia de nombre");
    assert.equal((await getOrderById(o2.id))!.customer.name, "Martín Gómez");
    const [ficha] = await db.select().from(schema.customers).where(eq(schema.customers.id, o1.customerId));
    assert.equal(ficha.name, "Martín Gómez", "sin cuenta: manda el último dato");
    assert.equal(ficha.email, "martin@example.com", "email nuevo actualiza");
    // Sin email no pisa el que tenía.
    await checkout({ name: "Martín Gómez", phone: ph, email: "" });
    const [ficha2] = await db.select().from(schema.customers).where(eq(schema.customers.id, o1.customerId));
    assert.equal(ficha2.email, "martin@example.com");
    // Turno con el mismo WhatsApp: guarda su nombre y la vista lo usa.
    const a = await appts.createAppointment({ serviceId: "asesoramiento", date: nextWeekday(0), time: "12:30", name: "Laura G.", phone: ph, source: "manual" });
    assert.equal(a.customerName, "Laura G.");
    assert.equal((await appts.getAppointmentView(a.id))!.customer.name, "Laura G.");
    assert.equal((await getOrderById(o2.id))!.customer.name, "Martín Gómez");
    // Con cuenta vinculada: la cuenta manda nombre y email de la ficha.
    const reg = await accountActions.registerAccount({ name: "Carla Paz", phone: "2235550402", email: "carla@example.com", password: "clave-segura-9" });
    assert.ok(reg.ok, JSON.stringify(reg));
    const r3 = await checkout({ name: "Regalo para Carla", phone: "2235550402", email: "otro@example.com" });
    const o3 = await orderByNumber((r3 as any).number);
    const [carla] = await db.select().from(schema.customers).where(eq(schema.customers.id, o3.customerId));
    assert.equal(carla.name, "Carla Paz");
    assert.equal(carla.email, "carla@example.com");
    assert.equal((await getOrderById(o3.id))!.customer.name, "Regalo para Carla");
    for (const o of [o1, o2, o3]) await orders.cancelOrder(o.id);
    const rest = await db.select().from(schema.orders).where(and(eq(schema.orders.customerId, o1.customerId), eq(schema.orders.status, "PENDIENTE_PAGO")));
    for (const o of rest) await orders.cancelOrder(o.id);
    await appts.cancelAppointment(a.id, "admin");
  });

  test("cuotas reales de Mercado Pago: paidInstallments y 'Mercado Pago · 6 cuotas'", async () => {
    const { paymentText } = await import("@/lib/server/screens/admin-d1");
    const r = await checkout({ name: "Pablo Ruiz", phone: "2235550403" });
    const o = await orderByNumber((r as any).number);
    // El checkout con MP depende de features.payments.mp: se fuerza el medio.
    await db.update(schema.orders).set({ paymentMethod: "mercadopago" }).where(eq(schema.orders.id, o.id));
    const pay = await payments.applyPaymentResult({
      provider: "mp",
      providerPaymentId: `mp-test-${o.number}`,
      status: "approved",
      amount: o.total,
      orderNumber: o.number,
      installments: 6,
    });
    assert.ok(pay.ok);
    const after = await order(o.id);
    assert.equal(after.status, "PAGADO");
    assert.equal(after.paidInstallments, 6);
    assert.equal(after.installments, o.installments, "no pisa las cuotas del checkout (base del total)");
    assert.equal(flow.orderInstallments(after), 6);
    assert.equal(paymentText(after), "Mercado Pago · 6 cuotas");
    assert.equal(flow.orderInstallments({ installments: 3, paidInstallments: null }), 3);
    // Reintento del webhook: idempotente.
    const again = await payments.applyPaymentResult({
      provider: "mp", providerPaymentId: `mp-test-${o.number}`, status: "approved", amount: o.total, orderNumber: o.number, installments: 1,
    });
    assert.ok(again.already);
    assert.equal((await order(o.id)).paidInstallments, 6);
    await orders.cancelOrder(o.id);
  });

  test("importación: preview.rows cuenta todas las filas y junta todos los errores de una fila", async () => {
    const two = ["sku_producto;nombre;categoria;precio;stock", "PIN-1;Pinza;mtb;1000;1", "PIN-2;Pinza 2;mtb;2000;2"].join("\n");
    const ok2 = await importer.previewProductImport(Buffer.from(two));
    assert.ok(ok2.ok, JSON.stringify(ok2.errors));
    assert.equal(ok2.rows, 2);
    assert.equal(ok2.validRows, 2);
    // Fila 3 con tres errores: SKU, precio y stock. Las vacías no cuentan.
    const bad = ["sku_producto;nombre;categoria;precio;stock;estado", "PIN-1;Pinza;mtb;1000;1;", ";;;;;", "X;Pinza 2;mtb;abc;-3;vendido"].join("\n");
    const pv = await importer.previewProductImport(Buffer.from(bad));
    assert.equal(pv.ok, false);
    assert.equal(pv.rows, 2);
    assert.equal(pv.validRows, 1);
    const fields = pv.errors.filter((e) => e.row === 4).map((e) => e.field).sort();
    assert.deepEqual(fields, ["estado", "precio", "sku_producto", "stock"]);
    // XLSX con una fila vacía autocerrada en el medio (<row r="3"/>).
    const xlsx = buildXlsx([
      ["sku_producto", "nombre", "categoria", "precio"],
      ["PIN-1", "Pinza", "mtb", "1000"],
      [],
      ["PIN-2", "Pinza 2", "mtb", "2000"],
    ]);
    const px = await importer.previewProductImport(xlsx);
    assert.ok(px.ok, JSON.stringify(px.errors));
    assert.equal(px.rows, 2);
    assert.deepEqual(px.products.map((p) => p.sku).sort(), ["PIN-1", "PIN-2"]);
  });

  test("createProduct(null): primera categoría hoja, determinista", async () => {
    const productActions = await import("@/lib/server/actions/products");
    // Empate de `order` entre un padre y su hija (como bicicletas/mtb).
    const cats = await db.select().from(schema.categories);
    const parent = cats.find((c) => cats.some((x) => x.parentSlug === c.slug))!;
    const res: any = await asAdmin(() => productActions.createProduct(null));
    assert.ok(res.ok, JSON.stringify(res));
    const [p] = await db.select().from(schema.products).where(eq(schema.products.id, res.id));
    const chosen = cats.find((c) => c.slug === p.category)!;
    assert.ok(!cats.some((c) => c.parentSlug === chosen.slug), `"${chosen.slug}" es hoja`);
    assert.notEqual(chosen.slug, parent.slug);
    const res2: any = await asAdmin(() => productActions.createProduct(undefined));
    const [p2] = await db.select().from(schema.products).where(eq(schema.products.id, res2.id));
    assert.equal(p2.category, p.category, "siempre la misma");
    // Con la categoría pedida, esa.
    const res3: any = await asAdmin(() => productActions.createProduct(parent.slug));
    const [p3] = await db.select().from(schema.products).where(eq(schema.products.id, res3.id));
    assert.equal(p3.category, parent.slug);
    for (const id of [res.id, res2.id, res3.id])
      await db.update(schema.products).set({ hidden: true }).where(eq(schema.products.id, id));
  });

  test("admin en SQL: tablero de pedidos, Resumen, consultas y clientes", async () => {
    const d1 = await import("@/lib/server/screens/admin-d1");
    const aq = await import("@/lib/server/admin-queries");
    const { matchesLead, LEAD_FILTERS } = await import("@/app/admin/(panel)/consultas/filters");
    const [{ n: total }] = (await client.query<{ n: number }>("SELECT count(*)::int AS n FROM orders")).rows;
    assert.ok(total > 2);
    const all = await d1.getOrdersBoard({ filter: "todos", range: "todo", q: "" });
    assert.equal(all.counts.todos, total);
    assert.equal(all.rows.length, total);
    for (const f of d1.ORDER_FILTERS) {
      if (!f.pills) continue;
      assert.equal(all.counts[f.key], all.rows.filter((r) => f.pills!.includes(r.pill)).length, f.key);
      const only = await d1.getOrdersBoard({ filter: f.key, range: "todo", q: "" });
      assert.equal(only.rows.length, all.counts[f.key], f.key);
      assert.ok(only.rows.every((r) => f.pills!.includes(r.pill)), f.key);
    }
    // Búsqueda: número (con # y en minúsculas), ítem y WhatsApp.
    const one = all.rows.find((r) => r.itemsLabel)!;
    const byNumber = await d1.getOrdersBoard({ filter: "todos", range: "todo", q: `#${one.number.toLowerCase()}` });
    assert.deepEqual(byNumber.rows.map((r) => r.number), [one.number]);
    const word = one.itemsLabel.split(" · ")[0].replace(/^\d+× /, "").split(" ")[0];
    assert.ok((await d1.getOrdersBoard({ filter: "todos", range: "todo", q: word })).rows.some((r) => r.id === one.id));
    assert.ok((await d1.getOrdersBoard({ filter: "todos", range: "todo", q: one.phone.slice(-6) })).rows.some((r) => r.id === one.id));
    // Tope + "Ver más".
    const page = await d1.getOrdersBoard({ filter: "todos", range: "todo", q: "", limit: 2 });
    assert.deepEqual(page.rows.map((r) => r.id), all.rows.slice(0, 2).map((r) => r.id));
    assert.equal(page.hasMore, true);
    assert.equal(page.counts.todos, total);
    // Rango: los abiertos siempre; los cerrados viejos no.
    await client.query(`UPDATE orders SET created_at = now() - interval '40 days' WHERE id = '${all.rows[all.rows.length - 1].id}'`);
    const old = all.rows[all.rows.length - 1];
    const week = await d1.getOrdersBoard({ filter: "todos", range: "7", q: "" });
    assert.equal(week.rows.some((r) => r.id === old.id), old.open);
    // Resumen: solo los que piden acción.
    const res = await d1.getResumen();
    const actionable = all.rows.filter((r) => ["PENDIENTE_PAGO", "SEÑADO", "PAGADO", "EN_PREPARACION", "LISTO_RETIRO"].includes(r.status));
    assert.deepEqual(res.orders.map((r) => r.id).sort(), actionable.map((r) => r.id).sort());
    assert.equal(res.kpis.readyForPickup, all.rows.filter((r) => r.status === "LISTO_RETIRO").length);
    // Consultas: contadores y filtro en SQL = los de la pantalla.
    const leads = await db.select().from(schema.leads);
    const L = await aq.getLeads({ filter: "todas", limit: 1 });
    for (const [k] of LEAD_FILTERS) {
      assert.equal(L.counts[k], leads.filter((l) => matchesLead(l, k)).length, k);
      const f = await aq.getLeads({ filter: k, limit: 1000 });
      assert.equal(f.leads.length, L.counts[k], k);
    }
    assert.equal(L.leads.length, Math.min(1, leads.length));
    // Clientes: agregados por cliente.
    const customers = await aq.getAdminCustomers();
    assert.equal(customers.reduce((s, c) => s + c.ordersCount, 0), total);
    const card = customers.find((c) => c.ordersCount > 0)!;
    const mine = (await db.select().from(schema.orders).where(eq(schema.orders.customerId, card.id)));
    assert.equal(card.totalSpent, mine.filter((o) => !["CANCELADO", "VENCIDO"].includes(o.status)).reduce((s, o) => s + o.paidAmount, 0));
  });

  /* ── Correr ───────────────────────────────────────────────── */
  let failed = 0;
  for (const s of suites) {
    try {
      await s.fn();
      console.log(`✔ ${s.name}`);
    } catch (err) {
      failed++;
      console.error(`✘ ${s.name}\n`, err);
    }
  }
  void sql;
  await client.close();
  rmSync(TMP, { recursive: true, force: true });
  console.log(failed ? `\n${failed} suite(s) fallaron` : `\nTodo OK (${suites.length + 1} suites)`);
  process.exit(failed ? 1 : 0);
}

/** .xlsx mínimo (ZIP sin comprimir + inline strings) para el test. */
function buildXlsx(rows: string[][]): Buffer {
  const col = (i: number) => String.fromCharCode(65 + i);
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const sheet = `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows
    .map(
      (r, ri) =>
        !r.length ? `<row r="${ri + 1}" spans="1:4"/>` : `<row r="${ri + 1}">${r
          .map((v, ci) =>
            v === "" ? "" : /^\d+$/.test(v) ? `<c r="${col(ci)}${ri + 1}"><v>${v}</v></c>` : `<c r="${col(ci)}${ri + 1}" t="inlineStr"><is><t>${esc(v)}</t></is></c>`,
          )
          .join("")}</row>`,
    )
    .join("")}</sheetData></worksheet>`;
  const files: [string, string, boolean][] = [
    ["xl/workbook.xml", `<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Hoja1" sheetId="1" r:id="rId1"/></sheets></workbook>`, false],
    ["xl/_rels/workbook.xml.rels", `<Relationships><Relationship Id="rId1" Type="worksheet" Target="worksheets/sheet1.xml"/></Relationships>`, false],
    ["xl/worksheets/sheet1.xml", sheet, true],
  ];
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const [name, content, deflate] of files) {
    const raw = Buffer.from(content, "utf8");
    const data = deflate ? deflateRawSync(raw) : raw;
    const nameBuf = Buffer.from(name);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(deflate ? 8 : 0, 8);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    locals.push(local, nameBuf, data);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(deflate ? 8 : 0, 10);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuf);
    offset += 30 + nameBuf.length + data.length;
  }
  const cd = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(cd.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, eocd]);
}

main().catch((err) => {
  console.error(err);
  try {
    rmSync(TMP, { recursive: true, force: true });
  } catch {
    /* nada */
  }
  process.exit(1);
});
