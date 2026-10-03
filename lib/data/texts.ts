/**
 * Textos editables de la web — seed de BiciTienda MDQ.
 * `TEXTS` es el seed; los overrides del admin viven en la tabla `texts` y
 * se mergean en getTexts(). `TEXT_GROUPS` arma los formularios de
 * /admin/contenido. Al crear una tienda real, reescribí los valores de
 * `TEXTS` con la voz de la marca (las claves las usa el core: no las
 * renombres).
 */
import type { SiteTexts, TextGroup } from "@/lib/types";

export const TEXTS: SiteTexts = {
  "cat_title": "Elegí\nlo tuyo",
  "cat_sub": "Categorías claras, un mismo respaldo: garantía real, atención directa y asesoramiento.",
  "feat_kicker": "DESTACADOS",
  "feat_title": "Los más elegidos",
  "tools_t1": "Tu asesor,",
  "tools_t2": "las 24 horas.",
  "tools_sub": "Tres herramientas para decidir bien antes de escribirnos: probalas ahora, sin registrarte.",
  "test_t": "¿Cuál es para mí?",
  "test_d": "Contestá tres preguntas y te recomendamos el producto justo.",
  "cuotas_t": "Calculadora de cuotas",
  "cuotas_d": "Mirá cómo queda cada producto en 3 o 6 cuotas con tarjeta o con transferencia.",
  "cmp_t": "Comparador",
  "cmp_d": "Elegí productos con “+ VS” y miralos lado a lado, spec por spec.",
  "blog_kicker": "NOVEDADES Y GUÍAS",
  "blog_title": "Para leer antes de comprar",
  "er_kicker": "COMUNIDAD",
  "er_title": "LA COMUNIDAD",
  "er_body": "El grupo de los clientes de la tienda: novedades, encuentros, tips y beneficios exclusivos antes que nadie.",
  "er_btn": "Conocé la comunidad →",
  "local_kicker": "EL LOCAL",
  "local_title": "Vení a verlos\nde cerca.",
  "local_body": "No somos un marketplace: somos un local real. Lo que vendemos, lo respaldamos nosotros.",
  "news_title": "Novedades y promos, primero por mail",
  "news_body": "Una vez al mes: productos nuevos, promos y la agenda de eventos. Nada de spam.",
  "news_done": "¡Listo! Te llega el próximo boletín.",
  "veh_title": "Los productos",
  "prod_note": "Especificaciones oficiales · Garantía y atención en el local.",
  "blogp_title": "Novedades y guías",
  "blogp_sub": "Guías para elegir bien y novedades de la tienda, por escrito.",
  "erp_body": "Comprar en la tienda te suma a la comunidad: un grupo de WhatsApp con novedades, encuentros, tips y promos antes que nadie.",
  "float_btn": "Hablá con nosotros",
  "ig_handle": "@bicitiendamdq",
  "footer_copy": "© 2026 BiciTienda MDQ — Mar del Plata."
};

export const TEXT_GROUPS: TextGroup[] = [
  {
    "tab": "home",
    "title": "Categorías",
    "fields": [
      [
        "cat_title",
        "Título",
        2
      ],
      [
        "cat_sub",
        "Bajada",
        2
      ]
    ]
  },
  {
    "tab": "home",
    "title": "Destacados",
    "fields": [
      [
        "feat_kicker",
        "Etiqueta",
        1
      ],
      [
        "feat_title",
        "Título",
        1
      ]
    ]
  },
  {
    "tab": "home",
    "title": "Herramientas de asesoría",
    "fields": [
      [
        "tools_t1",
        "Título — línea 1",
        1
      ],
      [
        "tools_t2",
        "Título — línea 2 (en color)",
        1
      ],
      [
        "tools_sub",
        "Bajada",
        2
      ],
      [
        "test_t",
        "Tarjeta test — título",
        1
      ],
      [
        "test_d",
        "Tarjeta test — texto",
        2
      ],
      [
        "cuotas_t",
        "Tarjeta cuotas — título",
        1
      ],
      [
        "cuotas_d",
        "Tarjeta cuotas — texto",
        2
      ],
      [
        "cmp_t",
        "Tarjeta comparador — título",
        1
      ],
      [
        "cmp_d",
        "Tarjeta comparador — texto",
        2
      ]
    ]
  },
  {
    "tab": "home",
    "title": "Novedades (bloque del home)",
    "fields": [
      [
        "blog_kicker",
        "Etiqueta",
        1
      ],
      [
        "blog_title",
        "Título",
        1
      ]
    ]
  },
  {
    "tab": "home",
    "title": "Comunidad (bloque destacado)",
    "fields": [
      [
        "er_kicker",
        "Etiqueta",
        1
      ],
      [
        "er_title",
        "Título",
        1
      ],
      [
        "er_body",
        "Texto",
        2
      ],
      [
        "er_btn",
        "Botón",
        1
      ]
    ]
  },
  {
    "tab": "home",
    "title": "El local",
    "fields": [
      [
        "local_kicker",
        "Etiqueta",
        1
      ],
      [
        "local_title",
        "Título",
        2
      ],
      [
        "local_body",
        "Texto",
        2
      ]
    ]
  },
  {
    "tab": "home",
    "title": "Newsletter",
    "fields": [
      [
        "news_title",
        "Título",
        1
      ],
      [
        "news_body",
        "Texto",
        2
      ],
      [
        "news_done",
        "Mensaje al suscribirse",
        1
      ]
    ]
  },
  {
    "tab": "paginas",
    "title": "Página Catálogo",
    "fields": [
      [
        "veh_title",
        "Título",
        1
      ],
      [
        "prod_note",
        "Nota al pie de cada ficha",
        2
      ]
    ]
  },
  {
    "tab": "paginas",
    "title": "Página Novedades",
    "fields": [
      [
        "blogp_title",
        "Título",
        1
      ],
      [
        "blogp_sub",
        "Bajada",
        2
      ]
    ]
  },
  {
    "tab": "paginas",
    "title": "Página Comunidad",
    "fields": [
      [
        "erp_body",
        "Texto de presentación",
        3
      ]
    ]
  },
  {
    "tab": "paginas",
    "title": "Generales",
    "fields": [
      [
        "float_btn",
        "Botón flotante de WhatsApp",
        1
      ],
      [
        "ig_handle",
        "Usuario de Instagram (bloque del home)",
        1
      ],
      [
        "footer_copy",
        "Texto legal del pie",
        1
      ]
    ]
  }
];
