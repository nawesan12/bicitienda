"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { useToast } from "@/components/admin/toast";
import { store } from "@/lib/config";

/**
 * Isla cliente del Resumen: el toast de bienvenida al entrar con el PIN
 * (`/admin?bienvenida=1`) y la limpieza del parámetro.
 */
export function ResumenWelcome() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const welcomed = useRef(false);

  useEffect(() => {
    if (params.get("bienvenida") && !welcomed.current) {
      welcomed.current = true;
      toast(`Bienvenido al panel de ${store.brandName}`);
      router.replace("/admin");
    }
  }, [params, router, toast]);

  return null;
}
