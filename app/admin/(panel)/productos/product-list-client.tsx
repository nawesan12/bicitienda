"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Toggle } from "@/components/bt";
import { useToast } from "@/components/admin/toast";
import { createProduct, patchProduct } from "@/lib/server/actions/products";

/** "+ Nuevo producto": crea el borrador y abre su edición (3d). */
export function NewProductButton({ label, className }: { label: string; className?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="primary"
      size="md"
      className={className}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await createProduct(null);
          if (!r.ok) return toast(r.error);
          router.push(`/admin/productos/${r.id}?nuevo=1`);
        })
      }
    >
      {pending ? "Creando…" : label}
    </Button>
  );
}

/**
 * Switch "Prueba" de la fila: guarda al instante (`testRide`). Queda por
 * encima del link de la fila (relative z-10) y no navega.
 */
export function TestRideToggle({ id, name, initial }: { id: string; name: string; initial: boolean }) {
  const toast = useToast();
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <span className="relative z-10 flex">
      <Toggle
        aria-label={`Disponible para prueba: ${name}`}
        checked={on}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.checked;
          setOn(next);
          start(async () => {
            const r = await patchProduct(id, { testRide: next });
            if (!r.ok) {
              setOn(!next);
              toast(r.error);
            } else toast(next ? `${name}: disponible para prueba` : `${name}: sin prueba`);
          });
        }}
      />
    </span>
  );
}
