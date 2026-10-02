import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type {
  DeliveryMethodId,
  LeadStatus,
  LeadType,
  OrderEvent,
  OrderStatus,
  PaymentMethodId,
  PaymentMode,
  PaymentProvider,
  SiteContent,
  Spec,
  StockMovementReason,
  StockOverride,
} from "@/lib/types";

/**
 * Schema de la base — traducción 1:1 de lib/types.ts (cada interfaz una
 * tabla). Los enums van como text tipado (sin pg enum) para que agregar un
 * estado no requiera migración destructiva. Postgres real en producción
 * (Neon) y PGlite embebido en desarrollo: el mismo dialecto en los dos.
 */

/* ── Catálogo ─────────────────────────────────────────────── */

/**
 * Categorías: editables desde el admin (crear, renombrar, ordenar). No se
 * borra una categoría que todavía tiene modelos (FK de products).
 */
export const categories = pgTable("categories", {
  slug: text("slug").primaryKey(),
  /** Plural visible: "Bicicletas". */
  label: text("label").notNull(),
  /** Singular en mayúsculas para las tarjetas: "BICICLETA". */
  single: text("single").notNull().default(""),
  /** Subtítulo de la tarjeta del home ("" = contador de modelos). */
  sub: text("sub").notNull().default(""),
  home: boolean("home").notNull().default(true),
  /** Producto cuya foto ilustra la tarjeta. null = el primero. */
  imgProductId: text("img_product_id"),
  pathSlug: text("path_slug").notNull().unique(),
  order: integer("order").notNull().default(0),
});

export const brands = pgTable("brands", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
});

export const products = pgTable("products", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  brandId: text("brand_id")
    .notNull()
    .references(() => brands.id),
  category: text("category")
    .notNull()
    .references(() => categories.slug),
  /** null = "Precio a consultar". */
  price: integer("price"),
  priceApprox: boolean("price_approx").notNull().default(false),
  /** Precio de lista tachado (el `listPrice` del handoff). */
  oldPrice: integer("old_price"),
  tag: text("tag"),
  chips: jsonb("chips").$type<string[]>().notNull().default([]),
  specs: jsonb("specs").$type<Spec[]>().notNull().default([]),
  images: jsonb("images").$type<string[]>().notNull().default([]),
  hidden: boolean("hidden").notNull().default(false),
  /** Aparece en "Destacados" de la home. */
  featured: boolean("featured").notNull().default(false),
  /** "sin_stock" fuerza SIN STOCK aunque haya unidades. null = derivado. */
  stockOverride: text("stock_override").$type<StockOverride>(),
  /** Creado/duplicado desde el admin: el único tipo que se puede borrar. */
  custom: boolean("custom").notNull().default(false),
  description: text("description").notNull().default(""),
  /** ISO corto, ordena "más nuevos". */
  createdAt: text("created_at").notNull(),
});

/* ── Sucursales y stock ───────────────────────────────────── */

/**
 * Sucursales del local. El seed sale de `store.locations` (lib/config.ts) y
 * después se administran desde /admin/sucursales. La "principal" es la
 * activa de menor `order`.
 */
export const locations = pgTable("locations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  address: text("address").notNull(),
  hours: text("hours").notNull(),
  mapsUrl: text("maps_url").notNull().default(""),
  order: integer("order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

/**
 * Stock por sucursal — la fuente de verdad del inventario. El total de un
 * producto es SUM(qty); ninguna otra tabla guarda stock. Se escribe SOLO
 * a través de `applyStockMovement` (lib/server/stock.ts).
 */
export const productStock = pgTable(
  "product_stock",
  {
    productSlug: text("product_slug")
      .notNull()
      .references(() => products.slug),
    locationId: text("location_id")
      .notNull()
      .references(() => locations.id),
    qty: integer("qty").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.productSlug, t.locationId] })],
);

/**
 * Libro de movimientos de stock: cada variación queda asentada con su
 * motivo, el pedido que la causó (si lo hubo) y quién la hizo. `qtyAfter`
 * es el valor real que devolvió el UPDATE atómico.
 */
export const stockMovements = pgTable("stock_movements", {
  id: serial("id").primaryKey(),
  productSlug: text("product_slug").notNull(),
  locationId: text("location_id").notNull(),
  delta: integer("delta").notNull(),
  qtyAfter: integer("qty_after").notNull(),
  reason: text("reason").$type<StockMovementReason>().notNull(),
  orderId: uuid("order_id"),
  /**
   * Quién hizo el ajuste/transferencia: "admin" (el panel tiene un único
   * PIN, sin usuarios). null en ventas. Filas viejas pueden tener un email.
   */
  actor: text("actor"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ── Contenido editable ───────────────────────────────────── */

export const articles = pgTable("articles", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  tag: text("tag").notNull(),
  date: text("date").notNull(),
  readMinutes: integer("read_minutes").notNull(),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull(),
  paras: jsonb("paras").$type<string[]>().notNull().default([]),
  ctaTitle: text("cta_title").notNull(),
  ctaLabel: text("cta_label").notNull(),
  ctaKind: text("cta_kind").$type<"wa" | "pdf">().notNull(),
  ctaMsg: text("cta_msg").notNull(),
  published: boolean("published").notNull().default(true),
  /** Orden de listado, menor primero (el orden del array del handoff). */
  order: integer("order").notNull().default(0),
});

export const agendaEvents = pgTable("agenda_events", {
  id: text("id").primaryKey(),
  /** ISO real, ordena y vence eventos pasados. */
  date: text("date").notNull(),
  day: text("day").notNull(),
  month: text("month").notNull(),
  title: text("title").notNull(),
  meta: text("meta").notNull(),
  published: boolean("published").notNull().default(true),
});

/**
 * Configuración editable desde /admin/ajustes (fila única id "main").
 * Lo que no se edita desde el admin (marca, léxico, rutas) sigue viviendo
 * en lib/config.ts, la capa de código por tienda. Los % van enteros como
 * en el handoff: transferDiscount 5 = 5%.
 */
export const settings = pgTable("settings", {
  id: text("id").primaryKey().default("main"),
  whatsapp: text("whatsapp").notNull(),
  /** Link de invitación al grupo de la comunidad (el `erGroup`). */
  whatsappGroupUrl: text("whatsapp_group_url"),
  instagram: text("instagram").notNull(),
  tiktok: text("tiktok"),
  /** Dirección visible del local (el `dir` del handoff). */
  address: text("address").notNull().default(""),
  /** Horario visible (el `hor` del handoff). */
  hours: text("hours").notNull().default(""),
  mapsUrl: text("maps_url").notNull().default(""),
  transferAlias: text("transfer_alias").notNull(),
  /** Descuento por transferencia en % (el `dto`): 5 = 5%. */
  transferDiscount: real("transfer_discount").notNull(),
  /** Recargo % del Plan MiPyME en 3 y 6 cuotas. */
  r3: real("r3").notNull().default(0),
  r6: real("r6").notNull().default(0),
  depositRate: real("deposit_rate").notNull(),
  /** Total mínimo del pedido para ofrecer reserva con seña. */
  depositMinTotal: integer("deposit_min_total").notNull().default(2_000_000),
  reservationHours: integer("reservation_hours").notNull(),
  localShippingCost: integer("local_shipping_cost").notNull(),
  showPrices: boolean("show_prices").notNull().default(true),
  /** false = la web es 100% WhatsApp: sin carrito ni botones de compra. */
  ventaOnline: boolean("venta_online").notNull().default(true),
  /** Token de larga duración de la Graph API de Instagram (se renueva solo). */
  igToken: text("ig_token"),
  igTokenExpiresAt: timestamp("ig_token_expires_at", { withTimezone: true }),
  /** Cuenta conectada por "Conectar Instagram" (OAuth): id y @usuario. */
  igUserId: text("ig_user_id"),
  igUsername: text("ig_username"),
  /** Contenido editable: hero, Nosotros, reparaciones, comunidad, test. */
  content: jsonb("content").$type<SiteContent>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Overrides de los textos de la web: clave de `TEXTS` (lib/data/texts.ts)
 * → valor editado. Sin fila = el texto original; "Restaurar" la borra.
 */
export const texts = pgTable("texts", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

/**
 * Consultas: una por cada botón de WhatsApp que se toca en la web (y por
 * pedido). El admin las lista, filtra y marca atendidas.
 */
export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ts: timestamp("ts", { withTimezone: true }).notNull().defaultNow(),
    type: text("type").$type<LeadType>().notNull(),
    label: text("label").notNull(),
    detail: text("detail").notNull().default(""),
    status: text("status").$type<LeadStatus>().notNull().default("nueva"),
  },
  (t) => [index("leads_ts_idx").on(t.ts)],
);

export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  email: text("email").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** "Avisame cuando vuelva": interesados por producto sin stock. */
export const stockAlerts = pgTable(
  "stock_alerts",
  {
    id: serial("id").primaryKey(),
    productSlug: text("product_slug").notNull(),
    email: text("email").notNull(),
    notified: boolean("notified").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("stock_alerts_slug_email").on(t.productSlug, t.email)],
);

/* ── Clientes y pedidos ───────────────────────────────────── */

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  address: text("address"),
  city: text("city"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  number: text("number").notNull().unique(),
  status: text("status").$type<OrderStatus>().notNull(),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id),
  deliveryMethod: text("delivery_method").$type<DeliveryMethodId>().notNull(),
  deliveryAddress: text("delivery_address"),
  deliveryNotes: text("delivery_notes"),
  paymentMethod: text("payment_method").$type<PaymentMethodId>().notNull(),
  paymentMode: text("payment_mode").$type<PaymentMode>().notNull(),
  subtotal: integer("subtotal").notNull(),
  discount: integer("discount").notNull().default(0),
  shippingCost: integer("shipping_cost").notNull().default(0),
  total: integer("total").notNull(),
  depositAmount: integer("deposit_amount").notNull().default(0),
  paidAmount: integer("paid_amount").notNull().default(0),
  balanceDue: integer("balance_due").notNull().default(0),
  /**
   * Referencia del checkout en la pasarela: el site_transaction_id enviado a
   * Payway (o el id de preferencia de MP). null en pagos manuales.
   */
  providerCheckoutId: text("provider_checkout_id"),
  /** Cuotas elegidas al pagar con tarjeta (1, 3 o 6). El total ya incluye el recargo. */
  installments: integer("installments").notNull().default(1),
  pickupCode: text("pickup_code"),
  /** Sucursal elegida para el retiro. null en los envíos. */
  pickupLocationId: text("pickup_location_id").references(() => locations.id),
  /** Sucursal que despacha un envío (la de mayor cobertura del pedido). */
  fulfillmentLocationId: text("fulfillment_location_id").references(
    () => locations.id,
  ),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  timeline: jsonb("timeline").$type<OrderEvent[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id),
  productSlug: text("product_slug").notNull(),
  name: text("name").notNull(),
  image: text("image").notNull().default(""),
  quantity: integer("quantity").notNull(),
  /** Precio unitario congelado al momento de la compra. */
  unitPrice: integer("unit_price").notNull(),
});

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id),
  kind: text("kind").$type<"total" | "sena" | "saldo">().notNull(),
  method: text("method").$type<PaymentMethodId>().notNull(),
  amount: integer("amount").notNull(),
  /** Pasarela que reportó el pago. null en pagos manuales (admin). */
  provider: text("provider").$type<PaymentProvider>(),
  /** id del pago en la pasarela — clave de idempotencia del webhook. */
  providerPaymentId: text("provider_payment_id").unique(),
  status: text("status")
    .$type<"pending" | "approved" | "rejected">()
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Contadores atómicos (números de pedido). `UPDATE … value = value + 1
 * RETURNING` es atómico en Postgres y PGlite — sin depender de
 * transacciones interactivas, que el driver HTTP de Neon no soporta.
 */
export const counters = pgTable("counters", {
  id: text("id").primaryKey(),
  value: integer("value").notNull(),
});
