import { NextResponse } from "next/server";
import { isOnlinePayment } from "@/lib/config";
import { startOnlinePayment } from "@/lib/server/online-payment";
import { getOrderForCustomer } from "@/lib/server/order-queries";
import { withinRateLimit } from "@/lib/server/rate-limit";

/**
 * "Reintentar el pago" de un pedido online que quedó pendiente (pago
 * rechazado o formulario cancelado): genera un link nuevo en la pasarela
 * (con otra referencia: Payway no admite repetirla) y redirige. Gate igual
 * que la confirmación: número + email.
 */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ numero: string }> },
) {
  const { numero } = await ctx.params;
  const url = new URL(request.url);
  const email = url.searchParams.get("e") ?? "";
  const back = new URL(
    `/checkout/confirmacion/${encodeURIComponent(numero)}?e=${encodeURIComponent(email)}`,
    url,
  );

  if (!(await withinRateLimit("retry-payment", 6))) {
    return NextResponse.redirect(back, 303);
  }
  if (!/^[A-Za-z0-9-]{1,20}$/.test(numero) || !email) {
    return new Response("Not found", { status: 404 });
  }
  const full = await getOrderForCustomer(numero, email);
  if (!full) return new Response("Not found", { status: 404 });
  const { order, customer } = full;
  if (order.status !== "PENDIENTE_PAGO" || !isOnlinePayment(order.paymentMethod)) {
    return NextResponse.redirect(back, 303);
  }

  try {
    const target = await startOnlinePayment(order, customer.email);
    return NextResponse.redirect(new URL(target, url), 303);
  } catch (err) {
    console.error("[checkout] reintento de pago:", err);
    return NextResponse.redirect(back, 303);
  }
}
