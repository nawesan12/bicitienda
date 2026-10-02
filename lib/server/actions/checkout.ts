"use server";

import { z } from "zod";
import { createOrder, type CheckoutResult } from "@/lib/server/orders";
import { isValidArPhone } from "@/lib/phone";
import { getCurrentAccount } from "@/lib/server/customer-auth";
import { withinRateLimit } from "@/lib/server/rate-limit";

/**
 * La única puerta de entrada pública de compra. Todo lo importante
 * (precios, stock, totales, vencimientos) se resuelve server-side en
 * createOrder — del cliente solo se toman slugs, cantidades y datos de
 * contacto, y ni eso se toma sin validar.
 */

const checkoutSchema = z.object({
  items: z
    .array(
      z.object({
        productSlug: z.string().trim().min(1).max(80),
        /** Talle × color. Opcional si el producto tiene una sola variante. */
        variantId: z.string().trim().min(1).max(80).optional(),
        quantity: z.number().int().min(1).max(10),
      }),
    )
    .min(1, "El carrito está vacío.")
    .max(20),
  name: z.string().trim().min(2, "Completá tu nombre.").max(120),
  /** Opcional: sin email no salen mails (todo sigue por WhatsApp). */
  email: z
    .union([z.literal(""), z.string().trim().toLowerCase().email("Revisá el email.").max(200)])
    .optional(),
  phone: z
    .string()
    .trim()
    .max(30)
    .refine(isValidArPhone, "Revisá el WhatsApp: 10 dígitos con la característica (ej. 223 555-0182)."),
  deliveryMethod: z.enum(["retiro", "envio-mdq", "envio-coordinar"]),
  deliveryAddress: z.string().trim().max(300).optional(),
  deliveryNotes: z.string().trim().max(500).optional(),
  paymentMethod: z.enum(["payway", "mercadopago", "transferencia", "efectivo"]),
  pickupLocationId: z.string().trim().max(60).optional(),
  paymentMode: z.enum(["total", "sena"]).optional(),
  installments: z.union([z.literal(1), z.literal(3), z.literal(6)]).optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export async function placeOrder(input: unknown): Promise<CheckoutResult> {
  if (!(await withinRateLimit("checkout", 8))) {
    return { ok: false, error: "Demasiados intentos. Esperá un minuto." };
  }

  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      error: issue?.message ?? "Revisá los datos del pedido.",
    };
  }

  try {
    // Logueado: el pedido queda en su cuenta ("Mis pedidos").
    const account = await getCurrentAccount();
    return await createOrder({
      ...parsed.data,
      email: parsed.data.email || account?.email || null,
      accountId: account?.id ?? null,
    });
  } catch (err) {
    console.error("[checkout] error creando pedido:", err);
    return { ok: false, error: "No pudimos crear el pedido. Probá de nuevo." };
  }
}
