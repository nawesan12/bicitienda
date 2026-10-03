# 2g / 4f · Mi cuenta

- PNG: [2g desktop](prototype/2g.png) · [4f mobile](prototype/4f.png)
- Ruta: `/cuenta` (sin sesión → redirige a `/cuenta/ingresar`)
- Dueño: **C Cliente**
- Fuente: `BiciTienda MDQ.dc.html` l.563–588 (2g), l.153–163 (4f); datos `pastAppts` / `myOrders` en `renderVals()`.

## Estructura desktop (2g, 1440)

0. **Header**: `active=""` (ningún ítem del nav activo), `account="Juan"` (nombre de pila de la cuenta en lugar de "Cuenta"), `cart="0"`. Ver `shell.md`.
   Componente bt: `Header { hrefs, account: firstName, cart }`.

1. **Contenedor**: grid `260px minmax(0,1fr)`, gap 48, padding `40px 56px 80px`, `align-items:start`.
   **SIN componente bt** de layout (grid simple con Tailwind).

2. **Aside (nav de cuenta)**: flex column gap 4.
   - Saludo: "Hola,<br>Juan" (salto de línea), Archivo 900 40px/.9 @66%, uppercase, margin-bottom 20. Componente bt: `Display`; **no hay tamaño 40/.9 @66** en `Display` (los tamaños son hero/page/section/h2/…): usar `className` o agregar size.
   - Ítems (`<a>`): padding 13×16, radius 6, Archivo 15px uppercase, letter-spacing .06em.
     - Activo "Mis turnos": bg yellow `#ffd21f`, texto ink `#121110`, peso 800.
     - "Mis pedidos", "Mis datos": peso 700, texto paper.
     - "Cerrar sesión": peso 700, texto text-3 `#8d867a`.
   - **SIN componente bt** (nav vertical de cuenta). `SegmentedControl` no sirve (es horizontal). Falta `AccountNav` (vertical desktop / segmentado mobile).

3. **Columna principal**: flex column gap 40, con 3 secciones (cada una flex column gap 16).

   3.1 **"Próximo turno"** (eyebrow Archivo 700 13px uppercase .08em text-3) → `Eyebrow tone="muted" size="md"`.
   Card amarilla: grid `200px minmax(0,1fr) auto`, gap 28, `align-items:center`, bg yellow, texto ink, radius 10, padding 24.
   - Bloque fecha: bg ink, texto yellow, radius 8, padding 18, column centrada gap 2:
     "Jueves" (700 14px uppercase .08em) / "8" (900 72px/.9 @70%) / "Oct · 17:30" (700 14px uppercase .08em).
   - Info (column gap 8): "Prueba de bici" (900 48px/.9 @66% uppercase) · "MTB rodado 29 · 21 vel. · talle M · 30 min" (16px) · "[Local a confirmar]" (15px).
   - Acciones (column gap 8):
     - "Reprogramar": bg ink, texto yellow, padding 14×22, radius 6, 800 14px uppercase .06em, centrado → link a `/turnos` (2f) en modo reprogramar.
     - "Cancelar": borde 1.5px ink, padding 13×22, radius 6, 800 14px uppercase .06em.
   - Componentes bt: `Panel surface="yellow" padding="lg"` para la card; `Button variant="ink"` (Reprogramar) y `Button variant="ink-outline"` (Cancelar). **SIN componente bt** para el bloque calendario (día/número/mes·hora) → falta `DateBadge` (`{ weekday, day, caption, size: lg|sm }`), reutilizable en 4f.

   3.2 **"Turnos anteriores"**: fila título `justify-content:space-between; align-items:baseline` con eyebrow "Turnos anteriores" + link "+ Nuevo turno" (700 14px yellow uppercase .06em → `/turnos`). Componente bt: `Eyebrow` + `TextLink tone="yellow"`.
   Lista: border-top `#2b2824`; cada fila grid `180px 1fr 160px`, gap 20, padding 16×0, border-bottom line, Archivo 15px:
   - Fecha mono: JetBrains Mono 600 13px text-2 `#cfc8bb` — "12 SEP 2026 · 11:00".
   - "**Asesoramiento** · Elegimos rodado y talle" (servicio en `<strong>`).
   - Pill a la derecha (`justify-self:end`): 700 12px uppercase .06em, text-3, borde 1px line-strong `#3a362f`, padding 5×10, radius 999 — "Asistió" / "Reprogramado".
   - Componente bt: `AppointmentPill status size="lg"` (tono `muted` = mismo look; ojo: bt usa peso 800, el prototipo 700). Fila: **SIN componente bt** (lista simple; `Table` es excesivo) — usar `Mono` + divs.

   3.3 **"Mis pedidos"**: eyebrow + grid `1fr 1fr`, gap 16. Card: bg surface `#1f1d1a`, borde 1px line `#2b2824`, radius 10, padding 20, grid `96px 1fr`, gap 18, centrado.
   - Thumb 96×72, object-fit cover, radius 6.
   - Fila superior space-between: número mono 600 13px text-3 ("#BT-10482") + pill (800 12px uppercase .06em, padding 5×10, radius 999).
   - Ítems: 800 17px ("MTB R29 21v + Casco").
   - Meta: 14px text-2 ("1 oct 2026 · $ 544.800").
   - Pills del prototipo: "Armando" bg yellow / texto ink; "Retirado" bg line-strong `#3a362f` / texto paper (¡distinto de 3a! ver Ambigüedades).
   - Componentes bt: `Panel surface="surface" padding=...` (o `Card`), `CellThumb`?, `Mono size=13`, `OrderPill size="lg"`. **SIN componente bt** para la card de pedido de cliente → falta `OrderSummaryCard { href, number, status, itemsLabel, meta, image, size: desktop|mobile }`. Debería linkear al detalle del pedido (`/checkout/confirmacion/[numero]` o `/seguimiento`), no definido en el diseño.

4. **Footer**: `Footer` (ver `shell.md`).

## Mobile (4f, 390)

- **MobileHeader** `cart=0`, `search=false` (sin fila de búsqueda).
- Contenedor padding `20px 16px 28px`, column gap 20.
- H1 "Hola, Juan" en una línea: 900 56px/.88 @66% uppercase.
- **Tabs** (reemplazan el aside): grid 3 cols, bg surface, radius 8, padding 4; cada tab min-height 44, radius 6, 800 13px uppercase letter-spacing .04em; activo bg yellow/ink; inactivos text-2 `#cfc8bb`. Copy: "Turnos" · "Pedidos" · "Datos". **No hay "Cerrar sesión" en 4f** (queda en el menú 5c "Mi cuenta"? no definido). Componente bt: `SegmentedControl tone="yellow"` (ya replica 44px/13px/.04em en mobile y 13px/15px/.06em en md — pero en desktop el diseño es vertical, no segmentado).
- **Próximo turno** (sin eyebrow): card bg yellow, radius 8, padding 18, column gap 14.
  - Fila gap 14: bloque fecha bg ink/yellow radius 6 padding 10×14: "Jue" (700 11px uppercase) / "8" (900 40px/.9 @70%) / "17:30" (700 11px uppercase). Info gap 4: "Prueba de bici" (900 30px/.9 @66% uppercase) + "MTB R29 · talle M · 30 min" (14px).
  - Botones grid `1fr 1fr` gap 8: "Reprogramar" min-height 46, bg ink, texto yellow, 800 13px uppercase .06em, radius 6; "Cancelar" min-height 44, borde 1.5px ink, 800 13px. → `Button variant="ink"` / `"ink-outline"` `size="sm"` (bt fuerza min-h 44 en sm).
  - No muestra "[Local a confirmar]".
- **Turnos anteriores**: eyebrow 700 12px; filas flex space-between gap 10, padding 12×0, border-top line: servicio 800 15px + fecha mono 600 11px text-3 debajo; pill 700 11px (padding 5×10, `white-space:nowrap`). Sin el texto de detalle. → `AppointmentPill size="md"`.
- **Mis pedidos**: cards bg surface, radius 8, padding 12, grid `72px 1fr` gap 12; thumb 72×56 radius 6; número mono 600 11px text-3; pill 800 10px padding 4×8; ítems 800 15px; meta 13px text-2. 1 columna. → `OrderPill size="sm"`.
- Sin footer en el artboard 4f (la versión mobile del Footer igual va por layout).

## Estados e interacciones

- Prototipo: estático (sin state). El ítem activo es "Mis turnos"/"Turnos".
- Implementación sugerida: las tres vistas (turnos / pedidos / datos) como secciones de `/cuenta` con `?tab=` o sub-rutas; desktop muestra en "Mis turnos" las tres secciones apiladas tal como el diseño (próximo turno + anteriores + pedidos).
- Sin próximo turno: no hay diseño → `EmptyState` + CTA "+ Nuevo turno" / "Sacar turno".
- **Reprogramar / Cancelar**: mostrar solo si `canCustomerModify(appt)` es true; si no, la UI debe ofrecer WhatsApp (comentario de `canCustomerModify`: "la UI decide botón o WhatsApp"). Cancelar requiere confirmación (no diseñada).
- **Cerrar sesión** → `logoutAccount()` y redirect a `/` o `/cuenta/ingresar` (en el prototipo linkea a 2h).
- "Mis datos" (desktop) / "Datos" (mobile): **sin diseño**; campos editables nombre + WhatsApp (`updateMyProfile`), email solo lectura. Reusar `Field` + `Input surface="page" size="lg"` como 2h.

## Datos

| Bloque | Demo (`lib/data/demo`) | Real |
|---|---|---|
| Nombre en header/H1 | `CUSTOMERS` (`DEMO_ACCOUNT_EMAIL = "juanperez@gmail.com"`, Juan Pérez) | `getMyAccount()` (`actions/account.ts`) → `PublicAccount.name` (usar primer nombre) |
| Copy | `COPY.account` (`hello`, `nav`, `navMobile`, `nextAppointment`, `reschedule`, `cancel`, `pastAppointments`, `newAppointment`, `ordersTitle`) | idem |
| Próximo turno | `APPOINTMENTS` id `DEMO_ACCOUNT_NEXT_APPOINTMENT = "a9"` (jue 8 oct 17:30, prueba, MTB R29 talle M) | `getMyAppointments()` → `upcoming[0]` (`AppointmentView`: `dayLabel`, `time`, `service.name`, `productLabel`, `service` duración) |
| Turnos anteriores | `APPOINTMENTS` ids `p1` (12 sep, asistió), `p2` (28 ago, reprogramado) | `getMyAppointments()` → `past` (status → `AppointmentPill`; `APPOINTMENT_STATUS_LABEL`) |
| Mis pedidos | `ORDERS` de Juan: `BT-10482`, `BT-10288` | `getMyOrders()` → `FullOrder[]` (`order.number`, `order.status`+medio → `OrderPill` según tabla de components/bt/README, `items[].name`, `order.createdAt`, total) |
| Reprogramar | — | `rescheduleMyAppointment(ref, slot)` (`actions/appointments.ts`), slots con `fetchAvailability` |
| Cancelar | — | `cancelMyAppointment(ref)`; gate con `canCustomerModify(appt)` (`lib/server/appointments.ts`) |
| Cerrar sesión | — | `logoutAccount()` |
| Datos | — | `updateMyProfile({ name?, phone? })` |
| Presupuestos | `QUOTES` | `getMyQuotes()` existe pero **no hay bloque en el diseño** |

Formato de fecha de pedido: "1 oct 2026 · $ 544.800" (`ars()` de `lib/data/demo/format.ts` / `formatMoney` de bt). Fecha de turno pasado: mono uppercase "12 SEP 2026 · 11:00".

## Componentes bt faltantes

- `AccountNav` — nav vertical de cuenta desktop (ítem activo amarillo, "Cerrar sesión" apagado). En mobile alcanza `SegmentedControl`.
- `DateBadge` — bloque de fecha del próximo turno (lg 2g: 200px de col, 72px número; sm 4f: 40px).
- `NextAppointmentCard` (opcional, compone `Panel yellow` + `DateBadge` + botones).
- `OrderSummaryCard` — card de pedido del cliente (thumb + número + pill + ítems + meta), desktop y mobile.
- `Display` no tiene tamaño 40/.9 @66 (saludo) ni 48/.9 @66 (título del turno) ni 56/.88 (H1 4f): usar `className` o sumar tamaños.

## Ambigüedades

- **Colores de pills de pedido**: 2g pinta "Armando" amarillo y "Retirado" `#3a362f`/paper; 3a usa "Armando" `#3a362f` y "Retirado" contorneado. Recomendación: usar `OrderPill` (paleta de 3a) para consistencia. Además #BT-10482 figura "Armando" en 2g y "Pagado" en 3a (demo: manda 3a).
- **Peso de la pill de turno pasado**: prototipo 700, `Pill` bt 800.
- **README dice "Mis turnos, Mis pedidos, Datos, Salir"**; el prototipo dice "Mis datos" y "Cerrar sesión". Se usa el prototipo (=`COPY.account.nav`).
- **Mis datos** y la vista "Mis pedidos" separada no tienen diseño.
- **4f no tiene "Cerrar sesión"** ni Footer.
- **Presupuestos del cliente** (`getMyQuotes`) no aparecen en 2g/4f: decidir si se agrega una sección "Mis presupuestos" (con `QuotePill`) o se omite.
- "[Local a confirmar]" es placeholder del cliente (dirección del local → `STORE_INFO` / `getStore()`).
- El link de cada pedido no está definido (¿`/checkout/confirmacion/[numero]`? ¿`/seguimiento`?).
