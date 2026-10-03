# 2a / 4a · Home

- PNG: [2a desktop](prototype/2a.png) · [4a mobile](prototype/4a.png)
- Ruta app: `/`
- Agente dueño: **A Tienda**
- Fuente: `BiciTienda MDQ.dc.html` l.350–380 (2a), l.94–106 (4a); datos `renderVals()` (`cats`, `featured`, `howTo`).

## Estructura desktop (2a, 1440)

### 1. Header
`<Header active="">` (ningún ítem activo). Ver [shell.md](shell.md).

### 2. Hero
- Contenedor: `display:grid; padding:24px 56px; height:580px` (incluye los 24 px de padding → caja de 532 px).
- Caja: `border-radius:10px; position:relative; overflow:hidden; bg #1f1d1a; flex column; justify-content:flex-end; padding:44px; gap:20px`.
- Foto: `position:absolute; inset:0; object-fit:cover`; alt "Bicicletas a la venta en el local". Pexels 11923271.
- Gradiente: `linear-gradient(180deg, rgba(18,17,16,.1) 25%, rgba(18,17,16,.93))`.
- Tag: `align-self:flex-start; bg #d7261e (red); color #fff; Archivo 800 14px uppercase .08em; padding:6px 12px; radius 4` → "Temporada de rodar".
- H1: Archivo 900 120px/.86, `font-stretch:66%`, uppercase, `letter-spacing:-.01em`, `max-width:760px` → "Salí a rodar por " + `<span #ffd21f>`"La Feliz."
- Fila CTA: `flex; gap:12px; align-items:center` → botón primario `padding:17px 28px; radius 6; bg #ffd21f; ink; Archivo 800 16px uppercase .06em` "Ver bicicletas" + texto Archivo 500 16px `#cfc8bb` "MTB · Ruta · Urbanas · Infantiles".
- **El cliente sacó las promo cards laterales: no agregarlas.**

Componentes bt: `Tag` (size `hero`, tone red), `Display size="hero"` + `Highlight`, `Button variant="primary" size="lg"`. **SIN componente bt para el bloque hero** (caja con foto + gradiente): armar en la página.

### 3. Tira de categorías
- `grid-template-columns:repeat(7,minmax(0,1fr)); gap:1px; bg #2b2824` (divisores de 1 px); `margin:24px 56px; border:1px solid #2b2824; radius 10; overflow:hidden`.
- Celda (link → catálogo): bg ink, `padding:22px 18px; column; gap:6px`.
  - Índice JetBrains Mono 600 12px `#8d867a` ("01"…"07").
  - Nombre Archivo 800 20px, `font-stretch:80%`, uppercase, paper.
- Copy: "MTB", "Ruta / Gravel", "Urbanas", "Infantiles", "Accesorios", "Repuestos", "Importados".

Componente bt: `TileGrid columns={7}` + `Tile` (+ `Mono size=12` para el índice). El estilo de la celda (padding, 800 20 @80) no está en bt: va en la página.

### 4. Destacados
- Sección `padding:56px 56px 72px; column; gap:28px`.
- Cabecera `flex; justify-content:space-between; align-items:flex-end`:
  - H2 Archivo 900 64px/.9 @66% uppercase "Lo más pedido en el mostrador".
  - Link Archivo 700 14px uppercase `.08em` `#ffd21f` "Ver catálogo →".
- Grilla `repeat(4,minmax(0,1fr)); gap:16px` de 4 product cards.

Product card desktop (igual en 2b):
- `bg #f4efe4; color #121110; radius 10; overflow:hidden; column`.
- Foto `aspect-ratio:4/3; bg #e8e1d3 (card-photo)`; tag `position:absolute top:0 left:0; bg #d7261e; #fff; Archivo 800 12px uppercase .08em; padding:6px 10px` (sin radio).
- Cuerpo `flex:1; padding:18px; gap:6px`:
  - JetBrains Mono 600 12px `#6f675a` (text-4): "{cat} / MARCA".
  - Nombre Archivo 700 18px/1.2, `min-height:2.4em; margin-bottom:8px`, clamp 2 líneas.
  - Pie `margin-top:auto; padding-top:12px; border-top:1px dashed #c9c0ae (card-dash); flex; space-between; align-items:flex-end`:
    - Precio Archivo 900 30px/1 @75% → "$ 489.900".
    - Cuotas 500 13px `#4c463d` → "6 x $ 81.650 sin interés".
    - Transferencia 700 13px `#b81d16` → "$ 440.910 por transferencia".
    - Botón "+" `40×40; radius 6; bg #121110; color #ffd21f; Archivo 800 22px`.

Componentes bt: `Display size="section"`, `TextLink tone="yellow"`, **`ProductCard`** `{ href, name, category, brand, image, price, tag, installments, transferDiscountPct, layout:"responsive", imageAspect:"auto", addAction }`.

### 5. Cómo funciona (3 pasos)
- `margin:0 56px 72px; grid 1fr 1fr 1fr; gap:1px; bg #2b2824; border 1px line; radius 10; overflow:hidden`.
- Celda bg ink, `padding:32px; column; gap:10px`:
  - Número Archivo 900 56px/1 @66% `#ffd21f`.
  - Título Archivo 900 28px/1 @72% uppercase.
  - Texto 15px/1.5 `#cfc8bb`.
- Copy exacto:
  - "01" "Elegís online" "O pasás a probarla antes con un turno."
  - "02" "Pagás como quieras" "Mercado Pago en cuotas, transferencia o efectivo en el local."
  - "03" "La retirás armada" "Te avisamos por WhatsApp cuando está lista."

Componente bt: `TileGrid columns={3}` + `Tile`. **SIN componente bt "Step"** (número + título + texto): armarlo en la página (o como componente local de home).

### 6. Footer
`<Footer>` desktop. Ver [shell.md](shell.md).

## Estructura mobile (4a, 390)

1. **MobileHeader** con búsqueda (`search` default).
2. **Hero**: `position:relative; height:500px; overflow:hidden; flex column; justify-content:flex-end; padding:20px 16px; gap:14px` (sin caja redondeada, a sangre).
   - Gradiente `linear-gradient(180deg, rgba(18,17,16,.05) 20%, rgba(18,17,16,.94))`.
   - Tag Archivo 800 12px uppercase `.08em`, `padding:5px 10px`, radius 4: "Temporada de rodar".
   - H1 Archivo 900 76px/.86 @66% uppercase: "Salí a rodar por " + amarillo "La Feliz.".
   - CTA ancho completo `min-height:52px; radius 6; bg #ffd21f; Archivo 800 15px uppercase .06em` "Ver bicicletas". (Sin la línea "MTB · Ruta · Urbanas · Infantiles".)
3. **Chips de categorías** scroll horizontal: `flex; gap:8px; overflow:hidden; padding:4px 16px 8px`; chip `min-height:44px; padding:0 16px; border:1px solid #3a362f; radius 999; Archivo 800 14px @85% uppercase; nowrap`. Mismos 7 nombres, sin índice. → bt **`ChipScroller` + `Chip`**.
4. **Destacados**: `padding:28px 16px; gap:16px`.
   - H2 Archivo 900 40px/.9 @66% "Lo más pedido"; link 700 13px `.06em` amarillo `padding:12px 0` "Ver todo →".
   - Grilla `1fr 1fr; gap:10px`.
   - Card mobile: radius 8; foto `aspect-ratio:1`; tag 800 10px `.06em` `padding:4px 7px`; cuerpo `padding:10px 10px 12px; gap:4px`.
     - Mono 600 10px `#6f675a` **solo "{cat}"** (sin "/ MARCA").
     - Nombre 700 14px/1.2, clamp 2, min 2.4em.
     - Pie `padding-top:8px; border-top dashed #c9c0ae; column; gap:1px`: precio 900 22px/1 @75%; cuotas 500 11px `#4c463d` nowrap ellipsis.
     - **Sin precio de transferencia ni "+"** → `ProductCard layout="mobile"` (o responsive).
5. **Cómo funciona**: `margin:0 16px 28px; border 1px line; radius 8; column`. Fila `grid 52px 1fr; gap:12px; padding:16px; border-bottom 1px line; align-items:center`. Número 900 40px/1 @66% amarillo; título 900 20px/1 @72% uppercase; texto 14px/1.4 text-2.
   - Copy mobile (`howTo`, **distinto del desktop**): "Elegís online" / "O pasás a probarla con un turno." · "Pagás como quieras" / "Mercado Pago, transferencia o efectivo." · "La retirás armada" / "Te avisamos por WhatsApp."
   - **SIN componente bt** para esta lista (no es TileGrid).
6. **Footer mobile** (ver [shell.md](shell.md)).

## Desktop vs mobile

| | 2a | 4a |
|---|---|---|
| Hero | caja redondeada 532 px dentro de padding 24/56, H1 120 | a sangre 500 px, H1 76 |
| Subline "MTB · Ruta…" | sí | no |
| Categorías | tira de 7 celdas con índice | chips scrolleables 44 px |
| Título destacados | "Lo más pedido en el mostrador" / "Ver catálogo →" | "Lo más pedido" / "Ver todo →" |
| Cards | 4 col, foto 4/3, con transferencia y "+" | 2 col, foto 1/1, sin transferencia ni "+", sin "/ MARCA" |
| Pasos | 3 columnas, textos largos | lista, textos cortos |

## Estados e interacciones

Estático. Links: hero CTA y "Ver catálogo" → `/catalogo` (bicicletas); celdas/chips → catálogo de la categoría; card → `/catalogo/[slug]`; "+" agrega al carrito (talle por defecto o lleva a la ficha si hay talles — decisión de A). Hover sutil.

## Datos

| Bloque | Demo (`lib/data/demo`) | Real |
|---|---|---|
| Hero (foto, tag, título, CTA, subline) | `COPY.home.hero` (`photo: DEMO_PHOTOS.hero`, `titleLead`, `titleHighlight`, `cta`, `subline`) | `getContent()` (`SiteContent extends HeroContent`: `heroProd` + foto HD, heredado de Rodar; no tiene tag/título/CTA del handoff) → hoy el copy sale de `COPY.home.hero` |
| Tira de categorías | `HOME_CATEGORY_STRIP` (`index`, `name`, `categorySlug`) | `getCategories()` (`lib/server/queries.ts`) para hrefs/contadores |
| Destacados | `PRODUCTS.filter(p => p.featured)` (= BIKES[0], BIKES[5], BIKES[8], ACC[0]) | `getVisibleProducts()` filtrando `featured` |
| Precio / cuotas / transferencia | `ars`, `installmentValue`, `transferPrice` (`format.ts`); `PAYMENT_SETTINGS` | `getStore().maxInstallments` + % transferencia de `getSettings()`; bt `formatMoney`, `installmentsLabel`, `transferLabel` |
| Títulos y CTAs de destacados | `COPY.home.featured` (`title`, `titleMobile`, `cta`, `ctaMobile`) | — |
| Pasos | `COPY.home.steps` (**texto desktop**) | — |
| Foto de card | `demoPhoto(p.photos[0])` | `product.images[0]` |

## Componentes bt faltantes

- **HomeHero** (caja con foto + gradiente + tag + H1 + CTA; variantes desktop/mobile).
- **Step / StepsGrid** (número grande amarillo + título + texto; grilla 3 col desktop / lista mobile).
- (Menor) celda de la tira de categorías: `Tile` existe pero no el contenido índice + nombre 800 20 @80.

## Ambigüedades

- **Copy de pasos mobile** difiere del desktop y `COPY.home.steps` solo tiene el desktop. Decidir si se usa el corto en mobile (agregar `stepsMobile` al copy) o el mismo texto.
- **Tag de card**: el prototipo pinta todos los tags rojos; bt `tagToneFor` pone "Nuevo" amarillo (README handoff). La demo normaliza "Nueva" → "Nuevo".
- En la tira, "Ruta / Gravel" es un solo tipo (`ruta-gravel`) aunque las cards digan "Gravel"/"Ruta".
- Todos los links del prototipo van a `#2b` sin filtro: el filtro por categoría lo define A.
- Destacados: el prototipo usa `featured` fijo; en real es el flag `featured` de producto.
