# Shell · Header, MobileHeader, Menú mobile (5c), Footer, AdminSidebar, AdminMobileHeader

- PNG: [5c](prototype/5c.png) (menú abierto). Header/Footer se ven en cualquier artboard de tienda: [2a](prototype/2a.png), [2b](prototype/2b.png) (nav activo "Bicicletas"), [5a](prototype/5a.png) (activo "Pedir presupuesto"); MobileHeader con búsqueda en [4a](prototype/4a.png), sin búsqueda en [4c](prototype/4c.png); footer mobile en [4a](prototype/4a.png); AdminSidebar en [3a](prototype/3a.png)/[3b](prototype/3b.png); AdminMobileHeader en [4h](prototype/4h.png)/[4i](prototype/4i.png).
- Fuente: `Header.dc.html`, `MobileHeader.dc.html`, `Footer.dc.html`, `AdminSidebar.dc.html`, artboard 5c (l.64) y la cabecera inline de 4h (l.181).
- Ruta app: layouts — tienda `app/layout.tsx` / layout de grupo de tienda; admin `app/admin/(panel)/layout.tsx`.
- Agente dueño: **Shell**.

## Header desktop (`Header.dc.html`)

Contenedor: `flex-direction:column`, `border-bottom:1px solid #2b2824` (line), bg `#121110` (ink), color `#f4efe4` (paper), `white-space:nowrap`. Alto ≈ 129 px en el render (README dice ~135; los artboards usan `hint-size 85px`/`135px`).

| Bloque | Medidas | Tipografía / color | Copy |
|---|---|---|---|
| Fila 1 | `display:flex; align-items:center; gap:28px; padding:16px 56px` | — | — |
| Logo + wordmark (link home) | `gap:12px`, logo `52×52` | Wordmark Archivo 900 30px/1, `font-stretch:72%`, `letter-spacing:.01em`, uppercase. "Bici" paper + "Tienda" `#d7261e` (red) + "MDQ" paper | alt "Logo BiciTiendaMDQ" |
| Spacer | `flex:1` | | |
| Búsqueda | `width:360px; padding:11px 16px; border-radius:6px; bg #1f1d1a (surface); border:1px solid #3a362f (line-strong)` | Archivo 400 14px, `#8d867a` (text-3) | "Buscar bici, accesorio, repuesto…" |
| Cuenta | link | Archivo 700 14px uppercase `.06em`, paper | "Cuenta" (o nombre del cliente: prop `account`) |
| Carrito | `padding:11px 16px; radius 6; bg #ffd21f` | Archivo 800 14px uppercase `.06em`, `#121110` | "Carrito · {n}" (default 2) |
| Fila 2 nav | `<nav> display:flex; gap:36px; padding:0 56px; border-top:1px solid #2b2824` | Archivo 700 15px, `font-stretch:85%`, uppercase, `.06em` | — |
| Ítem nav | `padding:14px 0 12px; border-bottom:2px solid {activo ? #ffd21f : transparent}` | color paper; **activo o "Sacar turno" → `#ffd21f`** | "Bicicletas" · "Accesorios" · "Repuestos" · "Productos importados" · "Pedir presupuesto" · "Sacar turno" (orden exacto) |

Links: los 4 primeros → catálogo filtrado (`/catalogo?…` o `/catalogo/<grupo>` según defina A); "Pedir presupuesto" → `/presupuesto`; "Sacar turno" → `/turnos`; Cuenta → `/cuenta` (o `/cuenta/ingresar` sin sesión); Carrito → `/checkout`.

Componente bt: **`Header`** `{ hrefs: StoreHrefs, active?: "bicicletas"|"accesorios"|"repuestos"|"importados"|"presupuesto"|"turnos", cart, account, searchPlaceholder?, searchDefault? }`. Solo desktop (`lg`+). La búsqueda en bt es un `SearchInput` real (form GET), en el prototipo es un div.

## MobileHeader (`MobileHeader.dc.html`)

| Bloque | Medidas | Tipografía / color | Copy |
|---|---|---|---|
| Contenedor | column, bg ink, `border-bottom:1px solid #2b2824` | | |
| Fila | `flex; align-items:center; gap:10px; padding:12px 16px` | | |
| Logo + wordmark (→ home) | `gap:8px; flex:1; min-width:0`, logo `36×36` | Archivo 900 19px/1, `font-stretch:68%`, uppercase, nowrap | "Bici" "Tienda"(red) "MDQ" |
| Carrito | `height:44px; padding:0 12px; radius 6; bg #ffd21f` | Archivo 800 **12px** uppercase `letter-spacing:.04em`, ink | "Carrito · {n}" |
| Hamburguesa (cerrado) | `44×44; radius 6; border:1px solid #3a362f`; 3 barras `18×2` paper, `gap:4px` | | → abre 5c |
| ✕ (abierto) | `44×44; radius 6; bg #f4efe4; color #121110` | Archivo 700 22px/1 | "✕" |
| Fila búsqueda (opcional) | `padding:0 16px 12px`; caja `padding:12px 14px; radius 6; bg #1f1d1a; border 1px #3a362f` | Archivo 15px, `#8d867a` | "Buscar bici, casco, repuesto…" |

Props prototipo: `search` (default true), `open` (oculta la búsqueda). Búsqueda visible en 4a, 4b, 4e…; oculta en 4c (`search=false`) y 5c (`open`).

Componente bt: **`MobileHeader`** (cliente) `{ hrefs, cart, active, showSearch, open|defaultOpen, onOpenChange, accountLabel, menuInfo, menuMode: overlay|inline, lockScroll }`. bt pone el input a 16 px (decisión anti-zoom iOS; prototipo 15).

## 5c · Menú mobile abierto

Debajo de `MobileHeader open` (sin búsqueda), artboard 390.

| Bloque | Medidas | Tipografía / color | Copy |
|---|---|---|---|
| Lista categorías | `<nav> column; padding:8px 16px 0`; fila `min-height:64px; border-bottom:1px solid #2b2824; justify-content:space-between` | Archivo 900 30px/1 `@70%` uppercase paper; flecha Archivo 700 18px `#8d867a` | "Bicicletas" · "Accesorios" · "Repuestos" · "Productos importados", flecha "→" |
| CTAs | `column; gap:10px; padding:20px 16px`; botones `min-height:52px; radius 6` | Archivo 800 15px uppercase `.06em` | Primario amarillo "Sacar turno" (→ turnos); borde `1.5px solid #f4efe4` "Pedir presupuesto" (→ presupuesto) |
| Pie | `column; gap:6px; padding:12px 16px 28px; border-top:1px solid #2b2824` | "Mi cuenta": Archivo 700 15px uppercase `.06em`, `min-height:44px`. Línea: 14px/1.5 `#8d867a` | "Mi cuenta" · "WhatsApp [a confirmar] · [Horarios a confirmar]" |

Datos: `quoteVals().mNav` (las 4 categorías, todas a #4b). Componente bt: **`MobileMenu`** `{ hrefs, active, accountLabel="Mi cuenta", info }` (lo monta `MobileHeader` con `menuMode`). Copy en `COPY.mobileMenu` (`contactLine: "WhatsApp {whatsapp} · {horarios}"`).

## Footer desktop (`Footer.dc.html`)

Contenedor: bg ink, color `#cfc8bb` (text-2), `border-top:1px solid #2b2824`.

| Bloque | Medidas | Tipografía / color | Copy |
|---|---|---|---|
| Tira | `grid-template-columns:repeat(4,minmax(0,1fr)); border-bottom 1px line`; celda 1 `padding:26px 56px`, resto `26px 40px`; `gap:4px`; `border-right 1px line` salvo la última | Título Archivo 900 22px `@72%` uppercase paper (2ª en `#ffd21f`); bajada 14px text-2 | "Mercado Pago" / "Tarjetas, débito y dinero en cuenta" · **"6 cuotas sin interés"** / "Con bancos seleccionados" · "10% off transferencia" / "O pagás en efectivo en el local" · "Retiro en el local" / "Te la damos armada y ajustada" |
| Pie | `padding:44px 56px; grid-template-columns:1.4fr 1fr 1fr 1fr; gap:40px`; Archivo 15px/1.6 | Títulos `<strong>` 13px uppercase `.08em` paper | Logo 56 + wordmark 900 26px/1 @72% · "Local" / "[Dirección a confirmar]" · "Horarios" / "[Horarios a confirmar]" · "WhatsApp" / "[Número a confirmar]" + "Instagram · Facebook" |

## Footer mobile (inline en 4a; no hay `.dc.html`)

`border-top 1px line; padding:24px 16px 28px; column; gap:14px`; Archivo 14px/1.5 text-2.
1. Logo 44 + wordmark 900 22px/1 @72% (`gap:10px`).
2. "[Dirección a confirmar] · [Horarios a confirmar]"
3. "WhatsApp [a confirmar] · Instagram · Facebook"
4. JetBrains Mono 600 11px `#8d867a`: "MERCADO PAGO · 6 CUOTAS · 10% OFF TRANSFERENCIA · RETIRO EN EL LOCAL"

Solo 4a lo muestra; 4b–4g terminan sin footer.

Componente bt: **`Footer`** `{ homeHref, address, hours, whatsapp, whatsappHref?, socials?, installments=6, transferDiscountPct=10 }` — ya resuelve desktop (≥ lg) y mobile (< lg).

## AdminSidebar (`AdminSidebar.dc.html`) — 240 px

`<aside>` bg `#0b0a09` (ink-deep), `border-right 1px #2b2824`, `padding:28px 18px`, column `gap:4px`, alto 100%.

| Bloque | Medidas | Tipografía / color | Copy |
|---|---|---|---|
| Marca | `gap:10px; padding:0 8px 28px`, logo `40×40` | wordmark 900 22px/1 @72% uppercase | |
| Ítem | `flex; justify-content:space-between; padding:12px; radius 6` | Archivo 700 14px uppercase `.06em`; contador JetBrains Mono 600 12px. Activo: bg `#ffd21f`, texto ink; resto: transparente, `#cfc8bb` | "Resumen" · "Pedidos" 7 · "Turnos" 14 · "Presupuestos" 2 · "Productos" 124 · "Clientes" · "Ajustes" |
| Spacer | `flex:1` | | |
| Ver tienda | `padding:12px` | Archivo 700 13px uppercase `.06em` `#8d867a` | "Ver tienda ↗" |
| Usuario | `padding:12px; border-top 1px line; gap:2px` | 700 14px / 13px `#8d867a` | "Mostrador" / "admin@bicitiendamdq" |

Layout admin: `.dv-card` con `grid-template-columns:240px minmax(0,1fr); min-height:980px`.

Componente bt: **`AdminSidebar`** `{ active, hrefs, counts?, storeHref, homeHref?, footer? }` + **`AdminShell`**. Contadores → `getAdminNavCounts()` (`lib/server/admin-queries.ts`). Decisión bt: sin bloque de usuario ("Mostrador / admin@…") porque se entra con PIN; `footer` sirve para "Salir" (`logout` en `lib/server/actions/session.ts`).

## AdminMobileHeader (4h, 4i)

`flex; align-items:center; gap:10px; padding:12px 16px; bg #0b0a09; border-bottom 1px #2b2824`. Logo 36. Título `flex:1`, Archivo 900 18px/1 @72% uppercase: "Admin · " + "Mostrador" en `#ffd21f`. Botón "Menú": `height:44px; padding:0 14px; radius 6; border 1px #3a362f`, Archivo 800 13px uppercase. Componente bt: **`AdminMobileHeader`** `{ label="Mostrador", homeHref?, menuHref?, menu? }`. El prototipo no dibuja el menú admin mobile.

## Estados e interacciones

- Header: `active` según la ruta (en 2a/2d/2e… `active=""`; 2b/2c `bicicletas`; 5a `presupuesto`; 2f `turnos`). "Sacar turno" siempre amarillo.
- MobileHeader: hamburguesa ↔ ✕ abre/cierra 5c (prototipo: link a `#5c` / `#4a`).
- AdminSidebar: activo amarillo por sección.
- Hover: aclarado sutil + transición 150 ms (README handoff).

## Datos

| Dato | Demo | Real |
|---|---|---|
| Nav labels/orden | `COPY.header.nav`, `NAV_GROUP_KEYS` (`lib/data/demo/categories.ts`) | `STORE_NAV` en `components/bt/header.tsx`; grupos de `getCategories()` |
| Placeholder búsqueda | `COPY.header.searchPlaceholder` / `searchPlaceholderMobile` | — |
| Contador carrito | — | store de carrito cliente (zustand) |
| Cuenta / nombre | `COPY.header.account` | `getMyAccount()` (`lib/server/actions/account.ts`) |
| Dirección, horarios, WhatsApp | `STORE_INFO` (`settings.ts`) | `getStore()` (`whatsapp`, ubicación) / `getSettings()` |
| Cuotas / % transferencia (tira) | `PAYMENT_SETTINGS`, `COPY.footer.strip` | `getStore().maxInstallments`, % transferencia de settings |
| Contadores sidebar | 7 / 14 / 2 / 124 hardcode | `getAdminNavCounts()` |

## Componentes bt faltantes

Ninguno: Header, MobileHeader, MobileMenu, Footer, AdminShell, AdminSidebar, AdminMobileHeader existen. Falta solo el **menú admin mobile** (no diseñado).

## Ambigüedades

- Header: README dice ~135 px; render real ≈ 129 px. Usar los valores de padding, no la altura.
- Sidebar: el `.dc.html` muestra Turnos **14**, pero `renderVals().adminNav` (sin uso en el canvas) dice 6 y no tiene Presupuestos. Usar los contadores reales.
- bt saca el bloque de usuario del sidebar (PIN). README del handoff lo pide.
- El footer mobile solo aparece en 4a; definir si va en todas las páginas mobile (bt lo muestra siempre < lg).
- Carrito mobile: letra 12px `.04em` (distinto del desktop 14px `.06em`).
- Copy del menú: "WhatsApp [a confirmar]" vs footer desktop "[Número a confirmar]" — son placeholders del mismo dato (`STORE_INFO.whatsapp`).
