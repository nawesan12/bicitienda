# 2d / 4d · Carrito (pago + retiro)

- PNG desktop: [2d (Mercado Pago)](prototype/2d.png) · [2d--transferencia](prototype/2d--transferencia.png) · [2d--efectivo](prototype/2d--efectivo.png)
- PNG mobile: [4d (Mercado Pago)](prototype/4d.png) · [4d--transferencia](prototype/4d--transferencia.png) · [4d--efectivo](prototype/4d--efectivo.png)
- Ruta: **`/checkout`**. El handoff NO tiene checkout separado: el carrito ES el checkout (pago + retiro + total + CTA en la misma pantalla). El CTA lleva a 2e (`/checkout/confirmacion/[numero]`) o a la pasarela.
- Agente dueño: **B Compra**.
- Fuente: `BiciTienda MDQ.dc.html` l.460–494 (2d), l.130–141 (4d); estado `pay` en `renderVals()` (`cart`, `pays`, `payNote`, `payCta`, `isTransf`, `subtotalF`, `discountF`, `totalF`).

## Estructura desktop (1440, gutter 56)

1. **Header** `<Header active={undefined} cart={2} />` (`active=""` en el prototipo: ningún ítem del nav activo). Detalle en `shell.md`.
2. **Título + volver** — flex `align-items:flex-end; justify-content:space-between`, padding `40px 56px 0`.
   - H1 "Tu carrito": Archivo 900 96px/.86, stretch 66%, uppercase, `#f4efe4` paper. → bt `Display size="page"`.
   - Link "← Seguir comprando": Archivo 700 14px, uppercase, letter-spacing .08em, `#ffd21f` yellow, href catálogo (2b). → bt `TextLink tone="yellow"` (verificar que TextLink acepte uppercase/tracking .08em; si no, `Eyebrow tone="yellow" size="lg"` envuelto en Link).
3. **Cuerpo** — grid `minmax(0,1fr) 480px`, gap 40, padding `32px 56px 80px`, `align-items:start`.

### Columna izquierda (flex-col, gap 24)

4. **Lista de ítems** — contenedor `border-top:1px solid #2b2824` (line). Cada fila: grid `160px minmax(0,1fr) 150px 150px`, gap 24, `align-items:center`, padding `24px 0`, `border-bottom:1px solid #2b2824`.
   - Foto 160×120, `object-fit:cover`, radius 8.
   - Texto (flex-col gap 6):
     - "{CATEGORÍA} / MARCA": JetBrains Mono 600 12px, `#8d867a` text-3 (sin uppercase forzado: "Cascos / MARCA" sale en minúscula). → bt `Mono size={12} tone="muted"`.
     - Nombre: Archivo 800 20px/1.2 (ej. "MTB rodado 29 · 21 vel. · aluminio").
     - Variante: Archivo 400 14px, `#cfc8bb` text-2 (ej. "Talle M · Negro / amarillo", "Talle M/L · Negro").
     - "Quitar": Archivo 600 13px, `#8d867a`, subrayado, margin-top 4. → bt `TextLink tone="muted" underline` (como `<button>`).
   - Stepper: borde `1px #3a362f` (line-strong), radius 6, padding `12px 16px`, Archivo 800 17px, `space-between`; "−" en `#8d867a` (en mínimo), número, "+". → bt `QtyStepper size="lg"` (cliente; `onChange` → `useCart().setQty`).
   - Precio: Archivo 900 30px/1, stretch 75%, alineado a la derecha (ej. "$ 489.900"). → bt `Price size="card"` (30 @75) con `text-right`.
5. **Banner prueba** (link a 2f / `/turnos`) — bg `#1f1d1a` surface, `border:1px solid #2b2824`, radius 10, padding `22px 24px`, flex `space-between`.
   - "¿Querés probar la MTB antes de pagar?": Archivo 800 18px.
   - "Reservá una prueba de 30 minutos en el local. Tu carrito queda guardado.": 15px `#cfc8bb`.
   - "Reservar prueba →": Archivo 800 14px uppercase, .06em, `#ffd21f`.
   - **SIN componente bt** (banner-link horizontal). Se arma con `Panel surface="surface" radius={10}` + Link, o nuevo `PromoBanner`/`CalloutLink`. Solo tiene sentido si el carrito tiene una bici con `testRide`; "la MTB" sale de la categoría del ítem.

### Panel derecho (480px)

6. **Panel** — bg `#1f1d1a`, `border:1px solid #2b2824`, radius 10, padding 28, flex-col gap 22. → bt `Panel surface="surface" padding="lg" gap="xl" radius={10}` (lg = p-7 = 28 en desktop).
7. **"1 · Cómo pagás"** (flex-col gap 12): rótulo Archivo 700 13px uppercase .08em `#8d867a` → bt `Eyebrow tone="muted" size="md"`.
   - 3 radio cards: grid `22px 1fr`, gap 14, padding 16, radius 8, `border:1.5px solid` (`#ffd21f` si seleccionada, `#3a362f` si no), bg `rgba(255,210,31,.08)` si seleccionada. Círculo 22×22 borde 2px (mismo color), punto 10×10 `#ffd21f`. Título Archivo 800 16px, descripción 14px `#cfc8bb`, gap 3.
   - Copy exacto:
     - "Mercado Pago" / "Tarjeta de crédito, débito o dinero en cuenta. Hasta 6 cuotas sin interés."
     - "Transferencia · 10% off" / "Te pasamos el CBU al confirmar. Reservamos el stock 24 hs."
     - "Efectivo en el local" / "Reservás online y pagás cuando la retirás."
   - → bt `RadioCard { title, description, name="paymentMethod", value, checked, onChange }`.
8. **"2 · Dónde la retirás"** (gap 12): mismo rótulo. Caja padding 16, radius 8, `border:1px solid #3a362f`, flex-col gap 4:
   - "Retiro en el local · sin cargo" (800 16px)
   - "[Dirección a confirmar] · [Horarios a confirmar]" (14px `#cfc8bb`)
   - "Te avisamos por WhatsApp cuando esté armada." (14px `#cfc8bb`)
   - Es informativo (una sola opción, sin radio). → **SIN componente bt específico**: `Panel surface="outline" radius={8}` con borde line-strong (Panel outline usa `border-line` #2b2824, no #3a362f → ajustar con className) o `RadioCard` deshabilitado/checked si se prefiere input.
9. **Totales** — `padding-top:18px; border-top:1px dashed #3a362f`, flex-col gap 10, Archivo 16px. → bt `Divider variant="dashed"` + filas.
   - "Subtotal" (`#cfc8bb`) … "$ 544.800".
   - Solo transferencia: "10% off transferencia" … "− $ 54.480" — color `#ff6a5c` red-light, weight 700.
   - "Retiro en el local" (`#cfc8bb`) … "Gratis".
   - "Total": Archivo 800 16px uppercase .06em, margin-top 6 … importe Archivo 900 44px/1 stretch 72% `#ffd21f` → bt `Price size="total" tone="yellow"`.
   - Nota bajo total (`payNote`), 14px `#cfc8bb`, alineada a la derecha.
   - **SIN componente bt** para la fila label/valor de totales (`SummaryRow`/`TotalsList`); se repite en 2e, 4d, 5b, 4i.
10. **CTA** — bg `#ffd21f`, texto `#121110`, padding `19px 0`, radius 6, Archivo 800 16px uppercase .06em, centrado, ancho completo. Texto = `payCta`. → bt `Button variant="primary" size="full-lg" type="submit"`.
11. **Footer** → `shell.md`.

## Mobile (4d, 390, gutter 16)

- `MobileHeader` con `search={false}` → bt `MobileHeader showSearch={false} cart={2}`.
- Contenedor padding `20px 16px 28px`, flex-col gap 18.
- H1 "Tu carrito": Archivo 900 **64px**/.88 stretch 66% uppercase (el inline declara 56px y lo pisa `font-size:64px`). bt `Display size="page"` da 56 en mobile → **diferencia**: usar className `text-[64px]` o aceptar 56 (ver Ambigüedades).
- No hay link "← Seguir comprando" ni banner de prueba en mobile.
- Ítems: grid `88px 1fr`, gap 12, padding `14px 0`, border-bottom line. Foto 88×88 radius 6. Nombre 800 15px/1.2; variante 13px `#cfc8bb`; fila inferior `space-between` margin-top 4: stepper (borde `#3a362f`, radius 6, min-height 40, padding `0 12px`, gap 14, 800 15px) + precio Archivo 900 22px/1 stretch 75% (→ `Price size="card-sm"`). Sin mono de categoría ni "Quitar" (quitar = bajar a 0 / a definir). bt `QtyStepper size="sm"` (44px por la decisión de mínimo táctil del README bt).
- "Cómo pagás" (sin "1 ·"): 700 12px uppercase .08em `#8d867a`, gap 10. Radio cards: gap 12, padding 14, título 800 15px, desc 13px/1.4.
- Retiro: padding 14, radius 8, borde `#3a362f`, gap 2: "Retiro en el local · sin cargo" (800 15px) + "[Dirección y horarios a confirmar]" (13px `#cfc8bb`). Sin "2 · Dónde la retirás" ni la línea de WhatsApp.
- Totales: padding-top 14, borde dashed `#3a362f`, gap 8, 15px. Sin fila "Retiro en el local · Gratis". Total 800 15px / importe 900 40px/1 stretch 72% amarillo. Nota 13px.
- CTA: min-height 52, 800 15px uppercase .06em, amarillo. (bt `Button size="full-lg"` ya da min-h 52 / letra 15 en mobile).
- Sin Footer en el artboard 4d (el Footer mobile del shell igual aplica en la app).

## Estados e interacciones

Estado `pay: 'mp' | 'transf' | 'cash'` (default `mp`). Datos del prototipo: subtotal = 489.900 + 54.900 = 544.800.

| pay | Card seleccionada | Línea descuento | Total | `payNote` | CTA (`payCta`) | PNG |
|---|---|---|---|---|---|---|
| mp | Mercado Pago | — | $ 544.800 | "6 cuotas sin interés de $ 90.800" (`subtotal/6`) | "Pagar con Mercado Pago" | 2d / 4d |
| transf | Transferencia · 10% off | "10% off transferencia … − $ 54.480" | $ 490.320 | "Ahorrás $ 54.480" | "Confirmar y ver datos bancarios" | --transferencia |
| cash | Efectivo en el local | — | $ 544.800 | "Pagás al retirar" | "Reservar y pagar en el local" | --efectivo |

- El stepper y "Quitar" no son interactivos en el prototipo (cantidad fija 1).
- Carrito vacío: no diseñado → usar bt `EmptyState` (ver Ambigüedades).
- Seleccionada: patrón del README (bg `rgba(255,210,31,.08)` + borde `#ffd21f`), lo resuelve `RadioCard` con `:has(:checked)`.

## Datos

- Ítems: `lib/cart-store.tsx` (`useCart`: `items`, `setQty`, `remove`; `cartLineKey`). Precios/stock se revalidan server-side en `placeOrder`.
- Demo: `COPY.cart.*` (`title`, `continueShopping`, `remove`, `testRideBanner`, `payTitle`, `pickupTitle`, `payments.{mp,transfer,cash}.{name,desc,note,cta}`, `pickup`, `totals`) con `fillTemplate` (`{cuotas}`, `{off}`, `{horas}`, `{monto}`, `{min}`, `{direccion}`, `{horarios}`); `PAYMENT_SETTINGS` (`transferDiscountPct` 10, `maxInstallments` 6, `transferReservationHours` 24, `cashEnabled`); `STORE_INFO.address/hours`; `ars`, `transferPrice`, `installmentValue` (`lib/data/demo/format.ts`).
- Server:
  - `getStore(): Promise<RuntimeStore>` (`lib/server/queries.ts`): `transferDiscount`, `maxInstallments`, `reservationHours`, `cashEnabled`, `cashReservationHours`, `address`, `hours`, `locations[0]`.
  - `paymentOptions(runtime): CheckoutOption[]` (`lib/server/checkout-options.ts`): ids `mercadopago | transferencia | efectivo` (+ `payway` si el flag está), con `name`, `detail`, `note`; filtra efectivo apagado y pasarelas sin credenciales. Ojo: su `detail` de transferencia dice "Te pasamos el **alias** al confirmar…" (el prototipo dice "CBU") y su `note` de MP dice "Hasta N cuotas sin interés" (el prototipo muestra el valor de la cuota). El CTA por medio NO viene de acá: tomarlo de `COPY.cart.payments.*.cta`.
  - `deliveryOptions(runtime): DeliveryMethod[]`: con `pickupOnly` queda solo `retiro`, `detail` = "`{address}` · sin cargo".
  - `placeOrder(input): Promise<CheckoutResult>` (`lib/server/actions/checkout.ts`): `{ items:[{productSlug, variantId?, quantity}], name, email?, phone, deliveryMethod:"retiro", paymentMethod, pickupLocationId?, installments?: 1|3|6 }` → `{ ok:true, number, redirect }` (redirect = `/checkout/confirmacion/{number}?e=...` para transferencia/efectivo, o URL de la pasarela vía `lib/server/online-payment.ts` para MP/Payway) | `{ ok:false, error }`.
  - Transferencia: datos bancarios (`runtime.transferAlias`) se muestran en 2e; comprobante con `uploadTransferReceipt(formData{number, contact, file})` (`lib/server/actions/transfer-receipt.ts`).

## Componentes bt faltantes

- **CalloutLink / PromoBanner** (banner "¿Querés probar la MTB…" → Reservar prueba).
- **SummaryRow / TotalsList** (filas label/valor de subtotal/descuento/retiro/total + nota), compartido con 2e, 4i, 5b.
- **CartLine** (fila de ítem del carrito desktop 160|1fr|150|150 y mobile 88|1fr). No hay `CellThumb` equivalente fuera de tablas.
- (Menor) caja informativa de retiro: Panel con borde `#3a362f` (Panel `outline` usa `#2b2824`).

## Ambigüedades

- **Faltan datos de contacto**: `placeOrder` exige `name` + `phone` (WhatsApp) y acepta `email`, pero 2d/4d no tienen campos. El handoff (2f) dice "Requires name + WhatsApp (or logged-in account)" y `copy.ts` dice "Sin cuenta se pide nombre + WhatsApp + email opcional". Propuesta: bloque "3 · Tus datos" (Nombre y apellido / WhatsApp / Email (opcional)) en el panel antes de totales, copiando los inputs de 2f (bg `#1f1d1a`→ en panel usar `Input surface="page"`), prellenado si hay cuenta. Confirmar con el usuario.
- **Cuotas de MP**: el schema acepta `installments: 1|3|6`; el diseño no tiene selector de cuotas (solo la nota "6 cuotas sin interés de …"). Se elige en Mercado Pago.
- "CBU" (prototipo, `COPY.cart.payments.transfer.desc`) vs "alias" (`paymentOptions`). Unificar (el handoff pide alias/CBU en Ajustes).
- H1 mobile 64px (inline) vs `Display size="page"` 56px mobile.
- "Retiro en el local · Gratis" y "Te avisamos por WhatsApp…" solo existen en desktop.
- "¿Querés probar **la MTB**…": texto fijo en el prototipo; debería depender del ítem (bici con prueba disponible) u ocultarse si el carrito no tiene bicis.
- Carrito vacío, error de stock y loading del CTA: no diseñados.
- Cantidad > 1: el resumen de 2e muestra "· x1"; no hay diseño de precio unitario vs subtotal de línea.
