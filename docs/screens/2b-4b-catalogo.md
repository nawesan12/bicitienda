# 2b / 4b · Catálogo (listado)

- PNG: [2b desktop](prototype/2b.png) · [4b mobile](prototype/4b.png)
- Ruta app: `/catalogo` (grupo/tipo por query o segmento, ej. Bicicletas, Accesorios, Repuestos, Productos importados — mismo layout para los 4 grupos del nav)
- Agente dueño: **A Tienda**
- Fuente: `BiciTienda MDQ.dc.html` l.381–421 (2b), l.107–115 (4b); datos `renderVals()` (`types`, `rodados`, `catalog = BIKES`, `mCatalog = BIKES.slice(0,6)`).

## Estructura desktop (2b, 1440)

### 1. Header
`<Header active="bicicletas">` (el activo depende del grupo). Ver [shell.md](shell.md).

### 2. Cabecera de página
- `padding:32px 56px 0; column; gap:14px`.
- Breadcrumb Archivo 500 14px `#8d867a`; último ítem paper: "Inicio / " + "Bicicletas".
- Fila `flex; align-items:flex-end; justify-content:space-between`:
  - H1 Archivo 900 96px/.86 @66% uppercase "Bicicletas".
  - Contador JetBrains Mono 600 13px `#8d867a` "48 MODELOS".

bt: `Breadcrumb { items }`, `Display size="page"`, `Mono size=13`.

### 3. Cuerpo
`display:grid; grid-template-columns:280px minmax(0,1fr); gap:40px; padding:32px 56px 72px`.

#### 3a. Aside de filtros (280 px) — `column; gap:28px`
Cada grupo: `column; gap:12px`; título Archivo 700 13px uppercase `.08em` `#8d867a`.

| Grupo | Detalle | bt |
|---|---|---|
| "Tipo" | Filas `<label> flex; gap:12px; Archivo 500 16px`. Check `20×20; radius 4; border 1.5px`; marcado bg/borde `#ffd21f` + "✓" ink 900 13px; vacío borde `#5a554c` (line-muted). Contador `margin-left:auto`, JetBrains Mono 12px `#8d867a`. Ítems: "MTB" 18 (✓), "Ruta / Gravel" 9, "Urbana" 14, "Infantil" 7 | `Checkbox { label, count }` |
| "Rodado" | `flex-wrap; gap:8px`; chip `padding:8px 12px; radius 6; border 1px`; activo bg/borde `#ffd21f` texto ink; resto borde `#3a362f`. Archivo 700 14px. Valores "12" "16" "20" "24" "26" "27.5" "28" "29" (activo 29) | `OptionChip type="checkbox"` |
| "Precio" | Inputs `grid 1fr 1fr; gap:8px`; caja `bg #1f1d1a; border 1px #3a362f; radius 6; padding:12px; 14px #cfc8bb`: "$ 150.000" / "$ 1.500.000". Slider: barra `height:4px; bg #3a362f; radius 2; margin:8px 4px`; tramo amarillo `left:0; right:22%`; 2 thumbs `16×16` círculo amarillo, `top:-6px` | `Input` para los montos; **SIN componente bt para el slider de rango** |
| "Talle" | `flex; gap:8px`; chip `padding:8px 14px; radius 6; border 1px #3a362f; 700 14px`; activo M amarillo. "S" "M" "L" "XL" | `OptionChip` |
| Toggle prueba | Caja `bg #1f1d1a; border 1px #2b2824; radius 10; padding:18px; gap:10px`. Fila: Archivo 800 16px "Se puede probar en el local" + switch `40×22` pill amarillo con knob `16×16` ink a la derecha. Texto 14px/1.45 `#cfc8bb` "Mostramos solo las bicis disponibles para reservar una prueba." | `Toggle { label, description }` dentro de `Panel surface="surface" radius=10` (verificar padding 18) |

#### 3b. Resultados — `column; gap:20px`
- Barra: `flex; align-items:center; gap:10px; flex-wrap`:
  - Chips activos `bg #ffd21f; color ink; padding:7px 12px; radius 999; Archivo 700 13px; gap:8px`: "MTB ×", "Rodado 29 ×", "Talle M ×" → bt `RemovableChip tone="yellow"`.
  - Link 600 13px `#8d867a` underline "Limpiar" → `TextLink tone="muted" underline`.
  - Spacer `flex:1`.
  - Label 500 14px `#8d867a` "Ordenar por" + select `bg #1f1d1a; border 1px #3a362f; radius 6; padding:10px 14px; 600 14px` "Más vendidas ▾" → bt `Select` (verificar tamaño `sm`).
- Grilla: `grid-template-columns:repeat(3,minmax(0,1fr)); gap:16px` (**3 columnas**, no 4) — 9 cards (`BIKES`). Card = la misma de home (ver [2a-4a-home.md](2a-4a-home.md) §4) → `ProductCard layout="responsive"`.
- Paginación: `flex; justify-content:center; gap:8px; margin-top:20px`. Cajas `44×44; radius 6`; actual bg amarillo ink 800 15px; resto `border 1px #3a362f` 700 15px. "1" "2" "3" + `height:44px; padding:0 16px` 700 14px uppercase `.06em` "Siguiente →" → bt `Pagination { page, totalPages, hrefFor }`.

### 4. Footer
Ver [shell.md](shell.md).

## Estructura mobile (4b, 390)

1. MobileHeader con búsqueda.
2. Cabecera `padding:18px 16px 0; column; gap:8px`: breadcrumb 500 13px `#8d867a` "Inicio / **Bicicletas**"; fila H1 Archivo 900 **64px**/.88 @66% uppercase "Bicicletas" (el inline declara 56px y lo pisa con `font-size:64px`) + Mono 600 11px `#8d867a` `padding-bottom:6px` "48 MODELOS".
3. Botones `grid 1fr 1fr; gap:8px; padding:16px 16px 0`:
   - "Filtros · 3": bg amarillo, ink, radius 6, `min-height:48px`, Archivo 800 **14px** uppercase `.06em`.
   - "Más vendidas ▾": `min-height:48px; border 1px #3a362f; radius 6; Archivo 700 14px`.
   → `Button variant="primary"` + `Select`/botón. **El drawer de filtros NO está diseñado** (README: "filters behind a button (drawer)").
4. Chips activos `flex; gap:6px; padding:12px 16px 0; overflow:hidden`; chip `min-height:36px; padding:0 12px; bg #f4efe4 (paper); ink; radius 999; 700 13px`: "MTB ×" "Rodado 29 ×" "Talle M ×" → `RemovableChip tone="paper"`.
5. Grilla `1fr 1fr; gap:10px; padding:16px`, 6 cards mobile (ver home §4 mobile: foto 1/1, mono solo cat, sin transferencia ni "+").
6. `padding:4px 16px 32px`: botón secundario `min-height:50px; border 1.5px #4a453e (line-btn); radius 6; 800 15px uppercase .06em` "Ver más modelos" → `Button variant="secondary" size="full"`. (Mobile usa "ver más" en lugar de paginación.)

## Desktop vs mobile

| | 2b | 4b |
|---|---|---|
| Filtros | aside 280 px siempre visible | botón "Filtros · N" → drawer (sin diseño) |
| Chips activos | amarillos + "Limpiar" | paper, sin "Limpiar" |
| Orden | label "Ordenar por" + select | solo select |
| Grilla | 3 col, 9 por página | 2 col, 6 |
| Paginación | números + "Siguiente →" | "Ver más modelos" |

## Estados e interacciones

- Prototipo estático (no hay state en DCLogic para filtros): seleccionados fijos MTB, rodado 29, talle M, toggle prueba ON.
- Real: filtros por query string (form GET, `OptionChip`/`Checkbox` nativos funcionan sin JS). Quitar chip = link sin ese parámetro; "Limpiar" = link sin filtros.
- Contador "N MODELOS" y "Filtros · N" (cantidad de filtros activos) son dinámicos.
- Vacío: **no diseñado** → bt `EmptyState`.

## Datos

| Bloque | Demo | Real |
|---|---|---|
| Grupo/tipo y breadcrumb | `CATEGORY_GROUPS`, `CATEGORY_TYPES` | `getCategories()` / `getCategory(slug)` (`lib/server/queries.ts`) |
| Tipo + contadores | `CATEGORY_TYPES` hijos del grupo | `getCategories()` → `count` por categoría (visible) |
| Rodado | `RODADOS` | `product.rodado` |
| Precio (min/max) | `PRICE_FILTER_RANGE` (150.000–1.500.000) | min/max de `getVisibleProducts()` filtrados |
| Talle | `TALLES` | `product.variants[].size` con stock > 0 (`getVariantsBySlug` ya viene en `getVisibleProducts()`) |
| "Se puede probar en el local" | `DemoProduct.testRide` | `product.testRide` |
| Ordenar | `COPY.catalog.sortDefault` ("Más vendidas") | orden de seed (`bySeedOrder`) ≈ más vendidas; otras opciones a definir |
| Cards | `PRODUCTS` filtrados por `categorySlug` | `getVisibleProducts()` |
| Copy | `COPY.catalog` (`breadcrumbHome`, `count: "{n} modelos"`, `filters.*` incl. `testRide`, `testRideHint`, `clear`, `mobileButton: "Filtros · {n}"`, `sortLabel`, `next`, `loadMore`) | — |

## Componentes bt faltantes

- **PriceRangeSlider** (barra 4 px + tramo amarillo + 2 thumbs 16 px, sincronizado con los dos inputs).
- **FiltersDrawer** mobile (contenedor del aside en mobile; sin diseño en el handoff).
- **CatalogFilters** (aside completo) no existe como bloque; se arma con `Checkbox`, `OptionChip`, `Input`, `Toggle`.

## Ambigüedades

- **Grilla 3 vs 4 columnas**: README handoff dice "Desktop grid 4 columns"; 2b usa `repeat(3,…)` (con el aside de 280 px). Respetar 3 en catálogo, 4 en home.
- Nombres del filtro Tipo en singular ("Urbana", "Infantil") vs tira del home plural; la demo usa el plural como nombre de categoría.
- Contadores del prototipo (18/9/14/7, "48 MODELOS") no cuadran con los 9 productos demo: son decorativos, usar los reales.
- Mobile: H1 declarado 56px con override a 64px; ancho del botón Filtros con `min-height` duplicado (52 → 48). Usar 64px y 48px. Ojo: bt `Display size="page"` en mobile da 56px/.88 → pasar `className` con 64px o ajustar el tamaño.
- Para Accesorios/Repuestos/Importados el aside de bicis (Rodado, Talle, prueba) no aplica: no hay diseño de filtros por grupo. Proponer mostrar solo Tipo + Precio.
- Chips activos amarillos (desktop) vs paper (mobile): son así en el prototipo; bt los cubre con `tone`.
