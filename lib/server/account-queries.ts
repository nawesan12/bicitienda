import { getAppointmentsForAccount, type AppointmentView } from "@/lib/server/appointments";
import { getCurrentAccount } from "@/lib/server/customer-auth";
import { getOrdersForAccount, type FullOrder } from "@/lib/server/order-queries";
import { getQuotesForAccount, type FullQuote } from "@/lib/server/quotes";

/**
 * Lecturas de "Mi cuenta" (2g): pedidos, turnos y presupuestos de la
 * cuenta logueada. null = sin sesión (la página redirige al login).
 * Siempre frescas: datos transaccionales.
 */

export async function getMyOrders(): Promise<FullOrder[] | null> {
  const account = await getCurrentAccount();
  return account ? getOrdersForAccount(account.id) : null;
}

export async function getMyAppointments(): Promise<{
  upcoming: AppointmentView[];
  past: AppointmentView[];
} | null> {
  const account = await getCurrentAccount();
  if (!account) return null;
  const all = await getAppointmentsForAccount(account.id);
  const now = Date.now();
  const active = (v: AppointmentView) =>
    v.appointment.status === "pendiente" || v.appointment.status === "confirmado";
  return {
    upcoming: all
      .filter((v) => active(v) && v.appointment.startsAt.getTime() >= now)
      .sort((a, b) => a.appointment.startsAt.getTime() - b.appointment.startsAt.getTime()),
    past: all.filter((v) => !(active(v) && v.appointment.startsAt.getTime() >= now)),
  };
}

export async function getMyQuotes(): Promise<FullQuote[] | null> {
  const account = await getCurrentAccount();
  return account ? getQuotesForAccount(account.id) : null;
}
