/**
 * Tipos de los datos demo de BiciTienda MDQ (sacados de la clase de lógica
 * de `design_handoff_bicitienda_mdq/BiciTienda MDQ.dc.html`, ≈ líneas
 * 635–853).
 *
 * Son tipos propios y simples a propósito: NO dependen del schema de la
 * base ni de `lib/types.ts`. El seed (B1) los traduce a filas de la DB y la
 * UI de B2/B3 los puede usar directo mientras tanto.
 *
 * Convenciones:
 *  - Montos en pesos enteros (sin decimales), SIEMPRE precio de lista. El
 *    10% off de transferencia y las cuotas se derivan de los settings.
 *  - Fechas en ISO local de Mar del Plata (`-03:00`); los turnos usan
 *    `date` (YYYY-MM-DD) + `time` (HH:MM).
 *  - Teléfonos en el formato del prototipo ("223 555-0182"); el core los
 *    normaliza al guardarlos.
 *  - Fotos: id numérico de Pexels. `demoPhoto(id)` (photos.ts) lo resuelve
 *    a Cloudinary vía `lib/data/image-manifest.json` (`pexels:<id>`).
 */

/** Id de una foto de Pexels del prototipo. */
export type PexelsId = number;

/* ── Catálogo ───────────────────────────────────────────── */

export type CategoryGroupSlug = "bicicletas" | "accesorios" | "repuestos" | "importados";

export interface DemoCategory {
  slug: string;
  name: string;
  /** null = grupo de primer nivel (ítem del nav). */
  parentSlug: CategoryGroupSlug | null;
  order: number;
}

export type Talle = "S" | "M" | "L" | "XL";

/** Etiqueta de la card. Normalizada (ver products.ts). */
export type ProductTag = "Más vendida" | "Oferta" | "Nuevo";

export type ProductStatus = "publicado" | "borrador";

export interface DemoVariant {
  /** "S" | "M" | "L" | "XL" o "Único". */
  size: Talle | "Único";
  /** Color; null = el producto tiene un solo color (no se muestra selector). */
  color: string | null;
  /** Altura sugerida ("1,55 – 1,65 m"); solo bicis con talle. */
  heightRange: string | null;
  sku: string;
  stock: number;
}

export interface DemoSpec {
  label: string;
  value: string;
}

export interface DemoProduct {
  slug: string;
  name: string;
  /** Slug de la categoría hoja (tipo) o del grupo si no tiene tipo. */
  categorySlug: string;
  /** Rótulo corto de la card ("MTB", "Gravel", "Cascos"…): "CATEGORÍA / MARCA". */
  cardLabel: string;
  /** null = "[Marca a confirmar]" (pendiente del cliente). */
  brand: string | null;
  sku: string;
  price: number;
  tag: ProductTag | null;
  /** Foto de portada + galería (ids de Pexels). */
  photos: PexelsId[];
  /** Rodado para el filtro del catálogo ("29", "27.5"…); null si no aplica. */
  rodado: string | null;
  /** "Disponible para prueba" (turno de prueba de bici). */
  testRide: boolean;
  status: ProductStatus;
  featured: boolean;
  hideWhenOut: boolean;
  variants: DemoVariant[];
  description: string | null;
  specs: DemoSpec[];
  /** Colores ofrecidos (si hay más de uno aparece el selector). */
  colors: DemoColor[];
}

export interface DemoColor {
  name: string;
  /** Uno o dos hex (bicolor: "Negro / amarillo"). */
  swatch: string[];
}

/* ── Pedidos ────────────────────────────────────────────── */

export type PaymentMethod = "mp" | "transfer" | "cash";

/**
 * Estados del pedido del prototipo. `transf_pendiente` y `paga_en_local`
 * son "pendiente de pago" según el medio; `cancelado` lo suma el plan.
 */
export type DemoOrderStatus =
  | "transf_pendiente"
  | "paga_en_local"
  | "pagado"
  | "armando"
  | "listo_retiro"
  | "retirado"
  | "cancelado";

export interface DemoCustomerRef {
  name: string;
  phone: string;
  email?: string | null;
}

export interface DemoOrderItem {
  /** null = producto que no está en el catálogo demo (ej. "Casco infantil"). */
  productSlug: string | null;
  /** Nombre tal como figura en el pedido. */
  name: string;
  size: Talle | "Único" | null;
  color: string | null;
  /** Rótulo de variante del prototipo ("Talle M · Negro/amarillo"). */
  variantLabel: string;
  qty: number;
  /** Precio de LISTA unitario (el descuento de transferencia se calcula). */
  unitPrice: number;
  photo: PexelsId;
}

export interface DemoOrder {
  number: string;
  customer: DemoCustomerRef;
  createdAt: string;
  payment: PaymentMethod;
  /** Solo MP: cuotas elegidas (1 = un pago). */
  installments: number | null;
  status: DemoOrderStatus;
  items: DemoOrderItem[];
  /** Comprobante de transferencia adjunto (solo demo de 3a). */
  transferReceipt: string | null;
}

/* ── Turnos ─────────────────────────────────────────────── */

export type ServiceKey = "prueba" | "asesoramiento";

export type DemoAppointmentStatus =
  | "pendiente"
  | "confirmado"
  | "asistio"
  | "no_asistio"
  | "cancelado"
  | "reprogramado";

export interface DemoAppointment {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  customer: DemoCustomerRef;
  service: ServiceKey;
  /** Lo que el cliente cuenta / bici a probar ("MTB R29 · talle M"). */
  detail: string;
  /** Bici a probar (solo prueba, si se identifica en el catálogo). */
  productSlug: string | null;
  size: Talle | null;
  status: DemoAppointmentStatus;
  /** Nota interna del admin. */
  note: string | null;
}

/* ── Presupuestos ───────────────────────────────────────── */

export type QuoteKind = "bici" | "repuesto" | "importado" | "otro";

export type QuoteStatus = "nuevo" | "cotizado" | "aceptado" | "pedido_creado" | "rechazado";

export interface DemoQuoteLine {
  name: string;
  price: number;
}

export interface DemoQuote {
  number: string;
  customer: DemoCustomerRef;
  kind: QuoteKind;
  createdAt: string;
  status: QuoteStatus;
  title: string;
  detail: string;
  /** "Para qué bici (opcional)". */
  forBike: string | null;
  /** "Presupuesto aproximado (opcional)", texto libre. */
  budget: string | null;
  lines: DemoQuoteLine[];
  /** Demora ("30 a 45 días", "En stock"). */
  eta: string;
  validUntil: string; // YYYY-MM-DD
  /** Pedido generado al "Crear pedido" (si existe en ORDERS). */
  orderNumber: string | null;
}

export interface DemoQuoteKind {
  key: QuoteKind;
  label: string;
  description: string;
  /** Placeholder del textarea "Contanos el detalle". */
  placeholder: string;
}

/* ── Clientes ───────────────────────────────────────────── */

export interface DemoCustomer {
  name: string;
  email: string | null;
  phone: string;
  /** Mes y año de alta ("marzo 2025") → `since` ISO aproximado. */
  since: string; // YYYY-MM
  /** Agregados que muestra el prototipo en 3e (históricos, ver customers.ts). */
  stats: {
    orders: number;
    appointments: number;
    lastContact: string;
    spent: number;
  };
  /** Tiene cuenta (email + contraseña) en la demo. */
  hasAccount: boolean;
}

/* ── Settings ───────────────────────────────────────────── */

export interface TimeRange {
  from: string; // HH:MM
  to: string; // HH:MM (exclusivo: último turno = to − slotMinutes)
}

export interface DaySchedule {
  /** 0 = lunes … 6 = domingo (como el prototipo). */
  day: number;
  label: string;
  open: boolean;
  am: TimeRange | null;
  pm: TimeRange | null;
}

export interface DemoService {
  key: ServiceKey;
  /** Nombre en la tienda (2f). */
  name: string;
  /** Nombre en Ajustes (3f), si difiere. */
  adminName: string;
  description: string;
  durationMin: number;
  active: boolean;
  /** Nota de Ajustes: "30 min · se paga en el local". */
  note: string;
}

export interface DemoScheduleBlock {
  date: string; // YYYY-MM-DD
  from: string | null; // null = todo el día
  to: string | null;
  reason: string;
}

export type WhatsAppTemplateKey = "turno_confirmado" | "pedido_listo";

export interface DemoWhatsAppTemplate {
  key: WhatsAppTemplateKey;
  name: string;
  /** Cuándo se usa (rótulo de Ajustes). */
  when: string;
  /** Placeholders: {nombre} {día} {hora} {servicio} {producto} {número} {link} */
  body: string;
}
