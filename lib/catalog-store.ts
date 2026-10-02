"use client";

import { create } from "zustand";
import type { CatalogFilters } from "@/lib/filters";

/**
 * Estado de los filtros del catálogo, compartido entre el buscador del
 * header (y del menú mobile) y la grilla: escribir en el nav filtra en vivo
 * la lista, como el `search` global del prototipo. No se persiste: la URL
 * del catálogo es la que guarda los filtros.
 */
interface CatalogState extends CatalogFilters {
  set: (patch: Partial<CatalogFilters>) => void;
}

export const useCatalogFilters = create<CatalogState>()((set) => ({
  brand: "",
  sort: "rel",
  search: "",
  set: (patch) => set(patch),
}));
