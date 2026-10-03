"use client";

import { Button } from "@/components/bt/button";
import { EmptyState } from "@/components/bt/empty-state";
import { store } from "@/lib/config";
import { fontVariables } from "./fonts";
import "./globals.css";

/**
 * Error en el layout raíz: reemplaza todo el documento, así que trae su
 * propio <html>, las fuentes y los estilos globales. Sin header ni footer
 * (los arma un server component que puede ser justo el que falló).
 */
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="es-AR" className={fontVariables}>
      <body>
        <title>{`Algo salió mal · ${store.brandName}`}</title>
        <main className="flex min-h-dvh items-center justify-center px-4 py-14">
          <EmptyState
            className="w-full max-w-[720px]"
            eyebrow="Algo salió mal"
            title="El sitio no cargó."
            description="Puede ser un problema momentáneo. Probá de nuevo en unos segundos."
            action={
              <Button onClick={() => retry()} size="lg">
                Reintentar
              </Button>
            }
          />
        </main>
      </body>
    </html>
  );
}
