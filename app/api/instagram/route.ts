import { getInstagramFeed } from "@/lib/server/instagram";

/**
 * Feed de Instagram como JSON estático con ISR de 1 h. La home lo pide
 * desde el cliente (<InstagramFeed>): así el feed se refresca cada hora
 * sin obligar a regenerar el HTML entero de la home, que queda con
 * revalidación on-demand + respaldo de 1 día. Lo sirve el CDN: una visita
 * no invoca funciones; como mucho una regeneración por hora (y solo si
 * alguien lo pide). `{ items: null }` → la UI muestra los igSlots.
 */
export const revalidate = 3600;

/** Cantidad de posts del bloque de la home. */
const LIMIT = 5;

export async function GET() {
  const items = await getInstagramFeed(LIMIT);
  return Response.json({ items });
}
