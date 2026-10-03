# 3e · Admin Clientes (listado + ficha)

- PNG: [prototype/3e.png](prototype/3e.png) (Juan Pérez seleccionado) · [prototype/3e--con-turno-sin-pedidos.png](prototype/3e--con-turno-sin-pedidos.png) (Ana Torres)
- Ruta: `/admin/clientes` (existe `app/admin/(panel)/clientes/page.tsx` heredado). Selección sugerida: `?c=<id>`.
- Agente dueño: **D Admin**
- Fuente: `BiciTienda MDQ.dc.html` l.294–310; datos `adminVals()` → `CL`, `clRows`, `cd`, `hist` (~l.712–720).

Artboard 1440 × ≥980, grilla `240px | minmax(0,1fr)`, fondo ink.

## Estructura (bloques en orden)

### 0. Sidebar
`AdminSidebar active="clientes"` (Pedidos 7 · Turnos 14 · Presupuestos 2 · Productos 124). Ver `shell.md`.

### 1. Top bar
`padding:22px 40px`, `gap:14px`, borde inferior line. H1 "Clientes" (900 44px/1 @66% uppercase) · spacer · búsqueda 280px (bg `#1f1d1a`, borde `#3a362f`, `padding:11px 16px`, 14px `#8d867a`): "Buscar por nombre, email o WhatsApp" · botón secundario "Exportar" (borde 1.5px `#4a453e`, `padding:11px 18px`, 800 14px uppercase `.06em`).
Componente bt: `AdminTopBar { title: "Clientes", search: { width: 280, placeholder }, actions: <Button variant="secondary" size="header">Exportar</Button> }`.

### 2. Cuerpo
Grilla `minmax(0,1fr) 360px`, `gap:24px`, `padding:24px 40px 40px`, `align-items:start`.

#### 2.1 Tabla
- Caja `border:1px solid #2b2824`, radio 10.
- Columnas `minmax(0,1fr) 124px 72px 112px 104px`, `gap:20px`.
- Header: `padding:14px 22px`, bg `#1a1816`, Mono 600 11px uppercase `#8d867a`: "Cliente" · "WhatsApp" · "Pedidos" · "Último contacto" · "Gastado" (derecha).
- Fila: clickeable, `padding:18px 22px`, `border-top:1px solid #2b2824`, Archivo 14px. Seleccionada: bg `rgba(255,210,31,.08)` + `box-shadow: inset 3px 0 0 #ffd21f`.
  - Cliente: nombre 700 + email 12px `#8d867a` (ellipsis), `gap:2px`.
  - WhatsApp: Mono 600 12px `#cfc8bb`.
  - Pedidos: 800.
  - Último contacto: `#cfc8bb`.
  - Gastado: 800, derecha, `$ 569.700`.
- Filas exactas (nombre · email · WhatsApp · pedidos · último · gastado):
  Juan Pérez · juanperez@gmail.com · 223 555-0182 · 3 · Hoy · $ 569.700 /
  Lucía Gómez · lugomez@hotmail.com · 223 555-0144 · 1 · Hoy · $ 323.910 /
  Martín Ruiz · mruiz.mdp@gmail.com · 223 555-0127 · 2 · Ayer · $ 924.800 /
  Sofía Díaz · sofi.diaz@gmail.com · 223 555-0163 · 1 · Hace 2 días · $ 219.800 /
  Diego Sosa · diegososa@yahoo.com · 223 555-0190 · 4 · Hace 3 días · $ 189.500 /
  Carla Méndez · carla.mendez@gmail.com · 223 555-0111 · 1 · Hace 5 días · $ 287.910 /
  Pablo Ferreyra · pferreyra@gmail.com · 223 555-0175 · 2 · Hace 1 semana · $ 1.312.300 /
  Ana Torres · anatorres@gmail.com · 223 555-0107 · 0 · Hace 1 semana · $ 0 /
  Marta Ríos · martarios@gmail.com · 223 555-0128 · 0 · Hoy · $ 0
Componente bt: `Table { columns, rows, getRowKey, selectedKey, rowHref (?c=id) | onRowClick, gap: 20 }` + `CellStack`, `CellMono`.

#### 2.2 Ficha (panel 360px)
Panel bg `#1f1d1a`, borde `1px #2b2824`, radio 10, `padding:24px`, column `gap:18px`.
1. Nombre: Archivo 900 40px/.95 `font-stretch:70%` uppercase; debajo "Cliente desde {mes año}" (14px `#8d867a`), `gap:4px`. Ej. "Cliente desde marzo 2025".
2. Contacto: 14px `#cfc8bb`, `gap:4px`: email · "WhatsApp {teléfono}".
3. Botón primario full "Escribir por WhatsApp": yellow, `padding:14px 0`, radio 6, 800 14px uppercase `.06em`, centrado.
4. KPIs: grilla `repeat(3,1fr)`, `gap:1px` sobre bg `#2b2824`, borde `1px #2b2824`, radio 8. Celda bg ink, `padding:14px`, `gap:2px`; label Archivo 700 11px uppercase `.08em` `#8d867a`; valor 900 30px/1 @72% ("Pedidos", "Turnos"); "Gastado" 900 **24px/1.1** @72% **yellow**.
5. "Historial": eyebrow 700 12px uppercase `.08em` `#8d867a`, `padding-bottom:8px`. Filas grilla `72px 1fr`, `gap:12px`, `padding:10px 0`, `border-top:1px solid #2b2824`, 14px: tipo (800 11px uppercase `.06em`; "Pedido" yellow `#ffd21f`, "Turno" paper `#f4efe4`, `padding-top:2px`) + texto `#cfc8bb`.
   - Pedido: "{número} · {items unidos por ' + '} · {estado}" → "#BT-10482 · MTB rodado 29 · 21 vel. + Casco urbano regulable · Pagado".
   - Turno: "{Prueba de bici|Asesoramiento} · {Lun..Sáb} {d} oct {hh:mm}" → "Prueba de bici · Jue 8 oct 17:30".
   - Vacío: "Sin movimientos esta semana." (14px `#8d867a`, `padding:10px 0`, borde superior).
Componentes bt: `Panel { surface: "surface", padding: "lg" }`, `Display size="detail"` (36/.95 @70 — el prototipo usa **40**), `Button variant="primary" size="full" href=wa.me external`, `KpiGrid { columns: 3 }` + `Kpi { size: "sm" }` (30). **SIN componente bt** para la lista "Historial" (tipo coloreado + texto) y para el Kpi de 24px (Gastado: `Kpi` solo tiene 48/40/30).

## Estados e interacciones
- Click en fila → selecciona y llena la ficha (default: primera fila, Juan Pérez).
- Variante [3e--con-turno-sin-pedidos](prototype/3e--con-turno-sin-pedidos.png): Ana Torres, Pedidos 0 · Turnos 1 · Gastado $ 0, historial "Turno · Asesoramiento · Lun 5 oct 10:00".
- "Escribir por WhatsApp" abre `wa.me` sin texto.
- "Exportar": sin diseño (CSV).

## Datos
- Demo: `CUSTOMERS` (`lib/data/demo/customers.ts`, del array `CL`: name, email, phone, ordersCount, appointmentsCount, lastContact, spent, since), `customerByName()`, `ORDERS`, `APPOINTMENTS` para el historial.
- Real: `getAdminCustomers()` (`admin-queries.ts`) → `AdminCustomer { id, name, email, phone, hasAccount, ordersCount, appointmentsCount, quotesCount, totalSpent, lastContactAt, createdAt }` (ya ordenado por último contacto). Ficha: `getCustomerDetail(customerId)` (`lib/server/admin-crm.ts`) → `{ customer, hasAccount, orders: FullOrder[], appointments: AppointmentView[], quotes: FullQuote[], totalSpent }`. Estado de pedido → label: `STATUS_LABELS` (`order-queries.ts`) / mapeo `OrderPill` del bt README.
- WhatsApp: `customerWhatsApp(phone, text?)` (`lib/server/whatsapp-templates.ts`) devuelve el link wa.me.
- "Último contacto" relativo ("Hoy", "Ayer", "Hace 2 días", "Hace 1 semana"): formatear `lastContactAt`.

## Componentes bt faltantes
- Lista de historial (tipo coloreado 72px + texto), con estado vacío.
- `Kpi` tamaño 24px/1.1 (o permitir `size="xs"`), y KPI con padding 14 / label 11px.
- (Opcional) `Display` 40px/.95 @70 en panel de detalle (hoy `detail` = 36).

## Ambigüedades
- El README dice historial "pedido/turno/presupuesto"; el prototipo solo muestra Pedido y Turno. El core trae `quotes`: sugerido agregar "Presupuesto" (¿color? propuesta: text-2 o rojo para "Nuevo").
- Datos demo inconsistentes: Juan Pérez figura con 3 pedidos y 3 turnos, pero el historial muestra 1 pedido y 1 turno (el prototipo cruza por nombre con 7 pedidos de ejemplo). La app real no tiene este problema.
- "Sin movimientos esta semana." sugiere que el historial es solo de la semana; pero la ficha muestra todo el historial. Probable copy de vacío para "sin historial" → confirmar ("Sin movimientos todavía.").
- Columna "Pedidos" muestra solo pedidos; turnos/presupuestos solo en la ficha.
- `hasAccount` no tiene representación visual.
- "Exportar" no tiene endpoint de clientes (hay uno para consultas en `app/admin/(panel)/consultas/export`).
