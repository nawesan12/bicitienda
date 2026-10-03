import { randomUUID } from "node:crypto";
import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { updateTag } from "next/cache";
import { cache } from "react";
import { deliveryMethods, isOnlinePayment, paymentMethods, store } from "@/lib/config";
import { formatARS, zonedParts } from "@/lib/format";
import { canCancel, nextTransition } from "@/lib/order-flow";
import { normalizeArPhone } from "@/lib/phone";
import {
  computeTotals,
  depositAmount,
  isBuyable,
  ratesOf,
  type Installments,
} from "@/lib/pricing";
import { COUNTERS, nextCounter } from "@/lib/server/counters";
import { upsertCustomer } from "@/lib/server/customers";
import { getDb, schema, type Db } from "@/lib/server/db";
import { insertLead } from "@/lib/server/leads";
import { isOnlinePaymentAvailable } from "@/lib/server/payment-availability";
import { sendOrderEmail } from "@/lib/server/mail";
import { getStore, getVisibleProducts } from "@/lib/server/queries";
import { invalidatePublic } from "@/lib/server/revalidate";
import {
  applyStockMovement,
  getVariantStockMatrix,
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
import { resolveVariant, variantLabel } from "@/lib/variants";

/**
 * Ciclo de vida de los pedidos. El stock se descuenta AL CREAR (reserva
 * real, por variante y sucursal, asentada en el libro de movimientos) y se
 * restaura al cancelar o vencer revirtiendo EXACTAMENTE esos movimientos;
 * los totales se recalculan siempre acá con las tasas de la DB — jamás se
 * confía en el cliente.
 *
 * Sin transacciones interactivas (el driver HTTP de Neon no las tiene):
 * cada movimiento de stock es un UPDATE condicional atómico y ante un
 * fallo a mitad de camino se compensa lo ya reservado. Las transiciones
 * de estado son UPDATE … WHERE status = <el de origen>: dos clics
 * simultáneos no avanzan dos veces.
 */

export interface CheckoutInput {
  items: CartItem[];
  name: string;
  /** Opcional: sin email no salen mails (todo sigue por WhatsApp). */
  email?: string | null;
  /** WhatsApp: obligatorio, se normaliza (lib/phone.ts). */
  phone: string;
  deliveryMethod: DeliveryMethodId;
  deliveryAddress?: string;
  deliveryNotes?: string;
  paymentMethod: PaymentMethodId;
  /** Sucursal elegida para retirar (obligatoria si hay más de una activa). */
  pickupLocationId?: string;
  /** "sena" reserva pagando solo la seña online (si la tienda la usa). */
  paymentMode?: PaymentMode;
  /** Cuotas con recargo (Payway). En MP las elige el cliente en Checkout Pro. */
  installments?: Installments;
  /** Cuenta del cliente logueado (la pone la action desde la sesión). */
  accountId?: string | null;
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

/** Número visible: prefijo de la tienda + contador ("BT-10482"). */
export async function nextOrderNumber(db?: Db): Promise<string> {
  const conn = db ?? (await getDb());
  const value = await nextCounter(conn, COUNTERS.order, store.firstOrderNumber ?? 1041);
  return `${store.orderPrefix ?? ""}${value}`;
}

function pickupCodeFor(number: string, name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
  const digits = number.replace(/\D/g, "") || number;
  return `RET-${digits}-${initials || "CL"}`;
}

/** Contacto con el que se valida el acceso público a un pedido. */
export function contactParam(email: string | null, phone: string): string {
  return email || phone;
}

/**
 * Reserva de un envío repartida entre sucursales, greedy: cada línea sale
 * primero de la sucursal con más stock de su variante. La "sucursal que
 * despacha" es la que aporta más unidades; empate → la principal.
 */
async function reserveForShipping(
  db: Db,
  orderId: string,
  lines: CartLine[],
  locations: StoreLocation[],
): Promise<{ fulfillmentLocationId: string }> {
  const matrix = await getVariantStockMatrix(db, lines.map((l) => l.productSlug));
  const allocated = new Map<string, number>();

  for (const line of lines) {
    const variant = line.variant!;
    let remaining = line.quantity;
    const perLoc = matrix.get(variant.id) ?? new Map<string, number>();
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
          variantId: variant.id,
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
      throw new StockError(`No queda stock suficiente de ${lineName(line)}.`);
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

function lineName(line: CartLine): string {
  const label = line.variant ? variantLabel(line.variant) : "";
  return label ? `${line.product.name} (${label})` : line.product.name;
}

/** Reserva en la sucursal de retiro: todo el pedido sale de ahí. */
export async function reserveAtLocation(
  db: Db,
  orderId: string,
  lines: { variantId: string; productSlug: string; quantity: number; name: string }[],
  location: StoreLocation,
): Promise<void> {
  for (const line of lines) {
    try {
      await applyStockMovement(db, {
        variantId: line.variantId,
        productSlug: line.productSlug,
        locationId: location.id,
        delta: -line.quantity,
        reason: "venta",
        orderId,
      });
    } catch (err) {
      if (err instanceof StockError)
        throw new StockError(
          `${line.name} no tiene stock suficiente${location.shortName ? ` en ${location.shortName}` : ""}.`,
        );
      throw err;
    }
  }
}

/**
 * Vencimiento de la reserva según el medio de pago (null = no vence): la
 * transferencia, sus horas; el efectivo, las suyas (o nunca); un pago
 * online pendiente, sus minutos (pedidos abandonados en la pasarela no
 * retienen stock para siempre).
 */
export function reservationExpiry(
  method: PaymentMethodId,
  runtime: {
    reservationHours: number;
    cashReservationHours: number | null;
    onlineReservationMinutes: number;
  },
): Date | null {
  if (isOnlinePayment(method))
    return new Date(Date.now() + runtime.onlineReservationMinutes * 60_000);
  if (method === "transferencia")
    return new Date(Date.now() + runtime.reservationHours * 3600_000);
  if (method === "efectivo")
    return runtime.cashReservationHours == null
      ? null
      : new Date(Date.now() + runtime.cashReservationHours * 3600_000);
  return null;
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
  const email = input.email?.trim().toLowerCase() || null;
  const phone = normalizeArPhone(input.phone);
  if (!name) return { ok: false, error: "Completá tu nombre." };
  if (!phone)
    return { ok: false, error: "Revisá el WhatsApp: 10 dígitos con la característica (ej. 223 555-0182)." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { ok: false, error: "Revisá el email." };
  if (!input.items.length) return { ok: false, error: "El carrito está vacío." };
  // Venta online apagada: la web es 100% WhatsApp y no acepta pedidos.
  if (!runtime.ventaOnline)
    return { ok: false, error: "La compra online no está disponible: escribinos por WhatsApp." };

  const delivery = deliveryMethods.find((d) => d.id === input.deliveryMethod);
  const payment = paymentMethods.find((p) => p.id === input.paymentMethod);
  if (!delivery || !payment)
    return { ok: false, error: "Elegí entrega y medio de pago." };
  if (isOnlinePayment(input.paymentMethod) && !isOnlinePaymentAvailable(input.paymentMethod))
    return { ok: false, error: "El pago online no está disponible ahora: elegí transferencia o efectivo." };
  if (input.paymentMethod === "efectivo" && !runtime.cashEnabled)
    return { ok: false, error: "El pago en efectivo no está disponible." };
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

  // Resuelve cada línea contra el catálogo real (precio congelado) y su
  // variante (talle × color).
  const lines: CartLine[] = [];
  for (const item of input.items) {
    const product = products.find((p) => p.slug === item.productSlug);
    const qty = Math.max(1, Math.floor(item.quantity));
    if (!product || !isBuyable(rates, product) || product.price == null)
      return { ok: false, error: "Un producto del carrito ya no está disponible." };
    const variant = resolveVariant(product.variants, item.variantId);
    if (!variant)
      return {
        ok: false,
        error: item.variantId
          ? `El talle elegido de ${product.name} ya no está disponible.`
          : `Elegí el talle de ${product.name}.`,
      };
    lines.push({
      productSlug: product.slug,
      variantId: variant.id,
      quantity: qty,
      product,
      variant,
      unitPrice: product.price,
      lineTotal: product.price * qty,
      available: variant.stock,
    });
  }

  // Reserva por variante y sucursal, asentada en el libro contra el id del
  // pedido (generado acá: los movimientos preceden a la fila del pedido).
  const orderId = randomUUID();
  let fulfillmentLocationId: string | null = null;
  try {
    if (pickupLocation) {
      await reserveAtLocation(
        db,
        orderId,
        lines.map((l) => ({
          variantId: l.variant!.id,
          productSlug: l.productSlug,
          quantity: l.quantity,
          name: lineName(l),
        })),
        pickupLocation,
      );
    } else {
      const r = await reserveForShipping(db, orderId, lines, locations);
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
    // Seña: solo si la tienda la usa, online y sobre el umbral de Ajustes.
    const base = computeTotals(
      rates,
      lines,
      input.deliveryMethod,
      input.paymentMethod,
      "total",
      1,
    );
    const wantsDeposit =
      store.features.deposit !== false &&
      input.paymentMode === "sena" &&
      online &&
      base.total >= runtime.depositMinTotal;
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

    const customer = await upsertCustomer(db, {
      name,
      phone,
      email,
      address: input.deliveryAddress,
      city: input.deliveryMethod === "envio-mdq" ? runtime.city.split(",")[0] : null,
    });

    const number = await nextOrderNumber(db);
    const deposit = wantsDeposit ? depositAmount(rates, totals.total) : 0;

    const [order] = await db
      .insert(schema.orders)
      .values({
        id: orderId,
        number,
        status: "PENDIENTE_PAGO",
        customerId: customer.id,
        customerName: name,
        accountId: input.accountId ?? null,
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
        expiresAt: reservationExpiry(input.paymentMethod, runtime),
        timeline: [makeEvent("CONFIRMADO", "Pedido recibido")],
      })
      .returning();

    await db.insert(schema.orderItems).values(
      lines.map((l) => ({
        orderId: order.id,
        productSlug: l.productSlug,
        variantId: l.variant!.id,
        variantLabel: variantLabel(l.variant!) || null,
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

    const confirmUrl = `/checkout/confirmacion/${number}?e=${encodeURIComponent(contactParam(email, phone))}`;
    if (!online) {
      // Transferencia y efectivo: el pedido nace como reserva y el email
      // sale ya, con las instrucciones de pago.
      await sendOrderEmail(order.id, "confirmacion");
      return { ok: true, number, redirect: confirmUrl };
    }

    // Pasarela online (MP o Payway): checkout real si hay credenciales;
    // si no, el sandbox local que ejecuta la misma lógica del webhook.
    const { startOnlinePayment } = await import("@/lib/server/online-payment");
    try {
      const redirect = await startOnlinePayment(order, email, lines);
      return { ok: true, number, redirect };
    } catch (err) {
      // La pasarela no respondió: el pedido no puede quedar reservando
      // stock sin forma de pagarse. Se cancela (devuelve el stock).
      console.error("[checkout] no se pudo iniciar el pago:", err);
      await cancelOrder(order.id, { notify: false });
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

/* ── Pedido desde un presupuesto ──────────────────────────── */

export interface ManualOrderLine {
  name: string;
  unitPrice: number;
  quantity: number;
  /** Línea del catálogo: reserva stock de esa variante. */
  productSlug?: string | null;
  variantId?: string | null;
  variantLabel?: string | null;
  image?: string;
}

/**
 * Pedido armado por el local (el "Crear pedido" de un presupuesto): líneas
 * libres o del catálogo, precios ya pactados (sin descuento ni recargo),
 * siempre retiro y sin vencimiento. Las líneas del catálogo reservan stock
 * de su variante como cualquier venta.
 */
export async function createManualOrder(input: {
  customerId: string;
  /** Nombre a guardar en el pedido (el del presupuesto); default: el de la ficha. */
  customerName?: string | null;
  accountId?: string | null;
  paymentMethod: "transferencia" | "efectivo";
  lines: ManualOrderLine[];
  quoteId?: string | null;
  note?: string;
}): Promise<{ ok: true; orderId: string; number: string } | { ok: false; error: string }> {
  const db = await getDb();
  const runtime = await getStore();
  const location = runtime.locations[0];
  if (!input.lines.length) return { ok: false, error: "La cotización no tiene ítems." };

  const orderId = randomUUID();
  const catalogLines = input.lines.filter((l) => l.variantId && l.productSlug);
  try {
    await reserveAtLocation(
      db,
      orderId,
      catalogLines.map((l) => ({
        variantId: l.variantId!,
        productSlug: l.productSlug!,
        quantity: l.quantity,
        name: l.name,
      })),
      location,
    );
  } catch (err) {
    await revertOrderMovements(db, orderId, "cancelacion");
    if (err instanceof StockError) return { ok: false, error: err.message };
    throw err;
  }

  try {
    const [customer] = await db
      .select()
      .from(schema.customers)
      .where(eq(schema.customers.id, input.customerId));
    if (!customer) throw new Error("Cliente inexistente");
    const total = input.lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
    const number = await nextOrderNumber(db);
    await db.insert(schema.orders).values({
      id: orderId,
      number,
      status: "PENDIENTE_PAGO",
      customerId: customer.id,
      customerName: input.customerName?.trim() || customer.name,
      accountId: input.accountId ?? customer.accountId ?? null,
      deliveryMethod: "retiro",
      deliveryNotes: input.note?.trim() || null,
      paymentMethod: input.paymentMethod,
      paymentMode: "total",
      subtotal: total,
      discount: 0,
      shippingCost: 0,
      total,
      paidAmount: 0,
      balanceDue: total,
      installments: 1,
      pickupCode: pickupCodeFor(number, input.customerName?.trim() || customer.name),
      pickupLocationId: location.id,
      expiresAt: null,
      quoteId: input.quoteId ?? null,
      timeline: [makeEvent("CONFIRMADO", "Pedido creado desde un presupuesto")],
    });
    await db.insert(schema.orderItems).values(
      input.lines.map((l) => ({
        orderId,
        productSlug: l.productSlug ?? null,
        variantId: l.variantId ?? null,
        variantLabel: l.variantLabel ?? null,
        name: l.name,
        image: l.image ?? "",
        quantity: l.quantity,
        unitPrice: l.unitPrice,
      })),
    );
    if (catalogLines.length) invalidatePublic("catalog", { from: "any" });
    await sendOrderEmail(orderId, "confirmacion");
    return { ok: true, orderId, number };
  } catch (err) {
    await revertOrderMovements(db, orderId, "cancelacion");
    throw err;
  }
}

/* ── Transiciones ─────────────────────────────────────────── */

export async function appendEvent(
  orderId: string,
  event: OrderEvent,
): Promise<void> {
  const db = await getDb();
  // Append atómico sobre el jsonb (sin leer-modificar-escribir).
  await db
    .update(schema.orders)
    .set({
      timeline: sql`${schema.orders.timeline} || ${JSON.stringify([event])}::jsonb`,
    })
    .where(eq(schema.orders.id, orderId));
}

export type AdvanceResult =
  | { ok: true; status: OrderStatus }
  | { ok: false; error: string };

/**
 * El botón amarillo del admin: aplica la próxima transición de la máquina
 * (lib/order-flow.ts). Atómica: el UPDATE exige el estado de origen, así
 * que un doble clic o dos pestañas no avanzan dos veces ni cobran dos
 * veces. `expectedFrom` (opcional) evita avanzar sobre un estado que el
 * admin no estaba viendo.
 */
export async function advanceOrder(
  orderId: string,
  expectedFrom?: OrderStatus,
): Promise<AdvanceResult> {
  const db = await getDb();
  const [order] = await db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.id, orderId));
  if (!order) return { ok: false, error: "Pedido inexistente." };
  if (expectedFrom && order.status !== expectedFrom)
    return { ok: false, error: "El pedido cambió de estado. Recargá la página." };
  const t = nextTransition(order);
  if (!t) return { ok: false, error: "Este pedido no tiene un próximo paso manual." };

  const paidNow = t.registersPayment ? order.total - order.paidAmount : 0;
  const claimed = await db
    .update(schema.orders)
    .set({
      status: t.to,
      ...(t.registersPayment
        ? { paidAmount: order.total, balanceDue: 0, expiresAt: null }
        : {}),
    })
    .where(and(eq(schema.orders.id, orderId), eq(schema.orders.status, t.from)))
    .returning();
  if (!claimed.length)
    return { ok: false, error: "El pedido cambió de estado. Recargá la página." };

  if (t.registersPayment && paidNow > 0) {
    await db.insert(schema.payments).values({
      orderId,
      kind: "total",
      method: order.paymentMethod,
      amount: paidNow,
      status: "approved",
    });
  }

  if (t.to === "PAGADO") {
    await appendEvent(orderId, makeEvent("PAGO", "Transferencia acreditada"));
    await sendOrderEmail(orderId, "confirmacion");
  } else if (t.to === "EN_PREPARACION") {
    await appendEvent(orderId, makeEvent("PAGO", "Armado y ajuste"));
  } else if (t.to === "LISTO_RETIRO") {
    await appendEvent(orderId, makeEvent("LISTO", "Listo para retirar"));
    await sendOrderEmail(orderId, "listo");
  } else if (t.to === "RETIRADO") {
    if (t.registersPayment)
      await appendEvent(orderId, makeEvent("PAGO", "Pago en efectivo registrado"));
    await appendEvent(orderId, makeEvent("ENTREGADO", "Retirado"));
  }
  return { ok: true, status: t.to };
}

/**
 * Cancela un pedido (admin, o la pasarela que no respondió). Devuelve el
 * stock exactamente donde se descontó, desde cualquier estado abierto
 * (no retirado). La devolución de dinero, si hubo pago, es manual.
 * Le avisa al cliente por mail salvo `notify: false` (la pasarela que no
 * respondió: el checkout ya le muestra el error).
 */
export async function cancelOrder(
  orderId: string,
  opts: { notify?: boolean } = {},
): Promise<boolean> {
  const db = await getDb();
  const [order] = await db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.id, orderId));
  if (!order || !canCancel(order)) return false;
  const claimed = await db
    .update(schema.orders)
    .set({ status: "CANCELADO", expiresAt: null })
    .where(and(eq(schema.orders.id, orderId), eq(schema.orders.status, order.status)))
    .returning();
  if (!claimed.length) return false;
  await revertOrderMovements(db, orderId, "cancelacion");
  await appendEvent(orderId, makeEvent("CONFIRMADO", "Pedido cancelado"));
  invalidatePublic("catalog", { from: "any" });
  if (opts.notify !== false) await sendOrderEmail(orderId, "cancelado");
  return true;
}

/**
 * Barrido perezoso de reservas vencidas: PENDIENTE_PAGO con expiresAt en el
 * pasado pasa a VENCIDO y devuelve su stock. Se invoca al leer pedidos en
 * el admin y en el seguimiento público. (Un cron lo reemplaza al deployar.)
 */
export async function expireStaleOrders(): Promise<number> {
  const db = await getDb();
  const stale = await db
    .update(schema.orders)
    .set({ status: "VENCIDO" })
    .where(
      and(
        inArray(schema.orders.status, ["PENDIENTE_PAGO"]),
        lt(schema.orders.expiresAt, new Date()),
      ),
    )
    .returning();
  for (const order of stale) {
    await revertOrderMovements(db, order.id, "vencimiento");
    await appendEvent(order.id, makeEvent("CONFIRMADO", "Reserva vencida sin pago"));
    await sendOrderEmail(order.id, "vencido");
  }
  if (stale.length) invalidatePublic("catalog", { from: "any" });
  return stale.length;
}

/**
 * El barrido perezoso UNA vez por request (React `cache`): una pantalla
 * que lee pedidos por varios caminos (tablero + detalle) no lo repite.
 * Fuera de un render (actions, cron, tests) `cache` no memoiza y corre
 * igual que `expireStaleOrders`.
 */
export const expireStaleOrdersOnce = cache(expireStaleOrders);
