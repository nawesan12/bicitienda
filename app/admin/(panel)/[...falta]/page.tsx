import { notFound } from "next/navigation";

/**
 * Cualquier path desconocido bajo /admin cae acá para mostrar la 404 del
 * panel (app/admin/(panel)/not-found.tsx) y no la de la tienda. Las rutas
 * reales siempre le ganan a este catch-all.
 */
export default function AdminUnknownPage() {
  notFound();
}
