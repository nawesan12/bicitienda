import type {
  DeliveryMethod,
  PaymentMethod,
  StoreConfig,
  StoreRoutes,
} from "@/lib/types";
// Import relativo: next.config.ts importa este archivo y ahí "@/" no resuelve.
import { PAYMENT_SETTINGS, STORE_INFO } from "./data/demo/settings";

/**
 * ── CAPA POR TIENDA ──────────────────────────────────────────
 * Configuración de BiciTienda MDQ. Este archivo, `app/theme.css` (tokens),
 * `app/fonts.ts` (tipografías), `app/layout.tsx` (metadata), `lib/data/`
 * (seed y léxico; los datos del prototipo en `lib/data/demo/`),
 * y `public/brand/` son los únicos lugares donde
 * vive la marca: el resto del código es core y no sabe qué tienda es.
 *
 * Lo editable en runtime (WhatsApp, alias, recargos, venta online…) vive
 * en la tabla `settings` y se edita desde /admin/ajustes: lo de acá es el
 * valor del seed (`pnpm db:seed`).
 *
 * Los datos del local que el cliente todavía no pasó quedan como en el
 * prototipo ("[… a confirmar]", ver STORE_INFO en lib/data/demo/settings.ts).
 * El WhatsApp necesita dígitos para los links wa.me: hasta tener el real
 * queda un número inexistente (549 223 000-0000).
 */
/** WhatsApp placeholder (inexistente) hasta que el cliente pase el real. */
export const WHATSAPP_PENDING = "5492230000000";

export const store: StoreConfig = {
  /** Carpeta en Cloudinary y prefijos técnicos: kebab-case, estable. */
  slug: "bicitienda",
  // Dominio provisorio: confirmarlo antes de publicar.
  siteUrl: "https://bicitiendamdq.com.ar",
  brandName: STORE_INFO.name,
  legalName: STORE_INFO.name,
  city: `${STORE_INFO.city}, Argentina`,
  timeZone: "America/Argentina/Buenos_Aires",
  whatsapp: WHATSAPP_PENDING, // ← [Número a confirmar] (STORE_INFO.whatsapp)
  whatsappGroupUrl: null,
  instagram: STORE_INFO.instagram.replace(/^@/, ""),
  tiktok: null,
  transferAlias: PAYMENT_SETTINGS.alias,
  transferDiscount: PAYMENT_SETTINGS.transferDiscountPct, // % off por transferencia
  r3: 0, // cuotas sin interés (Mercado Pago, hasta settings.maxInstallments)
  r6: 0,
  address: `${STORE_INFO.address} · ${STORE_INFO.city}`,
  hours: STORE_INFO.hours,
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=BiciTienda+MDQ+Mar+del+Plata",
  // Horario de turnos del local (WEEKLY_SCHEDULE): lun–vie mañana y tarde,
  // sábado solo a la mañana. Ajustarlo cuando el cliente confirme el de
  // atención al público.
  openingHours: ["Mo-Fr 10:00-13:00", "Mo-Fr 16:00-19:00", "Sa 10:00-13:00"],
  /** Tipo schema.org del negocio (JSON-LD). */
  businessType: "BikeStore",
  ventaOnline: true,
  /** PDF del catálogo en public/brand/ (o Cloudinary). null = sin link. */
  catalogPdfUrl: null,
  // Sin seña (features.deposit = false): estos valores no se usan.
  depositRate: 0.1,
  depositMinTotal: 300_000,
  // Reserva de una transferencia sin acreditar (el efectivo tiene la suya
  // en settings.cashReservationHours: null = no vence).
  reservationHours: PAYMENT_SETTINGS.transferReservationHours,
  // Solo retiro en el local (features.pickupOnly): sin envío.
  localShippingCost: 0,
  showPrices: true,
  criticalStock: 1,
  lowStock: 3,
  // Un solo local: todo el stock y los retiros salen de acá.
  locations: [
    {
      id: "central",
      name: STORE_INFO.name,
      shortName: "Local",
      address: `${STORE_INFO.address} · ${STORE_INFO.city}`,
      hours: STORE_INFO.hours,
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=BiciTienda+MDQ+Mar+del+Plata",
      order: 0,
      active: true,
    },
  ],
  features: {
    // Módulos de contenido del core que BiciTienda no usa.
    comparador: false,
    blog: false,
    agenda: false,
    asesor: false,
    repairs: false,
    community: false,
    pos: false,
    editorVisual: false,
    emails: true,
    // Sin seña: se paga el total (MP) o se reserva (transferencia/efectivo).
    deposit: false,
    // Módulos de BiciTienda.
    variants: true,
    accounts: true,
    appointments: true,
    quotes: true,
    cashPayment: true,
    pickupOnly: true,
    csvImport: true,
    // Mercado Pago Checkout Pro (sin credenciales: sandbox local). Payway
    // queda en el core, apagado.
    payments: { payway: false, mp: true },
    admin: { locations: false, customers: true },
  },
  orderPrefix: "BT-",
  firstOrderNumber: 10482,
  emailColors: {
    ink: "#121110",
    paper: "#f4efe4",
    accent: "#ffd21f",
    onAccent: "#121110",
    offer: "#d7261e",
  },
};

/**
 * Paths públicos de las secciones de rubro. El starter usa los neutros
 * (las carpetas reales del core → sin rewrites); una tienda puede elegir
 * otros ("/productos", "/club"…) y next.config genera el rewrite y el
 * redirect inverso. Los links del core SIEMPRE pasan por lib/paths.ts.
 */
export const routes: StoreRoutes = {
  catalog: "/catalogo",
  community: "/comunidad",
  cart: "/checkout",
  appointments: "/turnos",
  quote: "/presupuesto",
  account: "/cuenta",
  login: "/cuenta/ingresar",
  register: "/cuenta/registro",
  recover: "/cuenta/recuperar",
  tracking: "/seguimiento",
};

const allDeliveryMethods: DeliveryMethod[] = [
  {
    id: "retiro",
    name: "Retiro en el local",
    detail: `${store.locations[0].address} · coordinamos el retiro por WhatsApp`,
    cost: 0,
    isPickup: true,
  },
  {
    // El id es fijo del core ("envío en la ciudad del local").
    id: "envio-mdq",
    name: "Entrega a domicilio — en la ciudad",
    detail: "coordinamos día y franja horaria por WhatsApp",
    cost: store.localShippingCost,
    isPickup: false,
  },
  {
    id: "envio-coordinar",
    name: "Envío al resto del país",
    detail: "te cotizamos el envío por WhatsApp antes de despachar",
    cost: null,
    isPickup: false,
  },
];

/** Entregas del checkout: con `features.pickupOnly`, solo el retiro. */
export const deliveryMethods: DeliveryMethod[] = allDeliveryMethods.filter(
  (d) => !store.features.pickupOnly || d.isPickup,
);

/**
 * Medios de pago del checkout. Las pasarelas online se filtran por
 * `features.payments`: Payway y Mercado Pago son intercambiables para el
 * core (misma seña, mismas cuotas, mismo `applyPaymentResult`).
 */
const allPaymentMethods: PaymentMethod[] = [
  {
    id: "payway",
    name: "Tarjeta de crédito o débito",
    detail: "1, 3 o 6 cuotas vía Payway",
    transferDiscount: false,
    allowsInstallments: true,
    pickupOnly: false,
    allowsDeposit: true,
  },
  {
    id: "mercadopago",
    name: "Mercado Pago",
    detail: "Tarjeta de crédito, débito o dinero en cuenta. Hasta 6 cuotas sin interés.",
    transferDiscount: false,
    // Las cuotas se eligen en Checkout Pro (tope: settings.maxInstallments)
    // y se leen del pago al conciliar.
    allowsInstallments: false,
    pickupOnly: false,
    allowsDeposit: true,
  },
  {
    id: "transferencia",
    name: "Transferencia bancaria",
    detail: `${store.transferDiscount}% off · reservamos el stock ${store.reservationHours} hs`,
    transferDiscount: true,
    allowsInstallments: false,
    pickupOnly: false,
    allowsDeposit: false,
  },
  {
    id: "efectivo",
    name: "Efectivo en el local",
    detail: "Reservás online y pagás cuando la retirás.",
    transferDiscount: false,
    allowsInstallments: false,
    pickupOnly: true,
    allowsDeposit: false,
  },
];

export const paymentMethods: PaymentMethod[] = allPaymentMethods.filter(
  (p) =>
    (p.id !== "payway" || store.features.payments.payway) &&
    (p.id !== "mercadopago" || store.features.payments.mp) &&
    (p.id !== "efectivo" || store.features.cashPayment !== false),
);

/** Medios que cobran por una pasarela online (no se confirman a mano). */
export function isOnlinePayment(id: string): boolean {
  return id === "payway" || id === "mercadopago";
}

/**
 * Link de WhatsApp con mensaje prellenado. Sin bot: solo abre el chat.
 * El número viene del caller (getStore() lo lee de la DB, editable desde
 * /admin/ajustes) — el de este archivo es solo el valor del seed.
 */
export function whatsappLink(whatsapp: string, message: string): string {
  return `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`;
}
