# 3c · Admin Productos (listado con stock por talle)

- PNG: [prototype/3c.png](prototype/3c.png)
- Ruta: `/admin/productos` (hoy existe `app/admin/(panel)/productos/` heredado: `products-manager.tsx`, `product-modal.tsx`, `categories-manager.tsx`, `plantilla/`)
- Agente dueño: **D Admin**
- Fuente: `BiciTienda MDQ.dc.html` l.257–265; datos `adminVals()` → `STK`, `prods` (~l.700).

Artboard 1440 × ≥980. Grilla `240px | minmax(0,1fr)`, `min-height:980px`, fondo ink `#121110`.

## Estructura (bloques en orden)

### 0. Sidebar
`AdminSidebar active="productos"`. Contadores del prototipo: Pedidos 7 · Turnos 14 · Presupuestos 2 · Productos 124. Detalle en `shell.md`.
Componente bt: `AdminShell` + `AdminSidebar { active: "productos", counts }`.

### 1. Top bar
- Contenedor: flex, `align-items:center`, `gap:14px`, `padding:22px 40px`, `border-bottom:1px solid #2b2824` (line).
- H1 "Productos": Archivo 900 44px/1, `font-stretch:66%`, uppercase.
- Spacer `flex:1`.
- Búsqueda: bg surface `#1f1d1a`, borde `1px #3a362f` (line-strong), radio 6, `padding:11px 16px`, **ancho 280px**, Archivo 14px, color text-3 `#8d867a`. Placeholder: "Buscar por nombre o SKU".
- Botón secundario "Importar planilla": `border:1.5px solid #4a453e` (line-btn), `padding:11px 18px`, radio 6, Archivo 800 14px uppercase `.06em`, nowrap.
- Botón primario "+ Nuevo producto": bg yellow `#ffd21f`, texto ink, `padding:12px 18px`, radio 6, Archivo 800 14px uppercase `.06em`. Lleva a 3d.
Componente bt: `AdminTopBar { title: "Productos", search: { action, placeholder: "Buscar por nombre o SKU", width: 280 }, actions: <Button variant="secondary" size="header">Importar planilla</Button><Button variant="primary" size="header">+ Nuevo producto</Button> }`. (Verificar que `size="header"` dé 11×18/12×18; el header de tienda usa 11×16.)

### 2. Fila de filtros (chips)
- Contenedor: flex, `gap:8px`, `padding:18px 40px 0`.
- Chips: `padding:7px 14px`, radio 999, Archivo 700 13px. Activo: bg paper `#f4efe4`, texto ink. Inactivos: `border:1px solid #3a362f`.
- Copy exacto, en orden: "Todos · 124" (activo) · "Bicicletas · 48" · "Accesorios · 38" · "Indumentaria · 22" · "Cascos · 16" · spacer `flex:1` · "Sin stock · 2" (alineado a la derecha).
- Los números son decorativos (ver comentario en `lib/data/demo/products.ts` l.~198): la UI real cuenta productos.
Componente bt: `FilterChip { active, count, size: "md" }` (7×14, 700 13px). El spacer es layout local.

### 3. Tabla
- Wrapper: `padding:18px 40px 40px`; caja `border:1px solid #2b2824`, radio 10, `overflow:hidden`.
- Columnas (header y filas): `64px minmax(0,1fr) 110px 110px 190px 64px 112px`, `gap:24px`.
- Header: `padding:14px 22px`, bg surface-2 `#1a1816`, JetBrains Mono 600 11px uppercase, `#8d867a`. Copy: "" (thumb) · "Producto" · "Categoría" · "Precio" · "Stock por talle" · "Prueba" · "Estado".
- Fila: `<a>` a 3d, `padding:18px 22px`, `border-top:1px solid #2b2824`, `align-items:center`, Archivo 14px. Todas las celdas con ellipsis.
  - Thumb: img 64×48, `object-fit:cover`, radio 6.
  - Producto: columna `gap:2px`; nombre 700 (ellipsis); SKU JetBrains Mono 600 11px `#8d867a`.
  - Categoría: color text-2 `#cfc8bb`.
  - Precio: 800, formato `$ 489.900`.
  - Stock por talle: JetBrains Mono 600 12px; color `#cfc8bb`, **`#ff6a5c` (red-light) si el total es 0**.
  - Prueba: switch 40×22, radio 999, padding 3, knob 16×16. On: track yellow `#ffd21f`, knob ink `#121110` a la derecha. Off: track `#3a362f`, knob `#8d867a` a la izquierda.
  - Estado: pill `justify-self:start`, Archivo 800 11px uppercase `.06em`, `padding:5px 10px`, radio 999, borde 1px. Publicado: bg `#2b2824` / texto paper / borde `#2b2824`. Sin stock: bg red `#d7261e` / `#fff` / `#d7261e`. Borrador: transparente / `#8d867a` / borde `#5a554c`.
Componente bt: `Table { columns, rows, getRowKey, rowHref, gap: 24 }` + `CellThumb` (64×48 — verificar tamaño), `CellStack` (nombre + SKU mono), `CellMono` (stock, con tono rojo si 0), `Toggle` sin label (`aria-label="Disponible para prueba"`), `ProductPill { status: publicado|sin_stock|borrador, size: "md" }`.

Filas del prototipo (13 = 9 bicis + 4 accesorios), exactas:

| Producto | SKU | Cat. | Precio | Stock | Prueba | Estado |
|---|---|---|---|---|---|---|
| MTB rodado 29 · 21 vel. · aluminio | BT-MTB-1040 | MTB | $ 489.900 | S 1 · M 3 · L 2 · XL 0 | on | Publicado |
| MTB rodado 29 · doble suspensión | BT-MTB-1047 | MTB | $ 1.249.900 | S 0 · M 1 · L 1 · XL 0 | on | Publicado |
| MTB rodado 27.5 · juvenil | BT-MTB-1054 | MTB | $ 399.900 | S 2 · M 2 · L 0 · XL 0 | on | Publicado |
| Gravel 700c · 2x9 vel. | BT-GRA-1061 | Gravel | $ 899.900 | S 0 · M 0 · L 0 · XL 0 (rojo) | off | Sin stock |
| Ruta aluminio · 2x8 vel. | BT-RUT-1068 | Ruta | $ 759.900 | S 1 · M 2 · L 1 · XL 0 | on | Publicado |
| Urbana rodado 28 · canasto | BT-URB-1075 | Urbana | $ 359.900 | S 2 · M 3 · L 2 · XL 1 | on | Publicado |
| Paseo rodado 26 · guardabarros | BT-URB-1082 | Urbana | $ 319.900 | S 1 · M 1 · L 0 · XL 0 | on | Publicado |
| Urbana vintage rodado 28 | BT-URB-1089 | Urbana | $ 389.900 | S 0 · M 2 · L 1 · XL 0 | on | Borrador |
| Infantil rodado 16 · rueditas | BT-INF-1096 | Infantil | $ 189.900 | Único 3 | on | Publicado |
| Casco urbano regulable · M/L | BT-CAS-1103 | Cascos | $ 54.900 | Unidades 12 | off | Publicado |
| Casco MTB con visera | BT-CAS-1110 | Cascos | $ 79.900 | Unidades 5 | off | Publicado |
| Remera de ciclismo manga corta | BT-IND-1117 | Indumentaria | $ 42.900 | Unidades 0 (rojo) | off | Sin stock |
| Kit luces delantera + trasera | BT-ACC-1124 | Accesorios | $ 24.900 | Unidades 9 | off | Publicado |

## Estados e interacciones
- Fila entera = link a 3d (`/admin/productos/[id]`). Sin estado seleccionado (no hay panel de detalle).
- Chips filtran por grupo/categoría y "Sin stock"; búsqueda por nombre o SKU.
- Toggle "Prueba" en la fila: en el prototipo es decorativo (está dentro del `<a>`); en la app, si se hace interactivo, frenar la navegación del link (o sacarlo del link).
- Estado: prioridad Borrador > Sin stock > Publicado (`adminStatus`).
- Sin variantes de PNG (pantalla no interactiva).

## Datos
- Demo: `PRODUCTS` (`lib/data/demo/products.ts`), `adminStatus(p)`, `stockSummary(p)` ("S 1 · M 3 · L 2 · XL 0" / "Único 3" / "Unidades 12"), `totalStock(p)`, `ars()`.
- Real: `getAdminProducts()` (`lib/server/admin-queries.ts`) → `AdminProduct` (`name`, `sku`, `categoryLabel`, `brandName`, `price`, `images[0]`, `variants[]` con `size`/`stock`, `testRide`, `status`, `hidden`, `hideWhenOut`, `stock`, `stockByLocation`). Chips con conteos: `getAdminCategories()` (`count` por categoría). Contador del sidebar: `getAdminNavCounts()`.
- Acciones: toggle Prueba → `patchProduct(id, { testRide })` (`lib/server/actions/products.ts`). "+ Nuevo producto" → `createProduct(category)` → `{ ok, id }` y redirige a `/admin/productos/[id]`. "Importar planilla" → `previewImport(formData)` / `commitImport(formData)` (`lib/server/actions/product-import.ts`; columnas en `IMPORT_COLUMNS`, plantilla `importTemplateCsv()`; ya hay `app/admin/(panel)/productos/plantilla`).

## Componentes bt faltantes
- Ninguno estructural. Revisar: `CellThumb` a 64×48 radio 6 y que `Table` admita una celda con `Toggle` interactivo dentro de una fila-link.

## Ambigüedades
- Conteos de chips/sidebar ("124", "48"…) son decorativos; los chips mezclan grupos (Bicicletas, Accesorios) con categorías hoja (Indumentaria, Cascos) — definir si los chips son los grupos del nav (Bicicletas · Accesorios · Repuestos · Importados) o las categorías.
- No hay chips para "Repuestos" ni "Importados" aunque el menú los pide; probablemente deban sumarse.
- "Importar planilla" no tiene pantalla diseñada (preview/errores): reusar el flujo existente.
- Estado "oculto" (`hidden`) del core no tiene representación en 3c (solo Publicado / Sin stock / Borrador).
