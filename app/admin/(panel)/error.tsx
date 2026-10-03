"use client";

import { useEffect } from "react";
import { Button } from "@/components/bt/button";
import { EmptyState } from "@/components/bt/empty-state";
import { Mono } from "@/components/bt/typography";

/**
 * Error inesperado en una sección del panel. El sidebar queda (está en el
 * layout del grupo); el bloque ofrece reintentar o volver al Resumen.
 */
export default function AdminError({
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
    <div className="px-4 py-8 md:px-10 md:py-10">
      <EmptyState
        eyebrow="Error"
        title="Esta sección no cargó."
        description="Reintentá. Si vuelve a fallar, anotá el número de abajo para revisarlo en los logs."
        action={
          <>
            <Button onClick={() => retry()} size="md">
              Reintentar
            </Button>
            <Button href="/admin" variant="secondary" size="md">
              Ir al Resumen
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
