# Pack de pantallas: referencia para construir la tienda y el admin

Este pack es la referencia para construir cada pantalla igual al handoff
`design_handoff_bicitienda_mdq/` (README + `BiciTienda MDQ.dc.html`).

- **PNG**: `prototype/<id>.png` es la captura a tamaño real del artboard: 1440 px de ancho en desktop y admin, 390 px en mobile. `prototype/<id>--<variante>.png` es el mismo artboard en otro estado.
  Se regeneran con `pnpm screens:prototype` (o `pnpm screens:prototype 2d 5b` para algunos), que corre `scripts/screens/capture-prototype.ts`. Hace falta red, porque las fotos son de Pexels y las fuentes de Google Fonts.
- **Un md por pantalla**: desktop y mobile van juntos cuando son la misma pantalla. Cada md trae:
  - los bloques en orden;
  - las medidas, la tipografía y los colores con su token;
  - el copy exacto;
  - los estados;
  - de dónde salen los datos (`lib/data/demo/*` y las APIs de `lib/server`);
  - el componente de `components/bt` que corresponde a cada bloque. Cuando no hay, el bloque dice **SIN componente bt**.
- **Prioridad ante contradicciones**: primero las "Decisiones" de `components/bt/README.md` y los "Cambios respecto del prototipo" de `lib/data/demo/copy.ts`. Después, el HTML inline del prototipo (los valores exactos). Por último, el README del handoff. Cada md tiene su sección de **Ambigüedades**.
- **Shell**: Header, MobileHeader, Footer, AdminSidebar y el menú mobile (5c) están en [`shell.md`](shell.md). Los md de cada pantalla solo dicen qué props llevan.

## Índice

| Pantalla | md | PNG (base + variantes) | Ruta app | Agente |
|---|---|---|---|---|
| 2a Home · 4a Home mobile | [2a-4a-home.md](2a-4a-home.md) | [2a](prototype/2a.png) · [4a](prototype/4a.png) | `/` | A Tienda |
| 2b Catálogo · 4b | [2b-4b-catalogo.md](2b-4b-catalogo.md) | [2b](prototype/2b.png) · [4b](prototype/4b.png) | `/catalogo` | A Tienda |
| 2c Producto · 4c | [2c-4c-producto.md](2c-4c-producto.md) | [2c](prototype/2c.png) · [4c](prototype/4c.png) | `/catalogo/[slug]` | A Tienda |
| 2d Carrito (pago + retiro) · 4d | [2d-4d-carrito.md](2d-4d-carrito.md) | [2d](prototype/2d.png) · [2d--transferencia](prototype/2d--transferencia.png) · [2d--efectivo](prototype/2d--efectivo.png) · [4d](prototype/4d.png) · [4d--transferencia](prototype/4d--transferencia.png) · [4d--efectivo](prototype/4d--efectivo.png) | `/checkout` | B Compra |
| 2e Confirmación | [2e-confirmacion.md](2e-confirmacion.md) | [2e](prototype/2e.png) | `/checkout/confirmacion/[numero]` | B Compra |
| 2f Reserva de turno · 4e | [2f-4e-turno.md](2f-4e-turno.md) | [2f](prototype/2f.png) · [2f--asesoramiento-dia9-sin-horario](prototype/2f--asesoramiento-dia9-sin-horario.png) · [4e](prototype/4e.png) · [4e--asesoramiento-dia9-sin-horario](prototype/4e--asesoramiento-dia9-sin-horario.png) | `/turnos` | C Cliente |
| 2g Mi cuenta · 4f | [2g-4f-cuenta.md](2g-4f-cuenta.md) | [2g](prototype/2g.png) · [4f](prototype/4f.png) | `/cuenta` | C Cliente |
| 2h Login / registro · 4g | [2h-4g-login.md](2h-4g-login.md) | [2h](prototype/2h.png) · [2h--registro](prototype/2h--registro.png) · [4g](prototype/4g.png) · [4g--registro](prototype/4g--registro.png) | `/cuenta/ingresar` · `/cuenta/registro` · `/cuenta/recuperar` (sin diseño, derivada de 2h) | C Cliente |
| 5a Pedir presupuesto · 5d | [5a-5d-presupuesto.md](5a-5d-presupuesto.md) | [5a](prototype/5a.png) · [5a--bicicleta](prototype/5a--bicicleta.png) · [5a--repuesto](prototype/5a--repuesto.png) · [5a--otra-consulta](prototype/5a--otra-consulta.png) · [5d](prototype/5d.png) · [5d--bicicleta](prototype/5d--bicicleta.png) · [5d--repuesto](prototype/5d--repuesto.png) · [5d--otra-consulta](prototype/5d--otra-consulta.png) | `/presupuesto` | C Cliente |
| 2i Admin resumen · 4h Admin hoy | [2i-4h-admin-resumen.md](2i-4h-admin-resumen.md) | [2i](prototype/2i.png) · [4h](prototype/4h.png) | `/admin` | D Admin |
| 3a Pedidos · 4i Detalle pedido mobile | [3a-4i-admin-pedidos.md](3a-4i-admin-pedidos.md) | [3a](prototype/3a.png) (transf. pendiente) · [3a--pagado](prototype/3a--pagado.png) · [3a--armando](prototype/3a--armando.png) · [3a--paga-en-local](prototype/3a--paga-en-local.png) · [3a--listo-para-retirar](prototype/3a--listo-para-retirar.png) · [3a--retirado](prototype/3a--retirado.png) · [4i](prototype/4i.png) · [4i--pagado](prototype/4i--pagado.png) · [4i--listo-para-retirar](prototype/4i--listo-para-retirar.png) · [4i--retirado](prototype/4i--retirado.png) | `/admin/pedidos` (+ `/admin/pedidos/[numero]` en mobile) | D Admin |
| 3b Turnos | [3b-admin-turnos.md](3b-admin-turnos.md) | [3b](prototype/3b.png) · [3b--sin-confirmar](prototype/3b--sin-confirmar.png) · [3b--asesoramiento](prototype/3b--asesoramiento.png) | `/admin/turnos` | D Admin |
| 5b Presupuestos | [5b-admin-presupuestos.md](5b-admin-presupuestos.md) | [5b](prototype/5b.png) (nuevo) · [5b--cotizado](prototype/5b--cotizado.png) · [5b--aceptado](prototype/5b--aceptado.png) · [5b--pedido-creado](prototype/5b--pedido-creado.png) · [5b--rechazado](prototype/5b--rechazado.png) | `/admin/presupuestos` | D Admin |
| 3c Productos | [3c-admin-productos.md](3c-admin-productos.md) | [3c](prototype/3c.png) | `/admin/productos` | D Admin |
| 3d Editar producto | [3d-admin-editar-producto.md](3d-admin-editar-producto.md) | [3d](prototype/3d.png) | `/admin/productos/[id]` | D Admin |
| 3e Clientes | [3e-admin-clientes.md](3e-admin-clientes.md) | [3e](prototype/3e.png) · [3e--con-turno-sin-pedidos](prototype/3e--con-turno-sin-pedidos.png) | `/admin/clientes` | D Admin |
| 3f Ajustes | [3f-admin-ajustes.md](3f-admin-ajustes.md) | [3f](prototype/3f.png) | `/admin/ajustes` | D Admin |
| Shell: Header, MobileHeader, 5c Menú mobile, Footer, AdminSidebar, AdminMobileHeader | [shell.md](shell.md) | [5c](prototype/5c.png) (y el header/footer de cualquier artboard) | layouts `(tienda)` y `admin/(panel)` | Shell |

En el prototipo el estado es uno solo para todo el canvas (`pay`, `svc`, `day`, `time`, `tab`, `selOrder`, `ov`, `selAppt`, `selClient`, `qSel`, `qOv`, `qKind`, en la clase `Component extends DCLogic` cerca de la l.660). Por eso cada variante se captura con la página recargada.

### Variantes que no se capturaron

No se pueden disparar con un click, o no existen en el prototipo:
- carrito vacío y errores de stock;
- 2e con transferencia, efectivo o pago pendiente o rechazado (solo está MP aprobado), y 2e mobile;
- éxito y carga de turno y de presupuesto;
- `/cuenta/recuperar`;
- drawer de filtros mobile (4b);
- vista "Día" de la agenda (3b);
- menú del admin mobile;
- avance de estado en 5b con el botón (las capturas eligen una fila por estado, que da el mismo resultado);
- 3c y 3d no tienen estados interactivos.

## Componentes bt que faltan (consolidado)

**Compartidos entre varias pantallas**

| Componente propuesto | Dónde | Nota |
|---|---|---|
| `SummaryRows` / `TotalsList` (filas etiqueta–valor + total) | 2d, 2e, 2f (sobre amarillo), 3a/4i, 5b | Pago / Entrega / Total con monto amarillo; subtotal / descuento rojo |
| `KeyValueList` (filas clave/valor de panel) | 3b, 3a, 5b, 3e | "Cuándo / Detalle / WhatsApp / Estado" |
| `NumberedSteps` / `StepsGrid` (n.º grande + título + texto) | 2a/4a ("01 Elegís online…"), 5a ("Cómo sigue") | 3 columnas en desktop, lista en mobile. `StepList` (2e) es otra cosa |
| `PhotoPanel` (foto con gradiente) | 2h/4g, base para el hero de 2a | |
| `Display`: tamaños nuevos | 2c/4c (72/.88, 48), 4b (64), 4d (64), 4e (60), 2g/5a (40/.9, 48/.9, 56/.88, 88/.86, 44/.9), 3e (40) | O `className` puntual |
| `Kpi` 24px/1.1 | 3e "Gastado" | `Kpi` solo tiene 48/40/30 |
| `Eyebrow tone="text-4"` (`#6f675a`) | 2e (card clara) | |

**Tienda (A / B / C)**

| Componente | Pantalla |
|---|---|
| `HomeHero` (foto + gradiente + tag + H1 + CTA, desktop y mobile) | 2a/4a |
| Contenido de la celda de categoría (índice mono + nombre 800 20 @80) | 2a (va dentro de `Tile`) |
| `PriceRangeSlider` (barra de 4 px, tramo amarillo, 2 thumbs + 2 inputs) | 2b |
| `FiltersDrawer` (mobile, sin diseño en el handoff) | 4b |
| `ProductGallery` (miniaturas de 96 px + principal de 640 px con tag) | 2c |
| `ProductCarousel` (foto de 340 px con dots) | 4c |
| `CartLine` (fila de ítem del carrito) | 2d/4d |
| `CalloutLink` / `PromoBanner` ("¿Querés probar la MTB antes de pagar?") | 2d/4d |
| `SuccessMark` (círculo de 88 con ✓) | 2e |
| `OrderSummaryItem` (ítem sobre la card clara) | 2e |
| `BankTransferDetails` (sin diseño) | 2e con transferencia |
| `MonthCalendar` | 2f/4e |
| `TimeSlotGrid` / `SlotButton` | 2f/4e |
| `SelectedProductRow` ("Bici a probar" + "Cambiar") y su selector | 2f |
| `AccountNav` (nav vertical de cuenta; en mobile alcanza `SegmentedControl`) | 2g |
| `DateBadge` / `NextAppointmentCard` | 2g/4f |
| `OrderSummaryCard` (pedido del cliente) | 2g/4f |
| `TextDivider` "o" (solo si queda algún login alternativo) | 2h |
| `OptionCard` compacta (solo título, alto 64, alineada abajo) | 5d |

**Admin (D)**

| Componente | Pantalla |
|---|---|
| `TodayAppointmentCard` (Hecho / Ahora / Confirmado / Sin confirmar; desktop y mobile) | 2i/4h |
| `OrderItemRow` (foto 64×48 / 60×46 + nombre/variante + precio) | 3a/4i |
| `ReceiptBox` ("Comprobante adjunto", borde rojo punteado, "Ver") | 3a |
| `OrderDetailPanel` (opcional, compartido entre 3a y 4i) | 3a/4i |
| `WeekAgenda` + `AgendaCell` (columna de 56 px + 6 días, separador "Tarde") | 3b |
| `WeekNav` ("‹ 5 – 10 oct 2026 ›") | 3b |
| `Legend` (cuadraditos de color) | 3b |
| `QuoteLinesEditor` (líneas editables + "+ Agregar ítem") | 5b |
| `MessageBox` (pedido del cliente, fondo ink) | 5b |
| `ClosedNote` (reemplaza los botones cuando el presupuesto está cerrado) | 5b |
| `SortablePhotoGrid` (borde amarillo + tag "Portada"; `UploadDropzone` tile solo cubre "Subir fotos") | 3d |
| `ComputedField` (solo lectura, borde punteado, `#ff6a5c` 800 17 px: "Con transferencia (auto)") | 3d |
| Link de peligro en mayúsculas 800 13 ("Eliminar producto") | 3d (aproximable con `TextLink tone="red-light"`) |
| `HistoryList` (tipo con color en 72 px + texto, con estado vacío) | 3e |
| `SettingsSubNav` (vertical, activo con bg surface y barra amarilla) | 3f |
| `ScheduleDayRow` (toggle + día + rango mañana + rango tarde) | 3f |
| `WhatsAppTemplateCard` (burbuja editable, radios 8/8/8/2, bg `#26231f`) | 3f |
| `Input` compacto (8×10, 13 px) | 3f |

El shell está cubierto por bt. Solo falta el menú del admin mobile, que el prototipo no dibuja. 3c no necesita componentes nuevos; falta verificar que `CellThumb` sea de 64×48 y que se pueda poner un `Toggle` dentro de una fila de `Table` que es link.

## Ambigüedades principales

El detalle completo está en cada md.

- **Contacto en el carrito**: 2d/4d no tienen campos de contacto, pero `placeOrder` exige nombre y WhatsApp. Propuesta: un bloque "Tus datos" como el de 2f. Tampoco hay selector de cuotas, aunque `placeOrder` acepta 1, 3 o 6.
- **Claves del tipo de presupuesto**: `lib/types.ts` y `submitQuoteRequest` usan `rep`/`imp`; `lib/data/demo` usa `repuesto`/`importado`. Hay que convertirlas al enviar.
- **Pills de pedido**: 2g pinta "Armando" amarillo y "Retirado" `#3a362f`, distinto de 3a. Además, #BT-10482 aparece "Armando" en 2g y "Pagado" en 3a. Usar `OrderPill` en todos lados.
- **Contadores del sidebar**: `AdminSidebar.dc.html` dice Turnos 14 (la semana) y `adminNav` en renderVals dice 6, pero no se usa. `getAdminNavCounts()` no trae turnos ni presupuestos; para presupuestos sirve `quoteCounts()`.
- **Qué día es "hoy"**: 2i dice "jueves 1 oct", la agenda 3b resalta el jue 8 y 2f preselecciona el 8. Los KPIs del día no tienen query; `getAdminStats()` es de la plantilla vieja.
- **Último paso del pedido**: el README dice "Marcar retirado"; el prototipo y `order-flow.ts` dicen "Marcar como retirada". En "Paga en local", el botón "Registrar pago y retiro" va directo a Retirado, y ese camino no está en el README.
- **Selección de turnos en 3b**: el turno seleccionado y el "Sin confirmar" usan el mismo borde rojo. Faltan "Cancelar" y WhatsApp en los confirmados, y la nota interna es texto fijo.
- **Usuarios y Recordatorio en 3f**: aparecen "Usuarios" y la plantilla "Recordatorio", pero no van: el admin entra con PIN, no hay recordatorios automáticos y `WhatsAppTemplateId` solo tiene `turno_confirmado | pedido_listo`. El título "Mensajes automáticos de WhatsApp" promete envío automático, y en el core el admin abre wa.me. El diseño dice "Mercado Pago · Conectado", pero el core soporta Payway y lo configura por variables de entorno.
- **Guardado en 3d y 3f**: el botón "Guardar cambios" es global y las actions guardan campo por campo. En 3d no hay columna Color, aunque el README pide talle × color × stock. "Cuotas" aparece por producto y en el core es un setting global. `setProductPhoto` solo reemplaza la portada. `patchSettings` no acepta `cashEnabled` ni `maxInstallments`.
- **Grilla del catálogo**: 2b usa 3 columnas y el README dice 4. Home usa 4.
- **Tag "Nuevo"**: el prototipo lo pinta rojo, bt amarillo (sigue al README). El color va con el estilo de talle de bt, no con los círculos de 36 px del prototipo.
- **Login**: "Continuar con Google" está en 2h/4g pero no va (`copy.ts`). `/cuenta/recuperar` no tiene diseño; el md propone uno.
- **2e**: solo cubre MP aprobado y no tiene versión mobile. Sus pasos no coinciden con `publicTimeline`. "Tu bici ya es tuya." no sirve para pedidos de solo accesorios.
- **Disponibilidad de turnos**: el sábado a la tarde se puede reservar en 2f pero está cerrado en 3f/3b. 4e no tiene "Tus datos". "Confirmar turno" no se deshabilita cuando no hay horario.
- **Placeholders del cliente**: dirección, horarios, WhatsApp, marcas y CBU siguen "a confirmar", como en el handoff.
