# 2e · Confirmación de compra

- PNG: [2e](prototype/2e.png) (solo desktop; **no hay versión mobile** en el handoff).
- Ruta: **`/checkout/confirmacion/[numero]`** (`?e=<email|whatsapp>` lo agrega `createOrder`; ver Datos).
- Agente dueño: **B Compra**.
- Fuente: `BiciTienda MDQ.dc.html` l.496–518; `steps` y `cart` en `renderVals()`.

## Estructura (1440, gutter 56)

1. **Header** `<Header cart={0} />` (`active=""`, `cart="0"`: el carrito queda vacío tras comprar). Ver `shell.md`.
2. **Cuerpo** — grid `minmax(0,1.2fr) minmax(0,1fr)`, gap 48, padding `64px 56px 80px`, `align-items:start`.

### Columna izquierda (flex-col, gap 28)

3. **Marca ✓** — círculo 88×88, `#ffd21f` bg, `#121110` texto, Archivo 900 44px "✓". **SIN componente bt** (ícono de éxito; trivial, `SuccessMark`).
4. **Encabezado** (flex-col gap 14):
   - Eyebrow "PEDIDO #BT-10482 · 1 DE OCTUBRE 2026": JetBrains Mono 600 14px, `#8d867a` text-3 (mayúsculas escritas en el texto). → bt `Mono size={14} tone="muted" uppercase`.
   - H1 "¡Listo, Juan!" + `<br>` + "Tu bici ya es tuya." (segunda línea `#ffd21f`): Archivo 900 112px/.85, stretch 66%, uppercase. → bt `Display size="confirm"` + `Highlight`.
   - Párrafo: Archivo 19px/1.5, `#cfc8bb` text-2, max-width 560: "Recibimos tu pago. Ahora la armamos y la ajustamos, y te escribimos por WhatsApp cuando esté lista para retirar."
5. **Pasos** — `border-top:1px solid #2b2824`; filas grid `56px 1fr`, gap 16, padding `18px 0`, border-bottom line. Círculo 40×40, borde 1.5px, Archivo 900 16px. Título 800 18px, bajada 14px `#8d867a`. → bt `StepList { steps, done }` (implementa exactamente esto).
   - Pasos (copy exacto) y estado del prototipo (`done=1`):
     1. "Pago aprobado" / "Mercado Pago · hoy 14:32" — hecho: bg `#ffd21f`, "✓", título `#f4efe4`.
     2. "Armado y ajuste" / "Lo hacemos en el taller del local" — actual: borde `#ffd21f`, número "2" `#ffd21f`, título paper.
     3. "Lista para retirar" / "Te avisamos por WhatsApp" — pendiente: borde `#3a362f`, número `#8d867a`, título `#8d867a`.
     4. "Retirás en el local" / "Con DNI y número de pedido" — pendiente.
6. **Botones** (flex gap 12):
   - "Ver mi pedido" (→ 2g `/cuenta`): primario, padding `17px 28px`, radius 6, Archivo 800 15px uppercase .06em. → bt `Button variant="primary" size="lg"`.
   - "Seguir comprando" (→ `/`): `border:1.5px solid #4a453e`, padding `16px 28px`, 800 15px uppercase .06em. → bt `Button variant="secondary" size="lg"`.

### Columna derecha (flex-col, gap 16)

7. **Resumen (card paper)** — bg `#f4efe4`, texto `#121110`, radius 10, padding 28, gap 18. → bt `Panel surface="paper" padding="lg" gap="lg" radius={10}`.
   - "Resumen": Archivo 700 13px uppercase .08em, `#6f675a` text-4. → `Eyebrow size="md"` (tono text-4: verificar; `tone="muted"` es #8d867a → **ajuste de color**).
   - Ítems: grid `72px 1fr auto`, gap 14. Foto 72×56 radius 6. Nombre 700 15px/1.2; "{variante} · x1" 13px `#4c463d` (card-cuotas); precio 800 17px.
   - Pie: `border-top:1px dashed #c9c0ae` (card-dash), padding-top 14, gap 8, 15px:
     - "Pago" (`#4c463d`) … "Mercado Pago · 6 cuotas" (700).
     - "Total" (800 15px uppercase .06em) … "$ 544.800" (Archivo 900 40px/1 stretch 72%) → `Price size="total"` (44 en desktop; el inline es 40 → usar `text-[40px]`). → bt `Divider variant="dashed-paper"`.
8. **Dónde retirás** — bg `#1f1d1a`, `border:1px solid #2b2824`, radius 10, padding 24, gap 10. → bt `Panel surface="surface" padding="md" gap="sm"`.
   - "Dónde retirás": 700 13px uppercase .08em `#ffd21f` → `Eyebrow tone="yellow" size="md"`.
   - "BiciTiendaMDQ · Local": 800 20px.
   - "[Dirección a confirmar]" `<br>` "[Horarios a confirmar]": 15px/1.5 `#cfc8bb`.
   - "Traé tu DNI y el número de pedido.": 15px/1.5 `#cfc8bb`.
9. **Footer** → `shell.md`.

## Mobile

No existe en el handoff. Aplicar la regla general del README ("same content stacked to 1 column"): columna izquierda arriba, luego Resumen y Dónde retirás; `Display size="confirm"` ya baja a 64px; `StepList` ya es responsive; botones `size="full-lg"` apilados.

## Estados e interacciones

El prototipo solo muestra el caso **Mercado Pago aprobado**. Variantes que la app necesita (no diseñadas, derivar del mismo layout):

| Caso | Título / párrafo | Pasos | Bloque extra |
|---|---|---|---|
| MP aprobado (diseñado) | "¡Listo, {nombre}!" / "Tu bici ya es tuya." | done=1 | — |
| Transferencia (`PENDIENTE_PAGO` + transferencia) | no diseñado | paso 1 "Esperando el pago" actual | Datos bancarios (alias/CBU, total con 10% off, "Reservamos el stock 24 hs") + subir comprobante |
| Efectivo (`PENDIENTE_PAGO` + efectivo) | no diseñado | paso 1 pendiente "Pagás al retirar" | — |
| MP pendiente/rechazado | no diseñado | — | reintentar pago |

- `StepList.done` sale del estado del pedido: usar `publicTimeline(order)` (estado `done/current/pending`) o `ORDER_STEPS_DONE` de bt.

## Datos

- Demo: `COPY.confirmation.*` (`eyebrow` "Pedido #{número} · {fecha}", `title` "¡Listo, {nombre}!", `subtitle`, `text`, `steps[]` con "Mercado Pago · {fecha}", `viewOrder`, `continueShopping`, `summaryTitle`, `payment`, `total`, `pickupTitle`, `pickupPlace`, `pickupNote`); `ORDERS[0]` (#BT-10482, Juan Pérez, MP 6 cuotas, `pagado`); `paymentLabel(payment, installments)` → "Mercado Pago · 6 cuotas"; `orderTotal`; `STORE_INFO.address/hours`.
- Server:
  - `getOrderForCustomer(number, contact): Promise<FullOrder | null>` (`lib/server/order-queries.ts`): exige número + contacto (el `?e=` que arma `createOrder`: `/checkout/confirmacion/{number}?e=...`). `FullOrder = { order, items, customer, payments }`. Nombre: `customer.name` (primer nombre para el H1).
  - `publicTimeline(order): TimelineStep[]` (4 hitos: Pedido confirmado / Pago / Listo para retirar / Retirado, con `state`). **Ojo**: sus labels no son los del diseño ("Pago aprobado · Armado y ajuste · Lista para retirar · Retirás en el local"); usar `state` para calcular `done` y los textos de `COPY.confirmation.steps`.
  - `STATUS_LABELS` para estados.
  - `getStore()`: `address`, `hours`, `transferAlias`, `transferDiscount`, `reservationHours`.
  - Transferencia: `uploadTransferReceipt(formData{number, contact, file})` (`lib/server/actions/transfer-receipt.ts`).
  - Tras éxito: `useCart().clear()` (`lib/cart-store.tsx`) — el header muestra "Carrito · 0".

## Componentes bt faltantes

- **SuccessMark** (círculo 88 amarillo con ✓) — trivial.
- **SummaryRow / TotalsList** (Pago / Total en card paper), compartido con 2d.
- **OrderSummaryItem** (fila 72|1fr|auto con foto, nombre, "variante · xN", precio sobre paper).
- **BankTransferDetails** (datos bancarios + subir comprobante) — no diseñado.
- `Eyebrow` sin tono text-4 (`#6f675a`) para el "Resumen" sobre paper.

## Ambigüedades

- Solo existe el caso MP pagado; transferencia/efectivo/pago pendiente no están diseñados (y el handoff dice "Transfer: show discount line, reserve stock 24 h").
- No hay versión mobile.
- Los 4 pasos del diseño no coinciden con los hitos de `publicTimeline` (que arranca en "Pedido confirmado") ni con los 5 del timeline admin (`ORDER_STEPS`).
- "Tu bici ya es tuya." asume una bici; si el pedido es solo accesorios, el copy no aplica (definir alternativo).
- "Ver mi pedido" va a 2g (Mi cuenta); un invitado sin cuenta no tiene a dónde ir (no hay ruta de seguimiento en la lista de rutas); definir destino (¿la misma confirmación con `?e=`?).
- Total 40px en el inline vs `Price size="total"` 44px desktop.
