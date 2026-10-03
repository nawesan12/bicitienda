# components/bt/cliente-c (Ola 1 · agente C)

Componentes nuevos de las pantallas del cliente: turnos (2f/4e), Mi cuenta
(2g/4f), login (2h/4g) y presupuesto (5a/5d). Siguen las reglas de
`components/bt/README.md` (tokens, breakpoints, valores del prototipo). No
están en `components/bt/index.ts`: se importan por ruta,
`@/components/bt/cliente-c/<archivo>`.

## Presentacionales (sin fetch)

| Componente | Archivo | Props | Dónde |
|---|---|---|---|
| `MonthCalendar` | `month-calendar.tsx` | `{ monthLabel, days: {date, state: available\|closed\|loading}[], selected?, onSelect?, onPrev?, onNext?, prevDisabled?, nextDisabled?, label?, surface?: page\|panel }` | 2f/4e, reprogramar. Celda 52 (mobile 44); cerrado = #4a453e tachado. `surface="panel"` pinta las celdas #121110 dentro de un panel #1f1d1a |
| `TimeSlotGrid` | `time-slot-grid.tsx` | `{ groups: {label, slots: {time, available}[], emptyText?}[], selected?, onSelect? }` | Desktop: Mañana/Tarde en 3 columnas; mobile: una grilla de 4 sin rótulos (4e). Grupo vacío → `emptyText` ("Ese día no hay turnos a la tarde.", sábado) |
| `SummaryRows` | `summary-rows.tsx` | `{ rows: {label, value}[] }` | Resumen sobre amarillo (2f): borde superior 1.5 tinta, divisores `ink/25` |
| `SelectedProductRow` | `selected-product-row.tsx` | `{ eyebrow, title, image?, action? }` | "Bici a probar" + "Cambiar" (2f) |
| `PhotoPanel` | `photo-panel.tsx` | `{ src, alt, children }` | Foto + gradiente de 2h (desktop) / 4g (alto 220) |
| `DateBadge` | `date-badge.tsx` | `{ weekday, day, caption, size: lg\|sm }` | Bloque de fecha del próximo turno (2g lg, 4f sm) |
| `AccountNav` | `account-nav.tsx` | `{ items: {label, href, active?}[], footer? }` + `ACCOUNT_NAV_ITEM` | Nav vertical de Mi cuenta (desktop). Mobile usa `SegmentedControl` |
| `OrderSummaryCard` | `order-summary-card.tsx` | `{ href?, number, pill?, title, meta, image?: string\|null\|false }` | Pedidos (y presupuestos con `image={false}`) de Mi cuenta. La pill la pone la página: `OrderPill` / `QuotePill` |
| `NumberedSteps` | `numbered-steps.tsx` | `{ items: {n, title, text?}[] }` | "Cómo sigue" (5a). Sirve para los 3 pasos del home |

## Islas cliente (llaman server actions)

Excepción a "sin fetch" porque las comparten varias rutas:

| Componente | Archivo | Qué hace |
|---|---|---|
| `SlotPicker` | `slot-picker.tsx` | `MonthCalendar` + `TimeSlotGrid` con la disponibilidad real (`fetchAvailability`, mes a mes). "Hoy" en la zona del local, horizonte `maxDaysAhead`, elige el primer día con lugar, `refreshKey` para recargar tras "ese horario se ocupó". Lo usan /turnos y reprogramar |
| `AppointmentManager` | `appointment-manager.tsx` | Card amarilla del próximo turno con Reprogramar (panel con `SlotPicker`) y Cancelar (confirmación inline). Con sesión (`{id}`) o por link (`{number, token}`). Si `canModify` es false (pasó la anticipación), muestra "Escribinos por WhatsApp" (wa.me) |

## Decisiones

- **Sábado a la tarde**: la agenda sale de `schedule_rules` vía
  `fetchAvailability`; el día muestra solo la mañana y en "Tarde" el texto
  "Ese día no hay turnos a la tarde." (el prototipo ofrecía la tarde).
- **Talle a probar**: se agrupan los colores de cada talle (para la prueba
  alcanza el talle); se manda la primera variante con stock de ese talle.
- **Login**: labels visibles en Email/Contraseña también en mobile
  (accesibilidad); Nombre/WhatsApp con placeholder + `aria-label`, como el
  diseño. Sin Google ni divisor "o".
- **Presupuesto mobile** respeta 5d: sin "Para qué bici", "Presupuesto
  aproximado" ni email. Con sesión se prellenan los datos.
- **Fotos del presupuesto**: se achican en el navegador (hasta 1600 px,
  bajando calidad) para que las 4 entren en el 1 MB por request de las
  server actions.
