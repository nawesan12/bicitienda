/**
 * Copy de compra (agente B) que NO está en el handoff: carrito vacío,
 * errores de stock, "Tus datos", y las variantes de la confirmación 2e
 * que el prototipo no dibuja (transferencia, efectivo, pago pendiente o
 * rechazado, pedido sin bici, vencido). El copy diseñado vive en
 * COPY.cart / COPY.confirmation (lib/data/demo/copy.ts).
 *
 * Voseo rioplatense, como el resto. No se promete WhatsApp automático ni
 * recordatorios: "te escribimos" es el local, a mano.
 */
export const BUY = {
  cart: {
    metaTitle: "Tu carrito",
    titleMobile: "Tu carrito",
    payTitleMobile: "Cómo pagás",
    dataTitle: "3 · Tus datos",
    dataTitleMobile: "Tus datos",
    name: "Nombre y apellido",
    phone: "WhatsApp",
    email: "Email (opcional)",
    dataNote: "Te escribimos a ese WhatsApp cuando esté lista para retirar.",
    loggedNote: "Compra con tu cuenta: queda en Mis pedidos.",
    pending: "Un momento…",
    empty: {
      eyebrow: "Carrito · 0",
      title: "Tu carrito está vacío",
      text: "Elegí una bici, un casco o lo que necesites y volvé acá para pagar y retirar en el local.",
      bikes: "Ver bicicletas",
      catalog: "Ver catálogo",
    },
    stock: {
      gone: "Ya no está disponible: quitalo para seguir.",
      unknownName: "Producto no disponible",
      none: "Sin stock en este talle: quitalo para seguir.",
      few: (n: number) => (n === 1 ? "Queda 1 en este talle." : `Quedan ${n} en este talle.`),
      blocked: "Revisá los productos marcados en rojo antes de seguir.",
    },
    errors: {
      name: "Completá tu nombre.",
      phone: "Revisá el WhatsApp: 10 dígitos con la característica (ej. 223 555-0182).",
      email: "Revisá el email.",
      noPayment: "Elegí cómo pagás.",
    },
  },

  confirm: {
    metaTitle: "Tu pedido",
    /** Segunda línea del H1 cuando el pedido no tiene bici. */
    subtitleNoBike: "Ya es tuyo.",
    textNoBike:
      "Recibimos tu pago. Ahora lo preparamos y te escribimos por WhatsApp cuando esté listo para retirar.",
    stepPrepNoBike: { title: "Preparamos tu pedido", text: "Lo dejamos listo en el local" },
    stepReadyNoBike: "Listo para retirar",

    transfer: {
      title: "¡Reservado, {nombre}!",
      subtitle: "Falta pagar.",
      text: "Te guardamos el pedido{vence}. Transferí {monto} a estos datos y mandanos el comprobante: apenas lo validamos, arrancamos.",
      textReceived:
        "Recibimos tu comprobante. Lo validamos y te escribimos por WhatsApp para seguir.",
      step: "Transferencia",
      stepWaiting: "Esperando el comprobante{vence}",
      stepReceived: "Comprobante recibido · lo estamos validando",
      bankTitle: "Datos para transferir",
      alias: "Alias",
      cbu: "CBU",
      holder: "Titular",
      bank: "Banco",
      amount: "Monto a transferir",
      amountNote: "Ya tiene el {off}% off aplicado.",
      uploadTitle: "Mandanos el comprobante",
      uploadLabel: "Subí el comprobante",
      uploadHint: "(foto o PDF, hasta 6 MB)",
      uploadCta: "Enviar comprobante",
      uploading: "Subiendo…",
      uploaded: "¡Listo! Recibimos el comprobante.",
      uploadAgain: "Si te equivocaste de archivo, podés subir otro.",
      or: "o",
      waCta: "Mandarlo por WhatsApp",
      waMsg: "Hola! Hice el pedido {número} y les mando el comprobante de la transferencia.",
    },

    cash: {
      title: "¡Reservado, {nombre}!",
      subtitle: "Pagás al retirar.",
      text: "Te guardamos el pedido{vence}. Pasá por el local, pagás en efectivo y te lo llevás.",
      step1: { title: "Reserva confirmada", text: "{fecha}" },
      step4: { title: "Pagás y retirás", text: "Efectivo en el local, con DNI y número de pedido" },
      payTitle: "Pago en el local",
      payAmount: "Total a pagar en efectivo",
      payUntil: "Te lo guardamos hasta",
      noExpiry: "Sin vencimiento",
    },

    online: {
      pendingTitle: "¡Casi, {nombre}!",
      pendingSubtitle: "Falta el pago.",
      pendingText:
        "Tu pedido quedó reservado pero el pago todavía no se acreditó. Si cerraste la ventana de {pasarela}, podés reintentarlo{vence}.",
      rejectedTitle: "¡Uy, {nombre}!",
      rejectedSubtitle: "El pago no pasó.",
      rejectedText:
        "{pasarela} no aprobó el pago. Probá de nuevo con otra tarjeta o medio{vence}, o escribinos y lo resolvemos.",
      step: "Pago pendiente",
      stepRejected: "Pago rechazado",
      stepText: "{pasarela}",
      retry: "Reintentar el pago",
      wa: "Escribinos por WhatsApp",
      waMsg: "Hola! Hice el pedido {número} y tuve un problema con el pago.",
    },

    closed: {
      expiredTitle: "Pedido vencido",
      cancelledTitle: "Pedido cancelado",
      expired:
        "La reserva venció sin que se acredite el pago, así que las unidades volvieron a estar disponibles. Si todavía lo querés, hacé el pedido de nuevo o escribinos.",
      cancelled: "Este pedido fue cancelado. Si fue un error, escribinos y lo resolvemos.",
      cta: "Volver al catálogo",
    },

    /** Sufijo "{vence}" de los textos. */
    until: " hasta el {fecha}",
    untilShort: " · vence {fecha}",
    pickupCode: "Código de retiro",
    discount: "{off}% off transferencia",
    subtotal: "Subtotal",
    paymentLabels: {
      mercadopago: "Mercado Pago",
      payway: "Tarjeta (Payway)",
      transferencia: "Transferencia",
      efectivo: "Efectivo en el local",
    } as Record<string, string>,
  },

  tracking: {
    metaTitle: "Seguimiento de pedido",
    eyebrow: "Seguimiento",
    title: "Seguí tu pedido",
    text: "Con el número de pedido y el WhatsApp o el email de la compra ves cómo va: pago, armado y retiro.",
    formTitle: "¿Dónde está mi compra?",
    number: "Número de pedido",
    numberPh: "Ej: BT-10482",
    contact: "WhatsApp o email de la compra",
    contactPh: "223 555-0182 o tu@email.com",
    submit: "Ver el estado",
    submitAccount: "Ver mis pedidos",
    formNote: "El número está en la confirmación del pedido.",
    back: "← Buscar otro pedido",
    orderEyebrow: "Pedido #{número} · {fecha}",
    progress: "Cómo va",
    items: "Tu pedido",
    pickup: "Dónde retirás",
    wa: "Consultar por WhatsApp",
    waMsg: "Hola! Consulta por el pedido {número}",
    payNow: "Ver cómo pagar",
  },
} as const;
