"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/bt";
import { useToast } from "@/components/admin/toast";
import { createProduct } from "@/lib/server/actions/products";

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
