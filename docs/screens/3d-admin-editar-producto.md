# 3d · Admin Editar producto

- PNG: [prototype/3d.png](prototype/3d.png)
- Ruta: `/admin/productos/[id]` (también destino de "+ Nuevo producto" tras `createProduct`)
- Agente dueño: **D Admin**
- Fuente: `BiciTienda MDQ.dc.html` l.266–293; datos `adminVals()` → `editPhotos`, `variants`.

Artboard 1440 × ≥980, grilla `240px | minmax(0,1fr)`, fondo ink `#121110`.

## Estructura (bloques en orden)

### 0. Sidebar
`AdminSidebar active="productos"` (counts: Pedidos 7 · Turnos 14 · Presupuestos 2 · Productos 124). Ver `shell.md`.

### 1. Top bar
- flex, `gap:14px`, `padding:22px 40px`, `border-bottom:1px solid #2b2824`.
- Columna izq. (`gap:4px`): link "← Productos" (Archivo 600 13px, `#8d867a`, → 3c) + H1 "MTB rodado 29 · 21 vel." (Archivo 900 44px/1, `font-stretch:66%`, uppercase).
- Spacer; botón secundario "Ver en la tienda" (borde 1.5px `#4a453e`, `padding:11px 18px`, radio 6, 800 14px uppercase `.06em`); botón primario "Guardar cambios" (yellow, `padding:12px 18px`).
Componente bt: `AdminTopBar { title, back: { href, label: "← Productos" }, actions }` + `Button variant="secondary" | "primary"`.

### 2. Cuerpo
Grilla `minmax(0,1fr) 360px`, `gap:24px`, `padding:24px 40px 40px`, `align-items:start`. Columna izquierda: flex column `gap:20px`. Todas las cards: bg surface `#1f1d1a`, `border:1px solid #2b2824`, radio 10, `padding:24px`, column `gap:18px`. Título de card: Archivo 900 26px/1, `font-stretch:70%`, uppercase.
Componente bt para cada card: `Panel { surface: "surface", padding: "lg" }` + `PanelTitle { size: "md" }` (26).

Labels de campo (todas): Archivo 700 12px uppercase `.08em` `#8d867a`, `gap:8px` al control. Control: bg ink `#121110`, borde `1px #3a362f`, radio 6, `padding:12px 14px`, Archivo 15px paper. → `Field` + `Input/Select/Textarea { surface: "panel" }` (ojo: bt `md` usa `py-[13px]`, el prototipo 12px).

#### 2.1 "Fotos"
- Grilla `repeat(5,minmax(0,1fr))`, `gap:10px`.
- 4 fotos: `aspect-ratio:1`, radio 8, `border:2px solid` (portada `#ffd21f`, resto transparente), img cover. Portada lleva tag "Portada" arriba-izq. (`left:6px;top:6px`, bg yellow, ink, Archivo 800 10px uppercase `.06em`, `padding:3px 6px`, radio 3).
- 5.ª celda: tile "Subir fotos": `aspect-ratio:1`, radio 8, `border:1.5px dashed #5a554c`, column centrada `gap:4px`, Archivo 700 13px `#8d867a`; "+" 24px yellow.
- README: "photos (drag order)".
Componente bt: `UploadDropzone { variant: "tile", label: "Subir fotos" }`. **SIN componente bt** para la grilla de fotos ordenable con borde de portada + tag "Portada" (podría reusar `Tag size="xs"` para el rótulo).

#### 2.2 "Información"
- "Nombre": "MTB rodado 29 · 21 vel. · aluminio".
- Fila `1fr 1fr 1fr`, `gap:12px`: "Categoría" → "MTB ▾" · "Marca" → "[Marca a confirmar]" (color `#8d867a`) · "Etiqueta" → "Más vendida ▾".
- "Descripción": textarea `min-height:84px`, `line-height:1.5`, color `#cfc8bb`: "Una MTB rodado 29 para arrancar en serio: firme en la Ruta 11, en los caminos de tierra de Sierra de los Padres o para ir al trabajo todos los días."
Componente bt: `Field` + `Input`, `Select` (categoría con Repuestos/Importados, etiqueta: sin etiqueta / Más vendida / Oferta / Nuevo), `Textarea`. Marca: input libre (el core crea la marca si no existe).

#### 2.3 "Precio"
Fila `1fr 1fr 1fr`, `gap:12px`:
- "Precio de lista": "$ 489.900" (800 17px).
- "Con transferencia (auto)": campo **de solo lectura**: bg transparente, `border-style:dashed`, color red-light `#ff6a5c`, 800 17px: "$ 440.910 · −10%".
- "Cuotas sin interés": "6 cuotas · $ 81.650 ▾".
Componente bt: `Field` + `Input` (precio). **SIN componente bt** para el campo calculado punteado rojo (variante read-only de `Input`). Cuotas: `Select`.

#### 2.4 "Variantes y stock"
- Encabezado: flex `space-between` baseline: título + link "+ Agregar variante" (Archivo 800 13px uppercase `.06em`, yellow).
- Tabla interna: borde `1px #2b2824`, radio 8. Columnas `100px 1fr 1fr 120px`, `gap:12px`.
  - Header: `padding:12px 18px`, **bg `#121110`**, JetBrains Mono 600 11px uppercase `#8d867a`: "Talle" · "Altura sugerida" · "SKU" · "Stock".
  - Filas: `padding:10px 18px`, `border-top:1px solid #2b2824`, Archivo 14px. Talle: Archivo 900 20px `font-stretch:75%`. Altura: `#cfc8bb`. SKU: Mono 600 12px `#8d867a`. Stock: stepper borde `1px #3a362f`, radio 6, `padding:8px 12px`, 800 15px, "−"/"+" en `#8d867a`, número paper o `#ff6a5c` si 0.
- Filas exactas: S · "1,55 – 1,65 m" · BT-MTB29-21-S · 1 / M · "1,65 – 1,75 m" · BT-MTB29-21-M · 3 / L · "1,75 – 1,85 m" · BT-MTB29-21-L · 2 / XL · "1,85 – 1,95 m" · BT-MTB29-21-XL · 0 (rojo).
Componente bt: `Table { density: "compact", gap: 12 }` (header `#121110`, 12×18) + `QtyStepper { size: "admin", highlightZero: true }` + `TextLink tone="yellow"` para "+ Agregar variante".

### 3. Columna derecha (360px, column `gap:20px`)

#### 3.1 "Visibilidad"
Card como arriba pero `gap:14px`. Filas flex `space-between`, Archivo 700 15px + switch 40×22:
- "Publicado en la tienda" — on
- "Destacado en el home" — on
- "Disponible para prueba" — on
- "Ocultar si no hay stock" — **off**, label en `#cfc8bb`.
Componente bt: `Toggle { label }` ×4.

#### 3.2 "Así se ve en la tienda"
- Eyebrow Archivo 700 12px uppercase `.08em` `#8d867a`, `gap:10px`.
- Product card clara (bg paper `#f4efe4`, radio 10): imagen `aspect-ratio:4/3` con tag "Más vendida" (bg red `#d7261e`, blanco, 800 12px uppercase `.08em`, `padding:6px 10px`, esquina sup-izq sin radio); cuerpo `padding:18px`, `gap:6px`: "MTB / MARCA" (Mono 600 12px `#6f675a`), nombre "MTB rodado 29 · 21 vel. · aluminio" (700 18px/1.2), bloque precio `margin-top:8px; padding-top:12px; border-top:1px dashed #c9c0ae`: "$ 489.900" (900 30px/1 @75%), "6 x $ 81.650 sin interés" (500 13px `#4c463d`), "$ 440.910 por transferencia" (700 13px `#b81d16`). Sin botón "+".
Componente bt: `ProductCard { layout: "desktop", imageAspect: "4/3", hideAdd: true, tag: { label: "Más vendida" } }` (sin link real: href a la ficha o `#`). Eyebrow: `Eyebrow tone="muted" size="sm"`.

#### 3.3 "Eliminar producto"
Link centrado, Archivo 800 13px uppercase `.06em`, red-light `#ff6a5c`, `padding:8px`.
Componente bt: `TextLink tone="red-light"` o `Button variant="danger"` estilado como link (no hay variante "danger text-only" exacta).

## Estados e interacciones
- Prototipo estático (sin variantes PNG).
- Precio con transferencia y cuotas se recalculan al cambiar el precio (`settings.transferDiscount`, `maxInstallments`).
- Preview "Así se ve en la tienda" refleja nombre/etiqueta/precio/foto portada en vivo.
- Stock: ± por variante; 0 en rojo.
- Fotos: subir, reordenar (drag), la primera es portada.

## Datos
- Demo: `productBySlug()`/`PRODUCTS[0]` (`lib/data/demo/products.ts`): `name`, `categorySlug`, `brand` (null → "[Marca a confirmar]"), `tag`, `price`, `photos` (31581017, 7635132, 5807803, 5807792), `variants[]` (`size`, `heightRange` = `SIZE_HEIGHTS`, `sku`, `stock`), `featured`, `testRide`, `hideWhenOut`, `status`. `transferPrice()`, `installmentValue()` (`format.ts`); `PAYMENT_SETTINGS.transferDiscountPct/maxInstallments`.
- Real (lectura): `getAdminProducts()` → buscar por id (`AdminProduct` con `variants: AdminVariant[]` + `stockByLocation`); `getAdminCategories()` para el select; `getVariantsBySlug(slug)` (`lib/server/variants.ts`); `getSettings()`/`getStore()` (`queries.ts`) para % transferencia y cuotas.
- Acciones (`lib/server/actions/products.ts`):
  - `patchProduct(id, patch)` — `name, category, brandName, description, price, oldPrice, tag, chips, specs, sku, rodado, testRide, hideWhenOut, status: "publicado"|"borrador", hidden, featured` (autosave por campo).
  - `setProductHidden(id, hidden)`, `setProductFeatured(id, featured)`.
  - Fotos: `setProductPhoto(productId, formData)` (campo `photo`; reemplaza la portada) y `revertProductPhoto(productId)`.
  - Variantes: `addProductVariant(productId, { size, color?, heightRange?, sku?, order?, active? })`, `patchProductVariant(variantId, patch)`, `deleteProductVariant(variantId)`.
  - Stock: `adjustStock({ …, delta })` / `setStockAt({ …, qty })` (por sucursal).
  - `deleteProduct(id)` — solo productos `custom` y sin ventas ("Los modelos del catálogo original se ocultan, no se eliminan.").
  - `duplicateProduct`, `revertProduct` disponibles (no están en el diseño).
- "Ver en la tienda" → `/catalogo/[slug]`.

## Componentes bt faltantes
- Grilla de fotos ordenable (portada con borde amarillo + tag "Portada" + tile de subida).
- Campo calculado de solo lectura (borde punteado, texto rojo-claro 800 17px).
- Link de peligro centrado ("Eliminar producto") — se arma con `TextLink`, pero no hay variante uppercase 800 13px.

## Ambigüedades
- **"Guardar cambios"** vs autosave: `patchProduct` está pensado como autosave por campo; el diseño tiene botón global. Decidir (botón que dispara el patch acumulado, o autosave + botón como confirmación).
- **Color**: el README pide variantes "talle × color × stock", el 3d no tiene columna Color. El core soporta `color`. Sugerido: columna Color solo si el producto tiene >1 color.
- **Specs** ("specs table" en README) y "chips" no aparecen en 3d; el core los guarda (`specs`, `chips`). Falta la card.
- **Cuotas sin interés por producto** ("6 cuotas · $ 81.650 ▾"): en el core las cuotas son globales (`settings.maxInstallments`); `patchProduct` no tiene campo de cuotas. Probablemente debería ser informativo.
- "Publicado en la tienda" → ¿`status` (publicado/borrador) o `hidden`? El core tiene ambos.
- Upload: `setProductPhoto` solo reemplaza la portada; la galería múltiple y el reordenamiento no tienen action.
- Stock por sucursal (`stockByLocation`) vs un solo número por variante en el diseño: BiciTienda tiene un local; usar la sucursal única.
- Precio "a consultar" (`price: null`) no está contemplado en el diseño.
