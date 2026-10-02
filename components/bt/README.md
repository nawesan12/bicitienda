# components/bt: sistema de diseño de BiciTienda MDQ (B2a)

Componentes **presentacionales**: props tipadas, sin fetch ni acceso a la DB.
Son server components salvo `QtyStepper` y `MobileHeader` (`"use client"`). Los
links usan `next/link` y **todos los hrefs entran por props**; las rutas reales
las conectan B2 (tienda) y B3 (admin).

Fuente de verdad visual: `design_handoff_bicitienda_mdq/` (README, `*.dc.html`).
Los valores (tamaños, paddings, gaps, font-stretch) se copiaron de los estilos
inline del prototipo. Revisión visual en **`/bt-kit`** (`app/(dev)/bt-kit`, solo
en desarrollo, `noindex`, 404 en producción).

```tsx
import { Button, ProductCard, Header } from "@/components/bt";
```

## Tokens

Todo sale de `app/theme.css` (commit 4a7e706). No quedan colores arbitrarios en
clases; los únicos `style` son dinámicos (grilla de la tabla, swatch de color,
tamaño del logo).

| Token (clase) | Hex | Uso en bt |
|---|---|---|
| `ink` | #121110 | fondo, tinta sobre amarillo/paper |
| `ink-deep` | #0b0a09 | sidebar y header mobile del admin |
| `surface` | #1f1d1a | paneles, inputs sobre la página |
| `surface-2` | #1a1816 | header de tablas |
| `surface-3` | #26231f | hover de botón `ink` |
| `line` | #2b2824 | bordes, divisores, fila de tabla |
| `line-strong` | #3a362f | bordes de inputs/chips, pill `dark` |
| `line-btn` | #4a453e | botón secundario, upload punteado |
| `line-muted` | #5a554c | checkbox vacío, pill `muted-strong`, talle sin stock |
| `paper` | #f4efe4 | texto principal, card, filtro activo |
| `text-2` / `text-3` / `text-4` | #cfc8bb / #8d867a / #6f675a | secundario / apagado / hover de borde |
| `yellow` | #ffd21f | acción, selección |
| `brand-hover` | #ffdc4d | hover del amarillo |
| `red` / `red-light` | #d7261e / #ff6a5c | ofertas, urgente / transferencia y errores sobre oscuro |
| `card-photo`, `card-dash`, `card-cuotas`, `card-transfer`, `card-meta` | #e8e1d3, #c9c0ae, #4c463d, #b81d16, #6f675a | product card clara |

- Radios: `rounded-tag` 4 · `rounded-btn` 6 · `rounded-box` 8 · `rounded-card` 10 · `rounded-pill`.
- Ancho: `stretch-66` … `stretch-85` (eje wdth de Archivo).
- Selección: `selected-row` (fila) y `has-checked:selected-option` (opción).
- Fuentes: `font-sans` (Archivo variable) y `font-mono` (JetBrains Mono). No uso
  `mono-data` porque suma `letter-spacing: .04em`, que el handoff no tiene.
- Gutter: `px-gutter` (56) / `px-gutter-admin` (40) disponibles; los componentes
  usan `px-14` / `px-10` (mismo valor).

Quedan como valores arbitrarios, a propósito: tamaños de letra (`text-[15px]`…),
paddings exactos (`py-[17px]`…), tracking (`.06em`/`.08em`) y las opacidades
`bg-paper/4`, `bg-ink/6` y `bg-red-light/6` de los hover.

## Breakpoints

- Contenido (cards, selectores, botones, tipografía): mobile < `md` (768).
- Chrome de la tienda: `Header` es solo desktop y `Footer` cambia de layout en
  `lg` (1024). B2 muestra `<Header>` desde `lg` y `<MobileHeader>` debajo.
- Admin: desktop (`AdminShell`, `AdminSidebar`, `AdminTopBar`); en mobile,
  `AdminMobileHeader`.

## Componentes y props

**Tipografía** (`typography.tsx`)
- `Display` `{ size: hero|confirm|page|section|h2|admin|detail|card|panel, as?, className? }`.
  Tamaños: hero 120/.86 @66 (mobile 76), page 96/.86 (56), section 64/.9 (40), h2 48/.9 (40),
  confirm 112/.85 (64), admin 44/1, detail 36/.95 @70 (mobile 40), card 30 @70, panel 26 @70.
- `Highlight`: amarillo dentro de un título.
- `Eyebrow` `{ tone: muted|yellow|ink|inherit, size: sm 12|md 13|lg 14, as? }`.
- `Mono` `{ size: 10–14, tone: muted|paper|soft|ink, uppercase?, as? }` (600).
- `Price` `{ amount, size: inline|card-sm|card|related|panel|total|product, tone?, prefix? }`.
- `formatMoney(n)` = `'$ ' + Math.round(n).toLocaleString('es-AR')`;
  `installmentsLabel(price, 6)` = "6 x $ 81.650 sin interés";
  `transferLabel(price, 10)` = "$ 440.910 por transferencia".

**Marca** (`brand.tsx`)
- `Wordmark` `{ size: header 30|footer 26|sidebar 22|mobile-footer 22|mobile 19 @68 }`.
- `Logo` `{ size: 36|40|44|52|56, decorative? }`: `/brand/logo-bicitiendamdq-320.webp`.
- `BrandLockup` `{ href?, logoSize, wordmarkSize, gap }`.

**Botones** (`button.tsx`)
- `Button` `{ variant: primary|secondary|outline-paper|danger|ink|ink-outline, size: lg|md|header|sm|full|full-lg, href?, external? , ...button/anchor props }`.
  Con `href` es `<Link>` (o `<a target=_blank>` si `external`). En mobile: min-h 52
  (rellenos) / 50 (bordeados) / 44 (header, sm); letra 15 en lg/full/full-lg.
- `buttonClasses({variant,size})` para estilar otros elementos.
- `TextLink` `{ href, tone: yellow|muted|red-light, underline?, external? }`.

**Estados** (`pill.tsx`, `tag.tsx`)
- `Pill` `{ tone, size: sm 10|md 11|lg 12 }`. Tonos: red, red-outline, yellow,
  yellow-outline, dark, paper, line, muted, muted-strong.
- `OrderPill` `{ status: transf_pendiente|paga_local|pagado|armando|listo|retirado|cancelado }`.
- `QuotePill` `{ status: nuevo|cotizado|aceptado|pedido_creado|rechazado }`.
- `ProductPill` `{ status: publicado|sin_stock|borrador }`.
- `AppointmentPill` `{ status: pendiente|confirmado|asistio|no_asistio|cancelado|reprogramado }`.
- `Tag` `{ tone?: red|yellow, size: xs|card|sm|md|lg|hero, flush? }`; sin `tone`,
  "Nuevo/Nueva" va amarillo y el resto rojo (`tagToneFor`).

**Chips** (`chip.tsx`)
- `Chip` `{ href?, active? }` (categorías mobile, min-h 44) + `ChipScroller`.
- `FilterChip` `{ href?|onClick?, active?, count?, size: sm|md }` (activo = paper).
- `RemovableChip` `{ href, tone: yellow|paper }` ("MTB ×").
- `OptionChip` `{ label, type: checkbox|radio, wide?, ...input }` (rodado, talle del filtro).

**Selección y formularios.** Todos usan inputs nativos; el estado
seleccionado sale de `:checked`, así que funcionan en un `<form>` sin JS y
también controlados.
- `OptionCard` `{ title, description?, meta?, selectedStyle: tint|fill, titleStyle: display|display-lg|display-sm|text, surface: transparent|surface, padding: sm|md|lg, radius: 8|10, ...input }`.
- `RadioCard` `{ title, description?, ...input }` (medio de pago).
- `Toggle` `{ label?, description?, ...input }` (switch 40×22; sin label pide `aria-label`).
- `Checkbox` `{ label, count?, ...input }`.
- `QtyStepper` (cliente) `{ value?|defaultValue, min, max?, onChange?, name?, size: lg|md|sm|admin, highlightZero? }`.
- `SizeSelector` / `ColorSelector` `{ name, options: {value,label,height?,swatch?,available?}[], value?|defaultValue?, onChange?(v), label?, selectedLabel?, help?: {href,label} }`.
  Sin stock: dashed, tachado, deshabilitado. `ColorSelector` devuelve `null` si hay menos de 2 colores.
- `Field` `{ label, optional?, hint?, error?, size: sm 12|md 13 }` (envuelve al control).
- `Input` / `Textarea` / `Select` `{ surface: panel|page, size: sm|md|lg, invalid? }`.
  En mobile la letra pasa a 16 px (evita el zoom de iOS).
- `SearchInput` `{ action, name="q", placeholder, defaultValue?, size: md|lg }` (form GET).
- `UploadDropzone` `{ variant: bar|tile, label?, hint?, selected?, ...input file }`.

**Datos** (`panel.tsx`, `table.tsx`, `timeline.tsx`)
- `Panel` `{ surface: surface|outline|paper|yellow, padding: none|sm|md|lg|xl, gap, radius: 8|10, as? }`; `Card` (= outline); `PanelTitle` `{ size: md 26|lg 30, action? }`.
- `TileGrid` `{ columns: 2|3|4|7 }` + `Tile`: grilla con divisores de 1 px.
- `Kpi` `{ label, value, tone: paper|yellow|red, size: lg 48|md 40|sm 30 }` + `KpiGrid` `{ columns, flush? }`.
- `Divider` `{ variant: solid|dashed|dashed-paper }`.
- `Table<T>` `{ columns: {key,header,width,align?,cell}[], rows, getRowKey, selectedKey?, rowHref?|onRowClick?, rowLabel?, gap: 12|20|24, density: default|compact, empty?, caption? }`.
  Celdas: `CellStack`, `CellMono`, `CellThumb`.
- `Timeline` `{ done, steps?=ORDER_STEPS, cancelled? }` (5 pasos del pedido);
  `ORDER_STEPS_DONE[estado]` da `done`. `StepList` `{ steps: {title,description?}[], done }` (2e).

**Navegación y contenido** (`navigation.tsx`, `accordion.tsx`, `empty-state.tsx`)
- `Breadcrumb` `{ items: {label, href?}[] }`.
- `Pagination` `{ page, totalPages, hrefFor(p), nextLabel?, prevLabel? }`.
- `SegmentedControl` `{ items: {label, href?|onClick?, active?}[], tone: yellow|paper }`.
- `Accordion` `{ title, defaultOpen?, name? }` (`<details>`) + `AccordionGroup`; `SpecList` `{ items, variant: desktop|mobile }`.
- `EmptyState` `{ title, description?, eyebrow?, action?, size: sm|md }`.

**Product cards** (`product-card.tsx`)
- `ProductCard` `{ href, name, category, brand?, image: {src,alt?}, price, tag?: {label,tone?}, installments=6, transferDiscountPct=10, layout: responsive|desktop|mobile, imageAspect: auto|square|4/3, addAction?, hideAdd? }`.
  Toda la card es link; `addAction` (botón "+" real, cliente) queda por encima. Para
  estilarlo: `PRODUCT_CARD_ADD_CLASSES`.
- `RelatedProductCard` `{ href, name, image, price }`; `PriceBox` `{ price, installments, transferDiscountPct }`.

**Chrome de la tienda**
- `Header` `{ hrefs: StoreHrefs, active?: StoreNavKey, cart?, account?="Cuenta", searchPlaceholder?, searchDefault? }`.
  `StoreHrefs = { home, cart, account, search, nav: Record<bicicletas|accesorios|repuestos|importados|presupuesto|turnos, string> }`.
- `MobileHeader` (cliente) `{ hrefs, cart?, active?, showSearch?, open?|defaultOpen?, onOpenChange?, accountLabel?, menuInfo?, menuMode: overlay|inline, lockScroll? }`.
- `MobileMenu` `{ hrefs, active?, accountLabel?, info? }` (5c).
- `Footer` `{ homeHref, address, hours, whatsapp, whatsappHref?, socials?, installments?, transferDiscountPct? }`.

**Admin** (`admin.tsx`)
- `AdminShell` `{ sidebar, children }` (grilla 240 | 1fr, min-h 980).
- `AdminSidebar` `{ active: AdminSection, hrefs: Record<AdminSection,string>, counts?, storeHref, homeHref?, footer? }`.
  Sin "Usuarios" ni bloque de usuario: el admin entra con PIN. `footer` sirve para "Salir".
- `AdminTopBar` `{ title, back?, search?: {action, placeholder, width: 280|300}, actions?, children? }`.
- `AdminMobileHeader` `{ label="Mostrador", homeHref?, menuHref?, menu? }`.

## Mapeos para B2/B3

Estado de pedido del core → `OrderPill`:

| OrderStatus + medio | OrderPillStatus |
|---|---|
| PENDIENTE_PAGO + transferencia | `transf_pendiente` |
| PENDIENTE_PAGO + efectivo | `paga_local` |
| PAGADO | `pagado` |
| EN_PREPARACION | `armando` |
| LISTO_RETIRO | `listo` |
| RETIRADO | `retirado` |
| CANCELADO / VENCIDO | `cancelado` |

`QuotePillStatus` y `AppointmentPillStatus` usan las mismas claves que
`QuoteStatus` / `AppointmentStatus` de `lib/types.ts`.

## Decisiones (lo que no está literal en el handoff)

- **Cancelado** (pedido): mismo lenguaje que "Rechazado" (transparente, texto
  #8d867a, borde #5a554c). En el timeline agrega un paso "Cancelado" con ✕ rojo claro.
- **Pills de turnos**: "Sin confirmar" = borde rojo (como la agenda);
  "Confirmado" = contorno amarillo; pasados contorneados apagados (como Mi cuenta).
- **Tag "Nuevo"** amarillo (el README lo pide así; el prototipo los pinta todos de rojo).
- **Talles en mobile** muestran la altura sugerida debajo de la letra (el plan
  pide altura en cada talle; el 4c no la tenía).
- **Selector de color**: mismo estilo que los talles (decisión del plan), con
  muestra de color de 14 px; no los círculos de 36 px del prototipo.
- **Inputs en mobile a 16 px** (el prototipo usa 15): evita el zoom de iOS.
- **QtyStepper mobile** a 44 px de alto (el prototipo, 40) por el mínimo táctil.
- **Product card mobile** sin precio de transferencia ni "+" (igual que 4a/4b).
- **Hover**: aclarado sutil + transición de color de 150 ms; foco visible amarillo.
