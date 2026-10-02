import type { DemoCustomer } from "./types";

/**
 * Clientes demo (`CL` de 3e). `stats` son los agregados que muestra el
 * prototipo; en la app real se calculan de pedidos/turnos. No cierran con
 * los pedidos demo (p. ej. Juan Pérez "gastó" $ 569.700 y su pedido de la
 * demo suma $ 544.800 + $ 24.900 del #BT-10288 = $ 569.700 ✓; Martín Ruiz
 * $ 924.800 vs $ 899.900): son históricos anteriores a la demo y se
 * guardan tal cual para que 3e se vea como en el handoff.
 *
 * Solo Juan Pérez tiene cuenta (es el "Hola, Juan" de 2g/4f).
 */
const CL: [string, string, string, number, number, string, number, string][] = [
  ["Juan Pérez", "juanperez@gmail.com", "223 555-0182", 3, 3, "Hoy", 569700, "2025-03"],
  ["Lucía Gómez", "lugomez@hotmail.com", "223 555-0144", 1, 0, "Hoy", 323910, "2026-10"],
  ["Martín Ruiz", "mruiz.mdp@gmail.com", "223 555-0127", 2, 1, "Ayer", 924800, "2026-01"],
  ["Sofía Díaz", "sofi.diaz@gmail.com", "223 555-0163", 1, 1, "Hace 2 días", 219800, "2026-08"],
  ["Diego Sosa", "diegososa@yahoo.com", "223 555-0190", 4, 0, "Hace 3 días", 189500, "2024-05"],
  ["Carla Méndez", "carla.mendez@gmail.com", "223 555-0111", 1, 2, "Hace 5 días", 287910, "2026-07"],
  ["Pablo Ferreyra", "pferreyra@gmail.com", "223 555-0175", 2, 1, "Hace 1 semana", 1312300, "2025-02"],
  ["Ana Torres", "anatorres@gmail.com", "223 555-0107", 0, 1, "Hace 1 semana", 0, "2026-09"],
  ["Marta Ríos", "martarios@gmail.com", "223 555-0128", 0, 1, "Hoy", 0, "2026-10"],
];

export const CUSTOMERS: DemoCustomer[] = CL.map(
  ([name, email, phone, orders, appointments, lastContact, spent, since]) => ({
    name,
    email,
    phone,
    since,
    stats: { orders, appointments, lastContact, spent },
    hasAccount: name === "Juan Pérez",
  }),
);

/** La cuenta demo de 2g (Mi cuenta). Contraseña: la define el seed. */
export const DEMO_ACCOUNT_EMAIL = "juanperez@gmail.com";

export const customerByName = (name: string) => CUSTOMERS.find((c) => c.name === name);
