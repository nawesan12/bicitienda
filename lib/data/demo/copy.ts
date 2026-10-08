import { DEMO_PHOTOS } from "./photos";

/**
 * Copy fijo de las pantallas del handoff que es editable por el cliente
 * (español rioplatense con voseo: "Salí", "Elegí", "Contanos"). Mantenerlo.
 *
 * Tokens que se completan con `fillTemplate()` (format.ts) desde los
 * settings / el contexto:
 *   {off}     → PAYMENT_SETTINGS.transferDiscountPct (10)
 *   {horas}   → PAYMENT_SETTINGS.transferReservationHours (24)
 *   {min}     → duración del servicio (30)
 *   {nombre}, {número}, {fecha}, {n} → del pedido / cliente / contador
 *   {direccion}, {horarios}, {whatsapp} → STORE_INFO
 *
 * Cambios respecto del prototipo:
 *  - 2f: "Te mandamos la confirmación y un recordatorio por WhatsApp" →
 *    sin "y un recordatorio" (no hay recordatorios automáticos).
 *  - 2h/4g: sin "Continuar con Google" (cuentas solo con email +
 *    contraseña).
 *  - Sin cuenta se pide nombre + WhatsApp + email opcional.
 */
export const COPY = {
  header: {
    searchPlaceholder: "Buscar bici, accesorio, repuesto…",
    searchPlaceholderMobile: "Buscar bici, casco, repuesto…",
    account: "Cuenta",
    cart: "Carrito · {n}",
    /** Nav en el orden exacto que pidió el cliente. */
    nav: [
      { key: "bicicletas", label: "Bicicletas" },
      { key: "accesorios", label: "Accesorios" },
      { key: "repuestos", label: "Repuestos" },
      { key: "importados", label: "Productos importados" },
      { key: "presupuesto", label: "Pedir presupuesto" },
      { key: "turnos", label: "Sacar turno" },
    ],
  },

  mobileMenu: {
    primaryCta: "Sacar turno",
    secondaryCta: "Pedir presupuesto",
    account: "Mi cuenta",
    contactLine: "WhatsApp {whatsapp} · {horarios}",
  },

  footer: {
    strip: [
      { title: "Mercado Pago", text: "Tarjetas, débito y dinero en cuenta" },
      { title: "{off}% off transferencia", text: "O pagás en efectivo en el local", highlight: true },
      { title: "Retiro en el local", text: "Te la damos armada y ajustada" },
    ],
    columns: { local: "Local", hours: "Horarios", whatsapp: "WhatsApp" },
    social: "Instagram · Facebook",
    /** Versión mobile de la tira. */
    mobileStrip: "Mercado Pago · {off}% off transferencia · Retiro en el local",
  },

  home: {
    hero: {
      photo: DEMO_PHOTOS.hero,
      photoAlt: "Bicicletas a la venta en el local",
      tag: "Temporada de rodar",
      /** H1: "Salí a rodar por" + (amarillo) "La Feliz." */
      titleLead: "Salí a rodar por",
      titleHighlight: "La Feliz.",
      cta: "Ver bicicletas",
      subline: "Nuevas · Usadas",
    },
    featured: {
      title: "Lo más pedido en el mostrador",
      titleMobile: "Lo más pedido",
      cta: "Ver catálogo →",
      ctaMobile: "Ver todo →",
    },
    steps: [
      { n: "01", title: "Elegís online", text: "O traés la tuya al taller con un turno." },
      { n: "02", title: "Pagás como quieras", text: "Mercado Pago, transferencia o efectivo en el local." },
      { n: "03", title: "La retirás armada", text: "Te avisamos por WhatsApp cuando está lista." },
    ],
  },

  catalog: {
    breadcrumbHome: "Inicio",
    count: "{n} modelos",
    filters: {
      type: "Tipo",
      rodado: "Rodado",
      price: "Precio",
      size: "Talle",
      clear: "Limpiar",
      mobileButton: "Filtros · {n}",
    },
    sortLabel: "Ordenar por",
    sortDefault: "Más vendidas",
    next: "Siguiente →",
    loadMore: "Ver más modelos",
  },

  productCard: {
    brandPlaceholder: "MARCA",
    transfer: "{monto} por transferencia",
  },

  product: {
    transfer: "{monto} pagando por transferencia ({off}% off)",
    sizeLabel: "Talle",
    sizeHelp: "¿No sabés tu talle? Te asesoramos",
    sizeHelpMobile: "¿Cuál es mi talle?",
    colorLabel: "Color · {color}",
    addToCart: "Agregar al carrito",
    repairLink: "¿Ya tenés bici? Service en nuestro taller →",
    pickupTitle: "Retiro en el local",
    pickupText: "Armada y ajustada a tu altura",
    stockTitle: "Stock en el local",
    stockText: "Quedan {n} en talle {talle}",
    forWhoTitle: "Para quién es",
    specsTitle: "Especificaciones",
    relatedTitle: "Sumale a tu bici",
  },

  cart: {
    title: "Tu carrito",
    continueShopping: "← Seguir comprando",
    remove: "Quitar",
    repairBanner: {
      title: "¿Tu bici necesita un service?",
      text: "Sacá turno en el taller: la revisamos y te pasamos el presupuesto. Tu carrito queda guardado.",
      cta: "Sacar turno →",
    },
    payTitle: "1 · Cómo pagás",
    pickupTitle: "2 · Dónde la retirás",
    payments: {
      mp: {
        name: "Mercado Pago",
        desc: "Tarjeta de crédito, débito o dinero en cuenta.",
        note: "Las cuotas las elegís en Mercado Pago",
        cta: "Pagar con Mercado Pago",
      },
      transfer: {
        name: "Transferencia · {off}% off",
        desc: "Te pasamos el CBU al confirmar. Reservamos el stock {horas} hs.",
        note: "Ahorrás {monto}",
        cta: "Confirmar y ver datos bancarios",
      },
      cash: {
        name: "Efectivo en el local",
        desc: "Reservás online y pagás cuando la retirás.",
        note: "Pagás al retirar",
        cta: "Reservar y pagar en el local",
      },
    },
    pickup: {
      title: "Retiro en el local · sin cargo",
      place: "{direccion} · {horarios}",
      note: "Te avisamos por WhatsApp cuando esté armada.",
    },
    totals: {
      subtotal: "Subtotal",
      transferDiscount: "{off}% off transferencia",
      pickup: "Retiro en el local",
      pickupValue: "Gratis",
      total: "Total",
    },
  },

  confirmation: {
    eyebrow: "Pedido #{número} · {fecha}",
    title: "¡Listo, {nombre}!",
    subtitle: "Tu bici ya es tuya.",
    text: "Recibimos tu pago. Ahora la armamos y la ajustamos, y te escribimos por WhatsApp cuando esté lista para retirar.",
    steps: [
      { title: "Pago aprobado", text: "Mercado Pago · {fecha}" },
      { title: "Armado y ajuste", text: "Lo hacemos en el taller del local" },
      { title: "Lista para retirar", text: "Te avisamos por WhatsApp" },
      { title: "Retirás en el local", text: "Con DNI y número de pedido" },
    ],
    viewOrder: "Ver mi pedido",
    continueShopping: "Seguir comprando",
    summaryTitle: "Resumen",
    payment: "Pago",
    total: "Total",
    pickupTitle: "Dónde retirás",
    pickupPlace: "BiciTiendaMDQ · Local",
    pickupNote: "Traé tu DNI y el número de pedido.",
  },

  appointment: {
    eyebrow: "Turnos en el local · no pagás nada online",
    eyebrowMobile: "No pagás nada online",
    title: "Reservá tu turno",
    step1: "1 · ¿Qué necesitás?",
    durationBadge: "{min} MIN",
    noteRepair: { label: "¿Qué le pasa a tu bici?", placeholder: "Frenos, cambios, pinchadura, service general…" },
    noteAdvice: { label: "¿Qué estás buscando?", placeholder: "Una MTB para empezar, una bici para la ciudad, talle…" },
    step2: "2 · Elegí el día",
    step2Mobile: "2 · Día",
    calendarNote: "Domingos cerrado · días tachados sin turnos",
    step3: "3 · Elegí el horario",
    step3Mobile: "3 · Horario",
    morning: "Mañana",
    afternoon: "Tarde",
    step4: "4 · Tus datos",
    summaryTitle: "Tu turno",
    summary: { day: "Día", time: "Horario", duration: "Duración", where: "Dónde" },
    durationValue: "{min} minutos",
    pickTime: "Elegí un horario",
    cta: "Confirmar turno",
    /** Sin "y un recordatorio": no hay recordatorios automáticos. */
    note: "Te mandamos la confirmación por WhatsApp. Podés reprogramar desde tu cuenta.",
    /** Nombre del servicio en el resumen. */
    summaryServiceName: { reparacion: "Reparación / service", asesoramiento: "Asesoramiento de compra" },
  },

  account: {
    hello: "Hola,",
    nav: { appointments: "Mis turnos", orders: "Mis pedidos", data: "Mis datos", logout: "Cerrar sesión" },
    navMobile: { appointments: "Turnos", orders: "Pedidos", data: "Datos" },
    nextAppointment: "Próximo turno",
    reschedule: "Reprogramar",
    cancel: "Cancelar",
    pastAppointments: "Turnos anteriores",
    newAppointment: "+ Nuevo turno",
    ordersTitle: "Mis pedidos",
  },

  auth: {
    photo: DEMO_PHOTOS.local,
    photoAlt: "Bicicletas colgadas en el local",
    asideTitleLead: "Tus turnos y pedidos,",
    asideTitleHighlight: "en un lugar.",
    asideText: "Reprogramá tu turno del taller, seguí el armado de tu bici y comprá más rápido la próxima vez.",
    tabs: { login: "Ingresar", register: "Crear cuenta" },
    titles: { login: "Hola de nuevo", register: "Creá tu cuenta" },
    ctas: { login: "Ingresar", register: "Crear cuenta" },
    fields: { email: "Email", password: "Contraseña", name: "Nombre", whatsapp: "WhatsApp" },
    forgot: "Me olvidé la contraseña",
    guestNote: "También podés comprar y reservar sin cuenta. Te pedimos solo nombre y WhatsApp.",
    guestNoteMobile: "También podés comprar y reservar sin cuenta.",
  },

  quote: {
    eyebrow: "Presupuesto sin cargo",
    title: "¿Qué estás buscando?",
    intro: "Una bici, un repuesto o algo que hay que traer de afuera: contanos qué necesitás y te pasamos precio y demora por WhatsApp.",
    introMobile: "Te pasamos precio y demora por WhatsApp.",
    step1: "1 · Qué necesitás",
    step2: "2 · Contanos el detalle",
    step2Mobile: "2 · El detalle",
    forBike: { label: "Para qué bici (opcional)", placeholder: "Marca, modelo o rodado" },
    budget: { label: "Presupuesto aproximado (opcional)", placeholder: "Ej: hasta $ 300.000" },
    upload: "+ Subí una foto o captura",
    uploadOptional: "(opcional)",
    uploadMobile: "+ Agregar foto (opcional)",
    step3: "3 · Tus datos",
    fields: {
      name: { label: "Nombre", placeholder: "Nombre y apellido" },
      whatsapp: { label: "WhatsApp", placeholder: "223 …" },
      email: { label: "Email (opcional)", placeholder: "tu@email.com" },
    },
    cta: "Enviar pedido de presupuesto",
    ctaMobile: "Enviar pedido",
    ctaNote: "Te respondemos por WhatsApp en 24 hs hábiles.",
    ctaNoteMobile: "Te respondemos en 24 hs hábiles.",
    howTitle: "Cómo sigue",
    how: [
      { n: "01", title: "Lo revisamos en el local", text: "Vemos stock, compatibilidad y proveedores." },
      { n: "02", title: "Te escribimos por WhatsApp", text: "Con precio, demora y formas de pago." },
      { n: "03", title: "Si te sirve, lo encargamos", text: "Y te avisamos cuando esté para retirar." },
    ],
    directTitle: "¿Preferís hablarlo directo?",
    directCta: "Escribinos por WhatsApp",
    /** Validación del handoff. */
    validation: {
      kind: "Elegí qué necesitás.",
      detail: "Contanos un poco más (mínimo 10 caracteres).",
      name: "Decinos tu nombre.",
      whatsapp: "Poné un WhatsApp válido con característica (ej: 223 555-0182).",
    },
  },

  admin: {
    sidebar: { viewStore: "Ver tienda ↗" },
    nav: ["Resumen", "Pedidos", "Turnos", "Presupuestos", "Productos", "Clientes", "Ajustes"],
    summary: {
      kpis: ["Pedidos hoy", "Para retirar", "Turnos hoy", "Transf. a validar"],
      todayAppointments: "Turnos de hoy",
      searchPlaceholder: "Buscar pedido, cliente o DNI",
      manualAppointment: "+ Turno manual",
      mobileTitle: "Admin · Mostrador",
      mobileOrdersCta: "Ver pedidos para retirar · {n}",
    },
    orders: {
      title: "Pedidos",
      searchPlaceholder: "Buscar pedido, cliente o DNI",
      export: "Exportar",
      filters: ["Todos", "Transf. pendiente", "Para armar", "Listos", "Retirados"],
      range: "Últimos 7 días",
      columns: ["Pedido", "Cliente y productos", "Pago", "Total", "Estado"],
      write: "Escribir →",
      delivery: "Entrega",
      receipt: "Comprobante adjunto",
      receiptView: "Ver",
      notifyWhatsApp: "Avisar por WhatsApp",
      cancel: "Cancelar pedido",
      backMobile: "← Pedidos",
    },
    appointments: {
      title: "Turnos",
      viewWeek: "Semana",
      viewDay: "Día",
      block: "Bloquear horario",
      manual: "+ Turno manual",
      legend: { reparacion: "Taller · reparación", asesoramiento: "Asesoramiento", unconfirmed: "Sin confirmar" },
      exampleNote: "Horarios de ejemplo · a confirmar",
      detail: { when: "Cuándo", detail: "Detalle", whatsapp: "WhatsApp", status: "Estado" },
      confirmWhatsApp: "Confirmar por WhatsApp",
      attended: "Vino ✓",
      noShow: "No vino",
      reschedule: "Reprogramar",
    },
    quotes: {
      title: "Presupuestos",
      searchPlaceholder: "Buscar cliente o producto",
      columns: ["Número", "Qué pide / cliente", "Tipo", "Estado"],
      quoteTitle: "Cotización",
      addLine: "+ Agregar ítem",
      eta: "Demora",
      valid: "Válido",
      total: "Total",
      reject: "Rechazar",
    },
    products: {
      title: "Productos",
      searchPlaceholder: "Buscar por nombre o SKU",
      import: "Importar planilla",
      create: "+ Nuevo producto",
      columns: ["Producto", "Categoría", "Precio", "Stock por talle", "Estado"],
      edit: {
        back: "← Productos",
        viewInStore: "Ver en la tienda",
        save: "Guardar cambios",
        photos: "Fotos",
        cover: "Portada",
        upload: "Subir fotos",
        info: "Información",
        brand: "Marca",
        brandPlaceholder: "[Marca a confirmar]",
        tag: "Etiqueta",
        description: "Descripción",
        listPrice: "Precio de lista",
        transferPrice: "Con transferencia (auto)",
        variants: "Variantes y stock",
        addVariant: "+ Agregar variante",
        heightRange: "Altura sugerida",
        sku: "SKU",
        visibility: "Visibilidad",
        toggles: {
          published: "Publicado en la tienda",
          featured: "Destacado en el home",
          hideWhenOut: "Ocultar si no hay stock",
        },
        preview: "Así se ve en la tienda",
        delete: "Eliminar producto",
      },
    },
    customers: {
      title: "Clientes",
      searchPlaceholder: "Buscar por nombre, email o WhatsApp",
      export: "Exportar",
      columns: ["Cliente", "WhatsApp", "Pedidos", "Último contacto", "Gastado"],
      writeWhatsApp: "Escribir por WhatsApp",
      history: "Historial",
      noHistory: "Sin movimientos esta semana.",
    },
    settings: {
      /** Sin "Usuarios" (login con PIN). */
      tabs: ["Local", "Turnos", "Pagos", "Notificaciones"],
      local: {
        title: "Datos del local",
        address: "Dirección",
        whatsapp: "WhatsApp del local",
        email: "Email de contacto",
        instagram: "Instagram",
      },
      schedule: { title: "Horarios para turnos", closed: "Cerrado" },
      appointments: { perSlot: "Por horario", notice: "Anticipación", maxDays: "Reservar hasta" },
      services: "Servicios",
      payments: {
        title: "Pagos",
        mp: "Mercado Pago",
        mpConnected: "Conectado",
        transferOff: "Off transferencia",
        installments: "Tope de cuotas en Mercado Pago",
        alias: "Alias / CBU",
        cash: "Efectivo al retirar",
      },
      templates: {
        title: "Mensajes de WhatsApp",
        hint: "Los campos entre llaves se completan solos",
      },
    },
  },
} as const;
