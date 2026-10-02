"use server";

import { z } from "zod";
import { requireAdmin } from "@/lib/server/actions/guard";
import { invalidateAdmin } from "@/lib/server/revalidate";
import {
  appointmentWhatsApp,
  orderReadyWhatsApp,
  resetWhatsAppTemplate,
  saveWhatsAppTemplate,
  type WhatsAppMessage,
} from "@/lib/server/whatsapp-templates";

/** Plantillas de WhatsApp (Ajustes → Notificaciones) y links del admin. */

const templateId = z.enum(["turno_confirmado", "pedido_listo"]);

export async function adminSaveWhatsAppTemplate(id: unknown, body: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const p = z.object({ id: templateId, body: z.string().trim().min(5).max(1000) }).safeParse({ id, body });
  if (!p.success) return { ok: false, error: "El mensaje no puede quedar vacío." };
  await saveWhatsAppTemplate(p.data.id, p.data.body);
  invalidateAdmin();
  return { ok: true };
}

export async function adminResetWhatsAppTemplate(id: unknown): Promise<{ ok: boolean }> {
  await requireAdmin();
  const p = templateId.safeParse(id);
  if (!p.success) return { ok: false };
  await resetWhatsAppTemplate(p.data);
  invalidateAdmin();
  return { ok: true };
}

/** Link wa.me "Turno confirmado" de un turno. */
export async function adminAppointmentWhatsApp(appointmentId: unknown): Promise<WhatsAppMessage | null> {
  await requireAdmin();
  const p = z.string().uuid().safeParse(appointmentId);
  return p.success ? appointmentWhatsApp(p.data) : null;
}

/** Link wa.me "Pedido listo" de un pedido. */
export async function adminOrderReadyWhatsApp(orderId: unknown): Promise<WhatsAppMessage | null> {
  await requireAdmin();
  const p = z.string().uuid().safeParse(orderId);
  return p.success ? orderReadyWhatsApp(p.data) : null;
}
