# components/bt/tienda-a: home, catálogo y ficha (Ola 1 · A)

Componentes de las pantallas 2a/4a, 2b/4b y 2c/4c que `components/bt` no
tiene. Siguen las reglas de bt (tokens de `app/theme.css`, hrefs por props,
sin fetch). Los datos los arma `lib/server/screens/tienda-a.ts` (view models
serializables sobre las queries cacheadas de `lib/server/queries.ts`).

Breakpoint del chrome: desktop desde `lg` (donde aparece el `Header`), mobile
debajo. Las cards siguen el `md` de `ProductCard`.

| Componente | Archivo | Tipo | Uso |
|---|---|---|---|
| `HomeHero` `{ photo, photoAlt, tag, titleLead, titleHighlight, cta: {href,label}, subline? }` | `home.tsx` | server | Hero 2a (caja radio 10 de 580 px) / 4a (a sangre, 540 px, CTA a todo el ancho, sin subline) |
| `CategoryStrip` `{ cells: {index,name,href}[] }` | `home.tsx` | server | Tira de 7 celdas (2a) y `ChipScroller` + `Chip` (4a) |
| `HowItWorks` `{ steps: {n,title,text,textMobile?}[] }` | `home.tsx` | server | "Cómo funciona": 3 columnas (2a) / lista con columna de 52 px (4a) |
| `CatalogCard` `{ item: CatalogItem, pricing, className? }` | `catalog-card.tsx` | server/cliente | `ProductCard` de bt desde un `CatalogItem`. Marca `sin-marca` → sin marca; tono del tag según bt (`tagToneFor`) |
| `CardAddButton` `{ slug, name, href, variant }` | `card-add.tsx` | cliente | "+" de la card: con una sola variante vendible suma al carrito (✓ un momento); si hay que elegir talle/color lleva a la ficha |
| `CatalogBrowser` (`CatalogBrowserProps`) | `catalog-browser.tsx` | cliente | Catálogo completo: aside de filtros, chips, orden, grilla de 3 columnas con paginación (9) en desktop; botón "Filtros · N" + drawer, chips paper, 2 columnas y "Ver más modelos" (6) en mobile |
| `PriceRangeSlider` `{ min, max, step?, value, onChange, idPrefix? }` | `price-range.tsx` | cliente | Dos montos editables + barra de 4 px con tramo amarillo y 2 thumbs de 16 px (dos `input range` superpuestos) |
| `ProductPhotos` / `ProductGallery` / `ProductCarousel` `{ photos: {src,thumb,alt}[], tag? }` | `product-gallery.tsx` | cliente | Galería 2c (miniaturas de 96 + principal de 640) y carrusel 4c (340 px, scroll-snap, dots) |
| `ProductPurchase` (`ProductPurchaseProps`) | `product-purchase.tsx` | cliente | Talle (con altura sugerida), color (solo con >1), cantidad (desktop), agregar al carrito, reservar prueba y celdas Retiro / Stock |

## Decisiones

- **Filtros del catálogo en el navegador.** La página es estática/ISR: el
  server manda todos los productos del grupo y `CatalogBrowser` filtra,
  ordena y pagina. El estado vive en la URL (`?tipo=mtb&rodado=29&talle=M&
  min=&max=&prueba=1&orden=&q=&pagina=`): se escribe con
  `history.replaceState` (con debounce, por el slider) y se lee con
  `useSearchParams` dentro de un `Suspense` chico, así el HTML estático trae
  la grilla sin filtros y los links con filtros (y el buscador `?q=`)
  funcionan.
- **Rodados y talles**: se muestran los del prototipo (12…29, S–XL) más los
  que haya en los datos; los que no tienen productos en el grupo quedan
  deshabilitados. Rodado, Talle y "Se puede probar" solo aparecen si el grupo
  tiene bicis (Accesorios: Tipo + Precio). "Tipo" solo con más de un tipo.
- **Orden**: Más vendidas (orden del seed), Menor precio, Mayor precio, Más
  nuevos.
- **Drawer de filtros (sin diseño)**: panel a pantalla completa sobre ink,
  título 900 30 @70, ✕ paper de 44 (como el menú 5c), los mismos grupos del
  aside y pie con "Limpiar" + "Ver N modelos" amarillo. Escape cierra.
- **Ficha**: talle inicial = el de más stock; color inicial = el primero con
  stock en ese talle. "Quedan N en talle X" es el stock de la variante
  elegida (talle × color; con más de un color suma " · Color"). Sin stock:
  botón "Sin stock" deshabilitado y la celda en rojo claro. "Agregar al
  carrito" suma la cantidad y lleva a `/checkout`.
- **Links de turnos**: "Reservar una prueba" → `/turnos?servicio=prueba&
  producto=<slug>` (solo `testRide`); ayuda de talle →
  `/turnos?servicio=asesoramiento&producto=<slug>`.
- **Relacionados**: de una bici, accesorios ("Sumale a tu bici"); del resto,
  su mismo grupo. Solo desktop, como el prototipo.
- **Retiro** en productos que no son bicis: "Sin cargo, listo para llevar"
  (el "Armada y ajustada" no aplica).
