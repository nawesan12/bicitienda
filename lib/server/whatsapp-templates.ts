import { asc, eq } from "drizzle-orm";
import { whatsappTemplates as seedTemplates } from "@/lib/data/operations";
import { getAppointmentView } from "@/lib/server/appointments";
import { getDb, schema } from "@/lib/server/db";
import { getOrderById } from "@/lib/server/order-queries";
import { runtimeSiteUrl } from "@/lib/site";
import type { WhatsAppTemplateId } from "@/lib/types";
import { renderTemplate } from "@/lib/wa-templates";
import { waUrl } from "@/lib/whatsapp";

/**
 * Plantillas de WhatsApp editables (Ajustes → Notificaciones) y los links
 * wa.me ya armados para un turno o un pedido. Nada se envía solo: el admin
 * toca el botón y se abre el chat con el texto.
 */

export type WhatsAppTemplateRow = typeof schema.whatsappTemplates.$inferSelect;

export async function getWhatsAppTemplates(): Promise<WhatsAppTemplateRow[]> {
  const db = await getDb();
  return db.select().from(schema.whatsappTemplates).orderBy(asc(schema.whatsappTemplates.id));
}

async function templateBody(id: WhatsAppTemplateId): Promise<string> {
  const db = await getDb();
  const [row] = await db.select().from(schema.whatsappTemplates).where(eq(schema.whatsappTemplates.id, id));
  return row?.body ?? seedTemplates.find((t) => t.id === id)?.body ?? "";
}

export async function saveWhatsAppTemplate(id: WhatsAppTemplateId, body: string): Promise<void> {
  const db = await getDb();
  const seed = seedTemplates.find((t) => t.id === id);
  if (!seed) throw new Error("Plantilla inexistente.");
  await db
    .insert(schema.whatsappTemplates)
    .values({ ...seed, body, updatedAt: new Date() })
    .onConflictDoUpdate({ target: schema.whatsappTemplates.id, set: { body, updatedAt: new Date() } });
}

/** Vuelve al texto original del seed. */
export async function resetWhatsAppTemplate(id: WhatsAppTemplateId): Promise<void> {
  const seed = seedTemplates.find((t) => t.id === id);
  if (!seed) throw new Error("Plantilla inexistente.");
  await saveWhatsAppTemplate(id, seed.body);
}

export interface WhatsAppMessage {
  text: string;
  url: string;
}

/** "Turno confirmado" para un turno: {nombre} {día} {hora} {servicio} {producto} {número} {link}. */
export async function appointmentWhatsApp(appointmentId: string): Promise<WhatsAppMessage | null> {
  const view = await getAppointmentView(appointmentId);
  if (!view) return null;
  const text = renderTemplate(await templateBody("turno_confirmado"), {
    nombre: view.customer.name.split(" ")[0],
    día: view.dayLabel,
    hora: view.time,
    servicio: view.service.name.toLowerCase(),
    producto: view.productLabel ?? "",
    número: view.appointment.number,
    link: view.manageUrl,
  });
  return { text, url: waUrl(view.customer.phone, text) };
}

/** "Pedido listo" para un pedido: {producto} es el primer ítem (+ "y N más"). */
export async function orderReadyWhatsApp(orderId: string): Promise<WhatsAppMessage | null> {
  const full = await getOrderById(orderId);
  if (!full) return null;
  const [first, ...rest] = full.items;
  const producto = first
    ? `${first.name}${rest.length ? ` y ${rest.length} producto${rest.length > 1 ? "s" : ""} más` : ""}`
    : "pedido";
  const contact = full.customer.email ?? full.customer.phone;
  const text = renderTemplate(await templateBody("pedido_listo"), {
    nombre: full.customer.name.split(" ")[0],
    producto,
    número: full.order.number,
    link: `${runtimeSiteUrl()}/seguimiento/${full.order.number}?e=${encodeURIComponent(contact)}`,
    día: null,
    hora: null,
    servicio: null,
  });
  return { text, url: waUrl(full.customer.phone, text) };
}

/** Chat libre con un cliente (botón "Escribir por WhatsApp" del admin). */
export function customerWhatsApp(phone: string, text?: string): string {
  return waUrl(phone, text);
}
