"use client";

import { useEffect } from "react";
import { Button } from "@/components/bt/button";
import { EmptyState } from "@/components/bt/empty-state";
import { Mono } from "@/components/bt/typography";

/**
 * Error inesperado en una página de la tienda (sin diseño en el handoff).
 * Queda dentro del layout del grupo, así que el header y el footer siguen;
 * el bloque es un EmptyState con "Reintentar" (vuelve a pedir la página) y
 * el número de error para cruzarlo con los logs.
 */
export default function StoreError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="px-4 pt-10 pb-14 md:px-14 md:pt-16 md:pb-20">
      <EmptyState
        eyebrow="Algo salió mal"
        title="No pudimos cargar esta página."
        description="Puede ser un problema momentáneo. Probá de nuevo en unos segundos; si sigue, escribinos por WhatsApp."
        action={
          <>
            <Button onClick={() => retry()} size="lg">
              Reintentar
            </Button>
            <Button href="/" variant="secondary" size="lg">
              Ir al inicio
            </Button>
          </>
        }
      />
      {error.digest && (
        <Mono size={11} className="mt-4 block text-center">
          Error {error.digest}
        </Mono>
      )}
    </div>
  );
}
