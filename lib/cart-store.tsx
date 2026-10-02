"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { lexicon } from "@/lib/data/content";
import type { CartItem } from "@/lib/types";

/**
 * Carrito, persistente en localStorage. Guarda solo {slug, cantidad}: los
 * datos del producto (nombre, precio, foto, stock) los aporta el server en
 * cada render vía CartCatalog — el precio que se muestra siempre es el
 * vigente, y el cobro real se recalcula server-side en createOrder.
 */

interface CartState {
  items: CartItem[];
  open: boolean;
  /** false hasta que zustand rehidrata desde localStorage. */
  hydrated: boolean;

  add: (slug: string, max: number) => void;
  setQty: (slug: string, qty: number, max: number) => void;
  remove: (slug: string) => void;
  clear: () => void;
  setOpen: (open: boolean) => void;
  setHydrated: () => void;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      open: false,
      hydrated: false,

      add: (slug, max) => {
        const items = get().items;
        const existing = items.find((i) => i.productSlug === slug);
        const next = existing
          ? items.map((i) =>
              i.productSlug === slug
                ? { ...i, quantity: Math.min(i.quantity + 1, max) }
                : i,
            )
          : [...items, { productSlug: slug, quantity: 1 }];
        set({ items: next, open: true });
      },

      setQty: (slug, qty, max) => {
        const capped = Math.min(Math.max(0, Math.floor(qty)), max);
        set({
          items:
            capped <= 0
              ? get().items.filter((i) => i.productSlug !== slug)
              : get().items.map((i) =>
                  i.productSlug === slug ? { ...i, quantity: capped } : i,
                ),
        });
      },

      remove: (slug) =>
        set({ items: get().items.filter((i) => i.productSlug !== slug) }),

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
