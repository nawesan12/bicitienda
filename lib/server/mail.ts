import { eq } from "drizzle-orm";
import { deliveryMethods, store } from "@/lib/config";
import { paths } from "@/lib/paths";
import { zonedParts } from "@/lib/format";
import { getDb, schema } from "@/lib/server/db";
import { getStore } from "@/lib/server/queries";
import { runtimeSiteUrl } from "@/lib/site";

/**
 * Envío de emails transaccionales con modo simulado:
 *
 *   - con RESEND_API_KEY → Resend por REST (el remitente sale del dominio
 *     verificado de la cuenta del cliente);
 *   - sin key → OUTBOX LOCAL: el HTML renderizado queda en
 *     `.data/outbox/<numero>-<tipo>.html` y se loguea — el flujo completo
 *     se prueba sin ningún servicio. Solo en desarrollo: en producción el
 *     disco es de solo lectura, así que sin key no se manda nada.
 *   - `features.emails: false` → la tienda no manda mails (no-op).
 */

export type OrderEmailKind = "confirmacion" | "listo" | "en-camino";

export async function deliver(opts: {
  /** Sin destinatario (cliente sin email) no se manda nada. */
  to: string | null;
  subject: string;
  html: string;
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
    }),
  });
  if (!res.ok) {
    // Un email caído no debe voltear un pedido: se loguea y sigue.
    console.error(`[mail] Resend ${res.status}: ${await res.text()}`);
  }
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
    const { render } = await import("@react-email/render");
    const { BackInStockEmail } = await import("../../emails/back-in-stock");
    const html = await render(
      BackInStockEmail({
        brandName: runtime.brandName,
        productName: product.name,
        price: runtime.showPrices ? product.price : null,
        productUrl: `${runtimeSiteUrl()}${paths.catalog(product.slug)}`,
        whatsapp: runtime.whatsapp,
        footer: `${runtime.brandName} · ${local.address} · ${local.hours}`,
      }),
    );
    await deliver({
      to,
      subject: `¡Volvió ${product.name}! — ${runtime.brandName}`,
      html,
      tag: `stock-${product.slug}-${to.replace(/[^a-z0-9]/gi, "_")}`,
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
    const items = await db
      .select()
      .from(schema.orderItems)
      .where(eq(schema.orderItems.orderId, orderId));
    if (!customer) return;

    const runtime = await getStore();
    // Sucursal del pedido: la de retiro elegida por el cliente, o la
    // principal para envíos y pedidos previos a multi-sucursal.
    const local =
      runtime.locations.find((l) => l.id === order.pickupLocationId) ??
      runtime.locations[0];
    const delivery = deliveryMethods.find((d) => d.id === order.deliveryMethod);
    // Sin email no hay a quién mandarle nada (todo sigue por WhatsApp).
    if (!customer.email) return;
    const trackingUrl = `${runtimeSiteUrl()}/seguimiento/${order.number}?e=${encodeURIComponent(customer.email)}`;
    const footer = `${runtime.brandName} · ${local.address} · ${local.hours}`;

    const { render } = await import("@react-email/render");

    let subject: string;
    let html: string;

    if (kind === "confirmacion") {
      const { OrderConfirmationEmail } = await import(
        "../../emails/order-confirmation"
      );
      const señado = order.status === "SEÑADO" && order.balanceDue > 0;
      subject = order.paidAmount >= order.total
        ? `Pedido ${order.number} pagado — ${runtime.brandName}`
        : señado
          ? `Pedido ${order.number} señado — ${runtime.brandName}`
          : `Pedido ${order.number} confirmado — ${runtime.brandName}`;
      html = await render(
        OrderConfirmationEmail({
          brandName: runtime.brandName,
          number: order.number,
          customerName: customer.name,
          items: items.map((i) => ({
            name: i.variantLabel ? `${i.name} · ${i.variantLabel}` : i.name,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
          subtotal: order.subtotal,
          discount: order.discount,
          installments: order.installments,
          financingSurcharge: Math.max(
            0,
            order.total - (order.subtotal - order.discount + order.shippingCost),
          ),
          transferDiscount:
            order.paymentMethod === "transferencia"
              ? runtime.transferDiscount
              : undefined,
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
          expiresLabel: expiresLabel(order.expiresAt),
          whatsapp: runtime.whatsapp,
          trackingUrl,
          footer,
        }),
      );
    } else {
      const { OrderStatusEmail } = await import("../../emails/order-status");
      const isPickup = order.deliveryMethod === "retiro";
      const listo = kind === "listo";
      subject = listo
        ? `Pedido ${order.number} listo para retirar — ${runtime.brandName}`
        : `Pedido ${order.number} en camino — ${runtime.brandName}`;
      html = await render(
        OrderStatusEmail({
          brandName: runtime.brandName,
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
        }),
      );
    }

    await deliver({
      to: customer.email,
      subject,
      html,
      tag: `${order.number}-${kind}`,
    });
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
    const { render } = await import("@react-email/render");
    const { PasswordResetEmail } = await import("../../emails/password-reset");
    const html = await render(
      PasswordResetEmail({
        brandName: runtime.brandName,
        customerName: opts.name,
        resetUrl: `${runtimeSiteUrl()}/cuenta/recuperar?token=${encodeURIComponent(opts.token)}`,
        validMinutes: opts.validMinutes,
        footer: `${runtime.brandName} · ${local.address} · ${local.hours}`,
      }),
    );
    await deliver({
      to: opts.to,
      subject: `Recuperá tu contraseña — ${runtime.brandName}`,
      html,
      tag: `reset-${opts.to.replace(/[^a-z0-9]/gi, "_")}`,
    });
  } catch (err) {
    console.error("[mail] error enviando recupero de contraseña:", err);
  }
}

/** "Turno confirmado": se manda al confirmarse (al reservar o desde el admin). */
export async function sendAppointmentConfirmedEmail(appointmentId: string): Promise<void> {
  try {
    const { getAppointmentView } = await import("@/lib/server/appointments");
    const view = await getAppointmentView(appointmentId);
    if (!view || !view.customer.email) return;
    const runtime = await getStore();
    const local = runtime.locations[0];
    const { render } = await import("@react-email/render");
    const { AppointmentConfirmedEmail } = await import("../../emails/appointment-confirmed");
    const html = await render(
      AppointmentConfirmedEmail({
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
        manageUrl: view.manageUrl,
        whatsapp: runtime.whatsapp,
        footer: `${runtime.brandName} · ${local.address} · ${local.hours}`,
      }),
    );
    await deliver({
      to: view.customer.email,
      subject: `Turno confirmado: ${view.dayLabel} ${view.time} — ${runtime.brandName}`,
      html,
      tag: `turno-${view.appointment.number}`,
    });
  } catch (err) {
    console.error("[mail] error enviando confirmación de turno:", err);
  }
}
