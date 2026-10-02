"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { lexicon } from "@/lib/data/content";

/** Máximo de modelos lado a lado, como en el prototipo. */
export const COMPARE_LIMIT = 3;

interface CompareState {
  slugs: string[];
  /** false hasta que zustand rehidrata desde localStorage. */
  hydrated: boolean;

  toggle: (slug: string) => void;
  remove: (slug: string) => void;
  clear: () => void;
  /** Reemplaza la selección completa (hidratación desde ?ids=). */
  replace: (slugs: string[]) => void;
  setHydrated: () => void;
}

/**
 * Selección del comparador, persistente en localStorage: sobrevive la
 * navegación entre catálogo y /comparador y se comparte por URL con ?ids=.
 */
export const useCompare = create<CompareState>()(
  persist(
    (set, get) => ({
      slugs: [],
      hydrated: false,

      toggle: (slug) => {
        const current = get().slugs;
        if (current.includes(slug)) {
          set({ slugs: current.filter((s) => s !== slug) });
        } else if (current.length < COMPARE_LIMIT) {
          set({ slugs: [...current, slug] });
        }
      },

      remove: (slug) => {
        set({ slugs: get().slugs.filter((s) => s !== slug) });
      },

      clear: () => set({ slugs: [] }),

      replace: (slugs) => set({ slugs: slugs.slice(0, COMPARE_LIMIT) }),

      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: lexicon.compareStorageKey,
      partialize: (state) => ({ slugs: state.slugs }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);
