/**
 * Preview de los mails: renderiza cada plantilla de emails/ con datos de
 * ejemplo (los del prototipo, lib/data/demo) a docs/emails/<id>.html y
 * su texto plano a docs/emails/<id>.txt, y saca capturas con Playwright:
 *
 *   <id>.png          600 px, SIN webfonts (lo que ve Gmail/Outlook)
 *   <id>.invert.png   simulación de un cliente que invierte colores
 *                     (Gmail iOS / Outlook.com en modo oscuro forzado)
 *   <id>.mobile.png   390 px (solo algunos)
 *
 *   pnpm exec tsx scripts/emails/preview.ts          (HTML + PNG)
 *   pnpm exec tsx scripts/emails/preview.ts --no-png (solo HTML/TXT)
 *
 * El logo se pide a la URL absoluta del sitio; en los HTML de docs/ se
 * reescribe a ../../public/brand/ para que se vea abriendo el archivo.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { ReactElement } from "react";

const SITE = "https://bicitiendamdq.com.ar";
process.env.NEXT_PUBLIC_SITE_URL = SITE;

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "docs/emails");

async function main() {
  // Imports dinámicos: SITE_URL de emails/components se calcula al cargar.
  const { renderEmail } = await import("../../emails/render");
  const { OrderConfirmationEmail } = await import("../../emails/order-confirmation");
  const { OrderStatusEmail } = await import("../../emails/order-status");
  const { OrderCancelledEmail } = await import("../../emails/order-cancelled");
  const { PasswordResetEmail } = await import("../../emails/password-reset");
  const { AppointmentConfirmedEmail } = await import("../../emails/appointment-confirmed");
  const { AppointmentCancelledEmail } = await import("../../emails/appointment-cancelled");
  const { QuoteReceivedEmail, QuoteSentEmail } = await import("../../emails/quote");
  const { BackInStockEmail } = await import("../../emails/back-in-stock");
  const { STORE_INFO, PAYMENT_SETTINGS } = await import("../../lib/data/demo/settings");
  const { store } = await import("../../lib/config");

  const brandName = STORE_INFO.name;
  const local = store.locations[0];
  const footer = `${brandName} · ${local.address} · ${local.hours}`;
  const whatsapp = store.whatsapp;
  const pct = PAYMENT_SETTINGS.transferDiscountPct;
  const tracking = `${SITE}/seguimiento/BT-10483?e=lucia%40mail.com`;

  const items = [
    { name: "MTB rodado 29 · 21 vel. · aluminio · Talle M", quantity: 1, unitPrice: 489900 },
    { name: "Casco MTB con visera", quantity: 1, unitPrice: 79900 },
    { name: "Kit luces delantera + trasera", quantity: 2, unitPrice: 24900 },
  ];
  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const base = {
    brandName,
    number: "BT-10483",
    customerName: "Lucía Gómez",
    items,
    subtotal,
    discount: 0,
    shippingCost: 0,
    shippingPending: false,
    total: subtotal,
    paid: false,
    señado: false,
    paidAmount: 0,
    balanceDue: 0,
    deliveryLabel: `Retiro en ${local.address} · ${local.hours}`,
    pickupCode: "K7M2",
    transferAlias: PAYMENT_SETTINGS.alias,
    expiresLabel: "sáb 3 a las 18:40",
    whatsapp,
    trackingUrl: tracking,
    footer,
  };
  const transferTotal = Math.round(subtotal * (1 - pct / 100));

  const mails: { id: string; title: string; subject: string; el: ReactElement; mobile?: boolean }[] = [
    {
      id: "pedido-mercadopago",
      title: "Pedido pagado con Mercado Pago (6 cuotas)",
      subject: `Pedido BT-10483 pagado — ${brandName}`,
      el: OrderConfirmationEmail({ ...base, paymentMethod: "mercadopago", paid: true, paidAmount: subtotal, installments: 6 }),
      mobile: true,
    },
    {
      id: "pedido-mercadopago-pendiente",
      title: "Pedido con Mercado Pago en proceso",
      subject: `Pedido BT-10483 confirmado — ${brandName}`,
      el: OrderConfirmationEmail({ ...base, paymentMethod: "mercadopago" }),
    },
    {
      id: "pedido-transferencia",
      title: "Pedido por transferencia (datos bancarios + comprobante)",
      subject: `Pedido BT-10483 confirmado — ${brandName}`,
      el: OrderConfirmationEmail({
        ...base,
        paymentMethod: "transferencia",
        transferDiscount: pct,
        discount: subtotal - transferTotal,
        total: transferTotal,
        transferCbu: "0000003100012345678901",
        transferHolder: "[Titular a confirmar]",
      }),
      mobile: true,
    },
    {
      id: "pedido-efectivo",
      title: "Pedido con pago en efectivo en el local (reserva)",
      subject: `Pedido BT-10483 confirmado — ${brandName}`,
      el: OrderConfirmationEmail({ ...base, paymentMethod: "efectivo" }),
    },
    {
      id: "pedido-listo",
      title: "Pedido listo para retirar",
      subject: `Pedido BT-10483 listo para retirar — ${brandName}`,
      el: OrderStatusEmail({
        brandName,
        number: "BT-10483",
        customerName: "Lucía Gómez",
        headline: "tu pedido está listo",
        body: "Pasá a retirarlo cuando quieras dentro del horario del local.",
        pickupCode: "K7M2",
        address: local.address,
        hours: local.hours,
        whatsapp,
        trackingUrl: tracking,
        footer,
        isPickup: true,
        amountDue: subtotal,
      }),
      mobile: true,
    },
    {
      id: "pedido-vencido",
      title: "Reserva vencida",
      subject: `Tu reserva BT-10483 venció — ${brandName}`,
      el: OrderCancelledEmail({
        brandName,
        number: "BT-10483",
        customerName: "Lucía Gómez",
        reason: "vencido",
        items,
        total: transferTotal,
        shopUrl: `${SITE}/catalogo`,
        whatsapp,
        footer,
      }),
    },
    {
      id: "pedido-cancelado",
      title: "Pedido cancelado",
      subject: `Pedido BT-10483 cancelado — ${brandName}`,
      el: OrderCancelledEmail({
        brandName,
        number: "BT-10483",
        customerName: "Lucía Gómez",
        reason: "cancelado",
        shopUrl: `${SITE}/catalogo`,
        whatsapp,
        footer,
      }),
    },
    {
      id: "recuperar-contrasena",
      title: "Recupero de contraseña",
      subject: `Recuperá tu contraseña — ${brandName}`,
      el: PasswordResetEmail({
        brandName,
        customerName: "Juan Pérez",
        resetUrl: `${SITE}/cuenta/recuperar?token=3f9a1c0e7b2d4a6f8e1c3b5d7f9a2c4e`,
        validMinutes: 60,
        footer,
      }),
    },
    {
      id: "turno-confirmado",
      title: "Turno confirmado (taller)",
      subject: `Turno confirmado: jueves 8 de octubre 17:30 — ${brandName}`,
      el: AppointmentConfirmedEmail({
        brandName,
        number: "T-0412",
        customerName: "Martín Ruiz",
        serviceName: "Reparación / service",
        dayLabel: "jueves 8 de octubre",
        time: "17:30",
        repair: true,
        priceNote: "Presupuesto por WhatsApp",
        address: local.address,
        hours: local.hours,
        manageUrl: `${SITE}/turnos/T-0412?t=abc123`,
        whatsapp,
        footer,
      }),
      mobile: true,
    },
    {
      id: "turno-reprogramado",
      title: "Turno reprogramado",
      subject: `Turno reprogramado: viernes 9 de octubre 10:30 — ${brandName}`,
      el: AppointmentConfirmedEmail({
        brandName,
        number: "T-0413",
        customerName: "Martín Ruiz",
        serviceName: "Asesoramiento de compra",
        dayLabel: "viernes 9 de octubre",
        time: "10:30",
        priceNote: "Sin cargo",
        address: local.address,
        hours: local.hours,
        manageUrl: `${SITE}/turnos/T-0413?t=abc123`,
        whatsapp,
        footer,
        rescheduledFrom: "jueves 8 de octubre 17:30",
      }),
    },
    {
      id: "turno-cancelado",
      title: "Turno cancelado",
      subject: `Turno T-0412 cancelado — ${brandName}`,
      el: AppointmentCancelledEmail({
        brandName,
        number: "T-0412",
        customerName: "Martín Ruiz",
        serviceName: "Reparación / service",
        dayLabel: "lunes 12 de octubre",
        time: "10:00",
        by: "local",
        reason: "feriado, el local está cerrado.",
        bookUrl: `${SITE}/turnos`,
        whatsapp,
        footer,
      }),
    },
    {
      id: "presupuesto-recibido",
      title: "Presupuesto recibido",
      subject: `Recibimos tu pedido de presupuesto P-0214 — ${brandName}`,
      el: QuoteReceivedEmail({
        brandName,
        number: "P-0214",
        customerName: "Carla Méndez",
        kindLabel: "Producto importado",
        detail: "Rodillo smart compatible con Zwift, para eje pasante 12 mm.",
        forBike: "Ruta aluminio 2x8",
        budget: "Hasta $ 700.000",
        whatsapp,
        footer,
      }),
    },
    {
      id: "presupuesto-cotizado",
      title: "Presupuesto cotizado",
      subject: `Tu presupuesto P-0214 — ${brandName}`,
      el: QuoteSentEmail({
        brandName,
        number: "P-0214",
        customerName: "Carla Méndez",
        title: "Rodillo smart Zwift",
        lines: [
          { name: "Rodillo smart directo 12 mm", price: 629900, quantity: 1 },
          { name: "Cassette 11-28 8v", price: 34900, quantity: 1 },
        ],
        total: 664800,
        eta: "30 a 45 días",
        validLabel: "8 oct",
        whatsapp,
        footer,
      }),
    },
    {
      id: "volvio-stock",
      title: "Volvió el stock",
      subject: `¡Volvió Gravel 700c · 2x9 vel.! — ${brandName}`,
      el: BackInStockEmail({
        brandName,
        productName: "Gravel 700c · 2x9 vel.",
        price: 899900,
        productUrl: `${SITE}/catalogo/gravel-700c-2x9-vel`,
        whatsapp,
        footer,
        category: "Gravel",
        variant: "Talle M",
        transferDiscount: pct,
      }),
    },
  ];

  await mkdir(OUT, { recursive: true });
  const localLogo = (html: string) => html.replaceAll(`${SITE}/brand/`, "../../public/brand/");
  for (const m of mails) {
    const { html, text } = await renderEmail(m.el);
    await writeFile(path.join(OUT, `${m.id}.html`), localLogo(html));
    await writeFile(path.join(OUT, `${m.id}.txt`), `Asunto: ${m.subject}\n\n${text}\n`);
  }

  // Índice para revisarlos de una.
  const index = `<!doctype html><meta charset="utf-8"><title>Mails BiciTienda</title>
<body style="background:#121110;color:#f4efe4;font-family:Helvetica,Arial,sans-serif;padding:24px">
<h1 style="font-size:20px">Mails de BiciTienda MDQ</h1><ul>${mails
    .map((m) => `<li style="margin:6px 0"><a style="color:#ffd21f" href="${m.id}.html">${m.title}</a> — <span style="color:#8d867a">${m.subject}</span> (<a style="color:#cfc8bb" href="${m.id}.png">png</a> · <a style="color:#cfc8bb" href="${m.id}.invert.png">invertido</a> · <a style="color:#cfc8bb" href="${m.id}.txt">texto</a>)</li>`)
    .join("")}</ul></body>`;
  await writeFile(path.join(OUT, "index.html"), index);
  console.log(`HTML/TXT: ${mails.length} mails en docs/emails/`);

  if (process.argv.includes("--no-png")) return;
  let chromium: typeof import("playwright").chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    console.warn("Playwright no está instalado: solo HTML.");
    return;
  }
  const browser = await chromium.launch();
  const INVERT =
    "html{filter:invert(1) hue-rotate(180deg);background:#fff} img{filter:invert(1) hue-rotate(180deg)}";
  try {
    for (const m of mails) {
      const url = pathToFileURL(path.join(OUT, `${m.id}.html`)).href;
      const shots: { suffix: string; width: number; invert?: boolean }[] = [
        { suffix: "", width: 640 },
        { suffix: ".invert", width: 640, invert: true },
        ...(m.mobile ? [{ suffix: ".mobile", width: 390 }] : []),
      ];
      for (const s of shots) {
        const page = await browser.newPage({ viewport: { width: s.width, height: 800 }, deviceScaleFactor: 1 });
        // Sin webfonts: lo que ve la mayoría de los clientes (Gmail, Outlook).
        await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
        await page.goto(url, { waitUntil: "load" });
        if (s.invert) await page.addStyleTag({ content: INVERT });
        await page.screenshot({ path: path.join(OUT, `${m.id}${s.suffix}.png`), fullPage: true });
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
  console.log("PNG: capturas en docs/emails/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
