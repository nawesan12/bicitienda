import { ProductCard } from "@/components/bt/product-card";
import type { CatalogItem, Pricing } from "@/lib/server/screens/tienda-a";
import { CardAddButton } from "./card-add";

/**
 * `ProductCard` de bt a partir de un `CatalogItem` (home y catálogo). La
 * marca placeholder "sin-marca" no se muestra (brand null) y el tono del
 * tag lo decide bt (`tagToneFor`: "Nuevo" amarillo, el resto rojo).
 */
export function CatalogCard({
  item,
  pricing,
  className,
}: {
  item: CatalogItem;
  pricing: Pricing;
  className?: string;
}) {
  return (
    <ProductCard
      href={item.href}
      name={item.name}
      category={item.category}
      brand={item.brand ?? undefined}
      image={item.image}
      price={item.price}
      tag={item.tag ? { label: item.tag } : undefined}
      transferDiscountPct={pricing.transferDiscountPct}
      layout="responsive"
      className={className}
      hideAdd={item.outOfStock}
      addAction={
        <CardAddButton slug={item.slug} name={item.name} href={item.href} variant={item.quickVariant} />
      }
    />
  );
}
