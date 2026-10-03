import { eq } from "drizzle-orm";
import type { ReactElement } from "react";
import { deliveryMethods, store } from "@/lib/config";
import { paths } from "@/lib/paths";
import { formatARS, zonedParts } from "@/lib/format";
import { getDb, schema } from "@/lib/server/db";
import { getStore, type RuntimeStore } from "@/lib/server/queries";
import { SITE_URL } from "@/lib/site";

/**
 * Envío de emails transaccionales con modo simulado:
 *
 *   - con RESEND_API_KEY → Resend por REST (el remitente sale del dominio
 *     verificado de la cuenta del cliente), HTML + texto plano;
 *   - sin key → OUTBOX LOCAL: el HTML renderizado queda en
 *     `.data/outbox/<numero>-<tipo>.html` (y el texto en `.txt`) y se
 *     loguea — el flujo completo se prueba sin ningún servicio. Solo en
 *     desarrollo: en producción el disco es de solo lectura, así que sin
 *     key no se manda nada.
 *   - `features.emails: false` → la tienda no manda mails (no-op).
 *
 * Los links y el logo usan la URL pública (`SITE_URL`: NEXT_PUBLIC_SITE_URL
 * o `store.siteUrl`), nunca localhost: un mail se abre fuera de la máquina.
 * Ningún envío tira: un mail caído no voltea un pedido, turno ni presupuesto.
 */

export type OrderEmailKind =
  | "confirmacion"
  | "listo"
  | "en-camino"
  /** Cancelado desde el admin. */
  | "cancelado"
  /** La reserva venció sin pago (expireStaleOrders). */
  | "vencido";

export async function deliver(opts: {
  /** Sin destinatario (cliente sin email) no se manda nada. */
  to: string | null;
  subject: string;
  html: string;
  /** Alternativa en texto plano (renderEmail). */
  text?: string;
  tag: string;
}): Promise<void> {
  if (store.features.emails === false || !opts.to) return;
  const key = process.env.RESEND_API_KEY;

  if (!key && process.env.NODE_ENV === "production") {
    console.warn(`[mail] sin RESEND_API_KEY: no se envía "${opts.subject}"`);
    return;
  }
  if (!key) {
    const { mkdir, writeFile } = await import("node:fs/promises");
    await mkdir(".data/outbox", { recursive: true });
    const file = `.data/outbox/${opts.tag}.html`;
    await writeFile(file, opts.html);
    if (opts.text)
      await writeFile(`.data/outbox/${opts.tag}.txt`, `Asunto: ${opts.subject}\nPara: ${opts.to}\n\n${opts.text}\n`);
    console.log(`[mail:outbox] ${opts.subject} → ${opts.to} (${file})`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.MAIL_FROM || "pedidos@resend.dev",
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
      ...(opts.text ? { text: opts.text } : {}),
    }),
  });
  if (!res.ok) {
    // Un email caído no debe voltear un pedido: se loguea y sigue.
    console.error(`[mail] Resend ${res.status}: ${await res.text()}`);
  }
}

/** Renderiza (HTML + texto) y entrega. */
async function send(opts: { to: string | null; subject: string; tag: string; el: ReactElement }) {
  if (!opts.to) return;
  const { renderEmail } = await import("../../emails/render");
  const { html, text } = await renderEmail(opts.el);
  await deliver({ to: opts.to, subject: opts.subject, html, text, tag: opts.tag });
}

/** "[CBU a confirmar]" y similares: datos que el local todavía no pasó. */
export function isPendingValue(v: string | null | undefined): boolean {
  return !v || /^\[.*\]$/.test(v.trim());
}

/** Datos opcionales del mail: sin los placeholders "[… a confirmar]". */
function known(v: string | null | undefined): string | null {
  return isPendingValue(v) ? null : v!.trim();
}

function footerOf(runtime: RuntimeStore, local: { address: string; hours: string }): string {
  return `${runtime.brandName} · ${local.address} · ${local.hours}`;
}

/** Seguimiento público del pedido (con el email para entrar sin cuenta). */
export function orderTrackingUrl(number: string, email: string): string {
  return `${SITE_URL}${paths.tracking(number)}?e=${encodeURIComponent(email)}`;
}

/**
 * Dónde se sube el comprobante de transferencia: la sección
 * `id="comprobante"` del seguimiento.
 */
export function orderReceiptUrl(number: string, email: string): string {
  return `${orderTrackingUrl(number, email)}#comprobante`;
}

/** Link de gestión del turno (también sin cuenta), con la URL pública. */
function appointmentManageUrl(number: string, token: string): string {
  return `${SITE_URL}${paths.appointments()}/${number}?t=${encodeURIComponent(token)}`;
}

function expiresLabel(expiresAt: Date | null): string | null {
  if (!expiresAt) return null;
  const dias = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
  const t = zonedParts(expiresAt);
  return `${dias[t.weekday]} ${t.day} a las ${t.hh}:${t.mm}`;
}

/** "Volvió el stock" para un interesado de la ficha agotada. */
export async function sendBackInStockEmail(
  product: { slug: string; name: string; price: number | null },
  to: string,
): Promise<void> {
  try {
    const runtime = await getStore();
    const local = runtime.locations[0];
    const { BackInStockEmail } = await import("../../emails/back-in-stock");
    await send({
      to,
      subject: `¡Volvió ${product.name}! — ${runtime.brandName}`,
      tag: `stock-${product.slug}-${to.replace(/[^a-z0-9]/gi, "_")}`,
      el: BackInStockEmail({
        brandName: runtime.brandName,
        productName: product.name,
        price: runtime.showPrices ? product.price : null,
        productUrl: `${SITE_URL}${paths.catalog(product.slug)}`,
        whatsapp: runtime.whatsapp,
        footer: footerOf(runtime, local),
        transferDiscount: runtime.transferDiscount,
      }),
    });
  } catch (err) {
    console.error("[mail] error enviando aviso de stock:", err);
  }
}

/** Renderiza y envía el email de un pedido según el momento del ciclo. */
export async function sendOrderEmail(
  orderId: string,
  kind: OrderEmailKind,
): Promise<void> {
  try {
    const db = await getDb();
    const [order] = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, orderId));
    if (!order) return;
    const [customer] = await db
      .select()
      .from(schema.customers)
      .where(eq(schema.customers.id, order.customerId));
    // Sin email no hay a quién mandarle nada (todo sigue por WhatsApp).
    if (!customer?.email) return;
    const rows = await db
      .select()
      .from(schema.orderItems)
      .where(eq(schema.orderItems.orderId, orderId));
    // Nombre y variante por separado: la plantilla pone el talle en mono.
    const items = rows.map((i) => ({
      name: i.name,
      variant: i.variantLabel || null,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
    }));

    const runtime = await getStore();
    // Sucursal del pedido: la de retiro elegida por el cliente, o la
    // principal para envíos y pedidos previos a multi-sucursal.
    const local =
      runtime.locations.find((l) => l.id === order.pickupLocationId) ??
      runtime.locations[0];
    const delivery = deliveryMethods.find((d) => d.id === order.deliveryMethod);
    const trackingUrl = orderTrackingUrl(order.number, customer.email);
    const footer = footerOf(runtime, local);
    const brand = runtime.brandName;
    const amountDue = Math.max(0, order.total - order.paidAmount);

    let subject: string;
    let el: ReactElement;

    if (kind === "confirmacion") {
      const { OrderConfirmationEmail } = await import("../../emails/order-confirmation");
      const señado = order.status === "SEÑADO" && order.balanceDue > 0;
      subject = order.paidAmount >= order.total
        ? `Pedido ${order.number} pagado — ${brand}`
        : señado
          ? `Pedido ${order.number} señado — ${brand}`
          : `Pedido ${order.number} confirmado — ${brand}`;
      el = OrderConfirmationEmail({
        brandName: brand,
        number: order.number,
        customerName: customer.name,
        items,
        subtotal: order.subtotal,
        discount: order.discount,
        installments: order.installments,
        financingSurcharge: Math.max(
          0,
          order.total - (order.subtotal - order.discount + order.shippingCost),
        ),
        transferDiscount:
          order.paymentMethod === "transferencia" ? runtime.transferDiscount : undefined,
        shippingCost: order.shippingCost,
        shippingPending: order.deliveryMethod === "envio-coordinar",
        total: order.total,
        paymentMethod: order.paymentMethod,
        paid: order.paidAmount >= order.total,
        señado,
        paidAmount: order.paidAmount,
        balanceDue: order.balanceDue,
        deliveryLabel:
          order.deliveryMethod === "retiro"
            ? // La dirección suele empezar con el nombre del local: sin repetirlo.
              `Retiro en ${
                local.address.startsWith(local.name)
                  ? local.address
                  : `${local.name} — ${local.address}`
              } · ${local.hours}`
            : delivery
              ? `${delivery.name} — ${order.deliveryAddress?.trim() || delivery.detail}`
              : "",
        pickupCode: order.pickupCode,
        transferAlias: runtime.transferAlias,
        transferCbu: known(runtime.transferCbu),
        transferHolder: known(runtime.transferHolder),
        transferBank: known(runtime.transferBank),
        receiptUrl: orderReceiptUrl(order.number, customer.email),
        expiresLabel: expiresLabel(order.expiresAt),
        whatsapp: runtime.whatsapp,
        trackingUrl,
        footer,
      });
    } else if (kind === "cancelado" || kind === "vencido") {
      const { OrderCancelledEmail } = await import("../../emails/order-cancelled");
      subject =
        kind === "vencido"
          ? `Tu reserva ${order.number} venció — ${brand}`
          : `Pedido ${order.number} cancelado — ${brand}`;
      el = OrderCancelledEmail({
        brandName: brand,
        number: order.number,
        customerName: customer.name,
        reason: kind,
        items,
        total: order.total,
        refundNote:
          order.paidAmount > 0
            ? `Ya habías pagado ${formatARS(order.paidAmount)}: te lo devolvemos por el mismo medio. Te escribimos por WhatsApp para coordinarlo.`
            : null,
        shopUrl: `${SITE_URL}${paths.catalog()}`,
        whatsapp: runtime.whatsapp,
        footer,
      });
    } else {
      const { OrderStatusEmail } = await import("../../emails/order-status");
      const isPickup = order.deliveryMethod === "retiro";
      const listo = kind === "listo";
      subject = listo
        ? `Pedido ${order.number} listo para retirar — ${brand}`
        : `Pedido ${order.number} en camino — ${brand}`;
      el = OrderStatusEmail({
        brandName: brand,
        number: order.number,
        customerName: customer.name,
        headline: listo ? "tu pedido está listo" : "tu pedido va en camino",
        body: listo
          ? "Pasá a retirarlo cuando quieras dentro del horario del local."
          : "Te escribimos por WhatsApp para coordinar el día y la franja de entrega.",
        pickupCode: order.pickupCode,
        address: local.address,
        hours: local.hours,
        whatsapp: runtime.whatsapp,
        trackingUrl,
        footer,
        isPickup,
        amountDue,
        items,
        total: order.total,
        mapsUrl: known(runtime.mapsUrl),
      });
    }

    await send({ to: customer.email, subject, el, tag: `${order.number}-${kind}` });
  } catch (err) {
    // Nunca romper el flujo de compra por un email.
    console.error("[mail] error enviando email:", err);
  }
}

/** Recupero de contraseña: link de un solo uso a /cuenta/recuperar. */
export async function sendPasswordResetEmail(opts: {
  to: string;
  name: string;
  token: string;
  validMinutes: number;
}): Promise<void> {
  try {
    const runtime = await getStore();
    const local = runtime.locations[0];
    const { PasswordResetEmail } = await import("../../emails/password-reset");
    await send({
      to: opts.to,
      subject: `Recuperá tu contraseña — ${runtime.brandName}`,
      tag: `reset-${opts.to.replace(/[^a-z0-9]/gi, "_")}`,
      el: PasswordResetEmail({
        brandName: runtime.brandName,
        customerName: opts.name,
        resetUrl: `${SITE_URL}${paths.recover()}?token=${encodeURIComponent(opts.token)}`,
        validMinutes: opts.validMinutes,
        footer: footerOf(runtime, local),
      }),
    });
  } catch (err) {
    console.error("[mail] error enviando recupero de contraseña:", err);
  }
}

/**
 * "Turno confirmado": se manda al confirmarse (al reservar o desde el
 * admin). Si el turno viene de una reprogramación (`rescheduledFromId`),
 * sale como "Turno reprogramado" con el día y la hora anteriores.
 */
export async function sendAppointmentConfirmedEmail(appointmentId: string): Promise<void> {
  try {
    const { getAppointmentView } = await import("@/lib/server/appointments");
    const view = await getAppointmentView(appointmentId);
    if (!view || !view.customer.email) return;
    const prev = view.appointment.rescheduledFromId
      ? await getAppointmentView(view.appointment.rescheduledFromId)
      : null;
    const rescheduledFrom = prev ? `${prev.dayLabel} ${prev.time}` : null;
    const runtime = await getStore();
    const local = runtime.locations[0];
    const { AppointmentConfirmedEmail } = await import("../../emails/appointment-confirmed");
    await send({
      to: view.customer.email,
      subject: `Turno ${rescheduledFrom ? "reprogramado" : "confirmado"}: ${view.dayLabel} ${view.time} — ${runtime.brandName}`,
      tag: `turno-${view.appointment.number}`,
      el: AppointmentConfirmedEmail({
        brandName: runtime.brandName,
        number: view.appointment.number,
        customerName: view.customer.name,
        serviceName: view.service.name,
        dayLabel: view.dayLabel,
        time: view.time,
        product: view.productLabel,
        priceNote: view.service.priceNote,
        address: local.address,
        hours: local.hours,
        manageUrl: appointmentManageUrl(view.appointment.number, view.appointment.manageToken),
        whatsapp: runtime.whatsapp,
        footer: footerOf(runtime, local),
        durationMin: view.appointment.durationMin,
        rescheduledFrom,
        mapsUrl: known(runtime.mapsUrl),
      }),
    });
  } catch (err) {
    console.error("[mail] error enviando confirmación de turno:", err);
  }
}

/** "Turno cancelado": por el cliente (desde su link) o por el local. */
export async function sendAppointmentCancelledEmail(
  appointmentId: string,
  opts: { by: "cliente" | "local"; reason?: string | null },
): Promise<void> {
  try {
    const { getAppointmentView } = await import("@/lib/server/appointments");
    const view = await getAppointmentView(appointmentId);
    if (!view || !view.customer.email) return;
    const runtime = await getStore();
    const local = runtime.locations[0];
    const { AppointmentCancelledEmail } = await import("../../emails/appointment-cancelled");
    await send({
      to: view.customer.email,
      subject: `Turno ${view.appointment.number} cancelado — ${runtime.brandName}`,
      tag: `turno-${view.appointment.number}-cancelado`,
      el: AppointmentCancelledEmail({
        brandName: runtime.brandName,
        number: view.appointment.number,
        customerName: view.customer.name,
        serviceName: view.service.name,
        dayLabel: view.dayLabel,
        time: view.time,
        by: opts.by,
        reason: opts.reason?.trim() || null,
        bookUrl: `${SITE_URL}${paths.appointments()}`,
        whatsapp: runtime.whatsapp,
        footer: footerOf(runtime, local),
      }),
    });
  } catch (err) {
    console.error("[mail] error enviando cancelación de turno:", err);
  }
}

/** "Recibimos tu pedido de presupuesto" (si dejó email). */
export async function sendQuoteReceivedEmail(quoteId: string): Promise<void> {
  try {
    const { getQuote } = await import("@/lib/server/quotes");
    const full = await getQuote(quoteId);
    if (!full?.customer.email) return;
    const { QUOTE_KINDS } = await import("@/lib/quote-flow");
    const runtime = await getStore();
    const local = runtime.locations[0];
    const { QuoteReceivedEmail } = await import("../../emails/quote");
    const q = full.quote;
    await send({
      to: full.customer.email,
      subject: `Recibimos tu pedido de presupuesto ${q.number} — ${runtime.brandName}`,
      tag: `presupuesto-${q.number}-recibido`,
      el: QuoteReceivedEmail({
        brandName: runtime.brandName,
        number: q.number,
        customerName: full.customer.name,
        kindLabel: QUOTE_KINDS.find((k) => k.id === q.kind)?.name ?? "Consulta",
        detail: q.detail,
        forBike: q.forBike || null,
        budget: q.budget || null,
        whatsapp: runtime.whatsapp,
        footer: footerOf(runtime, local),
      }),
    });
  } catch (err) {
    console.error("[mail] error enviando presupuesto recibido:", err);
  }
}

/** "Te pasamos el presupuesto": al pasar a Cotizado (si dejó email). */
export async function sendQuoteSentEmail(quoteId: string): Promise<void> {
  try {
    const { getQuote, quoteValidLabel } = await import("@/lib/server/quotes");
    const full = await getQuote(quoteId);
    if (!full?.customer.email || !full.lines.length) return;
    const runtime = await getStore();
    const local = runtime.locations[0];
    const { QuoteSentEmail } = await import("../../emails/quote");
    const q = full.quote;
    await send({
      to: full.customer.email,
      subject: `Tu presupuesto ${q.number} — ${runtime.brandName}`,
      tag: `presupuesto-${q.number}-cotizado`,
      el: QuoteSentEmail({
        brandName: runtime.brandName,
        number: q.number,
        customerName: full.customer.name,
        title: q.title || q.detail.slice(0, 60),
        lines: full.lines.map((l) => ({ name: l.name, price: l.price, quantity: l.quantity })),
        total: full.total,
        eta: q.eta || null,
        validLabel: quoteValidLabel(q.validUntil),
        whatsapp: runtime.whatsapp,
        footer: footerOf(runtime, local),
      }),
    });
  } catch (err) {
    console.error("[mail] error enviando presupuesto cotizado:", err);
  }
}
