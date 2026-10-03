import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isOnlinePayment, store } from "@/lib/config";
import { deliveryOptions, paymentOptions } from "@/lib/server/checkout-options";
import { toCartProduct } from "@/lib/cart-view";
import { lexicon } from "@/lib/data/content";
import { paths } from "@/lib/paths";
import { isBuyable, ratesOf } from "@/lib/pricing";
import {
  getCheckoutStockMatrix,
  getStore,
  getVisibleProducts,
} from "@/lib/server/queries";
import { CheckoutClient } from "./checkout-client";

export const metadata: Metadata = {
  title: lexicon.commerce.checkout.metaTitle,
  robots: { index: false },
};

/**
 * ISR: se regenera on-demand por tag desde el admin (invalidatePublic);
 * 1 día es solo el respaldo (literal: la segment config no admite imports).
 */
export const revalidate = 86400;

export default async function CheckoutPage() {
  const [products, runtime, stockMatrix] = await Promise.all([
    getVisibleProducts(),
    getStore(),
    getCheckoutStockMatrix(),
  ]);
  // Venta online apagada: la web es 100% WhatsApp (createOrder también
  // lo rechaza server-side).
  if (!runtime.ventaOnline) redirect(paths.catalog());

  const rates = ratesOf(runtime);
  const cartProducts = products
    .filter((p) => isBuyable(rates, p))
    .map((p) => toCartProduct(p, stockMatrix[p.slug] ?? {}))
    .filter((p) => p !== null);

  return (
    <>
      <CheckoutClient
        products={cartProducts}
        rates={rates}
        depositMinTotal={runtime.depositMinTotal}
        transferAlias={runtime.transferAlias}
        reservationHours={runtime.reservationHours}
        pickupLocations={runtime.locations.map((l) => ({
          id: l.id,
          name: l.name,
          shortName: l.shortName,
          address: l.address,
          hours: l.hours,
        }))}
        deliveryOptions={deliveryOptions(runtime).map((d) => ({
          id: d.id,
          name: d.name,
          detail: d.detail,
          cost: d.cost,
          isPickup: d.isPickup,
        }))}
        paymentOptions={paymentOptions(runtime).map((p) => ({
          id: p.id,
          name: p.name,
          detail: p.detail,
          pickupOnly: p.pickupOnly,
          online: isOnlinePayment(p.id),
          allowsInstallments: p.allowsInstallments,
          allowsDeposit: p.allowsDeposit && store.features.deposit !== false,
          transferDiscount: p.transferDiscount,
        }))}
      />
    </>
  );
}
