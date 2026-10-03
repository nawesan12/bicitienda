import { store } from "@/lib/config";
import { brands, PLACEHOLDER_BRAND_ID } from "@/lib/data/catalog";
import { COPY, DEMO_PHOTOS, manifestKey } from "@/lib/data/demo";
import type {
  AgendaEvent,
  Article,
  ComparePreset,
  LeadType,
  Lexicon,
  SiteContent,
  WaMessages,
} from "@/lib/types";

/**
 * ── CAPA POR TIENDA ──────────────────────────────────────────
 * Léxico (solo código) + SEED del contenido editable de BiciTienda MDQ
 * (copy del prototipo en lib/data/demo/copy.ts).
 * `content`, `articles` y `agendaEvents` viven en la base (tablas settings,
 * articles y agenda_events) y se editan desde el admin; acá son el seed
 * inicial que puebla `pnpm db:seed`. La web pública los lee de la DB vía
 * lib/server/queries.ts. Los textos sueltos editables están en
 * lib/data/texts.ts.
 */

/**
 * Copy de rubro que no es editable desde el admin: el core lee estas
 * strings, nunca las hardcodea. Reescribí cada valor con la voz de la
 * marca real (el léxico de Rodar es el ejemplo de un caso con carácter).
 */
export const lexicon: Lexicon = {
  unit: "modelo",
  unitPlural: "modelos",
  nav: {
    logoAlt: `${store.brandName} — Bicicletería en Mar del Plata`,
    catalog: "Catálogo",
    repairs: "Service",
    blog: "Novedades",
    test: "¿Cuál es para mí?",
    about: "Nosotros",
    community: "Comunidad",
    communityLong: "La comunidad",
    cuotas: "Calculadora de cuotas",
    searchPlaceholder: COPY.header.searchPlaceholder,
    compare: "Comparar",
    cart: "Carrito",
    advisor: "Hablá con nosotros",
  },
  footer: {
    catalogTitle: "PRODUCTOS",
    blog: "Novedades y guías",
    repairs: "Service y garantía",
    catalogPdf: "Catálogo (PDF)",
    contactTitle: "CONTACTO",
  },
  contact: {
    waSuffix: "respondemos en el día",
    address: "Dirección",
    hours: "Horarios",
    whatsapp: "WhatsApp",
    maps: "Cómo llegar ↗",
    write: "Escribinos",
  },
  home: {
    catalogCta: "Conocé los productos",
    testCta: "¿Cuál es para mí? →",
    seeAll: "Ver todo →",
    seeAllArticles: "Ver todas →",
    readArticle: "Leer la nota →",
    toolsTestKicker: "TEST · 3 PREGUNTAS",
    toolsTestCta: "Hacer el test →",
    toolsCuotasKicker: "FINANCIACIÓN",
    toolsCuotasCta: "Calcular →",
    toolsCompareKicker: "HASTA 3 PRODUCTOS",
    toolsCompareCta: "Ir al catálogo →",
    repairsKicker: "SERVICE Y GARANTÍA",
    repairsCta: "Pedir un diagnóstico",
    repairsWaCta: "Escribinos por WhatsApp",
    agendaKicker: "PRÓXIMOS EVENTOS",
    testRideCta: "Coordinar una visita",
    aboutLink: "Conocé más sobre nosotros →",
    instagramLink: "Instagram →",
    tiktokLink: "TikTok →",
  },
  localPhoto: {
    alt: `El local de ${store.brandName}`,
    title: "Foto del local",
    hint: "Se sube desde el panel de admin → Nosotros",
  },
  catalog: {
    countSuffix: "catálogo completo",
    allLabel: "Todos",
    allBrands: "Todas las marcas",
    sortRel: "Orden: destacados",
    sortAsc: "Menor precio",
    sortDesc: "Mayor precio",
    emptyBefore: "No encontramos nada con esa búsqueda. Probá con otra palabra o ",
    emptyLink: "preguntanos por WhatsApp",
    metaTitle: `Productos de ${store.brandName}`,
    metaDescription:
      "Bicicletas MTB, ruta, urbanas e infantiles, accesorios y repuestos. Retiro en el local en Mar del Plata.",
    categoryMetaTitle: (name) => `${name} · ${store.brandName}`,
    backLink: "← Volver a productos",
    productMetaFallback: "Producto",
  },
  product: {
    consult: "Consultar",
    outOfStock: "Sin stock",
    outOfStockSub: "Avisame cuando vuelva",
    noPriceSub: "Respuesta en el día",
    noPriceTitle: "Precio a consultar",
    noPriceNote:
      "Consultanos stock y financiación por WhatsApp — respondemos en el día.",
    waCta: "Consultar por WhatsApp",
    buyCta: "Comprar en la tienda ↗",
    compareAdd: "+ Agregar al comparador",
    compareIn: "✓ En el comparador · quitar",
    compareShortAdd: "+ VS",
    compareShortIn: "✓ VS",
    compareTitle: "Comparar",
    specsTitle: "ESPECIFICACIONES",
    stockAlert: "Avisame por email",
  },
  financing: {
    cardSub: (cuota) => `6 cuotas de ${cuota}`,
    box6: "6 CUOTAS",
    box3: "3 CUOTAS",
    boxTransfer: (pct) => `TRANSFERENCIA −${pct}%`,
    boxNote:
      "Cuotas con tarjeta de crédito · consultá bancos y tarjetas adheridas.",
    modalTitle: "Calculadora de cuotas",
    modalSub:
      "Elegí un producto y mirá cómo queda en 3 o 6 cuotas.",
    modal6: "6 cuotas de",
    modal3: "3 cuotas de",
    modalTransfer: (pct) => `Transferencia (${pct}% off)`,
    modalCta: "Consultar financiación por WhatsApp",
    modalNote:
      "Cuotas con tarjeta de crédito. Consultá bancos y tarjetas adheridas.",
  },
  compare: {
    title: "Comparador",
    sub: "Hasta 3 productos lado a lado: lo esencial con barras y la ficha técnica completa.",
    addPlaceholder: "+ Sumar un producto…",
    emptyTitle: "Empezá por una comparación armada",
    emptySub: [
      "O sumá productos con el selector de arriba, o con ",
      "+ VS",
      " desde el catálogo.",
    ],
    countLabel: (n) => `${n} ${n === 1 ? "PRODUCTO" : "PRODUCTOS"}`,
    essentials: "LO ESENCIAL",
    specsSheet: "FICHA TÉCNICA",
    diffOn: "✓ Solo diferencias",
    diffOff: "Mostrar solo diferencias",
    diffRow: "Diferencias",
    diffSame: "Coinciden en todo lo cargado",
    footnote:
      "Barras calculadas con la ficha de cada producto. “Mejor” marca el valor más alto (en peso, el más liviano).",
    remove: "Quitar del comparador",
    trayLabel: "VS",
    metaDescription:
      "Elegí hasta 3 productos del catálogo y miralos lado a lado, spec por spec.",
  },
  test: {
    step: (n, total) => `PREGUNTA ${n} DE ${total}`,
    match: "TU MATCH",
    seeModel: "Ver el producto",
    restart: "Repetir test",
  },
  repairs: {
    kicker: "SERVICE Y GARANTÍA",
    workshop: (address, hours) => `Atención en ${address} · ${hours}`,
    formKicker: "PEDÍ TU DIAGNÓSTICO",
    formTitle: "Contanos qué le pasa",
    typeLabel: "¿QUÉ PRODUCTO ES?",
    types: ["Hogar", "Viaje", "Otro"],
    modelLabel: "MARCA Y MODELO",
    modelPlaceholder: "Ej: Lámpara Duna, Mochila Norte…",
    problemLabel: "¿QUÉ LE PASA?",
    problemPlaceholder:
      "Ej: no enciende, se rompió un cierre, le falta una pieza…",
    send: "Enviar por WhatsApp",
    sendNote: "Se abre WhatsApp con tu consulta armada · respondemos en el día",
    metaTitle: "Service y garantía",
    metaDescription:
      "Garantía, cambios y reparaciones de lo que compraste en la tienda: contanos qué pasó y te respondemos en el día.",
  },
  about: {
    kicker: "NOSOTROS",
    visitKicker: "VENÍ AL LOCAL",
    brandsKicker: "MARCAS OFICIALES",
    metaTitle: "Nosotros",
    metaDescription:
      `${store.brandName}: bicicletería en Mar del Plata. Bicis, accesorios y repuestos con retiro en el local, turnos de prueba y presupuestos.`,
  },
  blog: {
    kicker: "NOVEDADES Y GUÍAS",
    backLink: "← Todas las novedades",
    ctaSub: "Te asesoramos por WhatsApp, sin vueltas.",
    moreKicker: "SEGUÍ LEYENDO",
    metaTitle: "Novedades y guías",
    metaDescription:
      "Guías para elegir bien y novedades de la tienda, por escrito.",
  },
  community: {
    metaTitle: "La comunidad",
    metaDescription:
      `La comunidad de ${store.brandName}: novedades, encuentros y beneficios exclusivos para clientes.`,
    badge: "COMUNIDAD",
    heroLine: "LA",
    heroAccent: "COMUNIDAD",
    agendaTitle: "AGENDA DE EVENTOS",
    joinCta: "Sumarme al grupo de WhatsApp",
    joinNote: `Gratis para clientes de ${store.brandName}`,
  },
  newsletter: {
    placeholder: "tu@email.com",
    submit: "Suscribirme",
    storageKey: "tienda-news",
  },
  notFound: {
    titleTop: "Esta página",
    titleAccent: "no existe.",
    body: "El link que seguiste no existe o cambió de lugar. El catálogo completo sigue en pie.",
    cta: "Ver los productos",
    waCta: "Preguntar por WhatsApp",
    waMessage: "Hola! Estaba buscando algo en la web y no lo encuentro",
  },
  admin: {
    newProduct: "Nuevo producto",
    newProductQuick: "→ Cargar un producto nuevo",
    productCreated: "Producto creado — completá sus datos",
    productDeleted: "Producto eliminado",
    deleteProductTitle: "Eliminar producto",
    deleteProductCta: "Eliminar este producto",
    newProductBrandId: PLACEHOLDER_BRAND_ID,
    newProductTag: "NUEVO",
    productPhotoHint:
      "Ideal: foto con fondo blanco, 1400 px o más. El fondo blanco se funde con la tarjeta.",
    extrasEmpty:
      "Sin specs adicionales. Usalas para material, medidas, garantía, etc.",
    heroProduct: "PRODUCTO DEL HERO (FOTO GRANDE DEL INICIO)",
    heroProductUpdated: "Producto del hero actualizado",
    heroPhotoHint:
      "Para máxima nitidez subí la foto oficial del producto en alta (fondo blanco, 1600 px o más).",
    localPhotoHint:
      "Se optimiza sola (máx. 1600 px). Ideal: el frente del local o el salón.",
    communityKicker: "LA COMUNIDAD",
    eventNew: "+ Nuevo evento",
    eventQuick: "→ Agregar un evento",
    eventAdded: "Evento agregado a la agenda",
    eventDeleted: "Evento eliminado",
    eventDeleteTitle: "Eliminar el evento",
    eventTitlePlaceholder: "Título del evento",
    eventMetaPlaceholder: "Hora · lugar · cupo",
    eventsStat: "EVENTOS EN AGENDA",
    galleryHint: "4 fotos al pie de la página de la comunidad. Se optimizan solas.",
    brandSuggestions: [],
  },
  commerce: {
    cart: {
      kicker: "CARRITO",
      title: "Tu carrito",
      close: "Cerrar carrito",
      emptyTitle: "Todavía está vacío",
      emptyBody: "Sumá un producto desde su ficha con “Comprar en la tienda” y lo ves acá.",
      emptyCta: "Ver los productos",
      unavailable: "Ya no está disponible · quitalo para seguir",
      remove: "Quitar",
      less: "Restar una unidad",
      more: "Sumar una unidad",
      subtotal: "Subtotal",
      box6: "6 CUOTAS",
      boxTransfer: (pct) => `TRANSFERENCIA −${pct}%`,
      cta: "Iniciar compra →",
      note: "Elegís retiro o envío y el medio de pago en el paso siguiente.",
    },
    checkout: {
      metaTitle: "Finalizar compra",
      back: "← Seguir mirando",
      kicker: "FINALIZAR COMPRA",
      title: "Tu compra",
      sub: "Tres pasos y listo: tus datos, cómo lo recibís y cómo pagás.",
      emptyTitle: "Tu carrito está vacío",
      emptyBody: "Elegí un producto y sumalo desde su ficha para comprarlo online.",
      emptyCta: "Ver los productos",
      stepData: "TUS DATOS",
      stepDelivery: "ENTREGA",
      stepPayment: "PAGO",
      name: "NOMBRE Y APELLIDO",
      namePh: "Ej: Martina Gómez",
      email: "EMAIL",
      emailPh: "tu@email.com",
      phone: "WHATSAPP",
      phonePh: "Ej: 223 555 1234",
      address: "DIRECCIÓN DE ENTREGA",
      addressLocalPh: "Calle, número y barrio",
      addressCountryPh: "Dirección, ciudad y provincia",
      notes: "NOTAS PARA EL PEDIDO (OPCIONAL)",
      notesPh: "Ej: horario para coordinar, quién retira…",
      free: "Gratis",
      toQuote: "A cotizar",
      pickupWhere: "¿EN QUÉ SUCURSAL RETIRÁS?",
      pickupMissing: (names) => `Sin stock acá de: ${names}`,
      pickupError: "Elegí una sucursal con stock para retirar tu pedido.",
      planKicker: "¿EN CUÁNTAS CUOTAS?",
      plan1: "1 PAGO",
      plan3: "3 CUOTAS",
      plan6: "6 CUOTAS",
      planEach: "por mes",
      planSurcharge: (pct) => `+${pct}% de recargo`,
      planNoSurcharge: "sin recargo",
      planTotal: (total) => `Total ${total}`,
      planNote:
        "Pago con tarjeta en el formulario seguro de la pasarela · consultá bancos y tarjetas adheridas.",
      depositKicker: "PEDIDO DE ALTO VALOR",
      payTotal: "Pagar el total",
      payDeposit: (pct) => `Reservar con seña del ${pct}%`,
      depositNote:
        "La seña se paga con tarjeta en 1 pago. El saldo, por transferencia o al retirar/recibir.",
      depositPlan: (amount) => `Seña de ${amount} en 1 pago`,
      transferKicker: "TRANSFERÍS A ESTE ALIAS",
      transferAlias: "ALIAS",
      transferBody:
        "Al confirmar te reservamos las unidades. Transferís y nos mandás el comprobante por WhatsApp.",
      cashBody: (hours) =>
        `Te reservamos las unidades por ${hours} hs para que pases a pagar y retirar.`,
      summaryKicker: "TU PEDIDO",
      subtotal: "Subtotal",
      shipping: "Envío",
      shippingPending: "A cotizar por WhatsApp",
      transferLine: (pct) => `Transferencia −${pct}%`,
      surchargeLine: (n, pct) => `Recargo ${n} cuotas (+${pct}%)`,
      total: "Total",
      installmentsOf: (n) => `${n} cuotas de`,
      payNow: (pct) => `Pagás ahora · seña ${pct}%`,
      balanceLater: "Saldo al retirar/recibir",
      shippingNote: "El envío al resto del país se cotiza antes de despachar.",
      submitPending: "Creando el pedido…",
      submitDeposit: "Reservar y pagar la seña →",
      submitOnline: "Confirmar e ir a pagar →",
      submitOffline: "Confirmar pedido →",
      secure:
        "Pago con tarjeta en el formulario seguro de la pasarela: los datos de tu tarjeta no pasan por esta web.",
    },
    sandbox: {
      metaTitle: "Pago simulado",
      ribbon: "SANDBOX · ENTORNO DE PRUEBA · SIN COBRO REAL",
      title: (gateway) => `${gateway} · Checkout de prueba`,
      sub: (gateway) =>
        `Este formulario reemplaza al de ${gateway} mientras no hay credenciales. Aprobar o rechazar ejecuta la misma lógica que la notificación real.`,
      merchant: "COMERCIO",
      order: "Pedido",
      customer: "Cliente",
      amount: "Total a pagar",
      deposit: "Seña a pagar",
      plan: "Plan",
      plan1: "1 pago",
      planN: (n, cuota) => `${n} cuotas de ${cuota}`,
      balance: "Saldo (al retirar/recibir)",
      cardLabel: "DATOS DE LA TARJETA",
      cardNumber: "Número de tarjeta",
      cardHolder: "Nombre como figura en la tarjeta",
      cardExpiry: "Vencimiento",
      cardCvv: "CVV",
      testCard: "Tarjeta de prueba precargada · no se valida",
      approve: (amount) => `Aprobar pago de ${amount}`,
      reject: "Simular rechazo",
      rejected: (gateway) =>
        `Pago rechazado (simulado). El pedido sigue pendiente de pago: podés aprobarlo para reintentar, como haría el cliente en ${gateway}.`,
      footer: "Sandbox local · con credenciales reales esta página no existe",
    },
    confirm: {
      metaTitle: "Pedido confirmado",
      kicker: "GRACIAS POR TU COMPRA",
      titlePaid: (n) => `¡Pedido ${n} pagado!`,
      titleDeposit: (n) => `¡Pedido ${n} señado!`,
      titleConfirmed: (n) => `¡Pedido ${n} confirmado!`,
      bodyPaid:
        "Tu pago ya está acreditado. Te escribimos por WhatsApp en el día para coordinar la entrega.",
      bodyDeposit:
        "Tu seña ya está acreditada y las unidades quedaron reservadas a tu nombre. El saldo se abona por transferencia o al retirar/recibir.",
      bodyTransfer:
        "Te reservamos las unidades. Transferí y mandanos el comprobante para confirmar el pago.",
      bodyCash:
        "Te reservamos las unidades para que pases a pagar y retirar por el local.",
      bodyPending: "Tu pago quedó pendiente. Podés reintentarlo o escribirnos.",
      retry: "Reintentar el pago →",
      transferKicker: "PAGO POR TRANSFERENCIA",
      alias: "ALIAS",
      amount: (pct) => `MONTO (−${pct}%)`,
      reservedUntil: "Reserva hasta",
      cashKicker: "PAGO EN EL LOCAL",
      pickupCode: "CÓDIGO DE RETIRO",
      depositKicker: "SEÑA RECIBIDA",
      depositPaid: "SEÑA PAGADA",
      balance: "SALDO PENDIENTE",
      balanceAlias: "Alias para el saldo",
      pickupKicker: "RETIRO EN EL LOCAL",
      planKicker: "PLAN DE PAGO",
      planLine: (n, cuota) => `${n} cuotas de ${cuota}`,
      planOne: "1 pago con tarjeta",
      planSurcharge: (amount) => `Incluye ${amount} de recargo`,
      summaryKicker: "TU PEDIDO",
      waProof: "Enviar comprobante por WhatsApp",
      waWrite: "Escribirnos por WhatsApp",
      waProofMsg: (n) =>
        `Hola! Hice el pedido ${n} y les mando el comprobante de la transferencia`,
      waMsg: (n) => `Hola! Hice el pedido ${n}`,
      track: "Seguir mi pedido",
    },
    tracking: {
      metaTitle: "Seguimiento de pedido",
      kicker: "SEGUIMIENTO",
      title: "Seguí tu pedido",
      sub: "Con el número de pedido y el email de la compra ves el estado al instante: pago, preparación y entrega.",
      formKicker: "BUSCÁ TU PEDIDO",
      formTitle: "¿Dónde está mi compra?",
      number: "NÚMERO DE PEDIDO",
      numberPh: "Ej: 1041",
      email: "EMAIL DE LA COMPRA",
      emailPh: "tu@email.com",
      submit: "Ver el estado →",
      submitAccount: "Ver mis pedidos →",
      formNote: "El número está en el email de confirmación.",
      back: "← Buscar otro pedido",
      orderKicker: "PEDIDO",
      orderTitle: (n) => `Pedido ${n}`,
      expired:
        "La reserva venció sin que se acredite el pago, así que las unidades volvieron a estar disponibles. Si todavía lo querés, hacé el pedido de nuevo o escribinos.",
      cancelled:
        "Este pedido fue cancelado. Si fue un error, escribinos y lo resolvemos.",
      progressKicker: "ESTADO",
      itemsKicker: "TU PEDIDO",
      total: "Total",
      balance: "Saldo pendiente",
      plan: (n, cuota) => `${n} cuotas de ${cuota}`,
      pickupKicker: "RETIRO",
      deliveryKicker: "ENTREGA",
      code: "Código de retiro",
      deliveryNote: "Te avisamos el día y la franja por WhatsApp.",
      deliveryFallback: "Coordinamos la dirección por WhatsApp",
      waCta: "Consultar por WhatsApp",
      waMsg: (n) => `Hola! Consulta por el pedido ${n}`,
    },
    account: {
      metaTitle: "Mis pedidos",
      kicker: "MIS PEDIDOS",
      title: "Todos tus pedidos",
      sub: "Ingresá tu email y el número de alguno de tus pedidos (está en el email de confirmación) y te mostramos todos.",
      notFound:
        "No encontramos pedidos con ese número y email. Revisá los datos.",
      listKicker: (n) => `${n} ${n === 1 ? "PEDIDO" : "PEDIDOS"}`,
      orderTitle: (n) => `Pedido ${n}`,
      see: "Ver el seguimiento →",
      other: "← Consultar con otro email",
    },
  },
  compareStorageKey: "bicitienda-compare",
  cartStorageKey: "bicitienda-cart",
};

/**
 * Seed de `settings.content`: hero, Nosotros, service, beneficios de la
 * comunidad, galería y recomendaciones del test. Las claves que falten en
 * la DB se completan con estos valores al leer (getContent).
 */
export const content: SiteContent = {
  badge: COPY.home.hero.tag.toUpperCase(),
  l1: COPY.home.hero.titleLead,
  l2: COPY.home.hero.titleHighlight,
  sub: COPY.home.hero.subline,
  heroProd: "mtb-rodado-29-21-vel-aluminio",
  // Foto del hero del prototipo (2a): el seed la resuelve a Cloudinary.
  heroPhoto: { prodId: "mtb-rodado-29-21-vel-aluminio", url: manifestKey(DEMO_PHOTOS.hero) },
  marquee: [
    "MERCADO PAGO",
    "6 CUOTAS SIN INTERÉS",
    "10% OFF POR TRANSFERENCIA",
    "EFECTIVO EN EL LOCAL",
    "RETIRO EN EL LOCAL",
  ],
  stats: [
    { num: "6", label: "CUOTAS SIN INTERÉS" },
    { num: "10%", label: "OFF TRANSFERENCIA" },
    { num: "30'", label: "PRUEBA EN EL LOCAL" },
  ],
  nosotros: {
    title: "Somos BiciTienda MDQ",
    intro:
      "[Texto a confirmar] Una bicicletería de Mar del Plata: te asesoramos, te la armamos y te la entregamos ajustada a tu altura.",
    paras: [
      "Elegís online o pasás a probarla antes con un turno.",
      "Pagás como quieras: Mercado Pago en cuotas, transferencia o efectivo en el local.",
      "La retirás armada: te avisamos por WhatsApp cuando está lista.",
    ],
    pillars: [
      {
        n: "01",
        title: "Garantía real",
        body: "Respondemos por cada producto que sale del local.",
      },
      {
        n: "02",
        title: "Atención directa",
        body: "Te atiende el equipo de la tienda, por WhatsApp o en el local.",
      },
      {
        n: "03",
        title: "Asesoramiento",
        body: "Te ayudamos a elegir según tu uso y tu presupuesto.",
      },
    ],
    localPhoto: null,
  },
  rep: {
    title: "Service y garantía",
    body: "¿Algo no funciona como esperabas? Contanos qué pasó y te respondemos en el día con la solución.",
    services: [
      "Cambios y devoluciones",
      "Garantía oficial",
      "Reparaciones",
      "Repuestos y accesorios",
    ],
  },
  perks: [
    {
      n: "01",
      title: "Grupo de WhatsApp",
      body: "La comunidad de la tienda: avisos, dudas y encuentros. Entrás con tu primera compra.",
    },
    {
      n: "02",
      title: "Promos antes que nadie",
      body: "Descuentos y lanzamientos, primero para la comunidad.",
    },
    {
      n: "03",
      title: "Encuentros",
      body: "Eventos y actividades de la marca, para todos los niveles.",
    },
  ],
  gallery: [null, null, null, null],
  // Una entrada por perfil de TEST_PROFILES (lib/advisor.ts).
  test: {
    hogar_alto: { id: "mtb-rodado-29-doble-suspension", why: "Doble suspensión para salir a la sierra." },
    hogar: { id: "mtb-rodado-29-21-vel-aluminio", why: "La más vendida: firme y liviana para todos los días." },
    viaje_bajo: { id: "paseo-rodado-26-guardabarros", why: "Cómoda y simple para pasear por la costa." },
    viaje: { id: "ruta-aluminio-2x8-vel", why: "Liviana y rápida para la ruta." },
    regalo_bajo: { id: "infantil-rodado-16-rueditas", why: "La primera bici, con rueditas." },
    regalo: { id: "urbana-rodado-28-canasto", why: "Urbana con canasto, lista para la ciudad." },
  },
};

/**
 * Texto fantasma del hero: el nombre del producto sin la marca adelante
 * ("Marca MTB 29" → "MTB 29").
 */
export function heroGhost(name: string): string {
  const brand = brands.find((b) => name.startsWith(b.name + " "));
  return brand ? name.slice(brand.name.length + 1) : name;
}

/** Producto que la calculadora de cuotas muestra al abrirse. */
export const cuotasDefault = "mtb-rodado-29-21-vel-aluminio";

/** Comparaciones armadas que ofrece el comparador vacío. */
export const cmpPresets: ComparePreset[] = [
  { label: "MTB", ids: ["mtb-rodado-29-21-vel-aluminio", "mtb-rodado-29-doble-suspension", "mtb-rodado-27-5-juvenil"] },
  { label: "URBANAS", ids: ["urbana-rodado-28-canasto", "paseo-rodado-26-guardabarros"] },
];

/** Leyendas de los 4 slots de la galería mientras no tengan foto. */
export const galleryLabels = [
  "foto: encuentro de la comunidad",
  "foto: el local por dentro",
  "foto: evento de lanzamiento",
  "foto: clientes felices",
];

/** Placeholders del feed de Instagram (sin cuenta conectada). */
export const igSlots = [
  "reel: producto destacado",
  "foto: vidriera nueva",
  "reel: unboxing",
  "foto: detrás de escena",
  "reel: promo del mes",
];

/**
 * Mensajes prearmados de WhatsApp por contexto. Los arma lib/whatsapp.ts;
 * el botón general abre el chat sin texto.
 */
export const waMessages: WaMessages = {
  /** Tarjetas, ficha y comparador. */
  product: (name) => `Hola! Quiero consultar por ${name}`,
  /** "Escribinos por WhatsApp" del bloque de service. */
  repair: "Hola! Quiero hacer una consulta de service",
  /** Formulario de service (tipo, producto, problema). */
  repairForm: ({ tipo, modelo, problema }) =>
    "Hola! Quiero hacer una consulta de service" +
    (tipo && tipo !== "Otro" ? " (" + tipo.toLowerCase() + ")" : "") +
    (modelo.trim() ? " por " + modelo.trim() : "") +
    "." +
    (problema.trim() ? " Le pasa: " + problema.trim() : ""),
  /** Modal de la calculadora de cuotas. */
  financing: (name) =>
    "Hola! Quiero consultar financiación en cuotas" +
    (name ? " para " + name : ""),
  /** "Coordinar una visita". */
  testRide: "Hola! Quiero coordinar una visita al local",
  /** Fallback cuando no hay link del grupo de la comunidad. */
  community: "Hola! Quiero sumarme al grupo de la comunidad",
  /** CTA de una nota sin ctaMsg propio. */
  articleFallback: "Hola!",
};

/** Etiqueta de cada evento de consulta según el botón tocado. */
export const leadLabels = {
  productDetail: "Consulta desde la web",
  general: "Botón de WhatsApp general",
  testRide: "Coordinar una visita",
  community: "Sumarse a la comunidad",
  repair: "Consulta de service",
  financing: "Financiación",
  financingDetail: "Cuotas con tarjeta",
};

/** Nombre visible de cada tipo de consulta (pills del admin y el CSV). */
export const leadTypeLabels: Record<LeadType, string> = {
  producto: "PRODUCTO",
  reparacion: "SERVICE",
  financiacion: "FINANCIACIÓN",
  prueba: "VISITA",
  comunidad: "COMUNIDAD",
  general: "GENERAL",
  nota: "NOTA",
  pedido: "PEDIDO",
};

/**
 * "Ver con datos de ejemplo" de Consultas: [tipo, consulta, detalle, hace
 * cuántas horas]. Las de más de 24 h se cargan como atendidas.
 */
export const sampleLeads: [LeadType, string, string, number][] = [
  ["producto", "MTB rodado 29 · 21 vel. · aluminio", "Consulta desde la web", 1],
  ["financiacion", "MTB rodado 29 · doble suspensión", "Cuotas con tarjeta", 3],
  ["producto", "Casco urbano regulable · M/L", "Consulta desde la web", 5],
  ["prueba", "Coordinar una visita", "", 20],
  ["producto", "Urbana rodado 28 · canasto", "Consulta desde la web", 30],
];

/** Suscriptos de ejemplo que se cargan si la newsletter está vacía. */
export const sampleSubscribers: [email: string, hoursAgo: number][] = [
  ["cliente.uno@example.com", 4],
  ["cliente.dos@example.com", 30],
];

/** Blog apagado (features.blog = false): sin notas en el seed. */
export const articles: Article[] = [];

/** Agenda de eventos apagada (features.agenda = false). */
export const agendaEvents: AgendaEvent[] = [];
