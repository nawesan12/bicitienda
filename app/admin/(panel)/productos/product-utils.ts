import type { AdminProduct } from "@/lib/server/admin-queries";
import { img, resolveImage } from "@/lib/images";

/** Logo de la marca como foto de un producto sin foto (como el prototipo). */
export const NO_PHOTO = resolveImage("/brand/logo-black.png");

/** Portada de un producto al tamaño pedido, o el logo si no tiene foto. */
export function productPhoto(images: string[], w: number): string {
  return images[0] ? img(images[0], { w }) : NO_PHOTO;
}

/**
 * Qué hace el interruptor de stock (fila y tab Estado). "Sin stock" se
 * deriva de las cantidades; el interruptor maneja el override manual:
 *   - con override → se quita (vuelve a mandar la cantidad);
 *   - con unidades → se fuerza SIN STOCK;
 *   - sin unidades ni override → no hay nada que prender: se cargan en Stock.
 */
export function stockToggle(p: AdminProduct): {
  next: boolean | null;
  message: string;
} {
  if (p.stockOverride === "sin_stock") {
    return {
      next: false,
      message:
        p.stock > 0
          ? `${p.name}: en stock`
          : `${p.name} no tiene unidades: cargalas en Stock`,
    };
  }
  if (p.stock > 0) return { next: true, message: `${p.name}: marcado sin stock` };
  return { next: null, message: `${p.name} no tiene unidades: cargalas en Stock` };
}

export function isOut(p: AdminProduct): boolean {
  return p.stockOverride === "sin_stock" || p.stock <= 0;
}
