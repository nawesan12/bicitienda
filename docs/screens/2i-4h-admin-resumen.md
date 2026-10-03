# 2i · 4h · Admin Resumen ("Hoy")

- PNG: [2i desktop](prototype/2i.png) · [4h mobile](prototype/4h.png)
- Ruta: `/admin` (`app/admin/(panel)/page.tsx`)
- Agente dueño: **D Admin**
- Fuente: `BiciTienda MDQ.dc.html` l.612–633 (2i), l.180–188 (4h); datos `renderVals()` → `kpis`, `todayAppts`, `orders`.

## Estructura 2i (desktop 1440, bloques en orden)

Contenedor: `.dv-card` grid `240px | minmax(0,1fr)`, `min-height:980px`, bg ink `#121110`.

1. **Sidebar**: `AdminSidebar active="resumen"`. Counts del prototipo: Pedidos 7 · Turnos 14 · Presupuestos 2 · Productos 124 (detalle en `shell.md`).
   Componente bt: `AdminShell` + `AdminSidebar` `{ active:"resumen", counts }`.
2. **Top bar**: flex, `align-items:center`, `gap:20px`, `padding:22px 40px`, `border-bottom:1px solid #2b2824` (line).
   - H1 "Hoy · jueves 1 oct": Archivo 900 44px/1, `font-stretch:66%`, uppercase.
   - spacer flex:1.
   - Buscador: bg surface `#1f1d1a`, border `1px #3a362f` (line-strong), radius 6, padding 11×16, **width 300px**, Archivo 400 14px, color text-3 `#8d867a`, placeholder "Buscar pedido, cliente o DNI".
   - Botón primario "+ Turno manual": bg yellow `#ffd21f`, texto ink, padding 12×18, radius 6, Archivo 800 14px uppercase, letter-spacing .06em.
   Componente bt: `AdminTopBar { title, search:{action, placeholder:"Buscar pedido, cliente o DNI", width:300}, actions:<Button variant="primary" size="header">+ Turno manual</Button> }`.
3. **KPIs**: grid `repeat(4,minmax(0,1fr))`, `gap:1px`, bg line `#2b2824` (divisores), `border-bottom:1px solid #2b2824`, sin radio (flush).
   Celda: bg ink, `padding:22px 28px`, flex column gap 4.
   - Label: Archivo 700 12px uppercase, ls .08em, text-3.
   - Valor: Archivo 900 48px/1, stretch 70%, color por KPI.
   - Copy/valores: "Pedidos hoy" 7 (paper `#f4efe4`) · "Para retirar" 3 (yellow) · "Turnos hoy" 6 (paper) · "Transf. a validar" 1 (red-light `#ff6a5c`).
   Componente bt: `KpiGrid { columns:4, flush }` + `Kpi { label, value, tone: paper|yellow|red, size:"lg" }`.
4. **Cuerpo**: grid `420px | minmax(0,1fr)`, `gap:28px`, `padding:28px 40px 40px`, `align-items:start`.
   - **Columna "Turnos de hoy"** (flex column gap 14):
     - Header: flex space-between baseline. "Turnos de hoy" Archivo 900 28px/1 stretch 70% uppercase; derecha "6 TURNOS" JetBrains Mono 600 12px text-3.
     - Lista flex column gap 8. Tarjeta de turno: grid `64px | 1fr`, gap 14, padding 14, radius 8, border 1px.
       - Hora: Archivo 900 22px/1 stretch 75%.
       - Nombre Archivo 800 15px; estado a la derecha Archivo 700 11px uppercase ls .06em.
       - Línea "servicio · detalle": Archivo 400 13px, opacity .85.
       - Colores por estado: **Ahora** bg yellow / fg ink / borde yellow · **Hecho** bg surface `#1f1d1a` / fg text-3 `#8d867a` / borde line · **Confirmado** bg surface / fg paper / borde line `#2b2824` · **Sin confirmar** bg surface / fg paper / borde red `#d7261e`.
       - Datos: 10:00 Ana Torres · Asesoramiento · Primera bici urbana · Hecho / 11:30 Juan Pérez · Prueba de bici · MTB R29 · talle M · Hecho / 16:00 Nicolás Vera · Prueba de bici · Gravel 700c · talle L · Ahora / 16:30 Marta Ríos · Asesoramiento · Bici para su hijo, 7 años · Confirmado / 17:30 Tomás Gil · Prueba de bici · MTB R27.5 juvenil · Confirmado / 18:30 Laura Paz · Asesoramiento · Ruta, presupuesto $800k · Sin confirmar.
     - **SIN componente bt** para la tarjeta de turno del día (`TodayAppointmentCard`): 2 tamaños (desktop 64px/22px/padding 14, mobile 52px/20px/padding 12).
   - **Columna "Pedidos"** (flex column gap 14):
     - Header: flex baseline gap 20. "Pedidos" (900 28px stretch 70% uppercase) + chips (gap 6): "Todos" (activo: bg paper, fg ink) · "Para armar" · "Listos" · "Transf. pendiente". Chip: padding 6×12, radius 999, Archivo 700 13px, inactivo border 1px `#3a362f`. **Sin contadores** (a diferencia de 3a).
       Componente bt: `FilterChip { active, size:"sm", href }`.
     - Tabla: border 1px line, radius 10, overflow hidden. Columnas `96px | minmax(0,1fr) | 168px | 104px`, gap 24.
       - Header: padding 14×22, bg surface-2 `#1a1816`, JetBrains Mono 600 11px uppercase text-3: "Pedido" · "Cliente y productos" · "Estado" · "Total" (right).
       - Fila: padding 18×22, border-top line, Archivo 14px, align center. Nº mono 600 13px; cliente 700 + items 13px text-3 (ellipsis); pill (`OrderPill`, 800 11px uppercase ls .06em, padding 5×10); total Archivo 800 15px right.
       - Filas: `#BT-10482` Juan Pérez · "MTB R29 21v · Casco urbano" · Pagado · $ 544.800 / `#BT-10481` Lucía Gómez · "Urbana R28 canasto" · Transf. pendiente · $ 323.910 / `#BT-10480` Martín Ruiz · "Gravel 700c 2x9" · Armando · $ 899.900 / `#BT-10479` Sofía Díaz · "Infantil R16 · Casco infantil" · Paga en local · $ 219.800 / `#BT-10477` Diego Sosa · "Kit luces · Remera ciclismo" · Listo para retirar · $ 67.800 / `#BT-10475` Carla Méndez · "Paseo R26 guardabarros" · Listo para retirar · $ 287.910 / `#BT-10471` Pablo Ferreyra · "MTB R29 doble suspensión" · Retirado · $ 1.249.900.
       - En 2i las filas **no** son seleccionables (sin `onClick`); lo lógico es `rowHref` → `/admin/pedidos?sel=<n>` o `/admin/pedidos/<n>`.
       Componente bt: `Table { columns, rows, gap:24, rowHref }` + `CellMono`, `CellStack`, `OrderPill`.

## 4h (mobile 390)

1. **Header admin mobile**: flex gap 10, padding 12×16, bg ink-deep `#0b0a09`, border-bottom line. Logo 36×36; "Admin · **Mostrador**" (Mostrador en yellow) Archivo 900 18px/1 stretch 72% uppercase, flex 1; botón "Menú" alto 44, padding 0 14, radius 6, border 1px `#3a362f`, Archivo 800 13px uppercase.
   Componente bt: `AdminMobileHeader { label:"Mostrador", menuHref | menu }`.
2. Contenido: padding `18px 16px 28px`, flex column gap 18.
   - H1 "Hoy · jue 1 oct": Archivo 900 **44px**/.88 stretch 66% uppercase (el inline declara 56px y lo pisa `font-size:44px`).
   - KPIs: grid `1fr 1fr`, gap 1, bg line, border 1px line, **radius 8**. Celda bg ink, padding 14, gap 2; label Archivo 700 11px uppercase ls .06em text-3; valor 900 40px/1 stretch 70%. Mismos 4 KPIs.
     Componente bt: `KpiGrid { columns:2 }` + `Kpi size="md"`.
   - "Turnos de hoy" (900 26px/1 stretch 70% uppercase), lista gap 8; tarjeta grid `52px | 1fr`, gap 10, padding 12, radius 8; hora 900 20px/1 stretch 75%; nombre 800 15px; estado 700 **10px** nowrap; detalle 13px opacity .85 con ellipsis. Sin "6 TURNOS".
   - Botón secundario "Ver pedidos para retirar · 3": min-height 50, border 1.5px `#4a453e` (line-btn), radius 6, Archivo 800 15px uppercase ls .06em, centrado; link a 4i/listado.
     Componente bt: `Button { variant:"secondary", size:"full", href }`.
   - **La tabla de pedidos no aparece en mobile** (solo el botón).

## Desktop vs mobile

| | 2i | 4h |
|---|---|---|
| Shell | Sidebar 240 + top bar con buscador y "+ Turno manual" | `AdminMobileHeader` (Menú) sin buscador ni acción |
| H1 | "Hoy · jueves 1 oct" 44px | "Hoy · jue 1 oct" 44px |
| KPIs | 4 columnas flush, 48px | 2×2 con radio 8, 40px |
| Turnos | col 420px, "6 TURNOS" | full width |
| Pedidos | tabla + chips | botón "Ver pedidos para retirar · 3" |

## Estados e interacciones

- Sin estado interactivo en el prototipo (chips y filas estáticos).
- Estado de la tarjeta de turno: Hecho / Ahora / Confirmado / Sin confirmar (colores arriba). "Ahora" = turno en curso (hora actual dentro del slot de 30 min).
- Chips de pedidos: "Todos" activo. Filtros sugeridos: Para armar = PAGADO+EN_PREPARACION; Listos = LISTO_RETIRO; Transf. pendiente = PENDIENTE_PAGO+transferencia.

## Datos

- Demo: `lib/data/demo/appointments.ts` (`DEMO_TODAY = "2026-10-01"`, turnos de hoy; mapeo Hecho→`asistio`, Ahora→`confirmado`, Sin confirmar→`pendiente`), `orders.ts` (`ORDERS`, `ORDER_STATUS_LABEL`, `paymentLabel`, `orderTotal`).
- Turnos de hoy: `getAppointmentsBetween(today, today)` (`lib/server/appointments.ts`) → `AppointmentView` (`time`, `customer.name`, `service.name`, `productLabel`, `appointment.status`). El detalle ("Primera bici urbana") sale de la nota/notes del turno o de `productLabel`.
- Pedidos: `getAdminOrders()` (`admin-queries.ts`) → `AdminOrderSummary { number, status, paymentMethod, customerName, itemsLabel, total }`; pill vía `orderStage()` de `lib/order-flow.ts` → `OrderPill` (tabla del README de bt).
- KPIs: **no hay query**. `getAdminStats()` devuelve métricas de la plantilla vieja (products, articles, agenda, leads, subscribers). Hay que agregar algo tipo `getTodaySummary()`: Pedidos hoy (`orders.createdAt` hoy), Para retirar (`LISTO_RETIRO`), Turnos hoy (count de `getAppointmentsBetween`), Transf. a validar (`PENDIENTE_PAGO` + transferencia).
- Sidebar counts: `getAdminNavCounts()` solo trae `orders` (PENDING_ORDER_STATUSES), `products`, `agenda`, `leads`: **faltan turnos y presupuestos** (usar `quoteCounts()` de `quotes.ts` y un count de turnos).
- "+ Turno manual" → `adminCreateAppointment(input)` (`actions/admin-appointments.ts`) / abre el flujo de 3b.
- Buscador "Buscar pedido, cliente o DNI": no hay búsqueda por DNI en el modelo (customers no tiene DNI).

## Componentes bt faltantes

- `TodayAppointmentCard` (tarjeta de turno del día, 4 estados, variante desktop/mobile).
- (opcional) query/servicio de KPIs del día; no es componente.

## Ambigüedades

- H1 4h: inline `font:900 56px/.88` y después `font-size:44px` → vale 44px.
- Counts del sidebar: AdminSidebar.dc.html dice Turnos **14** (turnos de la semana 3b), `renderVals.adminNav` (no usado) dice Turnos **6** (hoy). Definir si el contador es "turnos de hoy" o "pendientes de la semana".
- "Pedidos hoy 7" coincide con el total de pedidos listados de 7 días distintos (1 oct a 26 sep): el KPI y la tabla no son coherentes; la tabla parece "pedidos activos/recientes", no "de hoy".
- 2i es "jueves 1 oct" pero la agenda 3b resalta el jue 8 (ver nota en `lib/data/demo/appointments.ts`).
- Filas de 2i no linkean en el prototipo; se asume link al detalle.
- Buscador menciona DNI, campo que no existe.
