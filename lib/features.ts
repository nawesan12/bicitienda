import { store } from "@/lib/config";

/**
 * Módulos prendidos para ESTA tienda (lectura única de `store.features`):
 * las páginas apagadas responden notFound(), y header, footer, home,
 * sitemap y la navegación del admin no las enlazan. Los módulos de
 * contenido viejos (repairs, community) quedan prendidos si la tienda no
 * los define; los nuevos (cuentas, turnos…) arrancan apagados.
 */
const f = store.features;

export const features = {
  compare: f.comparador,
  blog: f.blog,
  agenda: f.agenda,
  /** Test "¿Cuál es para mí?" y calculadora de cuotas. */
  advisor: f.asesor,
  repairs: f.repairs !== false,
  community: f.community !== false,
  deposit: f.deposit !== false,
  emails: f.emails !== false,
  variants: !!f.variants,
  accounts: !!f.accounts,
  appointments: !!f.appointments,
  quotes: !!f.quotes,
  cashPayment: f.cashPayment !== false,
  pickupOnly: !!f.pickupOnly,
  csvImport: !!f.csvImport,
} as const;

export type Feature = keyof typeof features;
