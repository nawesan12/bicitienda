/**
 * Modelo de dominio de Rodar MDQ.
 *
 * Los nombres y la forma de estos tipos están pensados para mapear 1:1 al
 * schema de Drizzle cuando se incorpore Postgres en la Fase 2: cada interfaz
 * es una tabla, cada campo `xxxId` una foreign key.
 *
 * A diferencia de la tienda de indumentaria de la que nace este core, acá las
 * categorías y las marcas son datos (no uniones hardcodeadas), los productos
 * llevan una tabla de especificaciones ordenada en vez de talles, y el precio
 * puede ser null: "Precio a consultar" deriva a WhatsApp en vez del carrito.
 */

export type Slug = string;

/* ── Catálogo ─────────────────────────────────────────────── */

export interface Category {
  /** Slug corto del catálogo original: bici | mono | moto | dispo. */
  slug: Slug;
  /** Nombre plural visible en nav, filtros y tarjetas: "Bicicletas". */
  label: string;
  /** Singular en mayúsculas para la etiqueta de las tarjetas: "BICICLETA". */
  single: string;
  /** Subtítulo de la tarjeta del home. Vacío = contador de modelos. */
  sub: string;
  /** Aparece en la grilla de categorías del home. */
  home: boolean;
  /** Producto cuya foto ilustra la tarjeta. null = el primero de la categoría. */
  imgProductId: string | null;
  /** Slug largo para la URL pública: "bicicletas". */
  pathSlug: Slug;
  order: number;
  /**
   * Grupo de navegación al que pertenece (Bicicletas → MTB, Ruta/Gravel…).
   * null = categoría raíz (un grupo o una categoría suelta).
   */
  parentSlug: Slug | null;
}

/** Categoría con el contador de productos visibles (para home y filtros). */
export interface CategoryWithCount extends Category {
  count: number;
}

export interface Brand {
  id: string;
  name: string;
}

/** Par etiqueta/valor de la tabla de especificaciones, en orden de ficha. */
export interface Spec {
  label: string;
  value: string;
}

export interface Product {
  id: string;
  slug: Slug;
  name: string;
  brandId: string;
  category: Slug;
  /**
   * Precio de lista en pesos, sin decimales. null = "Precio a consultar":
   * la ficha no ofrece carrito y todos los CTAs derivan a WhatsApp.
   */
  price: number | null;
  /** true cuando el precio es orientativo ("aprox."). */
  priceApprox: boolean;
  /**
   * Precio de lista tachado (el `listPrice` del handoff). Solo se muestra
   * si es mayor que `price`, con su −%. null si no está en oferta.
   */
  oldPrice: number | null;
  /** Etiqueta libre sobre la foto: "PREMIUM", "MÁS VENDIDA", "EXTREMO"… */
  tag: string | null;
  /** Tres destacados cortos para la tarjeta del catálogo. */
  chips: string[];
  /** Specs cargadas; la ficha las ordena con `sortSpecs` (lib/specs.ts). */
  specs: Spec[];
  /** Fotos: la primera es la portada. */
  images: string[];
  /** Unidades disponibles (suma de las sucursales). 0 = sin stock. */
  stock: number;
  /**
   * Override manual del stock: "sin_stock" fuerza SIN STOCK aunque haya
   * unidades cargadas. null = se deriva de `stock`.
   */
  stockOverride: StockOverride | null;
  /** Oculto de la web pública sin borrarlo del catálogo. */
  hidden: boolean;
  /** Aparece en "Destacados" de la home (en el orden del catálogo). */
  featured: boolean;
  /** Creado o duplicado desde el admin: los únicos que se pueden eliminar. */
  custom: boolean;
  description: string;
  createdAt: string;
  /** SKU del producto (agrupa sus variantes en la importación). null = sin SKU. */
  sku: string | null;
  /** Rodado para el filtro del catálogo ("29", "27.5", "700c"…). null = no aplica. */
  rodado: string | null;
  /** Sin stock en ninguna variante → no aparece en la web. */
  hideWhenOut: boolean;
  /** "borrador" no aparece en la web aunque no esté oculto. */
  status: ProductStatus;
  /** Variantes activas (talle × color), en orden. Siempre al menos una. */
  variants: ProductVariant[];
}

export type ProductStatus = "publicado" | "borrador";

/**
 * Variante vendible de un producto (talle × color). El stock por sucursal
 * vive por variante; un producto sin talles tiene una sola, "Único".
 */
export interface ProductVariant {
  id: string;
  productSlug: Slug;
  /** "S", "M", "L", "XL", "16"… o "Único" si el producto no tiene talles. */
  size: string;
  /** "" si el producto no tiene colores. */
  color: string;
  /** Altura sugerida para el talle: "1,65 – 1,75 m". */
  heightRange: string | null;
  sku: string;
  order: number;
  active: boolean;
  /** Unidades disponibles de la variante (suma de las sucursales). */
  stock: number;
}

/** Talle de la variante única de un producto sin talles. */
export const SINGLE_SIZE = "Único";

export type StockOverride = "sin_stock";

/* ── Rutas públicas ───────────────────────────────────────── */

/**
 * Paths públicos de las secciones de rubro, definidos por la capa por
 * tienda. Las carpetas del core son neutras (/catalogo, /comunidad);
 * next.config traduce cuando la tienda elige otro path público.
 */
export interface StoreRoutes {
  /** URL pública del catálogo: "/catalogo", "/vehiculos", "/productos"… */
  catalog: string;
  /** URL pública de la sección comunidad: "/comunidad", "/e-riders"… */
  community: string;
  /**
   * Rutas fijas del core (carpetas reales de app/, sin rewrite): se listan
   * acá para que los links salgan de un solo lugar (lib/paths.ts).
   */
  /** Carrito con el pago integrado. */
  cart: string;
  /** Reserva de turnos (features.appointments). */
  appointments: string;
  /** Pedido de presupuesto (features.quotes). */
  quote: string;
  /** Mi cuenta y sus pantallas de acceso (features.accounts). */
  account: string;
  login: string;
  register: string;
  recover: string;
  /** Seguimiento de un pedido sin cuenta. */
  tracking: string;
}

/* ── Léxico ───────────────────────────────────────────────── */

/**
 * Copy de rubro de la web pública que NO es editable desde el admin (lo
 * editable vive en `TEXTS` + overrides y en `SiteContent`). El core no dice
 * "vehículos", no nombra a la comunidad ni a la pasarela: lee estas strings.
 * Cada tienda define su léxico en `lib/data/content.ts` (capa por tienda).
 */
export interface Lexicon {
  /** Palabra para una unidad del catálogo: "modelo", "producto". */
  unit: string;
  unitPlural: string;
  nav: {
    /** Alt del logo del header y el footer. */
    logoAlt: string;
    catalog: string;
    repairs: string;
    blog: string;
    /** Link que abre el test: "¿Cuál es para mí?". */
    test: string;
    about: string;
    /** Nombre corto de la comunidad en el nav: "E-Riders". */
    community: string;
    /** Label largo de la comunidad (menú mobile y footer). */
    communityLong: string;
    /** Link del menú mobile que abre la calculadora. */
    cuotas: string;
    searchPlaceholder: string;
    /** "Comparar" → "Comparar (2)". */
    compare: string;
    /** "Carrito" → "Carrito (1)". */
    cart: string;
    /** CTA de WhatsApp al pie del menú mobile. */
    advisor: string;
  };
  footer: {
    /** Título de la columna de categorías, en mayúsculas. */
    catalogTitle: string;
    blog: string;
    repairs: string;
    /** Link al PDF del catálogo. */
    catalogPdf: string;
    contactTitle: string;
  };
  contact: {
    /** Sufijo del número: "+54… — respondemos en el día". */
    waSuffix: string;
    address: string;
    hours: string;
    whatsapp: string;
    maps: string;
    /** Botón de WhatsApp general de la tarjeta de Nosotros. */
    write: string;
  };
  home: {
    catalogCta: string;
    testCta: string;
    seeAll: string;
    seeAllArticles: string;
    readArticle: string;
    toolsTestKicker: string;
    toolsTestCta: string;
    toolsCuotasKicker: string;
    toolsCuotasCta: string;
    toolsCompareKicker: string;
    toolsCompareCta: string;
    repairsKicker: string;
    repairsCta: string;
    repairsWaCta: string;
    agendaKicker: string;
    aboutLink: string;
    instagramLink: string;
    tiktokLink: string;
  };
  /** Placeholder de la foto del local mientras no se sube. */
  localPhoto: { alt: string; title: string; hint: string };
  catalog: {
    countSuffix: string;
    allLabel: string;
    allBrands: string;
    sortRel: string;
    sortAsc: string;
    sortDesc: string;
    /** Estado vacío: texto antes del link de WhatsApp y el link. */
    emptyBefore: string;
    emptyLink: string;
    metaTitle: string;
    metaDescription: string;
    categoryMetaTitle: (categoryName: string) => string;
    backLink: string;
    productMetaFallback: string;
  };
  product: {
    consult: string;
    outOfStock: string;
    outOfStockSub: string;
    noPriceSub: string;
    noPriceTitle: string;
    noPriceNote: string;
    waCta: string;
    /** "Comprar en la tienda ↗": agrega al carrito propio. */
    buyCta: string;
    compareAdd: string;
    compareIn: string;
    compareShortAdd: string;
    compareShortIn: string;
    compareTitle: string;
    specsTitle: string;
    stockAlert: string;
  };
  compare: {
    title: string;
    sub: string;
    addPlaceholder: string;
    emptyTitle: string;
    /** Texto del vacío: antes, resaltado y después ("+ VS"). */
    emptySub: [before: string, strong: string, after: string];
    countLabel: (n: number) => string;
    essentials: string;
    specsSheet: string;
    diffOn: string;
    diffOff: string;
    diffRow: string;
    diffSame: string;
    footnote: string;
    remove: string;
    trayLabel: string;
    metaDescription: string;
  };
  test: {
    step: (n: number, total: number) => string;
    match: string;
    seeModel: string;
    restart: string;
  };
  repairs: {
    kicker: string;
    workshop: (address: string, hours: string) => string;
    formKicker: string;
    formTitle: string;
    typeLabel: string;
    /** Tipos del formulario; el último es "otro". */
    types: string[];
    modelLabel: string;
    modelPlaceholder: string;
    problemLabel: string;
    problemPlaceholder: string;
    send: string;
    sendNote: string;
    metaTitle: string;
    metaDescription: string;
  };
  about: {
    kicker: string;
    visitKicker: string;
    brandsKicker: string;
    metaTitle: string;
    metaDescription: string;
  };
  blog: {
    kicker: string;
    backLink: string;
    ctaSub: string;
    moreKicker: string;
    metaTitle: string;
    metaDescription: string;
  };
  community: {
    metaTitle: string;
    metaDescription: string;
    badge: string;
    /** Línea del H1 y su parte con stroke. */
    heroLine: string;
    heroAccent: string;
    agendaTitle: string;
    joinCta: string;
    joinNote: string;
  };
  newsletter: {
    placeholder: string;
    submit: string;
    /** Clave de localStorage del aviso de suscripción. */
    storageKey: string;
  };
  notFound: {
    titleTop: string;
    titleAccent: string;
    body: string;
    cta: string;
    waCta: string;
    waMessage: string;
  };
  /** Copy de rubro del panel de administración. */
  admin: AdminLexicon;
  /** Carrito, checkout, pago, confirmación y seguimiento. */
  commerce: CommerceLexicon;
  /** Clave de localStorage del comparador. */
  compareStorageKey: string;
  /** Clave de localStorage del carrito. */
  cartStorageKey: string;
}

/**
 * Copy de rubro del panel (lo que en otro rubro cambia: "vehículo",
 * "rodada", la comunidad). Todo lo demás del admin es copy neutro del core.
 */
export interface AdminLexicon {
  /** Nombre del producto recién creado y su botón: "Nuevo vehículo". */
  newProduct: string;
  /** Acceso rápido del Resumen: "→ Cargar un vehículo nuevo". */
  newProductQuick: string;
  productCreated: string;
  productDeleted: string;
  /** Título de la confirmación y botón del tab Estado. */
  deleteProductTitle: string;
  deleteProductCta: string;
  /** Marca y etiqueta con las que nace un producto nuevo. */
  newProductBrandId: string;
  newProductTag: string | null;
  /** Ayuda del tab Foto del producto. */
  productPhotoHint: string;
  /** Ayuda de la ficha de specs sin extras. */
  extrasEmpty: string;
  /** Label del select del hero y toast al cambiarlo. */
  heroProduct: string;
  heroProductUpdated: string;
  heroPhotoHint: string;
  localPhotoHint: string;
  /** Kicker de la sección Comunidad: "E-RIDERS MDQ". */
  communityKicker: string;
  /** Agenda: "+ Nueva rodada", "Rodada agregada a la agenda"… */
  eventNew: string;
  eventQuick: string;
  eventAdded: string;
  eventDeleted: string;
  eventDeleteTitle: string;
  eventTitlePlaceholder: string;
  eventMetaPlaceholder: string;
  /** Métrica del Resumen: "RODADAS EN AGENDA". */
  eventsStat: string;
  /** Galería de la comunidad: "4 fotos al pie de la página E-Riders…". */
  galleryHint: string;
  /** Marcas sugeridas en el editor (datalist). */
  brandSuggestions?: string[];
}

/**
 * Copy del circuito de compra (drawer → checkout → pasarela → confirmación
 * → seguimiento / mis pedidos). Capa por tienda: el core no escribe
 * textos de rubro ni de pasarela.
 */
export interface CommerceLexicon {
  cart: {
    kicker: string;
    title: string;
    close: string;
    emptyTitle: string;
    emptyBody: string;
    emptyCta: string;
    unavailable: string;
    remove: string;
    less: string;
    more: string;
    subtotal: string;
    cta: string;
    note: string;
  };
  checkout: {
    metaTitle: string;
    back: string;
    kicker: string;
    title: string;
    sub: string;
    emptyTitle: string;
    emptyBody: string;
    emptyCta: string;
    stepData: string;
    stepDelivery: string;
    stepPayment: string;
    name: string;
    namePh: string;
    email: string;
    emailPh: string;
    phone: string;
    phonePh: string;
    address: string;
    addressLocalPh: string;
    addressCountryPh: string;
    notes: string;
    notesPh: string;
    free: string;
    toQuote: string;
    pickupWhere: string;
    pickupMissing: (names: string) => string;
    pickupError: string;
    /** Kicker de la caja de cuotas con tarjeta. */
    planKicker: string;
    plan1: string;
    plan3: string;
    plan6: string;
    planEach: string;
    planSurcharge: (pct: number) => string;
    planNoSurcharge: string;
    planTotal: (total: string) => string;
    planNote: string;
    depositKicker: string;
    payTotal: string;
    payDeposit: (pct: number) => string;
    depositNote: string;
    depositPlan: (amount: string) => string;
    transferKicker: string;
    transferAlias: string;
    transferBody: string;
    cashBody: (hours: number) => string;
    /** Efectivo deshabilitado por elegir envío (opcional por tienda). */
    cashPickupOnly?: string;
    summaryKicker: string;
    subtotal: string;
    shipping: string;
    shippingPending: string;
    transferLine: (pct: number) => string;
    surchargeLine: (n: number, pct: number) => string;
    total: string;
    installmentsOf: (n: number) => string;
    payNow: (pct: number) => string;
    balanceLater: string;
    shippingNote: string;
    submitPending: string;
    submitDeposit: string;
    submitOnline: string;
    submitOffline: string;
    secure: string;
  };
  /** Sandbox local de la pasarela (sin credenciales). */
  sandbox: {
    metaTitle: string;
    ribbon: string;
    title: (gateway: string) => string;
    sub: (gateway: string) => string;
    merchant: string;
    order: string;
    customer: string;
    amount: string;
    deposit: string;
    plan: string;
    plan1: string;
    planN: (n: number, cuota: string) => string;
    balance: string;
    cardLabel: string;
    cardNumber: string;
    cardHolder: string;
    cardExpiry: string;
    cardCvv: string;
    testCard: string;
    approve: (amount: string) => string;
    reject: string;
    rejected: (gateway: string) => string;
    footer: string;
  };
  confirm: {
    metaTitle: string;
    kicker: string;
    titlePaid: (n: string) => string;
    titleDeposit: (n: string) => string;
    titleConfirmed: (n: string) => string;
    /** Pago online todavía sin acreditar (opcional por tienda). */
    titlePending?: (n: string) => string;
    bodyPaid: string;
    bodyDeposit: string;
    bodyTransfer: string;
    bodyCash: string;
    bodyPending: string;
    retry: string;
    transferKicker: string;
    alias: string;
    amount: (pct: number) => string;
    reservedUntil: string;
    cashKicker: string;
    pickupCode: string;
    depositKicker: string;
    depositPaid: string;
    balance: string;
    balanceAlias: string;
    pickupKicker: string;
    planKicker: string;
    planLine: (n: number, cuota: string) => string;
    planOne: string;
    planSurcharge: (amount: string) => string;
    summaryKicker: string;
    waProof: string;
    waWrite: string;
    waProofMsg: (n: string) => string;
    waMsg: (n: string) => string;
    track: string;
  };
  tracking: {
    metaTitle: string;
    kicker: string;
    title: string;
    sub: string;
    formKicker: string;
    formTitle: string;
    number: string;
    numberPh: string;
    email: string;
    emailPh: string;
    submit: string;
    submitAccount: string;
    formNote: string;
    back: string;
    orderKicker: string;
    orderTitle: (n: string) => string;
    expired: string;
    cancelled: string;
    progressKicker: string;
    itemsKicker: string;
    total: string;
    balance: string;
    plan: (n: number, cuota: string) => string;
    pickupKicker: string;
    deliveryKicker: string;
    code: string;
    deliveryNote: string;
    deliveryFallback: string;
    waCta: string;
    waMsg: (n: string) => string;
  };
  account: {
    metaTitle: string;
    kicker: string;
    title: string;
    sub: string;
    notFound: string;
    listKicker: (n: number) => string;
    orderTitle: (n: string) => string;
    see: string;
    other: string;
  };
}

/* ── Contenido editable ───────────────────────────────────── */

/** Hero de la home, editable desde /admin/contenido. */
export interface HeroContent {
  badge: string;
  /** Línea 1 del H1. */
  l1: string;
  /** Línea 2 del H1 (en verde). */
  l2: string;
  sub: string;
  /** id del producto que ilustra el hero. */
  heroProd: string;
  /**
   * Foto HD subida para el hero. Solo se usa mientras `prodId` coincida
   * con `heroProd`; si no, va la foto de catálogo del producto.
   */
  heroPhoto: { url: string; prodId: string } | null;
  marquee: string[];
  stats: { num: string; label: string }[];
}

/** Bloque numerado: pilares de Nosotros y beneficios de la comunidad. */
export interface NumberedItem {
  n: string;
  title: string;
  body: string;
}

export interface AboutContent {
  title: string;
  intro: string;
  paras: string[];
  pillars: NumberedItem[];
  /** Foto del local (Nosotros y bloque "El local" del home). */
  localPhoto: string | null;
}

export interface RepairsContent {
  title: string;
  body: string;
  services: string[];
}

/** Recomendación del test para un perfil: modelo + argumento. */
export interface TestPick {
  id: string;
  why: string;
}

/**
 * Contenido editable de la tienda (jsonb `settings.content`). El hero va
 * plano en la raíz — como el `content` del handoff — y cada sección
 * editable del admin en su propia clave.
 */
export interface SiteContent extends HeroContent {
  nosotros: AboutContent;
  /** Página y bloque de reparaciones. */
  rep: RepairsContent;
  /** Beneficios de la comunidad. */
  perks: NumberedItem[];
  /** Galería de la comunidad: 4 slots, null = placeholder. */
  gallery: (string | null)[];
  /** Recomendación por perfil del test "¿Cuál es para mí?". */
  test: Record<string, TestPick>;
}

/** Textos sueltos de la web: clave → valor (seed `TEXTS` + overrides). */
export type SiteTexts = Record<string, string>;

/**
 * Grupo del formulario de Contenido: [clave, etiqueta, tipo]. Tipo 1 =
 * una línea, 2 = párrafo, 3 = párrafo largo.
 */
export interface TextGroup {
  tab: string;
  title: string;
  fields: [key: string, label: string, kind: 1 | 2 | 3][];
}

/** Comparación armada que ofrece el comparador vacío. */
export interface ComparePreset {
  label: string;
  ids: string[];
}

/* ── Consultas (leads) ────────────────────────────────────── */

/**
 * Mensajes prearmados de WhatsApp por contexto (capa por tienda en
 * lib/data/content.ts; lib/whatsapp.ts los arma en links).
 */
export interface WaMessages {
  product: (name: string) => string;
  repair: string;
  repairForm: (f: { tipo: string; modelo: string; problema: string }) => string;
  financing: (productName: string | null) => string;
  community: string;
  articleFallback: string;
}

export type LeadType =
  | "producto"
  | "reparacion"
  | "financiacion"
  | "prueba"
  | "comunidad"
  | "general"
  | "nota"
  | "pedido";

export type LeadStatus = "nueva" | "atendida";

/** Una consulta: se registra cada vez que alguien toca un botón de WhatsApp. */
export interface Lead {
  id: string;
  ts: Date;
  type: LeadType;
  label: string;
  detail: string;
  status: LeadStatus;
}

export interface Article {
  id: string;
  slug: Slug;
  /** Categoría editorial libre: "GUÍA", "COMUNIDAD", "NOVEDAD"… */
  tag: string;
  /** Fecha visible, p. ej. "Enero 2026". */
  date: string;
  /** Minutos de lectura (el `read` del handoff, sin el " min"). */
  readMinutes: number;
  title: string;
  excerpt: string;
  /** Cuerpo como párrafos sueltos, en orden. */
  paras: string[];
  /** Tarjeta CTA al pie de la nota. */
  ctaTitle: string;
  ctaLabel: string;
  ctaKind: "wa" | "pdf";
  /** Mensaje prearmado de WhatsApp (ctaKind "wa"). */
  ctaMsg: string;
  published: boolean;
  /** Orden de listado: menor primero (las notas nuevas van arriba). */
  order: number;
}

export interface AgendaEvent {
  id: string;
  /** Fecha real ISO para ordenar y vencer eventos pasados. */
  date: string;
  /** Día visible en el bloque de fecha: "14". */
  day: string;
  /** Mes corto visible: "SEP". */
  month: string;
  title: string;
  /** Línea de detalle: punto de encuentro, hora, dificultad. */
  meta: string;
  published: boolean;
}

/* ── Pedidos ──────────────────────────────────────────────── */

export type OrderStatus =
  | "PENDIENTE_PAGO"
  | "SEÑADO"
  | "PAGADO"
  | "EN_PREPARACION"
  | "LISTO_RETIRO"
  | "ENVIADO"
  | "ENTREGA_COORDINADA"
  | "RETIRADO"
  | "ENTREGADO"
  | "CANCELADO"
  | "VENCIDO";

export type DeliveryMethodId = "retiro" | "envio-mdq" | "envio-coordinar";

/**
 * Medios de pago del checkout. "payway" y "mercadopago" son pasarelas
 * online (cada tienda prende la suya en `features.payments`).
 */
export type PaymentMethodId =
  | "payway"
  | "mercadopago"
  | "transferencia"
  | "efectivo";

/** Pasarela que reporta un pago online. */
export type PaymentProvider = "payway" | "mp";

/** El pedido se paga completo o se reserva con una seña. */
export type PaymentMode = "total" | "sena";

export interface OrderItem {
  /** null en líneas libres (presupuestos: un importado que no está en el catálogo). */
  productSlug: Slug | null;
  variantId: string | null;
  /** "Talle M · Negro" congelado al comprar. null si no aplica. */
  variantLabel: string | null;
  name: string;
  image: string;
  quantity: number;
  /** Precio unitario congelado al momento de la compra. */
  unitPrice: number;
}

export interface Order {
  id: string;
  /** Número visible al cliente, p. ej. "1041". */
  number: string;
  status: OrderStatus;
  customerId: string;
  items: OrderItem[];
  deliveryMethod: DeliveryMethodId;
  /** Dirección de entrega. null en los retiros por el local. */
  deliveryAddress: string | null;
  deliveryNotes: string | null;
  paymentMethod: PaymentMethodId;
  paymentMode: PaymentMode;
  subtotal: number;
  discount: number;
  shippingCost: number;
  total: number;
  /** Monto de la seña cuando paymentMode es "sena". 0 si no aplica. */
  depositAmount: number;
  /** Total efectivamente cobrado hasta el momento. */
  paidAmount: number;
  /** total − paidAmount: lo que falta cobrar (saldo de seña). */
  balanceDue: number;
  /** Referencia del checkout en la pasarela, si el pago fue online. */
  providerCheckoutId: string | null;
  /** Cuotas con tarjeta (1, 3 o 6); el total ya incluye el recargo. */
  installments: number;
  /** Código a mostrar al retirar, p. ej. "RET-1041-MP". */
  pickupCode: string | null;
  /** Sucursal elegida para el retiro. null en los envíos. */
  pickupLocationId: string | null;
  /** Sucursal que despacha un envío (la de mayor cobertura del pedido). */
  fulfillmentLocationId: string | null;
  /** Vencimiento de la reserva (transferencia/efectivo sin acreditar). */
  expiresAt: string | null;
  timeline: OrderEvent[];
  createdAt: string;
}

export interface OrderEvent {
  key: "CONFIRMADO" | "PAGO" | "LISTO" | "ENTREGADO";
  label: string;
  /** Fecha/hora corta, p. ej. "sáb 20 · 11:30". null si aún no ocurrió. */
  at: string | null;
  state: "done" | "current" | "pending";
}

export interface Payment {
  id: string;
  orderId: string;
  kind: "total" | "sena" | "saldo";
  method: PaymentMethodId;
  amount: number;
  /** Pasarela que reportó el pago. null en pagos manuales. */
  provider: PaymentProvider | null;
  /** id del pago en la pasarela — clave de idempotencia del webhook. */
  providerPaymentId: string | null;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

/* ── Clientes ─────────────────────────────────────────────── */

export interface Customer {
  id: string;
  name: string;
  /** Opcional: sin email no salen mails, todo sigue por WhatsApp. */
  email: string | null;
  /** Obligatorio y normalizado (lib/phone.ts): la coordinación es por WhatsApp. */
  phone: string;
  address: string | null;
  city: string | null;
  createdAt: string;
}

/* ── Carrito ──────────────────────────────────────────────── */

export interface CartItem {
  productSlug: Slug;
  /**
   * Variante elegida (talle × color). Opcional solo si el producto tiene una
   * única variante activa: el server la resuelve.
   */
  variantId?: string;
  quantity: number;
}

/** Línea de carrito ya resuelta contra el catálogo, lista para renderizar. */
export interface CartLine extends CartItem {
  product: Product;
  /** Variante resuelta (en el server, siempre presente). */
  variant?: ProductVariant;
  unitPrice: number;
  lineTotal: number;
  /** Unidades disponibles del producto. */
  available: number;
}

/* ── Entrega y pago ───────────────────────────────────────── */

export interface DeliveryMethod {
  id: DeliveryMethodId;
  name: string;
  detail: string;
  /** null = "a cotizar por WhatsApp antes de despachar". */
  cost: number | null;
  /** true para retiro en el local — habilita el pago en efectivo. */
  isPickup: boolean;
}

export interface PaymentMethod {
  id: PaymentMethodId;
  name: string;
  detail: string;
  /** Lleva el descuento por transferencia de Ajustes (`transferDiscount`). */
  transferDiscount: boolean;
  /** Admite pagar en 3 o 6 cuotas con el recargo r3/r6 de Ajustes. */
  allowsInstallments: boolean;
  /** Solo disponible cuando la entrega es retiro en el local. */
  pickupOnly: boolean;
  /** Admite reservar con seña además del pago total. */
  allowsDeposit: boolean;
}

/* ── Stock por sucursal ───────────────────────────────────── */

/**
 * Motivo de cada movimiento de stock. Todo cambio de inventario pasa por
 * `applyStockMovement` y queda asentado en el libro `stock_movements`.
 */
export type StockMovementReason =
  | "seed"
  | "venta"
  | "cancelacion"
  | "vencimiento"
  | "ajuste"
  | "transferencia"
  | "reposicion"
  | "importacion";

/* ── Configuración de la tienda ───────────────────────────── */

/**
 * Sucursal. En `lib/config.ts` es el seed; en runtime viven en la tabla
 * `locations` y se administran desde /admin/sucursales. La "principal" es
 * la activa con menor `order`.
 */
export interface StoreLocation {
  id: string;
  name: string;
  shortName: string;
  address: string;
  hours: string;
  /** Link "Cómo llegar" a Google Maps. */
  mapsUrl: string;
  /** Orden de listado; la principal es la de menor valor. */
  order?: number;
  /** Una sucursal inactiva no aparece en la web ni recibe pedidos. */
  active?: boolean;
}

/** Interruptores de módulos del core: cada tienda prende lo que usa. */
export interface FeatureFlags {
  comparador: boolean;
  blog: boolean;
  agenda: boolean;
  /** Test "¿Cuál es para mí?" y calculadora de cuotas. */
  asesor: boolean;
  pos: boolean;
  editorVisual: boolean;
  /**
   * Emails transaccionales (confirmación, estado, vuelta de stock). false =
   * la tienda no manda mails: no se envía nada y se oculta "Avisame cuando
   * vuelva". Sin definir = prendidos.
   */
  emails?: boolean;
  /** Reparaciones: página, formulario y bloque de la home. Sin definir = prendido. */
  repairs?: boolean;
  /** Comunidad (perks, galería y agenda). Sin definir = prendido. */
  community?: boolean;
  /** Reserva con seña en pagos online. Sin definir = prendida. */
  deposit?: boolean;
  /** Variantes talle × color visibles en la web y el admin. */
  variants?: boolean;
  /** Cuentas de cliente (registro, login, mis pedidos/turnos). */
  accounts?: boolean;
  /** Turnos en el local (prueba, asesoramiento) con agenda. */
  appointments?: boolean;
  /** Pedidos de presupuesto. */
  quotes?: boolean;
  /** Pago en efectivo al retirar (la reserva vence según `cashReservationHours`). */
  cashPayment?: boolean;
  /** Solo retiro en el local: sin envíos. */
  pickupOnly?: boolean;
  /** Importación de productos desde CSV/XLSX. */
  csvImport?: boolean;
  /** Pasarelas de pago online habilitadas en el checkout. */
  payments: {
    payway: boolean;
    mp: boolean;
  };
  /**
   * Secciones opcionales del panel (core, apagadas por defecto): una
   * tienda con varias sucursales o que quiere su listado de clientes las
   * prende. Apagadas, ni aparecen en la navegación ni responden.
   */
  admin?: {
    /** /admin/sucursales: alta, orden y baja de sucursales. */
    locations?: boolean;
    /** /admin/clientes: clientes derivados de los pedidos. */
    customers?: boolean;
  };
}

export interface StoreConfig {
  /**
   * Identificador corto y estable de la tienda (kebab-case): carpeta en
   * Cloudinary y prefijos técnicos. Nunca se muestra.
   */
  slug: string;
  /**
   * URL pública de producción (sin barra final): canonicals, sitemap,
   * JSON-LD y links de retorno de la pasarela. NEXT_PUBLIC_SITE_URL la pisa.
   */
  siteUrl: string;
  brandName: string;
  legalName: string;
  city: string;
  /**
   * Zona horaria IANA del local: todas las fechas que ve el dueño o el
   * cliente (admin, CSV, timeline, emails) se formatean en esta zona, no
   * en la del server (UTC en Vercel).
   */
  timeZone: string;
  whatsapp: string;
  /** Grupo de WhatsApp de la comunidad E-Riders. null si no hay. */
  whatsappGroupUrl: string | null;
  instagram: string;
  tiktok: string | null;
  transferAlias: string;
  /** Descuento por transferencia en porcentaje: 5 = 5% (el `dto` del handoff). */
  transferDiscount: number;
  /** Recargo % del Plan MiPyME en 3 cuotas (0 = sin recargo). */
  r3: number;
  /** Recargo % del Plan MiPyME en 6 cuotas. */
  r6: number;
  /** Dirección visible del local (el `dir` del handoff). */
  address: string;
  /** Horario visible del local (el `hor` del handoff). */
  hours: string;
  /** Link "Cómo llegar" a Google Maps. */
  mapsUrl: string;
  /**
   * Horario en formato schema.org para el JSON-LD `LocalBusiness`
   * ("Mo-Sa 10:00-18:00"). El visible es `hours`.
   */
  openingHours: string[];
  /** Tipo schema.org del negocio: "LocalBusiness", "BikeStore"… */
  businessType: string;
  /** false = la web es 100% WhatsApp: sin carrito ni "Comprar". */
  ventaOnline: boolean;
  /** PDF descargable del catálogo. null si la tienda no tiene. */
  catalogPdfUrl: string | null;
  /** Seña como fracción del total, 0–1. */
  depositRate: number;
  /** Total mínimo del pedido para ofrecer reserva con seña. */
  depositMinTotal: number;
  /** Horas de validez de una reserva sin pago acreditado. */
  reservationHours: number;
  /** Costo del envío a domicilio dentro de la ciudad. */
  localShippingCost: number;
  /** false = modo vidriera: todos los precios muestran "Consultar" y no hay carrito. */
  showPrices: boolean;
  /** Stock ≤ este valor se muestra en rojo en el admin. */
  criticalStock: number;
  /** Stock ≤ este valor se muestra en ámbar en el admin. */
  lowStock: number;
  locations: StoreLocation[];
  features: FeatureFlags;
  /** Prefijo del número de pedido: "BT-" → "BT-10482". "" = solo el número. */
  orderPrefix?: string;
  /** Primer número de pedido (el contador arranca en este − 1). */
  firstOrderNumber?: number;
  /** Colores de marca para los emails (sin definir = paleta neutra del core). */
  emailColors?: EmailColors;
}

/** Paleta de los emails transaccionales. */
export interface EmailColors {
  /** Fondo del header y textos fuertes. */
  ink: string;
  /** Fondo de la página del mail. */
  paper: string;
  /** Acento de acciones (botones, filete del header). */
  accent: string;
  /** Texto sobre el acento. */
  onAccent: string;
  /** Ofertas / urgencia. */
  offer: string;
}

/* ── Turnos ───────────────────────────────────────────────── */

export type AppointmentStatus =
  | "pendiente"
  | "confirmado"
  | "asistio"
  | "no_asistio"
  | "cancelado"
  | "reprogramado";

/** De dónde salió el turno: la web (cliente) o cargado a mano en el admin. */
export type AppointmentSource = "web" | "manual";

/* ── Presupuestos ─────────────────────────────────────────── */

export type QuoteKind = "bici" | "rep" | "imp" | "otro";

export type QuoteStatus =
  | "nuevo"
  | "cotizado"
  | "aceptado"
  | "pedido_creado"
  | "rechazado";

/* ── Plantillas de WhatsApp ───────────────────────────────── */

export type WhatsAppTemplateId = "turno_confirmado" | "pedido_listo";

/* ── Seed del catálogo (capa por tienda) ──────────────────── */

/** Variante del seed: sin `sku` se deriva del slug del producto. */
export interface SeedVariant {
  size: string;
  color?: string;
  heightRange?: string | null;
  sku?: string;
  /** Unidades iniciales en la sucursal principal. */
  stock: number;
}

/**
 * Producto del seed: los campos nuevos son opcionales (default: sin SKU,
 * sin rodado, publicado). Sin `variants` nace con una variante "Único"
 * con el `stock` del producto.
 */
export type SeedProduct = Omit<
  Product,
  "sku" | "rodado" | "hideWhenOut" | "status" | "variants"
> &
  Partial<Pick<Product, "sku" | "rodado" | "hideWhenOut" | "status">> & {
    variants?: SeedVariant[];
  };

export type SeedCategory = Omit<Category, "parentSlug"> & {
  parentSlug?: Slug | null;
};
