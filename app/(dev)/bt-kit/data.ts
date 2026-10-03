/**
 * Datos de ejemplo del handoff (clase de lógica de "BiciTienda MDQ.dc.html")
 * para la página de revisión visual. No se usan en la tienda.
 */
import type { StoreHrefs } from "@/components/bt/header";
import type { AdminSection } from "@/components/bt/admin";
import type { OrderPillStatus, QuotePillStatus } from "@/components/bt/pill";

export const px = (id: number, w = 800) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

export const HREFS: StoreHrefs = {
  home: "#inicio",
  cart: "#carrito",
  account: "#cuenta",
  search: "#buscar",
  nav: {
    bicicletas: "#bicicletas",
    accesorios: "#accesorios",
    repuestos: "#repuestos",
    importados: "#importados",
    presupuesto: "#presupuesto",
    turnos: "#turnos",
  },
};

export const ADMIN_HREFS: Record<AdminSection, string> = {
  resumen: "#resumen",
  pedidos: "#pedidos",
  turnos: "#turnos-admin",
  presupuestos: "#presupuestos",
  productos: "#productos",
  clientes: "#clientes",
  consultas: "#consultas",
  ajustes: "#ajustes",
};

export interface DemoProduct {
  category: string;
  name: string;
  price: number;
  img: number;
  tag?: string;
}

export const BIKES: DemoProduct[] = [
  { category: "MTB", name: "MTB rodado 29 · 21 vel. · aluminio", price: 489900, img: 31581017, tag: "Más vendida" },
  { category: "MTB", name: "MTB rodado 29 · doble suspensión", price: 1249900, img: 7635132 },
  { category: "MTB", name: "MTB rodado 27.5 · juvenil", price: 399900, img: 11075610, tag: "Oferta" },
  { category: "Gravel", name: "Gravel 700c · 2x9 vel.", price: 899900, img: 5807754, tag: "Nueva" },
  { category: "Ruta", name: "Ruta aluminio · 2x8 vel.", price: 759900, img: 128202 },
  { category: "Urbana", name: "Urbana rodado 28 · canasto", price: 359900, img: 170379 },
  { category: "Urbana", name: "Paseo rodado 26 · guardabarros", price: 319900, img: 35269121 },
  { category: "Urbana", name: "Urbana vintage rodado 28", price: 389900, img: 14388756 },
  { category: "Infantil", name: "Infantil rodado 16 · rueditas", price: 189900, img: 19012942, tag: "Oferta" },
];

export const ACC: DemoProduct[] = [
  { category: "Cascos", name: "Casco urbano regulable · M/L", price: 54900, img: 12956080, tag: "Nuevo" },
  { category: "Cascos", name: "Casco MTB con visera", price: 79900, img: 33181395 },
  { category: "Indumentaria", name: "Remera de ciclismo manga corta", price: 42900, img: 17015631 },
  { category: "Accesorios", name: "Kit luces delantera + trasera", price: 24900, img: 132695 },
];

export interface DemoOrder {
  id: string;
  client: string;
  items: string;
  pay: string;
  status: OrderPillStatus;
  total: number;
}

export const ORDERS: DemoOrder[] = [
  { id: "#BT-10482", client: "Juan Pérez", items: "MTB R29 21v · Casco urbano", pay: "Mercado Pago", status: "pagado", total: 544800 },
  { id: "#BT-10481", client: "Lucía Gómez", items: "Urbana R28 canasto", pay: "Transferencia", status: "transf_pendiente", total: 323910 },
  { id: "#BT-10480", client: "Martín Ruiz", items: "Gravel 700c 2x9", pay: "MP · 1 pago", status: "armando", total: 899900 },
  { id: "#BT-10479", client: "Sofía Díaz", items: "Infantil R16 · Casco infantil", pay: "Efectivo", status: "paga_local", total: 219800 },
  { id: "#BT-10477", client: "Diego Sosa", items: "Kit luces · Remera ciclismo", pay: "Mercado Pago", status: "listo", total: 67800 },
  { id: "#BT-10475", client: "Carla Méndez", items: "Paseo R26 guardabarros", pay: "Transferencia", status: "listo", total: 287910 },
  { id: "#BT-10471", client: "Pablo Ferreyra", items: "MTB R29 doble suspensión", pay: "Mercado Pago", status: "retirado", total: 1249900 },
  { id: "#BT-10468", client: "Ana Torres", items: "Casco MTB con visera", pay: "Transferencia", status: "cancelado", total: 71910 },
];

export interface DemoQuote {
  id: string;
  name: string;
  kind: string;
  date: string;
  status: QuotePillStatus;
  title: string;
}

export const QUOTES: DemoQuote[] = [
  { id: "#P-0213", name: "Lucía Benítez", kind: "Importado", date: "Hoy · 10:12", status: "nuevo", title: "Rodillo smart para Zwift" },
  { id: "#P-0212", name: "Martín Sosa", kind: "Repuesto", date: "Hoy · 09:40", status: "nuevo", title: "Cadena y cassette 11v" },
  { id: "#P-0211", name: "Carla Méndez", kind: "Bicicleta", date: "Ayer · 18:05", status: "cotizado", title: "Urbana para ir al trabajo" },
  { id: "#P-0210", name: "Diego Paz", kind: "Importado", date: "Ayer · 11:30", status: "aceptado", title: "Casco de ruta MIPS · L" },
  { id: "#P-0209", name: "Sofía Luna", kind: "Repuesto", date: "28 sep", status: "pedido_creado", title: "Frenos hidráulicos" },
  { id: "#P-0208", name: "Ramiro Gil", kind: "Bicicleta", date: "27 sep", status: "rechazado", title: "Plegable eléctrica" },
];

export const SPECS = [
  { label: "Cuadro", value: "Aluminio 6061, talles S / M / L / XL" },
  { label: "Horquilla", value: "Suspensión 80 mm con bloqueo" },
  { label: "Transmisión", value: "3x7 · 21 velocidades" },
  { label: "Frenos", value: "Disco mecánico delantero y trasero" },
  { label: "Ruedas", value: "Rodado 29 · doble pared" },
  { label: "Peso aprox.", value: "14,5 kg" },
];

export const SIZES = [
  { value: "S", label: "S", height: "1,55–1,65" },
  { value: "M", label: "M", height: "1,65–1,75" },
  { value: "L", label: "L", height: "1,75–1,85" },
  { value: "XL", label: "XL", height: "1,85–1,95", available: false },
];

export const COLORS = [
  { value: "negro-amarillo", label: "Negro / amarillo", swatch: "#121110" },
  { value: "rojo", label: "Rojo", swatch: "#d7261e" },
  { value: "crema", label: "Crema", swatch: "#e8e1d3" },
];

export const CATS = ["MTB", "Ruta / Gravel", "Urbanas", "Infantiles", "Accesorios", "Repuestos", "Importados"];
