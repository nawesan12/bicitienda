import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

const TAGS = ["catalog", "content", "settings", "locations"] as const;

/**
 * Herramienta SOLO LOCAL para disparar la invalidación por tag a mano
 * (p. ej. tras tocar la base con db:studio). En producción (Neon vía
 * DATABASE_URL) no existe: las server actions del admin ya llaman
 * revalidateTag y esto respondería 404.
 *
 *   curl -X POST "localhost:3000/api/dev/revalidate?tag=catalog"
 */
export async function POST(request: NextRequest) {
  if (process.env.DATABASE_URL) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const tag = request.nextUrl.searchParams.get("tag");
  const tags = tag ? [tag as (typeof TAGS)[number]] : [...TAGS];
  if (tags.some((t) => !TAGS.includes(t))) {
    return NextResponse.json({ error: `tag inválido` }, { status: 400 });
  }

  // expire 0: el próximo request bloquea y ya sirve el dato fresco.
  for (const t of tags) revalidateTag(t, { expire: 0 });
  return NextResponse.json({ revalidated: tags });
}
