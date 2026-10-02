import { headers } from "next/headers";

/**
 * Rate limit simple en memoria por IP + bucket (ventana deslizante).
 * Honesto: vive por instancia del server — suficiente para frenar
 * enumeración y spam en una tienda chica; si algún día hay múltiples
 * instancias detrás de un balanceador, migrar a un contador compartido.
 */

const hits = new Map<string, number[]>();
const WINDOW_MS = 60_000;

/** IP del cliente según los headers del proxy/plataforma ("local" en dev). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "local"
  );
}

/** true si la petición está dentro del límite del último minuto. */
export async function withinRateLimit(
  bucket: string,
  limit: number,
): Promise<boolean> {
  const key = `${bucket}:${await clientIp()}`;
  const now = Date.now();
  const prev = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (prev.length >= limit) {
    hits.set(key, prev);
    return false;
  }
  prev.push(now);
  hits.set(key, prev);
  // Poda ocasional para que el mapa no crezca sin techo.
  if (hits.size > 5000) {
    for (const [k, times] of hits) {
      if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
    }
  }
  return true;
}
