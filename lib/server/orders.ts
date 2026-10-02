import { randomUUID } from "node:crypto";
import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { updateTag } from "next/cache";
import { deliveryMethods, isOnlinePayment, paymentMethods } from "@/lib/config";
import { formatARS, zonedParts } from "@/lib/format";
import {
  computeTotals,
  depositAmount,
  isBuyable,
  ratesOf,
  type Installments,
} from "@/lib/pricing";
import { getDb, schema } from "@/lib/server/db";
import { insertLead } from "@/lib/server/leads";
import { sendOrderEmail } from "@/lib/server/mail";
import { getStore, getVisibleProducts } from "@/lib/server/queries";
import { invalidatePublic } from "@/lib/server/revalidate";
import {
  applyStockMovement,
  getStockMatrix,
  revertOrderMovements,
  StockError,
} from "@/lib/server/stock";
import type {
  CartItem,
  CartLine,
  DeliveryMethodId,
  OrderEvent,
  OrderStatus,
  PaymentMethodId,
  PaymentMode,
  StoreLocation,
} from "@/lib/types";

/**
 * Ciclo de vida de los pedidos. El stock se descuenta AL CREAR (reserva
 * real, por sucursal, asentada en el libro de movimientos) y se restaura
 * al cancelar o vencer revirtiendo EXACTAMENTE esos movimientos; los
 * totales se recalculan siempre acá con las tasas de la DB — jamás se
 * confía en el cliente.
 *
 * Sin transacciones interactivas (el driver HTTP de Neon no las tiene):
 * cada movimiento de stock es un UPDATE condicional atómico y ante un
 * fallo a mitad de camino se compensa lo ya reservado.
 */

export interface CheckoutInput {
  items: CartItem[];
  name: string;
  email: string;
  phone: string;
  deliveryMethod: DeliveryMethodId;
  deliveryAddress?: string;
  deliveryNotes?: string;
  paymentMethod: PaymentMethodId;
  /** Sucursal elegida para retirar (obligatoria si hay más de una activa). */
  pickupLocationId?: string;
  /** "sena" reserva pagando solo la seña online (pedidos de alto valor). */
  paymentMode?: PaymentMode;
  /** Cuotas con tarjeta (1, 3 o 6 con el recargo r3/r6). La seña va en 1. */
  installments?: Installments;
}

export type CheckoutResult =
  | { ok: true; number: string; redirect: string }
  | { ok: false; error: string };

function shortStamp(date = new Date()): string {
  const dias = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
  // En la hora del local, no la del server (UTC en Vercel).
  const t = zonedParts(date);
  return `${dias[t.weekday]} ${t.day} · ${t.hh}:${t.mm}`;
}

export function makeEvent(
  key: OrderEvent["key"],
  label: string,
): OrderEvent {
  return { key, label, at: shortStamp(), state: "done" };
}

/** Número secuencial atómico: UPDATE … RETURNING sobre la fila contador. */
async function nextOrderNumber(): Promise<string> {
  const db = await getDb();
  const [row] = await db
    .update(schema.counters)
    .set({ value: sql`${schema.counters.value} + 1` })
    .where(eq(schema.counters.id, "order_number"))
    .returning();
  if (!row) throw new Error("Falta el contador order_number: corré db:seed.");
  return String(row.value);
}

function pickupCodeFor(number: string, name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
  return `RET-${number}-${initials || "CL"}`;
}

/**
 * Reserva de un envío repartida entre sucursales, greedy: cada línea sale
 * primero de la sucursal con más stock. La "sucursal que despacha"
 * (fulfillment) es la que aporta más unidades; empate → la principal.
 * Repartir en vez de exigir una sola sucursal evita el falso "sin stock":
 * lo que la web muestra como disponible es el agregado.
 */
async function reserveForShipping(
  orderId: string,
  lines: CartLine[],
  locations: StoreLocation[],
): Promise<{ fulfillmentLocationId: string }> {
  const db = await getDb();
  const matrix = await getStockMatrix(db, lines.map((l) => l.productSlug));
  const allocated = new Map<string, number>();

  for (const line of lines) {
    let remaining = line.quantity;
    const perLoc = matrix.get(line.productSlug) ?? new Map<string, number>();
    const ranked = [...locations].sort(
      (a, b) =>
        (perLoc.get(b.id) ?? 0) - (perLoc.get(a.id) ?? 0) ||
        (a.order ?? 0) - (b.order ?? 0),
    );
    for (const loc of ranked) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, perLoc.get(loc.id) ?? 0);
      if (take <= 0) continue;
      try {
        await applyStockMovement(db, {
          productSlug: line.productSlug,
          locationId: loc.id,
          delta: -take,
          reason: "venta",
          orderId,
        });
        remaining -= take;
        allocated.set(loc.id, (allocated.get(loc.id) ?? 0) + take);
      } catch (err) {
        // Otro pedido ganó la carrera en esta sucursal: probar la próxima.
        if (!(err instanceof StockError)) throw err;
      }
    }
    if (remaining > 0)
      throw new StockError(
        `No queda stock suficiente de ${line.product.name}.`,
      );
  }

  const principal = locations[0];
  let best = principal.id;
  let bestQty = -1;
  for (const loc of locations) {
    const qty = allocated.get(loc.id) ?? 0;
    if (qty > bestQty) {
      best = loc.id;
      bestQty = qty;
    }
  }
  return { fulfillmentLocationId: best };
}

export async function createOrder(
  input: CheckoutInput,
): Promise<CheckoutResult> {
  const db = await getDb();
  const [runtime, products] = await Promise.all([
    getStore(),
    getVisibleProducts(),
  ]);
  const rates = ratesOf(runtime);
  const locations = runtime.locations;

  // Validaciones de forma.
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone.trim();
  if (!name || !/.+@.+\..+/.test(email) || phone.replace(/\D/g, "").length < 8)
    return { ok: false, error: "Completá nombre, email y teléfono." };
  if (!input.items.length) return { ok: false, error: "El carrito está vacío." };
  // Venta online apagada: la web es 100% WhatsApp y no acepta pedidos.
  if (!runtime.ventaOnline)
    return { ok: false, error: "La compra online no está disponible: escribinos por WhatsApp." };

  const delivery = deliveryMethods.find((d) => d.id === input.deliveryMethod);
  const payment = paymentMethods.find((p) => p.id === input.paymentMethod);
  if (!delivery || !payment)
    return { ok: false, error: "Elegí entrega y medio de pago." };
  if (payment.pickupOnly && !delivery.isPickup)
    return { ok: false, error: "El pago en efectivo es solo con retiro." };
  if (!delivery.isPickup && input.deliveryMethod === "envio-mdq" && !input.deliveryAddress?.trim())
    return { ok: false, error: "Completá la dirección de entrega." };

  // Sucursal de retiro: con una sola activa es esa; con varias, la elegida.
  let pickupLocation: StoreLocation | null = null;
  if (delivery.isPickup) {
    pickupLocation =
      locations.length === 1
        ? locations[0]
        : (locations.find((l) => l.id === input.pickupLocationId) ?? null);
    if (!pickupLocation)
      return { ok: false, error: "Elegí la sucursal donde vas a retirar." };
  }

  // Resuelve cada línea contra el catálogo real (precio congelado).
  const lines: CartLine[] = [];
  for (const item of input.items) {
    const product = products.find((p) => p.slug === item.productSlug);
    const qty = Math.max(1, Math.floor(item.quantity));
    if (!product || !isBuyable(rates, product) || product.price == null)
      return { ok: false, error: "Un producto del carrito ya no está disponible." };
    lines.push({
      productSlug: product.slug,
      quantity: qty,
      product,
      unitPrice: product.price,
      lineTotal: product.price * qty,
      available: product.stock,
    });
  }

  // Reserva por sucursal, asentada en el libro contra el id del pedido
  // (generado acá: los movimientos preceden a la fila del pedido).
  const orderId = randomUUID();
  let fulfillmentLocationId: string | null = null;
  try {
    if (pickupLocation) {
      // Retiro: todo el pedido sale de la sucursal donde se retira.
      for (const line of lines) {
        try {
          await applyStockMovement(db, {
            productSlug: line.productSlug,
            locationId: pickupLocation.id,
            delta: -line.quantity,
            reason: "venta",
            orderId,
          });
        } catch (err) {
          if (err instanceof StockError)
            throw new StockError(
              `${line.product.name} no tiene stock suficiente en ${pickupLocation.shortName}.`,
            );
          throw err;
        }
      }
    } else {
      const r = await reserveForShipping(orderId, lines, locations);
      fulfillmentLocationId = r.fulfillmentLocationId;
    }
  } catch (err) {
    await revertOrderMovements(db, orderId, "cancelacion");
    updateTag("catalog");
    if (err instanceof StockError) return { ok: false, error: err.message };
    throw err;
  }

  try {
    const online = isOnlinePayment(input.paymentMethod);
    // Seña: solo online y en pedidos que superan el umbral de Ajustes. El
    // monto se recalcula acá — el flag del cliente solo expresa intención.
    // Se decide sobre el total en un pago (sin recargo de cuotas).
    const base = computeTotals(
      rates,
      lines,
      input.deliveryMethod,
      input.paymentMethod,
      "total",
      1,
    );
    const wantsDeposit =
      input.paymentMode === "sena" &&
      online &&
      base.total >= runtime.depositMinTotal;
    // Cuotas: solo con el pago total por tarjeta; el total lleva el recargo.
    const installments: Installments =
      payment.allowsInstallments && !wantsDeposit
        ? (input.installments ?? 1)
        : 1;
    const totals = computeTotals(
      rates,
      lines,
      input.deliveryMethod,
      input.paymentMethod,
      "total",
      installments,
    );

    // Cliente: reusa por email (el último registro con ese email).
    const existing = await db
      .select()
      .from(schema.customers)
      .where(eq(schema.customers.email, email));
    let customerId = existing.at(-1)?.id;
    if (customerId) {
      await db
        .update(schema.customers)
        .set({ name, phone, address: input.deliveryAddress?.trim() || null })
        .where(eq(schema.customers.id, customerId));
    } else {
      const [c] = await db
        .insert(schema.customers)
        .values({
          name,
          email,
          phone,
          address: input.deliveryAddress?.trim() || null,
          city: input.deliveryMethod === "envio-mdq" ? runtime.city.split(",")[0] : null,
        })
        .returning();
      customerId = c.id;
    }

    const number = await nextOrderNumber();
    const manual = !online;
    const expiresAt = manual
      ? new Date(Date.now() + runtime.reservationHours * 3600_000)
      : null;
    const deposit = wantsDeposit ? depositAmount(rates, totals.total) : 0;

    const [order] = await db
      .insert(schema.orders)
      .values({
        id: orderId,
        number,
        status: "PENDIENTE_PAGO",
        customerId,
        deliveryMethod: input.deliveryMethod,
        deliveryAddress: input.deliveryAddress?.trim() || null,
        deliveryNotes: input.deliveryNotes?.trim() || null,
        paymentMethod: input.paymentMethod,
        paymentMode: wantsDeposit ? "sena" : "total",
        subtotal: totals.subtotal,
        discount: totals.paymentDiscount,
        installments,
        shippingCost: totals.shippingCost,
        total: totals.total,
        depositAmount: deposit,
        paidAmount: 0,
        balanceDue: totals.total,
        pickupCode: pickupLocation ? pickupCodeFor(number, name) : null,
        pickupLocationId: pickupLocation?.id ?? null,
        fulfillmentLocationId,
        expiresAt,
        timeline: [makeEvent("CONFIRMADO", "Pedido confirmado")],
      })
      .returning();

    await db.insert(schema.orderItems).values(
      lines.map((l) => ({
        orderId: order.id,
        productSlug: l.productSlug,
        name: l.product.name,
        image: l.product.images[0] ?? "",
        quantity: l.quantity,
        unitPrice: l.unitPrice,
      })),
    );

    updateTag("catalog");

    // Cada pedido también queda como consulta en el admin.
    await insertLead({
      type: "pedido",
      label: `Pedido ${number}`,
      detail: `${name} · ${formatARS(totals.total)}${installments > 1 ? ` en ${installments} cuotas` : ""}`,
    }).catch((err) => console.error("[checkout] lead del pedido:", err));

    if (manual) {
      // Transferencia y efectivo: el pedido nace como reserva con
      // vencimiento y el email sale ya, con las instrucciones de pago.
      await sendOrderEmail(order.id, "confirmacion");
      return {
        ok: true,
        number,
        redirect: `/checkout/confirmacion/${number}?e=${encodeURIComponent(email)}`,
      };
    }

    // Pasarela online (Payway o MP): checkout real si hay credenciales;
    // si no, el sandbox local que ejecuta la misma lógica del webhook.
    const { startOnlinePayment } = await import("@/lib/server/online-payment");
    try {
      const redirect = await startOnlinePayment(order, email, lines);
      return { ok: true, number, redirect };
    } catch (err) {
      // La pasarela no respondió: el pedido no puede quedar reservando
      // stock sin forma de pagarse. Se cancela (devuelve el stock).
      console.error("[checkout] no se pudo iniciar el pago:", err);
      await cancelOrder(order.id);
      return {
        ok: false,
        error:
          "No pudimos conectar con el medio de pago. Probá de nuevo en unos minutos.",
      };
    }
  } catch (err) {
    await revertOrderMovements(db, orderId, "cancelacion");
    updateTag("catalog");
    throw err;
  }
}

/* ── Transiciones ─────────────────────────────────────────── */

const RESTORE_STOCK_FROM: OrderStatus[] = ["PENDIENTE_PAGO", "SEÑADO"];

export async function appendEvent(
  orderId: string,
  event: OrderEvent,
): Promise<void> {
  const db = await getDb();
  const [order] = await db
    .select({ timeline: schema.orders.timeline })
    .from(schema.orders)
    .where(eq(schema.orders.id, orderId));
  if (!order) return;
  await db
    .update(schema.orders)
    .set({ timeline: [...order.timeline, event] })
    .where(eq(schema.orders.id, orderId));
}

/**
 * Cancela un pedido (admin). Restaura el stock exactamente donde se
 * descontó si la reserva seguía sin pago acreditado.
 */
export async function cancelOrder(orderId: string): Promise<void> {
  const db = await getDb();
  const [order] = await db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.id, orderId));
  if (!order || order.status === "CANCELADO" || order.status === "VENCIDO")
    return;
  if (RESTORE_STOCK_FROM.includes(order.status)) {
    await revertOrderMovements(db, orderId, "cancelacion");
    invalidatePublic("catalog", { from: "any" });
  }
  await db
    .update(schema.orders)
    .set({
      status: "CANCELADO",
      timeline: [...order.timeline, makeEvent("CONFIRMADO", "Pedido cancelado")],
    })
    .where(eq(schema.orders.id, orderId));
}

/**
 * Barrido perezoso de reservas vencidas: PENDIENTE_PAGO con expiresAt en el
 * pasado pasa a VENCIDO y devuelve su stock a las sucursales de origen. Se
 * invoca al leer pedidos en el admin y en el seguimiento público. (Un cron
 * lo reemplaza al deployar.)
 */
export async function expireStaleOrders(): Promise<number> {
  const db = await getDb();
  const stale = await db
    .select()
    .from(schema.orders)
    .where(
      and(
        inArray(schema.orders.status, ["PENDIENTE_PAGO"]),
        lt(schema.orders.expiresAt, new Date()),
      ),
    );
  for (const order of stale) {
    await revertOrderMovements(db, order.id, "vencimiento");
    await db
      .update(schema.orders)
      .set({
        status: "VENCIDO",
        timeline: [
          ...order.timeline,
          makeEvent("CONFIRMADO", "Reserva vencida sin pago"),
        ],
      })
      .where(eq(schema.orders.id, order.id));
  }
  if (stale.length) invalidatePublic("catalog", { from: "any" });
  return stale.length;
}
