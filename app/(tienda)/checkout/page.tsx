import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { COPY } from "@/lib/data/demo/copy";
import { fillTemplate } from "@/lib/data/demo/format";
import { paths } from "@/lib/paths";
import { NOINDEX } from "@/lib/seo";
import { paymentOptions } from "@/lib/server/checkout-options";
import { getStore } from "@/lib/server/queries";
import { getCartCatalog } from "@/lib/server/screens/compra-b";
import { BUY } from "./_lib/copy";
import { CheckoutClient, type CartPayment } from "./checkout-client";

export const metadata: Metadata = { title: BUY.cart.metaTitle, robots: NOINDEX };

/**
 * ISR: se regenera on-demand por tag desde el admin (invalidatePublic);
 * 1 día es solo el respaldo (literal: la segment config no admite imports).
 */
export const revalidate = 86400;

const PAY_COPY = {
  mercadopago: COPY.cart.payments.mp,
  payway: COPY.cart.payments.mp,
  transferencia: COPY.cart.payments.transfer,
  efectivo: COPY.cart.payments.cash,
} as const;

/**
 * 2d / 4d · Carrito con el pago integrado (el carrito ES el checkout):
 * líneas, cómo pagás, retiro en el local, tus datos, total y CTA.
 */
export default async function CheckoutPage() {
  const [catalog, runtime] = await Promise.all([getCartCatalog(), getStore()]);
  // Venta online apagada: la web es 100% WhatsApp (createOrder también
  // lo rechaza server-side).
  if (!runtime.ventaOnline) redirect(paths.catalog());

  const vars = {
    off: runtime.transferDiscount,
    horas: runtime.reservationHours,
  };
  const payments: CartPayment[] = paymentOptions(runtime).map((p) => {
    const c = PAY_COPY[p.id];
    const name =
      p.id === "payway"
        ? p.name
        : p.id === "transferencia" && runtime.transferDiscount <= 0
          ? "Transferencia"
          : fillTemplate(c.name, vars);
    return {
      id: p.id,
      name,
      description: p.id === "payway" ? p.detail : fillTemplate(c.desc, vars),
      // La nota de MP (cuotas en Mercado Pago) no aplica a Payway.
      note: p.id === "payway" ? "" : c.note,
      cta: p.id === "payway" ? "Pagar con tarjeta" : c.cta,
      transferDiscount: p.transferDiscount && runtime.transferDiscount > 0,
    };
  });

  const local = runtime.locations[0];
  const address = local?.address || runtime.address;
  const hours = local?.hours || runtime.hours;

  return (
    <CheckoutClient
      catalog={catalog}
      payments={payments}
      transferDiscountPct={runtime.transferDiscount}
      pickupLocationId={local?.id}
      pickup={{
        title: COPY.cart.pickup.title,
        place: fillTemplate(COPY.cart.pickup.place, { direccion: address, horarios: hours }),
        note: COPY.cart.pickup.note,
      }}
      hrefs={{
        catalog: paths.catalog(),
        bikes: paths.catalog("bicicletas"),
        appointments: paths.appointments(),
      }}
    />
  );
}
