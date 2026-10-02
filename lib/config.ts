import type {
  DeliveryMethod,
  PaymentMethod,
  StoreConfig,
  StoreRoutes,
} from "@/lib/types";

/**
 * ── CAPA POR TIENDA ──────────────────────────────────────────
 * Configuración de la tienda. Este archivo, `app/theme.css` (tokens),
 * `app/fonts.ts` (tipografías), `app/layout.tsx` (metadata), `lib/data/`
 * (seed y léxico), `lib/advisor.ts` (test) y `public/brand/` son los
 * únicos lugares donde vive la marca: el resto del código es core y no
 * sabe qué tienda es.
 *
 * Lo editable en runtime (WhatsApp, alias, recargos, seña, venta online…)
 * vive en la tabla `settings` y se edita desde /admin/ajustes: lo de acá es
 * el valor del seed (`pnpm db:seed`).
 *
 * "Faro" es la marca placeholder del starter: reemplazá TODOS los
 * valores de este archivo al crear una tienda real.
 */
export const store: StoreConfig = {
  /** Carpeta en Cloudinary y prefijos técnicos: kebab-case, estable. */
  slug: "bicitienda",
  // Cambiala por el dominio real antes de publicar.
  siteUrl: "https://faro.example.com",
  brandName: "BiciTienda MDQ",
  legalName: "BiciTienda MDQ",
  city: "Mar del Plata, Argentina",
  timeZone: "America/Argentina/Buenos_Aires",
  whatsapp: "5492230000000", // ← número real de la tienda
  whatsappGroupUrl: null, // ← link del grupo de la comunidad, si hay
  instagram: "faro.tienda",
  tiktok: null,
  transferAlias: "FARO.TIENDA", // ← alias/CBU real
  transferDiscount: 5, // % de descuento por transferencia
  r3: 0, // % de recargo en 3 cuotas (0 = sin recargo)
  r6: 0, // % de recargo en 6 cuotas
  address: "Av. Ejemplo 1234 · Mar del Plata",
  hours: "Lun a vie 9–18 hs · Sáb 9–13 hs",
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=Mar+del+Plata",
  openingHours: ["Mo-Fr 09:00-18:00", "Sa 09:00-13:00"],
  /** Tipo schema.org del negocio (JSON-LD): "Store", "ClothingStore"… */
  businessType: "Store",
  ventaOnline: true,
  /** PDF del catálogo en public/brand/ (o Cloudinary). null = sin link. */
  catalogPdfUrl: null,
  depositRate: 0.1,
  depositMinTotal: 300_000,
  reservationHours: 72,
  localShippingCost: 8000,
  showPrices: true,
  criticalStock: 1,
  lowStock: 3,
  // Dos sucursales de ejemplo: la primera es la principal (recibe el stock
  // del seed). Una tienda de un solo local deja únicamente la primera y
  // apaga `features.admin.locations`.
  locations: [
    {
      id: "central",
      name: "Av. Ejemplo 1234",
      shortName: "Central",
      address: "Av. Ejemplo 1234 · Mar del Plata",
      hours: "Lun a vie 9–18 hs · Sáb 9–13 hs",
      mapsUrl:
        "https://www.google.com/maps/search/?api=1&query=Mar+del+Plata",
      order: 0,
      active: true,
    },
    {
      id: "puerto",
      name: "12 de Octubre 3456",
      shortName: "Puerto",
      address: "12 de Octubre 3456 · Mar del Plata",
      hours: "Mar a sáb 10–19 hs",
      mapsUrl:
        "https://www.google.com/maps/search/?api=1&query=Mar+del+Plata",
      order: 1,
      active: true,
    },
  ],
  features: {
    comparador: true,
    blog: true,
    agenda: true,
    asesor: true,
    pos: false,
    editorVisual: false,
    // Pasarela online del checkout: Payway (formulario hosteado) o Mercado
    // Pago (Checkout Pro). Sin credenciales, las dos usan el sandbox local.
    payments: { payway: true, mp: false },
    // Secciones opcionales del panel: sucursales (hay dos de ejemplo) y el
    // listado de clientes derivado de los pedidos.
    admin: { locations: true, customers: false },
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
};

export const deliveryMethods: DeliveryMethod[] = [
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
    detail: "Tarjeta en 1, 3 o 6 cuotas",
    transferDiscount: false,
    allowsInstallments: true,
    pickupOnly: false,
    allowsDeposit: true,
  },
  {
    id: "transferencia",
    name: "Transferencia bancaria",
    detail: `${store.transferDiscount}% de descuento · alias ${store.transferAlias}`,
    transferDiscount: true,
    allowsInstallments: false,
    pickupOnly: false,
    allowsDeposit: false,
  },
  {
    id: "efectivo",
    name: "Efectivo en el local",
    detail: `solo retiro · reserva por ${store.reservationHours} hs`,
    transferDiscount: false,
    allowsInstallments: false,
    pickupOnly: true,
    allowsDeposit: false,
  },
];

export const paymentMethods: PaymentMethod[] = allPaymentMethods.filter(
  (p) =>
    (p.id !== "payway" || store.features.payments.payway) &&
    (p.id !== "mercadopago" || store.features.payments.mp),
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
