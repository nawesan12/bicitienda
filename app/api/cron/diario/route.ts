import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { expireStaleOrders } from "@/lib/server/orders";

/**
 * Cron diario de Vercel (vercel.json → "crons"; Hobby permite uno por día).
 * Vence las reservas sin pago que pasaron su plazo (expireStaleOrders:
 * devuelve el stock y manda el mail de "vencido"). El barrido también corre
 * perezoso al leer pedidos; esto cubre los días sin tráfico en el admin.
 *
 * Protegido con CRON_SECRET: Vercel manda `Authorization: Bearer
 * <CRON_SECRET>`. Sin la variable responde 401 en producción; en
 * desarrollo se puede llamar sin header (`curl localhost:3100/api/cron/diario`).
 */
export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const got = Buffer.from(request.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const expiredOrders = await expireStaleOrders();
  return NextResponse.json({ ok: true, expiredOrders });
}
