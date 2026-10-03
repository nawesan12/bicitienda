"use client";

import Link from "next/link";
import { useState } from "react";
import { PRODUCT_CARD_ADD_CLASSES } from "@/components/bt/product-card";
import { useCart } from "@/lib/cart-store";

/**
 * Botón "+" de la product card (`addAction`). Con una sola variante
 * vendible agrega una unidad al carrito (y muestra ✓ un momento); si hay
 * que elegir talle o color lleva a la ficha.
 */
export function CardAddButton({
  slug,
  name,
  href,
  variant,
}: {
  slug: string;
  name: string;
  href: string;
  variant: { id: string; stock: number } | null;
}) {
  const add = useCart((s) => s.add);
  const [done, setDone] = useState(false);

  if (!variant) {
    return (
      <Link href={href} aria-label={`Elegir talle de ${name}`} className={PRODUCT_CARD_ADD_CLASSES}>
        +
      </Link>
    );
  }
  return (
    <button
      type="button"
      aria-label={`Agregar ${name} al carrito`}
      className={PRODUCT_CARD_ADD_CLASSES}
      onClick={() => {
        add(slug, variant.stock, variant.id);
        setDone(true);
        window.setTimeout(() => setDone(false), 1400);
      }}
    >
      {done ? "✓" : "+"}
    </button>
  );
}
