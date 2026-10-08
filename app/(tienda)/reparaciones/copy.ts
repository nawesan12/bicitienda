/**
 * Copy de /reparaciones (sin diseño en el handoff). El título, el texto y
 * la lista de trabajos salen de `content.rep` (editable en Ajustes →
 * Taller); acá queda lo fijo de la página, el SEO y la imagen OG.
 */

const CITY = "Mar del Plata";

export const REPAIRS_COPY = {
  breadcrumb: "Taller",
  servicesTitle: "Lo que hacemos en el taller",
  stepsTitle: "Cómo funciona",
  steps: [
    {
      n: "01",
      title: "Sacás turno",
      text: "Elegí día y horario para traer la bici. Así te atendemos sin esperas.",
      textMobile: "Elegí día y horario para traerla.",
    },
    {
      n: "02",
      title: "Dejás la bici",
      text: "Contanos qué le pasa. La revisamos en el taller del local.",
      textMobile: "Contanos qué le pasa y la revisamos.",
    },
    {
      n: "03",
      title: "Te pasamos el presupuesto",
      text: "Por WhatsApp y antes de tocar nada. Si te cierra, la arreglamos y te avisamos cuando está lista.",
      textMobile: "Por WhatsApp, antes de tocar nada.",
    },
  ],
  ctaTitle: "¿Hace ruido, no frena o no cambia?",
  ctaText: "Traela al taller. Sacá turno o escribinos y te decimos qué necesita.",
} as const;

export const REPAIRS_SEO = {
  og: {
    kicker: "TALLER",
    title: "Tu bici, en manos del taller",
    sub: "Service, frenos, cambios y ruedas · presupuesto por WhatsApp antes de tocar nada",
  },
  meta: {
    title: `Taller de bicicletas: service y reparaciones en ${CITY}`,
    description:
      "Taller de BiciTienda MDQ en Mar del Plata: service completo, frenos, cambios, ruedas y armado. Sacá turno y te pasamos el presupuesto por WhatsApp.",
  },
  serviceType: "Reparación y service de bicicletas",
} as const;
