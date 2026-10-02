import {
  type AnyPgColumn,
  boolean,
  date,
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
  AppointmentSource,
  AppointmentStatus,
  DeliveryMethodId,
  LeadStatus,
  LeadType,
  OrderEvent,
  OrderStatus,
  PaymentMethodId,
  PaymentMode,
  PaymentProvider,
  ProductStatus,
  QuoteKind,
  QuoteStatus,
  SiteContent,
  Spec,
  StockMovementReason,
  StockOverride,
  WhatsAppTemplateId,
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
  /** Grupo de navegación (Bicicletas → MTB). null = raíz. */
  parentSlug: text("parent_slug").references((): AnyPgColumn => categories.slug),
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
  /** SKU del producto: clave de la importación (upsert). */
  sku: text("sku").unique(),
  /** Rodado para el filtro ("29", "27.5", "700c"). */
  rodado: text("rodado"),
  /** Se puede reservar una prueba en el local. */
  testRide: boolean("test_ride").notNull().default(false),
  /** Sin stock → no aparece en la web. */
  hideWhenOut: boolean("hide_when_out").notNull().default(false),
  status: text("status").$type<ProductStatus>().notNull().default("publicado"),
});

/**
 * Variantes vendibles (talle × color). El stock vive por variante; un
 * producto sin talles tiene una sola, "Único". No se borran si tienen
 * historial (pedidos o movimientos): se desactivan.
 */
export const productVariants = pgTable(
  "product_variants",
  {
    id: text("id").primaryKey(),
    productSlug: text("product_slug")
      .notNull()
      .references(() => products.slug),
    size: text("size").notNull().default("Único"),
    color: text("color").notNull().default(""),
    heightRange: text("height_range"),
    sku: text("sku").notNull().unique(),
    order: integer("order").notNull().default(0),
    active: boolean("active").notNull().default(true),
  },
  (t) => [
    uniqueIndex("product_variants_combo").on(t.productSlug, t.size, t.color),
    index("product_variants_product_idx").on(t.productSlug),
  ],
);

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
 * Stock por variante y sucursal — la fuente de verdad del inventario. El
 * total de un producto es SUM(qty) de sus variantes; ninguna otra tabla
 * guarda stock. `productSlug` va desnormalizado (agregados sin join). Se
 * escribe SOLO a través de `applyStockMovement` (lib/server/stock.ts).
 */
export const productStock = pgTable(
  "product_stock",
  {
    variantId: text("variant_id")
      .notNull()
      .references(() => productVariants.id),
    productSlug: text("product_slug")
      .notNull()
      .references(() => products.slug),
    locationId: text("location_id")
      .notNull()
      .references(() => locations.id),
    qty: integer("qty").notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.variantId, t.locationId] }),
    index("product_stock_product_idx").on(t.productSlug),
  ],
);

/**
 * Libro de movimientos de stock: cada variación queda asentada con su
 * motivo, el pedido que la causó (si lo hubo) y quién la hizo. `qtyAfter`
 * es el valor real que devolvió el UPDATE atómico.
 */
export const stockMovements = pgTable("stock_movements", {
  id: serial("id").primaryKey(),
  variantId: text("variant_id").notNull(),
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
  /** Horas de reserva de una transferencia sin acreditar. */
  reservationHours: integer("reservation_hours").notNull(),
  /**
   * Minutos que un pedido con pago online (MP) reserva el stock esperando
   * el pago. Pasado eso vence y el stock vuelve (y Checkout Pro deja de
   * aceptar el pago).
   */
  onlineReservationMinutes: integer("online_reservation_minutes").notNull().default(60),
  /** Horas de reserva del pago en efectivo. null = no vence. */
  cashReservationHours: integer("cash_reservation_hours"),
  /** Efectivo en el local habilitado en el checkout. */
  cashEnabled: boolean("cash_enabled").notNull().default(true),
  /** Tope de cuotas sin interés que se ofrecen en Mercado Pago. */
  maxInstallments: integer("max_installments").notNull().default(6),
  /** Turnos: duración de cada slot, turnos por slot, anticipación y horizonte. */
  slotMinutes: integer("slot_minutes").notNull().default(30),
  slotCapacity: integer("slot_capacity").notNull().default(1),
  minNoticeMin: integer("min_notice_min").notNull().default(120),
  maxDaysAhead: integer("max_days_ahead").notNull().default(30),
  /** Un turno web nace confirmado (true) o pendiente de confirmar. */
  autoConfirmAppointments: boolean("auto_confirm_appointments").notNull().default(true),
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

/**
 * Cuentas de cliente (email + contraseña scrypt). Separadas del admin:
 * otra cookie, otro secreto. `sessionVersion` invalida todas las sesiones
 * abiertas (recupero de contraseña).
 */
export const customerAccounts = pgTable("customer_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  /** WhatsApp normalizado (lib/phone.ts). */
  phone: text("phone").notNull(),
  sessionVersion: integer("session_version").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
});

/**
 * Tokens de recupero de contraseña: se guarda solo el SHA-256 del token;
 * se consume una sola vez (UPDATE condicional sobre `usedAt`).
 */
export const passwordResets = pgTable(
  "password_resets",
  {
    tokenHash: text("token_hash").primaryKey(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => customerAccounts.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("password_resets_account_idx").on(t.accountId)],
);

/**
 * Clientes (CRM): uno por WhatsApp normalizado. Los crean los pedidos, los
 * turnos y los presupuestos (con o sin cuenta).
 */
export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    /** Opcional: sin email no salen mails. */
    email: text("email"),
    /** Normalizado (lib/phone.ts): 549 + característica + número. */
    phone: text("phone").notNull(),
    address: text("address"),
    city: text("city"),
    accountId: uuid("account_id").references(() => customerAccounts.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("customers_phone_unique").on(t.phone),
    index("customers_email_idx").on(t.email),
  ],
);

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
  /** Comprobante de transferencia (Cloudinary o archivo local del admin). */
  transferReceiptUrl: text("transfer_receipt_url"),
  /** Cuenta de cliente dueña del pedido (comprado logueado o vinculado). */
  accountId: uuid("account_id").references(() => customerAccounts.id),
  /** Presupuesto del que salió el pedido ("Crear pedido"). */
  quoteId: uuid("quote_id"),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id),
  /** null en líneas libres de un presupuesto (fuera del catálogo). */
  productSlug: text("product_slug"),
  variantId: text("variant_id"),
  /** "Talle M · Negro" congelado al comprar. */
  variantLabel: text("variant_label"),
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

/* ── Turnos ───────────────────────────────────────────────── */

/** Servicios que se reservan con turno (prueba, asesoramiento). */
export const appointmentServices = pgTable("appointment_services", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  durationMin: integer("duration_min").notNull().default(30),
  /** "Se paga en el local", "Sin cargo"… */
  priceNote: text("price_note").notNull().default(""),
  /** La prueba lleva producto (y variante) a probar. */
  allowsProduct: boolean("allows_product").notNull().default(false),
  active: boolean("active").notNull().default(true),
  order: integer("order").notNull().default(0),
});

export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    number: text("number").notNull().unique(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    accountId: uuid("account_id").references(() => customerAccounts.id),
    serviceId: text("service_id")
      .notNull()
      .references(() => appointmentServices.id),
    productSlug: text("product_slug"),
    variantId: text("variant_id"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    durationMin: integer("duration_min").notNull(),
    status: text("status").$type<AppointmentStatus>().notNull(),
    source: text("source").$type<AppointmentSource>().notNull(),
    /** Lo que escribió el cliente ("MTB R29 · talle M", "primera bici"). */
    note: text("note").notNull().default(""),
    /** Nota interna del local (no la ve el cliente). */
    internalNote: text("internal_note").notNull().default(""),
    /** Token para que un cliente sin cuenta gestione su turno por link. */
    manageToken: text("manage_token").notNull(),
    /** Turno original cuando este es una reprogramación. */
    rescheduledFromId: uuid("rescheduled_from_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("appointments_starts_idx").on(t.startsAt),
    index("appointments_customer_idx").on(t.customerId),
  ],
);

/**
 * Ocupación por slot: la capacidad se garantiza con un UPDATE condicional
 * atómico (`booked < capacidad`), igual que el stock — sin transacciones
 * interactivas. Se escribe SOLO desde lib/server/appointments.ts.
 */
export const appointmentSlots = pgTable("appointment_slots", {
  startsAt: timestamp("starts_at", { withTimezone: true }).primaryKey(),
  booked: integer("booked").notNull().default(0),
});

/** Horario semanal de turnos: franjas por día (0 = domingo). */
export const scheduleRules = pgTable("schedule_rules", {
  id: serial("id").primaryKey(),
  weekday: integer("weekday").notNull(),
  /** "HH:MM" en la hora del local. */
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  active: boolean("active").notNull().default(true),
});

/** Horarios bloqueados (feriado, el dueño no está…). */
export const scheduleBlocks = pgTable(
  "schedule_blocks",
  {
    id: serial("id").primaryKey(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    reason: text("reason").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("schedule_blocks_starts_idx").on(t.startsAt)],
);

/* ── Presupuestos ─────────────────────────────────────────── */

export const quoteRequests = pgTable(
  "quote_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    number: text("number").notNull().unique(),
    kind: text("kind").$type<QuoteKind>().notNull(),
    /** Título corto para el admin (default: el comienzo del detalle). */
    title: text("title").notNull().default(""),
    detail: text("detail").notNull(),
    forBike: text("for_bike").notNull().default(""),
    budget: text("budget").notNull().default(""),
    photos: jsonb("photos").$type<string[]>().notNull().default([]),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    accountId: uuid("account_id").references(() => customerAccounts.id),
    status: text("status").$type<QuoteStatus>().notNull().default("nuevo"),
    /** Demora de entrega ("30 a 45 días", "En stock"). */
    eta: text("eta").notNull().default(""),
    validUntil: date("valid_until"),
    orderId: uuid("order_id").references(() => orders.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("quote_requests_created_idx").on(t.createdAt)],
);

/** Ítems de la cotización (libres o del catálogo). */
export const quoteLines = pgTable("quote_lines", {
  id: serial("id").primaryKey(),
  quoteId: uuid("quote_id")
    .notNull()
    .references(() => quoteRequests.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  /** Precio unitario en pesos. */
  price: integer("price").notNull(),
  quantity: integer("quantity").notNull().default(1),
  productSlug: text("product_slug"),
  variantId: text("variant_id"),
  order: integer("order").notNull().default(0),
});

/* ── WhatsApp ─────────────────────────────────────────────── */

/**
 * Plantillas de mensajes (links wa.me, sin envío automático). Variables:
 * {nombre} {día} {hora} {servicio} {producto} {número} {link}.
 */
export const whatsappTemplates = pgTable("whatsapp_templates", {
  id: text("id").$type<WhatsAppTemplateId>().primaryKey(),
  name: text("name").notNull(),
  /** Cuándo se usa ("Al reservar", "Al marcarlo listo"). */
  trigger: text("trigger").notNull().default(""),
  body: text("body").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
