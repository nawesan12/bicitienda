"use client";

import { useCart } from "@/lib/cart-store";

/**
 * "Comprar en la tienda ↗" de la ficha, con el estilo del prototipo
 * (contorno verde): agrega una unidad al carrito propio y abre el drawer.
 */
export function AddToCart({
  slug,
  stock,
  label,
}: {
  slug: string;
  stock: number;
  label: string;
}) {
  const add = useCart((s) => s.add);

  return (
    <button
      type="button"
      onClick={() => add(slug, stock)}
      className="box-border min-w-[180px] flex-1 rounded-full border-[1.5px] border-brand px-5 py-[15px] text-center font-sans text-[15px] font-bold text-brand-deep hover:bg-brand hover:text-night"
    >
      {label}
    </button>
  );
}
