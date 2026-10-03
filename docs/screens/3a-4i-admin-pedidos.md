# 3a · 4i · Admin Pedidos (listado + detalle)

- PNG 3a: [default: #BT-10481 Transf. pendiente](prototype/3a.png) · [pagado](prototype/3a--pagado.png) · [armando](prototype/3a--armando.png) · [paga en local](prototype/3a--paga-en-local.png) · [listo para retirar](prototype/3a--listo-para-retirar.png) · [retirado](prototype/3a--retirado.png)
- PNG 4i: [default: Transf. pendiente](prototype/4i.png) · [pagado](prototype/4i--pagado.png) · [listo para retirar](prototype/4i--listo-para-retirar.png) · [retirado](prototype/4i--retirado.png)
- Rutas: `/admin/pedidos` (listado + panel de detalle del seleccionado, `?sel=<numero>`) y `/admin/pedidos/[numero]` (detalle; en mobile es la vista 4i). Ya existen `app/admin/(panel)/pedidos/page.tsx`, `orders-list.tsx`, `order-ui.ts`, `[numero]/page.tsx`, `[numero]/order-actions.tsx`.
- Agente dueño: **D Admin**
- Fuente: l.210–229 (3a), l.190–203 (4i); lógica `adminVals()` → `ORD`, `STC`, `NEXT`, `DONE`, `ordRows`, `od`.

## Estructura 3a (desktop 1440)

Contenedor: grid `240px | minmax(0,1fr)`, min-height 980.

1. **Sidebar** `active="pedidos"` (count Pedidos 7). Componente bt: `AdminShell` + `AdminSidebar`.
2. **Top bar**: flex center, **gap 14**, padding 22×40, border-bottom line.
   - H1 "Pedidos" Archivo 900 44px/1 stretch 66% uppercase.
   - Buscador width **280px**, bg surface, border `#3a362f`, radius 6, padding 11×16, 14px text-3, "Buscar pedido, cliente o DNI".
   - Botón secundario "Exportar": border 1.5px `#4a453e`, padding 11×18, radius 6, Archivo 800 14px uppercase ls .06em, nowrap.
   Componente bt: `AdminTopBar { title:"Pedidos", search:{width:280,…}, actions:<Button variant="secondary" size="header">Exportar</Button> }`.
3. **Filtros**: flex center gap 8, padding `18px 40px 0`.
   - Chips (padding 7×14, radius 999, Archivo 700 13px; activo bg paper fg ink; inactivo border 1px `#3a362f`): "Todos · 7" (activo) · "Transf. pendiente · 1" · "Para armar · 2" · "Listos · 2" · "Retirados · 1".
   - spacer; a la derecha select "Últimos 7 días ▾": bg ink, border 1px `#3a362f`, radius 6, padding 12×14, Archivo 600 14px paper.
   Componente bt: `FilterChip { active, count, size:"md" }` + `Select { surface:"page", size:"sm" }`.
4. **Cuerpo**: grid `minmax(0,1fr) | 380px`, gap 24, padding `18px 40px 40px`, align start.
   - **Tabla** (border 1px line, radius 10): columnas `96px | minmax(0,1fr) | 168px | 104px`, gap 24.
     - Header surface-2 `#1a1816`, padding 14×22, Mono 600 11px uppercase text-3: "Pedido" · "Cliente y productos" · "Estado" · "Total".
     - Fila: padding 18×22, border-top line, Archivo 14px, cursor pointer. Seleccionada: bg `rgba(255,210,31,.08)` + `box-shadow: inset 3px 0 0 #ffd21f`. Nº Mono 600 13px; cliente 700 + items (nombres unidos con " · ") 13px text-3 ellipsis; pill 800 11px; total 800 15px right.
     Componente bt: `Table { gap:24, selectedKey, rowHref:(o)=>"?sel="+o.number }` + `CellMono`, `CellStack`, `OrderPill`.
   - **Panel de detalle**: bg surface `#1f1d1a`, border 1px line, radius 10, padding 24, flex column **gap 20**.
     1. Fila meta: Mono 600 13px text-3 "#BT-10481 · 1 oct · 12:05" + `OrderPill` (11px).
     2. Cliente: nombre Archivo 900 36px/.95 stretch 70% uppercase; "WhatsApp 223 555-0144" 14px text-2 `#cfc8bb`; a la derecha (align flex-end) link "Escribir →" Archivo 800 13px uppercase ls .06em yellow.
     3. Items: padding-top 16, border-top line, gap 12. Ítem grid `64px | 1fr | auto` gap 12: foto 64×48 radius 6 cover; nombre 700 14px/1.2 + variante 12px text-3; precio 800 15px.
     4. Totales: padding-top 16, border-top **1px dashed #3a362f**, gap 8, 14px: "Pago" (text-3) / valor 700 (ej. "Transferencia · 10% off"); "Entrega" / "Retiro en el local"; "Total" 800 14px uppercase ls .06em / monto Archivo 900 34px/1 stretch 72% yellow.
     5. **Solo si Transf. pendiente**: caja comprobante border **1.5px dashed #d7261e**, radius 8, padding 14: "Comprobante adjunto" 800 14px + "comprobante_10481.pdf" Mono 12px text-3; link "Ver" 800 13px uppercase yellow.
     6. Timeline 5 pasos (grid `28px | 1fr`, gap 10, padding 7×0): marca 20×20 redonda border 2px, ✓ ink 900 11px; label 700 14px. Pasos: "Pedido recibido" · "Pago confirmado" · "Armado y ajuste" · "Listo para retirar" · "Retirado".
        Componente bt: `Timeline { done }`.
     7. Botón amarillo (si hay próximo paso): bg yellow, ink, padding 16×0, radius 6, Archivo 800 15px uppercase ls .06em, centrado, label según estado (tabla abajo).
        Componente bt: `Button { variant:"primary", size:"full" }`.
     8. Fila de 2 botones (flex gap 10, flex:1 c/u; border 1.5px `#4a453e`, padding 12×0, radius 6, 800 13px uppercase): "Avisar por WhatsApp" · "Cancelar pedido" (texto red-light `#ff6a5c`).
        Componente bt: `Button variant="secondary"` + `Button variant="danger"` (size `sm`/`full`).
   - Panel: componente bt `Panel { surface:"surface", padding:"lg", radius:10 }`. **SIN componente bt** para el bloque "ítems del pedido" (`OrderItemRow`: thumb 64×48 + nombre/variante + precio) ni para "Comprobante adjunto" (`ReceiptBox`).

## 4i (mobile 390): detalle de pedido

1. `AdminMobileHeader` (ver 2i-4h).
2. Contenido padding `18px 16px 28px`, gap 16.
   - "← Pedidos": Archivo 600 14px text-3, padding 4×0 (link a 3a). (`AdminTopBar.back` no aplica en mobile: **SIN componente bt**, usar `TextLink tone="muted"`).
   - Meta: Mono 600 12px text-3 "#BT-10481 · 1 oct · 12:05" + pill **10px**, padding 5×9.
   - Nombre 900 **40px**/.95 stretch 70% uppercase; "WhatsApp 223 555-0144" 14px text-2. Sin "Escribir →".
   - Ítems: padding-top 12, border-top line, gap 10; grid `60px | 1fr | auto` gap 10; foto **60×46** radius 6; nombre 700 14px/1.2, variante 12px text-3, precio 800 14px.
   - Totales: border-top 1px dashed `#3a362f`, padding-top 12, gap 6: "Pago" + valor 700; "Total" 800 14px uppercase + monto 900 **32px** stretch 72% yellow. **Sin "Entrega"** y **sin caja de comprobante**.
   - Timeline (padding 6×0).
   - Botón amarillo: min-height 52, radius 6, 800 15px uppercase.
   - "Avisar por WhatsApp": secundario full, min-height 50, border 1.5px `#4a453e`, 800 15px. **Sin "Cancelar pedido"**.

## Estados e interacciones

Click en fila → selecciona y llena el panel. Botón amarillo → avanza el estado (prototipo: override local `ov[id]`).

| Pill (UI) | `OrderStatus` + medio | Pill colores (bg / fg / borde) | Botón amarillo | Pasa a | Timeline `done` |
|---|---|---|---|---|---|
| Transf. pendiente | PENDIENTE_PAGO + transferencia | red `#d7261e` / `#fff` / red | "Validar transferencia" | Pagado | 1 |
| Paga en local | PENDIENTE_PAGO + efectivo | transparent / yellow / yellow | "Registrar pago y retiro" | Retirado | 1 |
| Pagado | PAGADO | yellow / ink / yellow | "Pasar a armado" | Armando | 2 |
| Armando | EN_PREPARACION | `#3a362f` / paper / `#3a362f` | "Marcar lista para retirar" | Listo para retirar | 2 |
| Listo para retirar | LISTO_RETIRO | paper / ink / paper | "Marcar como retirada" | Retirado | 4 |
| Retirado | RETIRADO | transparent / text-3 / `#3a362f` | (sin botón) | — | 5 |

Timeline: paso `i < done` → bg yellow, borde yellow, ✓, label paper; `i === done` (actual) → borde yellow, label yellow, sin marca; resto → borde `#3a362f`, label text-3. Ojo: "Armando" tiene done 2, o sea "Armado y ajuste" se ve como paso actual.

Variantes capturadas: 3a una por estado (selección de fila); 4i avanzando con el botón desde Transf. pendiente (pagado, listo, retirado).

"Listo para retirar" debe disparar la plantilla de WhatsApp "Pedido listo" (README). "Avisar por WhatsApp" abre wa.me con texto prellenado.

## Datos

- Demo: `lib/data/demo/orders.ts` → `ORDERS`, `ORDER_STATUS_LABEL`, `ORDER_STATUS_PILL`, `ORDER_NEXT`, `ORDER_TIMELINE`, `ORDER_TIMELINE_DONE`, `paymentLabel(payment, installments)` ("Mercado Pago · 6 cuotas", "Transferencia · 10% off", "Efectivo en el local"), `orderSubtotal`, `orderTotal`.
- Listado: `getAdminOrders()` (`lib/server/admin-queries.ts`) → `AdminOrderSummary { id, number, status, customerName, itemsLabel, total, createdAt, paymentMethod, installments, … }`.
- Detalle: `getAdminOrder(number)` → `FullOrder` (`order-queries.ts`: order, items, customer; `order.transferReceiptUrl` para "Comprobante adjunto").
- Máquina de estados real: `lib/order-flow.ts` → `orderStage()` (pill), `STAGE_LABELS`, `nextTransition()` (labels idénticos al prototipo), `progressDone()` (= DONE), `canCancel()`, `PROGRESS_STEPS`.
- Acciones (`lib/server/actions/orders.ts`): `advanceOrder(orderId, expectedFrom?)` (botón amarillo) · `confirmManualPayment(orderId)` · `setOrderStatus(orderId, status)` · `cancelOrder(orderId)` ("Cancelar pedido") · `registerBalancePayment` (señas, fuera del diseño).
- WhatsApp: `adminOrderReadyWhatsApp(orderId)` (`actions/whatsapp.ts`) → `orderReadyWhatsApp()` (`whatsapp-templates.ts`) → `{ text, url }`; "Escribir →" → `customerWhatsApp(phone)`.
- Pill: `OrderPill` con el mapeo del README de bt (`paga_en_local` del core ↔ `paga_local` de bt; `listo` igual).
- Filtros con contadores: no hay query de conteo por etapa; derivar del array de `getAdminOrders()`. "Últimos 7 días" filtra por `createdAt`.
- "Exportar": no hay acción de export de pedidos (existe `/admin/consultas/export` para leads como referencia).

## Componentes bt faltantes

- `OrderItemRow` (thumb + nombre/variante + precio; tamaños 64×48 desktop / 60×46 mobile).
- `ReceiptBox` ("Comprobante adjunto", borde rojo punteado + "Ver").
- `KeyValueRow`/`SummaryRows` (filas "Pago / Entrega / Total" con total grande amarillo). `PriceBox` es de producto y no sirve.
- `OrderDetailPanel` (composición del panel; compartida entre 3a y 4i).

## Ambigüedades

- README dice "→(Marcar retirado)"; prototipo y `order-flow.ts` usan **"Marcar como retirada"** (se usa la del prototipo).
- "Paga en local" no está en el flujo del README; el prototipo y el core usan "Registrar pago y retiro" directo a Retirado (saltea armado y listo).
- Contadores de chips en 3a ("Para armar · 2" = Pagado+Armando; "Listos · 2"; "Retirados · 1") no suman 7 sin "Paga en local" (1): falta un chip para "Paga en local" o va dentro de otro.
- 2i usa chips "Todos · Para armar · Listos · Transf. pendiente" sin contadores y en otro orden.
- El comprobante solo se ve en Transf. pendiente; ¿qué pasa después de validarla? (desaparece en el prototipo).
- "Cancelar pedido" no tiene estado/pill en el prototipo; bt agrega `cancelado` (muted-strong) y el timeline con paso "Cancelado".
- En 4i no hay "Cancelar pedido" ni "Entrega".
- Fecha del pedido en mono: "1 oct · 12:05" (sin año).
- El botón "Exportar" y el select "Últimos 7 días ▾" no tienen comportamiento definido.
