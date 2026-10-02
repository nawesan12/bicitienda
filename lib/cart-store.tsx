"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { lexicon } from "@/lib/data/content";
import type { CartItem } from "@/lib/types";

/**
 * Carrito, persistente en localStorage. Guarda solo {slug, variante,
 * cantidad}: una línea por producto + variante (talle × color). Los
 * datos del producto (nombre, precio, foto, stock) los aporta el server en
 * cada render vía CartCatalog — el precio que se muestra siempre es el
 * vigente, y el cobro real se recalcula server-side en createOrder.
 */

interface CartState {
  items: CartItem[];
  open: boolean;
  /** false hasta que zustand rehidrata desde localStorage. */
  hydrated: boolean;

  /** Suma una unidad de la variante (o del producto de variante única). */
  add: (slug: string, max: number, variantId?: string) => void;
  setQty: (slug: string, qty: number, max: number, variantId?: string) => void;
  remove: (slug: string, variantId?: string) => void;
  clear: () => void;
  setOpen: (open: boolean) => void;
  setHydrated: () => void;
}

/** Clave de una línea del carrito: producto + variante. */
export function cartLineKey(item: Pick<CartItem, "productSlug" | "variantId">): string {
  return `${item.productSlug}::${item.variantId ?? ""}`;
}

function sameLine(item: CartItem, slug: string, variantId?: string): boolean {
  return item.productSlug === slug && (item.variantId ?? "") === (variantId ?? "");
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      open: false,
      hydrated: false,

      add: (slug, max, variantId) => {
        const items = get().items;
        const existing = items.find((i) => sameLine(i, slug, variantId));
        const next = existing
          ? items.map((i) =>
              sameLine(i, slug, variantId)
                ? { ...i, quantity: Math.min(i.quantity + 1, max) }
                : i,
            )
          : [...items, { productSlug: slug, ...(variantId ? { variantId } : {}), quantity: 1 }];
        set({ items: next, open: true });
      },

      setQty: (slug, qty, max, variantId) => {
        const capped = Math.min(Math.max(0, Math.floor(qty)), max);
        set({
          items:
            capped <= 0
              ? get().items.filter((i) => !sameLine(i, slug, variantId))
              : get().items.map((i) =>
                  sameLine(i, slug, variantId) ? { ...i, quantity: capped } : i,
                ),
        });
      },

      remove: (slug, variantId) =>
        set({ items: get().items.filter((i) => !sameLine(i, slug, variantId)) }),

      clear: () => set({ items: [] }),

      setOpen: (open) => set({ open }),

      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: lexicon.cartStorageKey,
      partialize: (state) => ({ items: state.items }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);

/** Cantidad total de unidades, 0 hasta hidratar (evita mismatch SSR). */
export function useCartCount(): number {
  const hydrated = useCart((s) => s.hydrated);
  const items = useCart((s) => s.items);
  if (!hydrated) return 0;
  return items.reduce((sum, i) => sum + i.quantity, 0);
}
