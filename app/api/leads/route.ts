import { NextResponse } from "next/server";
import {
  insertLead,
  LEADS_PER_MINUTE,
  publicLeadSchema,
} from "@/lib/server/leads";
import { withinRateLimit } from "@/lib/server/rate-limit";

/**
 * Registro de consultas por `navigator.sendBeacon` (lo usa <WaLink>): el
 * navegador lo manda aunque la pestaña se vaya a WhatsApp, sin bloquear
 * el click. Body JSON { type, label, detail }. Responde 204 siempre que el
 * input sea válido (nada que mostrar: el beacon no lee la respuesta).
 */
export async function POST(request: Request) {
  if (!(await withinRateLimit("leads", LEADS_PER_MINUTE))) {
    return NextResponse.json({ error: "rate" }, { status: 429 });
  }
  // sendBeacon manda text/plain o application/json: se parsea a mano y
  // con tope de tamaño.
  const raw = await request.text();
  if (raw.length > 2000) {
    return NextResponse.json({ error: "too large" }, { status: 413 });
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const parsed = publicLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  try {
    await insertLead(parsed.data);
  } catch (err) {
    console.error("[leads] error registrando consulta:", err);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
  return new Response(null, { status: 204 });
}
