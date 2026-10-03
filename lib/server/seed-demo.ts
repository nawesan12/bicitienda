import { randomBytes } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { store } from "@/lib/config";
import { products as seedProducts } from "@/lib/data/catalog";
import {
  AGENDA_WEEK,
  APPOINTMENTS,
  CUSTOMERS,
  DEMO_ACCOUNT_EMAIL,
  DEMO_ACCOUNT_NEXT_APPOINTMENT,
  DEMO_PHOTOS,
  DEMO_TODAY,
  manifestKey,
  ORDERS,
  QUOTES,
  SCHEDULE_BLOCKS,
  type DemoAppointmentStatus,
  type DemoOrder,
  type DemoOrderStatus,
  type DemoCustomerRef,
} from "@/lib/data/demo";
import { scheduleRules } from "@/lib/data/operations";
import { zonedParts } from "@/lib/format";
import { resolveImage } from "@/lib/images";
import { normalizeArPhone } from "@/lib/phone";
import { linkPreviousRecords } from "@/lib/server/accounts";
import type { Db } from "@/lib/server/db";
import * as schema from "@/lib/server/db/schema";
import { hashPassword } from "@/lib/server/password";
import { findSeedVariant } from "@/lib/server/seed-variants";
import { applyStockMovement } from "@/lib/server/stock";
import { SINGLE_SIZE } from "@/lib/types";
import type {
  OrderEvent,
  OrderStatus,
  PaymentMethodId,
  QuoteKind,
} from "@/lib/types";
import {
  addDays,
  daysBetween,
  localToUtc,
  toLocalParts,
  toMinutes,
  weekdayOf,
} from "@/lib/zoned-time";

/**
 * ── Operación DEMO del prototipo ────────────────────────────
 * Clientes, cuenta demo, pedidos (todos los estados), turnos, bloqueos y
 * presupuestos (todos los estados) de `lib/data/demo/*`. Lo corre el seed
 * SOLO sobre una base sin operación (tabla `customers` vacía) o en un reset
 * total (`pnpm db:seed` sobre una base nueva, o "Restablecer" sin
 * keepOperational): nunca pisa pedidos reales.
 *
 * Fechas relativas a "hoy" (zona del local), no las fijas de oct-2026 del
 * prototipo:
 *  - Pedidos y presupuestos: se corren los días que pasaron desde
 *    DEMO_TODAY (2026-10-01), así "hoy"/"ayer" siguen siendo hoy/ayer.
 *  - Turnos de hoy (2i): hoy, solo en los horarios abiertos del día.
 *  - Agenda semanal (3b): lunes a sábado de la SEMANA ACTUAL (en domingo,
 *    la próxima). Los días ya pasados quedan resueltos (confirmado →
 *    asistió, sin confirmar → no vino); el día de hoy lo ocupan los turnos
 *    de hoy; los días bloqueados (feriado) se saltean.
 *  - El "Próximo turno" de la cuenta demo (a9) siempre queda en el futuro.
 *
 * Cuenta demo: DEMO_ACCOUNT_EMAIL / DEMO_ACCOUNT_PASSWORD.
 */

export const DEMO_ACCOUNT_PASSWORD = "bicitienda-demo";

const TZ = store.timeZone;
const DAY_MS = 86_400_000;

/** Estado del prototipo → estado del core. */
const ORDER_STATUS: Record<DemoOrderStatus, OrderStatus> = {
  transf_pendiente: "PENDIENTE_PAGO",
  paga_en_local: "PENDIENTE_PAGO",
  pagado: "PAGADO",
  armando: "EN_PREPARACION",
  listo_retiro: "LISTO_RETIRO",
  retirado: "RETIRADO",
  cancelado: "CANCELADO",
};

const PAYMENT: Record<DemoOrder["payment"], PaymentMethodId> = {
  mp: "mercadopago",
  transfer: "transferencia",
  cash: "efectivo",
};

const QUOTE_KIND: Record<string, QuoteKind> = {
  bici: "bici",
  repuesto: "rep",
  importado: "imp",
  otro: "otro",
};

/**
 * Pedido cancelado: el prototipo no tiene uno (el estado lo suma el plan);
 * se agrega para que la pill y el timeline de "Cancelado" tengan datos.
 */
const EXTRA_ORDERS: DemoOrder[] = [
  {
    number: "BT-10473",
    customer: { name: "Ana Torres", phone: "223 555-0107", email: "anatorres@gmail.com" },
    createdAt: "2026-09-27T09:40:00-03:00",
    payment: "transfer",
    installments: null,
    status: "cancelado",
    items: [
      {
        productSlug: "casco-mtb-con-visera",
        name: "Casco MTB con visera",
        size: "Único",
        color: null,
        variantLabel: "",
        qty: 1,
        unitPrice: 79900,
        photo: DEMO_PHOTOS.cascoMtb,
      },
    ],
    transferReceipt: null,
  },
];

const DEMO_ORDERS = [...ORDERS, ...EXTRA_ORDERS];

/** Estados que todavía retienen stock (reservado o vendido sin retirar). */
const HOLDS_STOCK = new Set<DemoOrderStatus>([
  "transf_pendiente",
  "paga_en_local",
  "pagado",
  "armando",
  "listo_retiro",
]);

/** Fechas de referencia de esta corrida. */
function clock(now = new Date()) {
  const today = toLocalParts(now, TZ).date;
  const offsetDays = daysBetween(DEMO_TODAY, today);
  // Lunes de la semana actual (en domingo, el de la próxima).
  const wd = weekdayOf(today); // 0 = domingo
  const monday = wd === 0 ? addDays(today, 1) : addDays(today, -(wd - 1));
  return { now, today, offsetDays, monday };
}

type Clock = ReturnType<typeof clock>;

/** Corre un instante del prototipo los días transcurridos desde DEMO_TODAY. */
function shift(iso: string, c: Clock): Date {
  const t = new Date(new Date(iso).getTime() + c.offsetDays * DAY_MS);
  return t > c.now ? new Date(c.now.getTime() - 60_000) : t;
}

function stamp(date: Date): string {
  const dias = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
  const t = zonedParts(date);
  return `${dias[t.weekday]} ${t.day} · ${t.hh}:${t.mm}`;
}

function event(key: OrderEvent["key"], label: string, at: Date, c: Clock): OrderEvent {
  return { key, label, at: stamp(at > c.now ? c.now : at), state: "done" };
}

/** Variante del seed para un ítem (talle + color), si el producto existe. */
function variantFor(productSlug: string | null, size: string | null, color: string | null) {
  const p = productSlug ? seedProducts.find((x) => x.slug === productSlug) : undefined;
  if (!p) return null;
  const v = findSeedVariant(p, size ?? SINGLE_SIZE, color);
  return v ? { product: p, variant: v } : null;
}

/**
 * Unidades que los pedidos demo abiertos tienen reservadas, por variante.
 * El stock del prototipo (3c) es el DISPONIBLE: el seed carga stock +
 * reservado y después el pedido descuenta lo suyo (motivo "venta"), así el
 * libro de movimientos queda coherente y cancelar un pedido demo devuelve
 * sus unidades.
 */
export function demoReservedStock(): Map<string, number> {
  const reserved = new Map<string, number>();
  for (const o of DEMO_ORDERS) {
    if (!HOLDS_STOCK.has(o.status)) continue;
    for (const it of o.items) {
      const hit = variantFor(it.productSlug, it.size, it.color);
      if (hit) reserved.set(hit.variant.id, (reserved.get(hit.variant.id) ?? 0) + it.qty);
    }
  }
  return reserved;
}

/** Cliente por WhatsApp sin pisar el nombre de uno existente. */
async function ensureCustomer(
  db: Db,
  ref: DemoCustomerRef,
  createdAt?: Date,
): Promise<typeof schema.customers.$inferSelect> {
  const phone = normalizeArPhone(ref.phone);
  if (!phone) throw new Error(`Teléfono demo inválido: ${ref.phone}`);
  const [existing] = await db.select().from(schema.customers).where(eq(schema.customers.phone, phone));
  if (existing) return existing;
  const [row] = await db
    .insert(schema.customers)
    .values({
      name: ref.name,
      phone,
      email: ref.email?.toLowerCase() ?? null,
      city: "Mar del Plata",
      ...(createdAt ? { createdAt } : {}),
    })
    .returning();
  return row;
}

async function seedCustomers(db: Db) {
  for (const c of CUSTOMERS) {
    await ensureCustomer(db, c, localToUtc(`${c.since}-01`, "12:00", TZ));
  }
}

async function seedOrders(db: Db, c: Clock, locationId: string) {
  const pct = store.transferDiscount;
  for (const o of [...DEMO_ORDERS].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    const customer = await ensureCustomer(db, o.customer);
    const createdAt = shift(o.createdAt, c);
    const method = PAYMENT[o.payment];
    const subtotal = o.items.reduce((a, i) => a + i.unitPrice * i.qty, 0);
    const discount = method === "transferencia" ? Math.round((subtotal * pct) / 100) : 0;
    const total = subtotal - discount;
    const status = ORDER_STATUS[o.status];
    const paid = ["PAGADO", "EN_PREPARACION", "LISTO_RETIRO", "RETIRADO"].includes(status);
    const at = (h: number) => new Date(createdAt.getTime() + h * 3600_000);

    const timeline: OrderEvent[] = [event("CONFIRMADO", "Pedido recibido", createdAt, c)];
    if (paid) {
      const label =
        method === "mercadopago"
          ? "Pago acreditado con Mercado Pago"
          : method === "transferencia"
            ? "Transferencia acreditada"
            : "Pago en efectivo registrado";
      timeline.push(event("PAGO", label, at(method === "mercadopago" ? 0.05 : 3), c));
    }
    if (["EN_PREPARACION", "LISTO_RETIRO", "RETIRADO"].includes(status))
      timeline.push(event("PAGO", "Armado y ajuste", at(4), c));
    if (["LISTO_RETIRO", "RETIRADO"].includes(status))
      timeline.push(event("LISTO", "Listo para retirar", at(24), c));
    if (status === "RETIRADO") timeline.push(event("ENTREGADO", "Retirado", at(48), c));
    if (status === "CANCELADO") timeline.push(event("CONFIRMADO", "Pedido cancelado", at(26), c));

    const expiresAt =
      status === "PENDIENTE_PAGO" && method === "transferencia"
        ? new Date(createdAt.getTime() + store.reservationHours * 3600_000)
        : null;
    const digits = o.number.replace(/\D/g, "");
    const initials = o.customer.name
      .split(/\s+/)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 2);

    const [order] = await db
      .insert(schema.orders)
      .values({
        number: o.number,
        status,
        customerId: customer.id,
        deliveryMethod: "retiro",
        paymentMethod: method,
        paymentMode: "total",
        subtotal,
        discount,
        shippingCost: 0,
        total,
        depositAmount: 0,
        paidAmount: paid ? total : 0,
        balanceDue: paid || status === "CANCELADO" ? 0 : total,
        installments: o.installments ?? 1,
        pickupCode: `RET-${digits}-${initials || "CL"}`,
        pickupLocationId: locationId,
        fulfillmentLocationId: locationId,
        expiresAt,
        timeline,
        createdAt,
        // El prototipo muestra "comprobante_10481.pdf" pero no hay archivo:
        // el comprobante real lo sube el cliente en la confirmación.
        transferReceiptUrl: null,
      })
      .returning();

    await db.insert(schema.orderItems).values(
      o.items.map((it) => {
        const hit = variantFor(it.productSlug, it.size, it.color);
        return {
          orderId: order.id,
          productSlug: hit ? it.productSlug : null,
          variantId: hit?.variant.id ?? null,
          variantLabel: it.variantLabel || null,
          name: it.name,
          image: resolveImage(manifestKey(it.photo)),
          quantity: it.qty,
          unitPrice: it.unitPrice,
        };
      }),
    );

    if (paid) {
      await db.insert(schema.payments).values({
        orderId: order.id,
        kind: "total",
        method,
        amount: total,
        provider: method === "mercadopago" ? "mp" : null,
        providerPaymentId: method === "mercadopago" ? `demo-${digits}` : null,
        status: "approved",
        createdAt: at(method === "mercadopago" ? 0.05 : 3),
      });
    }

    if (HOLDS_STOCK.has(o.status)) {
      for (const it of o.items) {
        const hit = variantFor(it.productSlug, it.size, it.color);
        if (!hit) continue;
        await applyStockMovement(db, {
          variantId: hit.variant.id,
          productSlug: hit.product.slug,
          locationId,
          delta: -it.qty,
          reason: "venta",
          orderId: order.id,
        });
      }
    }
  }
  // El próximo pedido real sigue la numeración (BT-10483).
  const last = Math.max(...DEMO_ORDERS.map((o) => Number(o.number.replace(/\D/g, ""))));
  await bumpCounter(db, "order_number", last);
}

async function bumpCounter(db: Db, id: string, value: number) {
  await db
    .insert(schema.counters)
    .values({ id, value })
    .onConflictDoUpdate({
      target: schema.counters.id,
      set: { value: sql`greatest(${schema.counters.value}, ${value})` },
    });
}

/** ¿El horario cae dentro del horario de turnos de ese día? */
function isOpen(date: string, time: string): boolean {
  const wd = weekdayOf(date);
  const m = toMinutes(time);
  return scheduleRules.some(
    (r) => r.weekday === wd && m >= toMinutes(r.startTime) && m < toMinutes(r.endTime),
  );
}

const FULL_DAY_BLOCKS = new Set(SCHEDULE_BLOCKS.filter((b) => !b.from).map((b) => b.date));

/** Fecha y estado de cada turno demo en esta corrida (null = no va). */
function placeAppointment(
  a: (typeof APPOINTMENTS)[number],
  c: Clock,
): { date: string; status: DemoAppointmentStatus } | null {
  if (a.id.startsWith("p")) {
    // Anteriores de la cuenta demo: misma distancia en semanas.
    return { date: addDays(a.date, 7 * Math.floor(c.offsetDays / 7)), status: a.status };
  }
  if (a.id.startsWith("t")) {
    return isOpen(c.today, a.time) ? { date: c.today, status: a.status } : null;
  }
  const dayIdx = AGENDA_WEEK.findIndex((d) => d.date === a.date);
  let date = addDays(c.monday, dayIdx);
  if (a.id === DEMO_ACCOUNT_NEXT_APPOINTMENT && date <= c.today) date = addDays(date, 7);
  else if (date === c.today) return null; // hoy lo ocupan los turnos de hoy
  if (FULL_DAY_BLOCKS.has(date) || !isOpen(date, a.time)) return null;
  if (date < c.today) {
    const status: DemoAppointmentStatus =
      a.status === "confirmado" ? "asistio" : a.status === "pendiente" ? "no_asistio" : a.status;
    return { date, status };
  }
  return { date, status: a.status };
}

async function seedAppointments(db: Db, c: Clock, slotCapacity: number) {
  const placed = APPOINTMENTS.map((a) => ({ a, at: placeAppointment(a, c) }))
    .filter((x): x is { a: (typeof APPOINTMENTS)[number]; at: NonNullable<typeof x.at> } => !!x.at)
    .map((x) => ({ ...x, startsAt: localToUtc(x.at.date, x.a.time, TZ) }))
    .sort((x, y) => x.startsAt.getTime() - y.startsAt.getTime());

  let n = 0;
  for (const { a, at, startsAt } of placed) {
    // Los turnos que ocupan lugar toman su slot (capacidad garantizada).
    if (at.status !== "cancelado" && at.status !== "reprogramado") {
      await db.insert(schema.appointmentSlots).values({ startsAt, booked: 0 }).onConflictDoNothing();
      const took = await db
        .update(schema.appointmentSlots)
        .set({ booked: sql`${schema.appointmentSlots.booked} + 1` })
        .where(
          sql`${schema.appointmentSlots.startsAt} = ${startsAt} and ${schema.appointmentSlots.booked} < ${slotCapacity}`,
        )
        .returning();
      if (!took.length) continue; // choca con otro turno demo: se omite
    }
    const customer = await ensureCustomer(db, a.customer);
    const hit = a.productSlug ? variantFor(a.productSlug, a.size, null) : null;
    n++;
    await db.insert(schema.appointments).values({
      number: `T-${String(n).padStart(4, "0")}`,
      customerId: customer.id,
      serviceId: a.service,
      productSlug: a.productSlug,
      variantId: a.size && hit ? hit.variant.id : null,
      startsAt,
      durationMin: 30,
      status: at.status,
      source: "web",
      note: a.detail,
      internalNote: a.note ?? "",
      manageToken: randomBytes(18).toString("base64url"),
      createdAt: new Date(Math.min(c.now.getTime(), startsAt.getTime()) - 3 * DAY_MS),
    });
  }
  await bumpCounter(db, "appointment_number", n);

  for (const b of SCHEDULE_BLOCKS) {
    await db.insert(schema.scheduleBlocks).values({
      startsAt: localToUtc(b.date, b.from ?? "00:00", TZ),
      endsAt: b.to ? localToUtc(b.date, b.to, TZ) : localToUtc(addDays(b.date, 1), "00:00", TZ),
      reason: b.reason,
    });
  }
}

async function seedQuotes(db: Db, c: Clock) {
  for (const q of [...QUOTES].sort((a, b) => a.number.localeCompare(b.number))) {
    const customer = await ensureCustomer(db, q.customer);
    const createdAt = shift(q.createdAt, c);
    const [row] = await db
      .insert(schema.quoteRequests)
      .values({
        number: q.number,
        kind: QUOTE_KIND[q.kind] ?? "otro",
        title: q.title,
        detail: q.detail,
        forBike: q.forBike ?? "",
        budget: q.budget ?? "",
        photos: [],
        customerId: customer.id,
        status: q.status,
        eta: q.eta,
        validUntil: addDays(q.validUntil, c.offsetDays),
        createdAt,
        updatedAt: createdAt,
      })
      .returning();
    if (q.lines.length)
      await db.insert(schema.quoteLines).values(
        q.lines.map((l, i) => ({ quoteId: row.id, name: l.name, price: l.price, quantity: 1, order: i })),
      );
  }
  const last = Math.max(...QUOTES.map((q) => Number(q.number.replace(/\D/g, ""))));
  await bumpCounter(db, "quote_number", last);
}

/** Cuenta demo (Juan Pérez): queda enlazada a sus pedidos y turnos. */
async function seedDemoAccount(db: Db) {
  const c = CUSTOMERS.find((x) => x.email === DEMO_ACCOUNT_EMAIL)!;
  const phone = normalizeArPhone(c.phone)!;
  const [account] = await db
    .insert(schema.customerAccounts)
    .values({
      email: DEMO_ACCOUNT_EMAIL,
      passwordHash: hashPassword(DEMO_ACCOUNT_PASSWORD),
      name: c.name,
      phone,
    })
    .onConflictDoUpdate({
      target: schema.customerAccounts.email,
      set: { passwordHash: hashPassword(DEMO_ACCOUNT_PASSWORD), name: c.name, phone },
    })
    .returning();
  await linkPreviousRecords(db, account);
}

/**
 * Carga la operación demo. `locationId` = sucursal principal (de ahí sale
 * el stock reservado por los pedidos).
 */
export async function seedDemoOperations(
  db: Db,
  opts: { locationId: string; slotCapacity: number; now?: Date },
): Promise<{ orders: number; appointments: number; quotes: number; customers: number }> {
  const c = clock(opts.now);
  await seedCustomers(db);
  await seedOrders(db, c, opts.locationId);
  await seedAppointments(db, c, opts.slotCapacity);
  await seedQuotes(db, c);
  await seedDemoAccount(db);
  const count = async (t: typeof schema.orders | typeof schema.appointments | typeof schema.quoteRequests | typeof schema.customers) =>
    (await db.select({ n: sql<number>`count(*)::int` }).from(t))[0].n;
  return {
    orders: await count(schema.orders),
    appointments: await count(schema.appointments),
    quotes: await count(schema.quoteRequests),
    customers: await count(schema.customers),
  };
}
