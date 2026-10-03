# 5b · Admin Presupuestos (bandeja + cotización)

- PNG: [default: #P-0213 Nuevo](prototype/5b.png) · [cotizado #P-0211](prototype/5b--cotizado.png) · [aceptado #P-0210](prototype/5b--aceptado.png) · [pedido creado #P-0209](prototype/5b--pedido-creado.png) · [rechazado #P-0208](prototype/5b--rechazado.png)
- Ruta: `/admin/presupuestos` (no existe todavía; `?estado=<filtro>&sel=<numero>`)
- Agente dueño: **D Admin**
- Fuente: l.38–60; lógica `quoteVals()` → `Q`, `QST`, `QNEXT`, `qRows`, `qFilters`, `qd`.
- Sin versión mobile en el handoff.

## Estructura (desktop 1440)

Contenedor grid `240px | minmax(0,1fr)`, min-height 980.

1. **Sidebar** `active="presupuestos"` (count Presupuestos 2 = nuevos). Componente bt: `AdminShell` + `AdminSidebar`.
2. **Top bar**: flex center gap 14, padding 22×40, border-bottom line. H1 "Presupuestos" 900 44px/1 stretch 66% uppercase; buscador width 280 "Buscar cliente o producto" (bg surface, border `#3a362f`, radius 6, padding 11×16, 14px text-3). **Sin botón de acción.**
   Componente bt: `AdminTopBar { title, search:{ width:280, placeholder:"Buscar cliente o producto" } }`.
3. **Filtros** (flex gap 8, padding `18px 40px 0`): chips padding 7×14, radius 999, 700 13px. "Todos · 6" (activo bg paper, fg ink) · "Nuevos · 2" · "Cotizados · 1" · "Aceptados · 1" · "Cerrados · 2" (inactivos fg text-2 `#cfc8bb`, border `#3a362f`). Contadores en vivo (cambian al avanzar).
   Componente bt: `FilterChip { active, count, size:"md", href }`.
4. **Cuerpo**: grid `minmax(0,1fr) | 420px`, gap 24, padding `20px 40px 40px`, align start.
   - **Tabla** (border line, radius 10): columnas `110px | minmax(0,1fr) | 150px | 130px`, **gap 20**.
     - Header surface-2, padding 14×22, Mono 600 11px uppercase text-3: "Número" · "Qué pide / cliente" · "Tipo" · "Estado".
     - Fila padding 18×22, border-top line, 14px, cursor pointer; seleccionada bg `rgba(255,210,31,.06)` + inset 3px yellow (ojo: .06, no .08 como en 3a).
       - Número: Mono 600 12px + fecha 12px text-3 nowrap ("Hoy · 10:12").
       - Qué pide: título 700 ellipsis + cliente 12px text-3.
       - Tipo: text-2 ("Importado", "Repuesto", "Bicicleta").
       - Estado: `QuotePill` 800 11px.
     Componente bt: `Table { gap:20, selectedKey, rowHref }` + `CellStack`, `QuotePill`.
   - **Panel detalle** (bg surface, border line, radius 10, padding 24, gap 18):
     1. Meta: Mono 600 12px text-3 "#P-0213 · Hoy · 10:12" + `QuotePill`.
     2. Título 900 36px/.95 stretch 70% uppercase ("Rodillo smart para Zwift") + "Lucía Benítez · WhatsApp 223 555-0144" 14px text-2.
     3. "Lo que pide · Importado": eyebrow 700 12px uppercase ls .08em text-3; caja mensaje bg ink, border line, radius 8, padding 14, 14px/1.5 text-2; fila (gap 16, 13px text-3) "Para: Ruta · eje 12 mm" · "Presupuesto: Hasta $ 900.000".
        Componente bt: `Eyebrow` + `Panel surface="outline"`? (bg ink; **SIN componente bt** exacto para caja de mensaje: `MessageBox`).
     4. "Cotización" (eyebrow, padding-bottom 8). Líneas grid `minmax(0,1fr) | auto` gap 12, padding 10×0, border-top line, 14px; precio 800. Ej.: "Rodillo smart (importado)" $ 849.000 · "Adaptador eje pasante 12 mm" $ 38.000.
        "+ Agregar ítem": padding 10×0, border-top **1px dashed #3a362f**, Archivo 700 13px yellow.
        **SIN componente bt** (`QuoteLinesEditor`: líneas editables nombre + precio + agregar/quitar).
     5. Grid `1fr 1fr` gap 10, padding-top 4: label "Demora" / "Válido" (700 12px uppercase ls .08em text-3, gap 8) + input bg ink, border `#3a362f`, radius 6, padding 10×12, 14px paper. Valores "30 a 45 días" / "Hasta el 8 oct".
        Componente bt: `Field size="sm"` + `Input surface="page" size="sm"`.
     6. Total: flex space-between baseline, padding-top 16: "Total" 800 14px uppercase; monto 900 34px/1 stretch 72% yellow ("$ 887.000").
     7. Si estado abierto (Nuevo/Cotizado/Aceptado): primario full (padding 15×0, 800 14px uppercase ls .06em) con label del paso; debajo grid `1fr 1fr` gap 10 de secundarios (border 1.5px `#4a453e`, padding 12×0, 800 13px uppercase): "WhatsApp" · "Rechazar" (red-light `#ff6a5c`).
     8. Si cerrado (Pedido creado/Rechazado): nota 14px text-3, padding 12×14, border 1px line, radius 8 con el texto de cierre. **No** se muestran botones (ni WhatsApp).
     Componente bt: `Panel`, `Button` (primary/secondary/danger), `Price size="total"`.

## Estados e interacciones

Click en fila → `qSel`. Botón amarillo avanza; "Rechazar" pasa a Rechazado desde cualquier estado abierto.

| Estado | Pill (bg / fg / borde) | Botón amarillo | Pasa a | Botones extra |
|---|---|---|---|---|
| Nuevo | red `#d7261e` / `#fff` / red | "Enviar presupuesto por WhatsApp" | Cotizado | WhatsApp · Rechazar |
| Cotizado | `#3a362f` / paper / `#3a362f` | "Marcar como aceptado" | Aceptado | WhatsApp · Rechazar |
| Aceptado | yellow / ink / yellow | "Crear pedido" | Pedido creado | WhatsApp · Rechazar |
| Pedido creado | paper / ink / paper | — | — | nota "Ya se creó el pedido: seguilo desde Pedidos." |
| Rechazado | transparent / text-3 / `#5a554c` | — | — | nota "Presupuesto cerrado sin compra." |

Filtros: Todos · Nuevos (nuevo) · Cotizados (cotizado) · Aceptados (aceptado) · Cerrados (pedido_creado + rechazado). En el prototipo los chips **no filtran** (solo muestran conteos); "Todos" siempre activo.

Datos demo: #P-0213 Lucía Benítez Importado Nuevo "Rodillo smart para Zwift" · #P-0212 Martín Sosa Repuesto Nuevo "Cadena y cassette 11v" · #P-0211 Carla Méndez Bicicleta Cotizado "Urbana para ir al trabajo" · #P-0210 Diego Paz Importado Aceptado "Casco de ruta MIPS · L" · #P-0209 Sofía Luna Repuesto Pedido creado "Frenos hidráulicos" · #P-0208 Ramiro Gil Bicicleta Rechazado "Plegable eléctrica". "Válido" siempre "Hasta el 8 oct".

## Datos

- Demo: `lib/data/demo/quotes.ts` → `QUOTES`, `QUOTE_KIND_SHORT`, `QUOTE_STATUS_LABEL`, `QUOTE_STATUS_PILL`, `QUOTE_NEXT`, `QUOTE_CLOSED_NOTE`, `QUOTE_FILTERS`, `quoteTotal`.
- Máquina real: `lib/quote-flow.ts` → `nextQuoteTransition(status)`, `closedQuoteNote(status)`.
- Lectura (`lib/server/quotes.ts`): `listQuotes({ statuses? })` → `FullQuote[] { quote, lines, customer, total }`; `quoteCounts()` → `{ nuevo, cotizado, aceptado, pedido_creado, rechazado, total }` (chips y count del sidebar); `getQuote(id)` / `getQuoteByNumber(number)`.
- Acciones (`lib/server/actions/quotes.ts`): `adminAdvanceQuote(id, opts?)` → `AdvanceQuoteResult { ok, status, whatsappUrl?, orderNumber? }` (Nuevo→Cotizado devuelve `whatsappUrl` a abrir; Aceptado→Crear pedido crea el pedido con `createManualOrder` y devuelve `orderNumber`; exige ≥1 línea) · `adminRejectQuote(id)` · `adminSetQuoteLines(id, lines)` (Cotización / + Agregar ítem) · `adminPatchQuote(id, patch)` (Demora `eta`, Válido `validUntil`).
- WhatsApp secundario: `quoteWhatsAppUrl(full)` / `quoteWhatsAppText(full)` o `customerWhatsApp(phone)`.
- Pill: `QuotePill { status }` (mismas claves que `QuoteStatus`).
- "Crear pedido" → el pedido aparece en 3a (`opts.paymentMethod` default transferencia: el diseño no pregunta el medio de pago).

## Componentes bt faltantes

- `QuoteLinesEditor` (líneas cotización editables + "+ Agregar ítem" punteado).
- `MessageBox` (caja del pedido del cliente, bg ink).
- `ClosedNote` (nota de estado cerrado; podría ser `Panel outline` + texto).
- `KeyValueList`/totales con monto amarillo (compartido con 3a).

## Ambigüedades

- Chips de filtro sin comportamiento en el prototipo; se asume filtro por `?estado=`.
- Tipos: la tabla muestra "Importado/Repuesto/Bicicleta" (`QUOTE_KIND_SHORT`); `lib/types.ts` usa `QuoteKind = "bici"|"rep"|"imp"|"otro"` pero `lib/data/demo/types.ts` usa `"bici"|"repuesto"|"importado"|"otro"`: hay que mapear.
- "Válido: Hasta el 8 oct" fijo para todos; ¿lo carga el admin o se deriva (fecha + N días)?
- El medio de pago del pedido creado no se elige en la UI (core default transferencia).
- Selección de fila usa `rgba(255,210,31,.06)` (README) y 3a usa `.08`.
- "Enviar presupuesto por WhatsApp" pasa a Cotizado al instante aunque el mensaje se mande a mano por wa.me.
- Sidebar count "Presupuestos 2": se asume = nuevos.
- Monto en la columna/fila no aparece (solo en el panel).
