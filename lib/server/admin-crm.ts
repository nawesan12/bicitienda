import { eq } from "drizzle-orm";
import { getAppointmentsForCustomer, type AppointmentView } from "@/lib/server/appointments";
import type { CustomerRow } from "@/lib/server/customers";
import { getDb, schema } from "@/lib/server/db";
import { getOrdersByCustomer, type FullOrder } from "@/lib/server/order-queries";
import { getQuotesForCustomer, type FullQuote } from "@/lib/server/quotes";

/**
 * Ficha de un cliente para el admin (3e): datos, KPIs e historial de
 * pedidos, turnos y presupuestos.
 */
export interface CustomerDetail {
  customer: CustomerRow;
  hasAccount: boolean;
  orders: FullOrder[];
  appointments: AppointmentView[];
  quotes: FullQuote[];
  totalSpent: number;
}

export async function getCustomerDetail(customerId: string): Promise<CustomerDetail | null> {
  const db = await getDb();
  // Todo en paralelo: si el cliente no existe, las otras vuelven vacías.
  const [[customer], orders, appointments, quotes] = await Promise.all([
    db.select().from(schema.customers).where(eq(schema.customers.id, customerId)),
    getOrdersByCustomer(customerId),
    getAppointmentsForCustomer(customerId),
    getQuotesForCustomer(customerId),
  ]);
  if (!customer) return null;
  return {
    customer,
    hasAccount: !!customer.accountId,
    orders,
    appointments,
    quotes,
    totalSpent: orders
      .filter((o) => !["CANCELADO", "VENCIDO"].includes(o.order.status))
      .reduce((s, o) => s + o.order.paidAmount, 0),
  };
}
