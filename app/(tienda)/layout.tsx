import { StoreFrame } from "@/components/store/store-frame";

/**
 * Layout de la tienda pública (route group: no cambia las URLs). Todas las
 * páginas públicas comparten el chrome del sistema bt (Header /
 * MobileHeader / Footer) sin envolverse a mano. El admin (/admin) y las
 * herramientas de desarrollo ((dev)) quedan afuera.
 */
export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return <StoreFrame>{children}</StoreFrame>;
}
