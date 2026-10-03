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
`bg-paper/4` (sidebar, botón secundario, fila de tabla), `bg-paper/6`
(outline-paper), `bg-ink/6` y `bg-red-light/6` de los hover.

**`cx`** (`cx.ts`) une clases y las pasa por `tailwind-merge` (configurado con
los radios, el spacing y `stretch-*` de `theme.css`): una clase de `className`
le gana a la del componente si son de la misma propiedad, sin `!`. Font-size y
`leading-*` no compiten (en Tailwind 4 `text-[…]` no pisa el line-height).

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
- `AdminSidebar` `{ items: {key, label, href, count?}[], active, storeHref, homeHref?, footer? }`.
  `ADMIN_NAV` da el orden y los rótulos (Resumen … Clientes, Consultas, Ajustes). Sin "Usuarios" ni
  bloque de usuario: el admin entra con PIN. `footer` sirve para "Salir". Contador vacío o 0 = no se muestra.
- `AdminTopBar` `{ title, back?, search?: {action, placeholder, width: 280|300}, actions?, children? }`.
- `AdminMobileHeader` `{ label="Mostrador", homeHref?, menuHref?, menu? }`.

## Componentes de la Ola 1

Lo que sumaron las pantallas (agentes A, B, C, D1 y D2) se consolidó acá.
Regla: lo **reutilizable** vive en un archivo temático de `components/bt/` y
se exporta desde `index.ts` (salvo las islas que tocan `lib/`); lo
**específico de una pantalla** queda en la carpeta de su ruta.

**Resúmenes y datos** (`summary.tsx`, exportado)
- `SummaryRows` `{ tone: dark|paper|yellow|panel, size?: md|sm, rows?, total?: {label?, amount, note?}, children? }`
  + `SummaryRow` `{ label, value, tone, variant: default|discount }` + `SummaryTotal` `{ label, amount, tone, size?, note? }`.
  Es un `<dl>`; se usa con `rows`/`total` o componiendo hijos con el mismo `tone`.
  - `dark`: totales del carrito 2d/4d (dashed #3a362f, etiquetas #cfc8bb, total amarillo 44/40, nota a la derecha).
  - `paper`: pie del resumen de 2e y del seguimiento (#4c463d, valores 700, total ink 40 también en desktop).
    El descuento sale #ff6a5c sobre oscuro y #b81d16 sobre paper.
  - `yellow`: resumen del turno sobre amarillo (2f): borde superior 1.5 tinta, filas 14×0 16 px, divisores `ink/25`.
  - `panel`: paneles del admin (3a/4i/5b): dashed, etiquetas #8d867a, "Total" 800 14 + monto 900 34 @72 amarillo (`size="sm"`: 32, gap 6, 4i mobile).
- `KeyValueList` `{ items: {label, value, tone?, mono?, action?}[], layout: inline|stacked }`.
  `inline` (admin 3a/3b/5b): 14 px, clave #8d867a a la izquierda y valor 700 a la derecha con `tone` (paper|red-light|yellow|muted).
  `stacked` (datos bancarios, pago en el local, sandbox): etiqueta 700 12 uppercase arriba, valor 800 17 (mono 600 15 con `mono`), `action` a la derecha (`CopyButton`).

**Bloques** (`blocks.tsx`, exportado)
- `CalloutLink` `{ href, title, text?, cta }`: banner-link del carrito ("¿Querés probar la MTB antes de pagar?").
- `InfoBox` `{ title, children? }`: caja con borde #3a362f r8 (retiro del carrito).
- `SuccessMark` `{ tone: done|waiting|muted, symbol? }`: círculo 88 (72) de 2e; 2e solo diseña el ✓ amarillo, `waiting`/`muted` son nuestras.
- `NumberedSteps` `{ items: {n, title, text?}[] }`: "Cómo sigue" (5a), filas 44 | 1fr con número amarillo 30 @70.
- `PhotoPanel` `{ src, alt, children }`: foto + gradiente de 2h (desktop, padding 56) / 4g (alto 220).
- `MessageBox` `{ children, meta? }` (5b), `ClosedNote` `{ children, action? }` (reemplaza los botones de un estado cerrado),
  `SectionHeading` `{ children, aside? }` (2i "Turnos de hoy · 6 TURNOS").
- `BackLink` `{ href, children }` está en `navigation.tsx` ("← Pedidos", 44 px táctil en mobile).

**Pedidos** (`order.tsx`, exportado; `cart-line.tsx` y `copy-button.tsx` son cliente)
- `OrderItemRow` `{ image?, name, variant?, price, quantity?, size: md 64×48|sm 60×46 }` (3a/4i).
- `ReceiptBox` `{ href?, fileName?, kind: pdf|image, title?, viewLabel?, emptyText? }`: comprobante con borde rojo punteado + "Ver"; sin `href`, "Sin comprobante adjunto".
- `OrderSummaryItem` `{ image, name, meta?, price }`: ítem del resumen sobre paper (2e). Es un `<li>`.
- `OrderSummaryCard` `{ href?, number, pill?, title, meta, image?: string|null|false }`: pedidos y presupuestos de Mi cuenta (la pill la pone la página).
- `CartLine` (cliente) `{ image, name, eyebrow?, variant?, quantity, max, price, onQuantityChange, onRemove, removeLabel?, warning? }`:
  fila del carrito; dibuja los dos steppers (desktop `md`, mobile `sm` con mínimo 0 = quitar). Es un `<li>`.
- `CopyButton` (cliente) `{ value, label?, doneLabel? }`: "Copiar" → "Copiado".

**Calendario y turnos** (`calendar.tsx`, exportado)
- `MonthCalendar` `{ monthLabel, days: {date, state: available|closed|loading}[], selected?, onSelect?, onPrev?, onNext?, prevDisabled?, nextDisabled?, label?, surface?: page|panel }`. Celda 52 (44); cerrado = #4a453e tachado.
- `TimeSlotGrid` `{ groups: {label, slots: {time, available}[], emptyText?}[], selected?, onSelect? }`: Mañana/Tarde en 3 columnas (desktop) / grilla de 4 sin rótulos (4e).
- `DateBadge` `{ weekday, day, caption, size: lg|sm }`: fecha del próximo turno (2g/4f).

**Modal** (`modal.tsx`, cliente, exportado)
- `Modal` `{ open, onClose, title, children, footer?, width: 420|480|560 }` sobre `<dialog>` nativo, con el lenguaje de los paneles (surface, borde line, r10, título 900 @70). `FormError`.

**Admin** (en `admin.tsx` y `field.tsx`, exportados)
- `ResponsiveTopBar` `{ ...AdminTopBarProps, mobileActions?: ReactNode|null }`: desde `lg` es `AdminTopBar`; debajo, volver + título 40/.9 @66 + buscador a lo ancho + acciones en 2 columnas.
- `ComputedField` `{ tone: red|muted }`: campo calculado con borde punteado (3d "Con transferencia (auto)"; `muted` para datos de Ajustes).
- `DangerTextButton`: "Eliminar producto", 800 13 uppercase #ff6a5c.
- `COMPACT_INPUT` (clases): input compacto de 3f, 8×10, 13 px.
- `SortablePhotoGrid` (cliente, `sortable-photo-grid.tsx`) `{ photos: {key,src,alt?}[], onChange, coverLabel?, trailing?, disabled? }`:
  3d Fotos, 5 columnas (3 en mobile), la primera es portada; arrastrar o ← →, ✕ quita.

**Islas con datos** (en `components/bt/`, **no** exportadas desde `index.ts` porque importan `lib/`)
- `CatalogCard` (`catalog-card.tsx`) `{ item: CatalogItem, pricing }`: `ProductCard` desde un `CatalogItem` (marca `sin-marca` → sin marca).
- `CardAddButton` (`card-add.tsx`, cliente) `{ slug, name, href, variant }`: "+" de la card; con una sola variante vendible suma al carrito, si no lleva a la ficha.
- `SlotPicker` (`slot-picker.tsx`, cliente): `MonthCalendar` + `TimeSlotGrid` con la disponibilidad real (`fetchAvailability`, mes a mes); "hoy" en la zona del local, horizonte `maxDaysAhead`, `refreshKey`. Lo usan /turnos y reprogramar.
- `AppointmentManager` (`appointment-manager.tsx`, cliente): card amarilla del próximo turno con Reprogramar y Cancelar; con sesión (`{id}`) o por link (`{number, token}`); si pasó la anticipación, "Escribinos por WhatsApp".

**Específicos de una pantalla** (viven junto a su ruta)

| Área | Archivo | Componentes |
|---|---|---|
| Home 2a/4a | `app/(tienda)/_components/home.tsx` | `HomeHero`, `CategoryStrip`, `HowItWorks` |
| Catálogo 2b/4b | `app/(tienda)/catalogo/_screens/catalog-browser.tsx`, `price-range.tsx` | `CatalogBrowser`, `PriceRangeSlider` |
| Ficha 2c/4c | `app/(tienda)/catalogo/_screens/product-gallery.tsx`, `product-purchase.tsx` | `ProductPhotos`/`ProductGallery`/`ProductCarousel`, `ProductPurchase` |
| Turnos 2f | `app/(tienda)/turnos/selected-product-row.tsx` | `SelectedProductRow` ("Bici a probar" + "Cambiar") |
| Mi cuenta 2g | `app/(tienda)/cuenta/account-nav.tsx` | `AccountNav`, `ACCOUNT_NAV_ITEM` (mobile usa `SegmentedControl`) |
| Resumen 2i/4h | `app/admin/(panel)/today-card.tsx` | `TodayAppointmentCard` (`status: hecho|ahora|confirmado|sin_confirmar|no_vino`) |
| Turnos 3b | `app/admin/(panel)/turnos/agenda.tsx` | `WeekNav`, `Legend`, `AgendaCell`, `WeekAgenda` |
| Presupuestos 5b | `app/admin/(panel)/presupuestos/quote-lines-editor.tsx` | `QuoteLinesEditor` (inputs que se ven como texto hasta el hover/foco) |
| Clientes 3e | `app/admin/(panel)/clientes/history-list.tsx` | `HistoryList`, `KpiCell` |
| Ajustes 3f | `app/admin/(panel)/ajustes/settings-parts.tsx` | `SettingsSubNav`, `ScheduleDayRow`, `WhatsAppTemplateCard` |

### Decisiones por área

**Tienda (A)**
- **Filtros del catálogo en el navegador.** La página es estática/ISR: el server manda todos los productos del grupo y `CatalogBrowser` filtra, ordena y pagina. El estado vive en la URL (`?tipo=&rodado=&talle=&min=&max=&prueba=1&orden=&q=&pagina=`): se escribe con `history.replaceState` (con debounce, por el slider) y se lee con `useSearchParams` dentro de un `Suspense` chico.
- **Rodados y talles**: los del prototipo (12…29, S–XL) más los que haya en los datos; sin productos quedan deshabilitados. Rodado, Talle y "Se puede probar" solo si el grupo tiene bicis. "Tipo" solo con más de un tipo.
- **Orden**: Más vendidas (orden del seed), Menor precio, Mayor precio, Más nuevos.
- **Drawer de filtros (sin diseño)**: pantalla completa sobre ink, título 900 30 @70, ✕ de 44, pie con "Limpiar" + "Ver N modelos". Escape cierra.
- **Ficha**: talle inicial = el de más stock; color inicial = el primero con stock en ese talle. "Quedan N en talle X" es el stock de la variante elegida. Sin stock: botón deshabilitado y celda en rojo claro. "Agregar al carrito" suma y lleva a `/checkout`.
- **Links de turnos**: "Reservar una prueba" → `/turnos?servicio=prueba&producto=<slug>`; ayuda de talle → `/turnos?servicio=asesoramiento&producto=<slug>`.
- **Relacionados**: de una bici, accesorios ("Sumale a tu bici"); del resto, su mismo grupo. Solo desktop.
- **Retiro** en productos que no son bicis: "Sin cargo, listo para llevar".

**Compra (B)**
- `CartLine` dibuja los dos steppers y muestra uno por breakpoint (en mobile no hay "Quitar" y el mínimo es 0).
- `SummaryRows tone="paper"` usa 40 px también en desktop (como el inline de 2e); `Price size="total"` da 44.
- `KeyValueList` no está en el handoff: es la del consolidado de `docs/screens/README.md`.

**Cliente (C)**
- **Sábado a la tarde**: la agenda sale de `schedule_rules` vía `fetchAvailability`; en "Tarde" se ve "Ese día no hay turnos a la tarde.".
- **Talle a probar**: se agrupan los colores de cada talle; se manda la primera variante con stock de ese talle.
- **Login**: labels visibles en Email/Contraseña también en mobile; Nombre/WhatsApp con placeholder + `aria-label`. Sin Google ni divisor "o".
- **Presupuesto mobile** respeta 5d: sin "Para qué bici", "Presupuesto aproximado" ni email. Con sesión se prellenan los datos.
- **Fotos del presupuesto**: se achican en el navegador (hasta 1600 px) para que las 4 entren en el 1 MB por request de las server actions.

**Admin operación (D1)**
- **Turno seleccionado ≠ "Sin confirmar"**: sin confirmar = borde rojo 1.5 px; seleccionado = anillo amarillo de 2 px separado 2 px. Se pueden combinar.
- **Celda bloqueada** (no está en el handoff): fondo #1a1816, borde punteado #3a362f, "Bloqueado" + motivo.
- **Celda vacía con `href`**: "+" al hover (turno manual). Las cerradas y las pasadas no son clickeables.
- **Empty de la agenda**: el #221f1c del prototipo no tiene token; se usa `border-line/60`.
- **Modal**: el handoff no dibuja diálogos; se arma con el lenguaje de los paneles.

**Admin gestión (D2)**
- **Menú del admin en mobile**: no está dibujado; usa el lenguaje del menú 5c (filas de 60 px, sección 900 28 @70, contador en pill mono, activa en amarillo con barra, "Ver tienda ↗" y "Salir" abajo). El header dice "Admin · {sección}".
- **Nav**: "Consultas" va entre Clientes y Ajustes (`ADMIN_NAV` en `admin.tsx`; el layout le pasa los ítems a `AdminSidebar`).
- **Tablas anchas** (3c, 3e, Consultas): desde `xl`/`lg` son `Table`; debajo, lista de cards.
- `HistoryList`: Pedido en amarillo, Turno en paper y Presupuesto en #ff6a5c (no está en el prototipo).
- `WhatsAppTemplateCard` sin switch: nada se manda solo.

## Shells (ola 0)

Las páginas **no** arman el chrome: lo ponen los layouts. Cada pantalla solo
renderiza su contenido.

**Tienda pública — `app/(tienda)/layout.tsx`** (route group: no cambia las URLs).
Todas las rutas públicas viven ahí (`/`, `/catalogo`, `/checkout`, `/turnos`,
`/presupuesto`, `/cuenta/*`, `/seguimiento`…). El layout usa
`StoreFrame` (`components/store/store-frame.tsx`, server, estático): lee
`getStore()` + `getCategories()` (cacheados por tag) y renderiza
`<StoreChrome>` + `<main id="contenido">` + `<Footer>`. `app/not-found.tsx`
(fuera del grupo) se envuelve en `StoreFrame` a mano.

- `StoreChrome` (`components/store/store-chrome.tsx`, **isla cliente**) muestra
  `Header` desde `lg` y `MobileHeader` (con `MobileMenu` 5c) debajo. El ítem
  activo sale de `usePathname()`: match con `hrefs.nav` y un mapa
  categoría→grupo (`/catalogo/mtb` marca "Bicicletas"). Las fichas de
  producto no marcan grupo.
- **Carrito**: `useCartCount()` (zustand + localStorage, 0 hasta hidratar).
  Para sumar: `useCart().add(slug, max, variantId)`. No hay drawer: "Carrito"
  lleva a `paths.cart()` (2d).
- **Cuenta**: la isla llama a la server action `getMyAccount()` al montar y
  en cada pantalla de `/cuenta/*`; muestra el primer nombre o "Cuenta" /
  "Mi cuenta". Así ninguna página pública se vuelve dinámica por la sesión.
- **Links**: `storeHrefs()` (exportada de `store-frame.tsx`) arma los
  `StoreHrefs` desde `lib/paths.ts` (`routes` de `lib/config.ts`): grupos →
  `/catalogo/<grupo>`, presupuesto → `paths.quote()`, turnos →
  `paths.appointments()`, buscador → GET `paths.catalog()?q=`, cuenta →
  `paths.account()` (o `paths.tracking()` sin `features.accounts`).
- Footer: dirección, horarios, WhatsApp (formateado; "[Número a confirmar]"
  mientras el número sea el placeholder `WHATSAPP_PENDING`), Instagram,
  cuotas (`settings.maxInstallments`) y % off (`settings.transferDiscount`).
- Placeholder de pantallas pendientes: `UnderConstruction`
  (`components/store/under-construction.tsx`).

**Admin — `app/admin/(panel)/layout.tsx`** (dinámico; `/admin/ingresar` queda
afuera). `AdminShell` con `AdminDesktopNav` (≥ lg) y `AdminMobileNav`
(< lg, `AdminMobileHeader` + sidebar desplegable), ambos en
`components/admin/bt-admin-nav.tsx` (islas cliente solo para la sección
activa por URL). Secciones y rutas: `ADMIN_HREFS` (Resumen `/admin`, Pedidos,
Turnos, Presupuestos, Productos, Clientes, Ajustes). "Salir" = form con la
server action `logout`. Contadores de `getAdminNavCounts()`:
Pedidos = `ordersToAct` (pendientes de pago, pagados, armando y listos),
Turnos = `appointmentsToday` (activos de hoy), Presupuestos = `quotesNew`,
Productos = total; también expone `appointmentsUnconfirmed`. Siguen
montados `ConfirmProvider` y `ToastProvider` (los usan las pantallas viejas).
Cada página arma su `AdminTopBar` arriba de su contenido.

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
