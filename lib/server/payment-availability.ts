import { store } from "@/lib/config";
import { isMpConfigured } from "@/lib/server/mp";
import { isPaywayConfigured } from "@/lib/server/payway";
import type { PaymentMethodId } from "@/lib/types";

/**
 * ¿Se puede cobrar online con este medio? Con credenciales de la pasarela,
 * sí. Sin credenciales, solo en desarrollo (o con PAYMENT_SANDBOX=1 para
 * probar un build local): el sandbox /checkout/pago-simulado NUNCA queda
 * abierto en producción — ahí el medio online se oculta del checkout.
 */
export function isGatewayConfigured(method: PaymentMethodId): boolean {
  if (method === "mercadopago") return store.features.payments.mp && isMpConfigured();
  if (method === "payway") return store.features.payments.payway && isPaywayConfigured();
  return false;
}

/**
 * El sandbox local de la pasarela está permitido (nunca en producción).
 * PAYMENT_SANDBOX=1 solo sirve para probar un build LOCAL: en un deploy de
 * producción de Vercel (VERCEL_ENV=production) no abre el sandbox aunque
 * la variable haya quedado cargada por error.
 */
export function isPaymentSandboxAllowed(): boolean {
  if (process.env.VERCEL_ENV === "production") return false;
  return process.env.NODE_ENV !== "production" || process.env.PAYMENT_SANDBOX === "1";
}

export function isOnlinePaymentAvailable(method: PaymentMethodId): boolean {
  if (method === "mercadopago" && !store.features.payments.mp) return false;
  if (method === "payway" && !store.features.payments.payway) return false;
  return isGatewayConfigured(method) || isPaymentSandboxAllowed();
}
