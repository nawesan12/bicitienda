# 2c / 4c · Detalle de producto

- PNG: [2c desktop](prototype/2c.png) · [4c mobile](prototype/4c.png)
- Ruta app: `/catalogo/[slug]`
- Agente dueño: **A Tienda**
- Fuente: `BiciTienda MDQ.dc.html` l.423–458 (2c), l.116–128 (4c); datos `renderVals()` (`gallery`, `specs`, `related = ACC`). Producto de ejemplo: MTB rodado 29 · 21 vel. · aluminio (`mtb-rodado-29-21-vel-aluminio`).

## Estructura desktop (2c, 1440)

### 1. Header
`<Header active="bicicletas">` (grupo del producto).

### 2. Breadcrumb
`padding:28px 56px 0`; Archivo 500 14px `#8d867a`; último paper: "Inicio / Bicicletas / MTB / " + "MTB rodado 29 · 21 vel." → bt `Breadcrumb` (el último ítem usa el nombre **corto**).

### 3. Bloque principal
`display:grid; grid-template-columns:1.25fr 1fr; gap:56px; padding:24px 56px 64px`.

#### 3a. Galería — `grid-template-columns:96px minmax(0,1fr); gap:14px`
- Miniaturas: `column; gap:12px`; `96×96; object-fit:cover; radius 8; border:2px solid` (seleccionada `#ffd21f`, resto transparent; `box-sizing:border-box`). 4 fotos.
- Principal: `position:relative; radius 10; overflow:hidden; bg #1f1d1a; height:640px`; img cover; tag `top:0 left:0; bg #d7261e; #fff; Archivo 800 13px uppercase .08em; padding:8px 12px` "Más vendida".
- **SIN componente bt de galería** (`ProductGallery`).

#### 3b. Info — `column; gap:24px`
1. Encabezado `column; gap:10px`:
   - JetBrains Mono 600 13px `#8d867a`: "MTB / MARCA · SKU BT-MTB29-21".
   - H1 Archivo 900 72px/.88 @66% uppercase: "MTB rodado 29 · 21 vel. · aluminio". → `Display` (no hay tamaño 72 en la lista: `page` es 96; **verificar/agregar tamaño `product` 72**).
2. Caja de precio: `bg #1f1d1a; border 1px #2b2824; radius 10; padding:22px; gap:8px`:
   - Archivo 900 56px/1 @72% "$ 489.900".
   - 600 16px `#cfc8bb`: `<span #ffd21f>`"6 cuotas sin interés"`</span>` + " de $ 81.650".
   - 700 16px `#ff6a5c` (red-light): "$ 440.910 pagando por transferencia (10% off)".
   → bt **`PriceBox { price, installments, transferDiscountPct }`** (exacto).
3. Talle `column; gap:12px`:
   - Fila `space-between`: label 700 13px uppercase `.08em` `#8d867a` "Talle" + link 600 14px `#ffd21f` underline "¿No sabés tu talle? Te asesoramos" (→ turnos).
   - Grilla `repeat(4,1fr); gap:8px`; opción `padding:14px 0; centrado; radius 6`:
     - normal: `border 1px #3a362f`, 700 16px; altura 400 13px `#8d867a` → "S 1,55–1,65", "L 1,75–1,85".
     - seleccionado: bg `#ffd21f`, ink, 800 16px; altura 500 13px → "M 1,65–1,75".
     - sin stock: `border 1px dashed #3a362f`, color `#5a554c`, `line-through`, sin altura → "XL".
   → bt **`SizeSelector { name, options:{value,label,height,available}[], help:{href,label} }`**.
4. Color `column; gap:12px`:
   - Label 700 13px uppercase `.08em` `#8d867a`: "Color · Negro / amarillo".
   - `flex; gap:10px`; swatches círculo `36×36`, `border 2px`: seleccionado `bg #121110; border #ffd21f; box-shadow inset 0 0 0 3px #121110, inset 0 0 0 12px #ffd21f`; rojo `#d7261e` y crema `#e8e1d3` con borde `#3a362f`.
   → bt `ColorSelector` (**decisión bt: estilo de talles con swatch 14 px, no círculos de 36**).
5. Cantidad + agregar `grid 140px 1fr; gap:10px`:
   - Stepper `border 1px #3a362f; radius 6; padding:0 16px; Archivo 800 18px; space-between`: "−" (`#8d867a`) "1" "+" → bt `QtyStepper size="lg"`.
   - Primario `padding:19px 0; radius 6; amarillo; 800 16px uppercase .06em` "Agregar al carrito" → `Button variant="primary" size="full-lg"` (19 px vertical · 16 px).
6. Secundario `border 1.5px #f4efe4; padding:17px 0; radius 6; 800 16px uppercase .06em` "Reservar una prueba de esta bici" (→ `/turnos` con el producto) → `Button variant="outline-paper" size="full-lg"` (prototipo 17 px vertical vs 19 de `full-lg`: diferencia de 2 px). Solo si `testRide`.
7. Mini cards `grid 1fr 1fr; gap:1px; bg #2b2824; border 1px line; radius 10; overflow:hidden`; celda bg ink `padding:16px 18px; gap:4px`; título 800 15px, texto 14px `#cfc8bb`:
   - "Retiro en el local" / "Armada y ajustada a tu altura"
   - "Stock en el local" / "Quedan 3 en talle M"
   → `TileGrid columns={2}` + `Tile`.

### 4. Descripción + specs
`grid-template-columns:1fr 1.25fr; gap:56px; padding:0 56px 64px` (**invierte** las proporciones del bloque de arriba).
- Columna 1 `gap:16px`: H2 Archivo 900 48px/.9 @66% uppercase "Para quién es" + `<p>` 17px/1.6 `#cfc8bb`: "Una MTB rodado 29 para arrancar en serio: firme en la Ruta 11, en los caminos de tierra de Sierra de los Padres o para ir al trabajo todos los días. Cuadro liviano de aluminio y 21 cambios para las subidas."
- Columna 2 `gap:16px`: H2 "Especificaciones"; lista `border-top 1px line`; fila `grid 200px 1fr; padding:14px 0; border-bottom 1px line; 15px`; clave JetBrains Mono 600 12px uppercase `#8d867a` `padding-top:2px`.
  - Cuadro — Aluminio 6061, talles S / M / L / XL
  - Horquilla — Suspensión 80 mm con bloqueo
  - Transmisión — 3x7 · 21 velocidades
  - Frenos — Disco mecánico delantero y trasero
  - Ruedas — Rodado 29 · doble pared
  - Peso aprox. — 14,5 kg
- bt: `Display size="h2"`, **`SpecList variant="desktop"`**.

### 5. Relacionados
`padding:0 56px 72px; column; gap:24px`. H2 48px "Sumale a tu bici". Grilla `repeat(4,minmax(0,1fr)); gap:16px`. Card `bg #f4efe4; ink; radius 10`; img `aspect-ratio:4/3`; cuerpo `padding:16px; gap:4px`: nombre 700 16px/1.2; precio 900 26px/1 @75% `margin-top:6px`. → bt **`RelatedProductCard { href, name, image, price }`**. Items: los 4 `ACC`.

### 6. Footer

## Estructura mobile (4c, 390)

1. MobileHeader **sin búsqueda** (`search=false`).
2. Foto `position:relative; height:340px` a sangre; tag 800 11px `.08em` `padding:6px 10px` "Más vendida"; dots `bottom:12px` centrados `gap:6px`: activo `20×6` radius 3 amarillo, resto `6×6` `rgba(244,239,228,.6)`. → **SIN componente bt (carrusel con dots)**.
3. Contenido `padding:18px 16px 28px; column; gap:18px`:
   - Mono 600 11px `#8d867a` "MTB / MARCA · BT-MTB29-21" (sin "SKU"); H1 900 **48px**/.88 @66% (inline 56 pisado a 48).
   - Caja precio `radius 8; padding:16px; gap:4px`: 900 44px/1 @72%; cuotas 600 14px; transferencia 700 14px `#ff6a5c` **"$ 440.910 por transferencia"** (texto corto). → `PriceBox` (ya cambia el texto en mobile).
   - Talle: label 700 12px; link 600 13px amarillo "¿Cuál es mi talle?" (→ turnos); grilla `repeat(4,1fr); gap:6px`; opción `min-height:48px; radius 6; 800 16px`, **sin altura**; seleccionado M amarillo; XL dashed `#5a554c` tachado.
   - Sin selector de color ni stepper de cantidad.
   - "Agregar al carrito" `min-height:52px` primario 800 15px; "Reservar una prueba" `min-height:50px; border 1.5px #f4efe4`.
   - Mini cards `grid 1fr 1fr; gap:8px`; caja `bg #1f1d1a; radius 8; padding:12px; gap:2px`; 800 14px / 13px `#cfc8bb`: "Retiro en el local" / "Armada y ajustada" · "Stock" / "Quedan 3 en talle M".
   - Acordeones `border-top 1px line`: cabecera `min-height:56px; border-bottom 1px line; space-between`; título 900 22px @72% uppercase; signo 800 20px amarillo ("−" abierto, "+" cerrado). "Especificaciones" abierto con filas `padding:11px 0; border-bottom; 14px`, clave `#8d867a`, valor `text-align:right`. "Para quién es" cerrado. → bt **`Accordion` + `SpecList variant="mobile"`**.
   - Sin relacionados ni footer.

## Desktop vs mobile

| | 2c | 4c |
|---|---|---|
| Galería | 4 miniaturas + principal 640 | carrusel 340 con dots |
| H1 | 72px | 48px |
| Talles | con altura sugerida | sin altura (bt la agrega: decisión) |
| Color / cantidad | sí | no |
| Texto transferencia | "… pagando por transferencia (10% off)" | "… por transferencia" |
| CTA prueba | "Reservar una prueba de esta bici" | "Reservar una prueba" |
| Ayuda talle | "¿No sabés tu talle? Te asesoramos" | "¿Cuál es mi talle?" |
| Mini cards | "Armada y ajustada a tu altura" / "Stock en el local" | "Armada y ajustada" / "Stock" |
| Para quién / specs | 2 columnas abiertas | acordeones |
| Relacionados | "Sumale a tu bici" ×4 | no |

## Estados e interacciones

- Prototipo estático (no hay state para talle/color/galería). Real:
  - Miniatura click → cambia la principal (borde amarillo).
  - Talle/color: radios; talle sin stock deshabilitado. "Quedan N en talle X" se actualiza con la variante (stock de talle+color, o total del talle).
  - Si no hay stock en ningún talle: CTA deshabilitado / aviso (**no diseñado**).
  - Productos sin talles (accesorios, "Único") ocultan el selector; con 1 color, `ColorSelector` devuelve null.
  - "Agregar al carrito" → carrito (`/checkout`); "Reservar una prueba" → `/turnos?producto=<slug>` (solo `testRide`).
  - Acordeones mobile: `<details>`.

## Datos

| Bloque | Demo | Real |
|---|---|---|
| Producto | `productBySlug(slug)` (`PRODUCTS`) | `getProduct(slug)` (`lib/server/queries.ts`, sale de `getVisibleProducts()`) |
| Breadcrumb | grupo/tipo de `CATEGORIES` | `getCategory(product.category)` + padre |
| Galería | `photos` → `demoPhoto(id)` | `product.images` |
| Tag | `tag` | `product.tag` |
| Mono "CAT / MARCA · SKU" | `cardLabel`, `brand` (null → "MARCA"), `sku` | categoría, `getBrands()` por `brandId`, `product.sku` |
| Precio / cuotas / transferencia | `price`, `PAYMENT_SETTINGS` | `product.price`; `getStore().maxInstallments`; % de `getSettings()` |
| Talles / colores / stock | `variants` (`size`, `color`, `heightRange`, `stock`), `COLORS`, `SIZE_HEIGHTS` | `product.variants: ProductVariant[]` (`size`, `color`, `heightRange`, `stock`) vía `getVariantsBySlug` (`lib/server/variants.ts`) |
| Disponibilidad por sucursal | — | `getProductAvailability(slug)` (solo si >1 sucursal; niveles, no cantidades) |
| Prueba | `testRide` | `product.testRide` |
| "Para quién es" | `description` (`MTB29_DESCRIPTION`) | `product.description` |
| Specs | `specs` (`MTB29_SPECS`) | `product.specs` |
| Relacionados | `DEMO_ACCESSORIES` | `getVisibleProducts()` del grupo accesorios (criterio a definir) |
| Copy | `COPY.product` (`installmentsLead`, `installmentsTail`, `transfer`, `sizeLabel`, `sizeHelp`, `sizeHelpMobile`, `colorLabel`, `addToCart`, `testRide`, `testRideMobile`, `pickupTitle`, `pickupText`, `stockTitle`, `stockText: "Quedan {n} en talle {talle}"`, `forWhoTitle`, `specsTitle`, `relatedTitle`) | — |

## Componentes bt faltantes

- **ProductGallery** desktop (columna de miniaturas 96 + principal 640 con tag).
- **ProductCarousel** mobile (foto 340 + dots).
- `Display` no tiene tamaño 72/.88 desktop + 48/.88 mobile (H1 de producto; `page` es 96/56) → agregar un tamaño o usar `className`.

## Ambigüedades

- **SKU**: 2c muestra "BT-MTB29-21"; 3c usa la fórmula "BT-MTB-1040" y 3d variantes "BT-MTB29-21-S". La demo usa la fórmula de 3c (`products.ts`).
- **"Quedan 3 en talle M"**: con colores, la demo reparte el stock (M = 2 negro/amarillo + 1 rojo); mostrar total del talle o del talle+color — decidir.
- **Altura en talles mobile**: 4c no la muestra; bt `SizeSelector` la muestra (decisión del plan).
- **Selector de color**: círculos 36 px en el prototipo vs estilo de talles + swatch 14 px en bt (decisión bt).
- Breadcrumb usa un nombre corto ("MTB rodado 29 · 21 vel.") distinto del H1: no hay campo "nombre corto" en el modelo → usar el nombre completo o truncar.
- Mobile sin stepper de cantidad ni color: si el producto tiene >1 color, mobile necesita el selector (no diseñado).
- "Para quién es" desktop es columna abierta; mobile acordeón cerrado.
