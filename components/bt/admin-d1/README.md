# components/bt/admin-d1: componentes de las pantallas de operación del admin

Ola 1 · D1 (Resumen 2i/4h, Pedidos 3a/4i, Turnos 3b, Presupuestos 5b). Mismas
reglas que `components/bt`: presentacionales, props tipadas, sin fetch ni
acciones (las conectan las páginas de `app/admin/(panel)/`), tokens de
`app/theme.css`, valores copiados del prototipo. No se exportan desde
`components/bt/index.ts`: se importan por archivo.

```tsx
import { TodayAppointmentCard } from "@/components/bt/admin-d1/today";
```

| Archivo | Componente | Pantalla | Props |
|---|---|---|---|
| `today.tsx` | `TodayAppointmentCard` | 2i / 4h | `{ time, name, service, detail?, status: hecho\|ahora\|confirmado\|sin_confirmar\|no_vino, href? }`. Mobile < lg (52 px / 20 / padding 12), desktop ≥ lg (64 / 22 / 14). "No vino" es nuevo (como Hecho, estado rojo claro). |
| `order.tsx` | `OrderItemRow` | 3a / 4i | `{ image?, name, variant?, price, quantity?, size: md (64×48) \| sm (60×46) }` |
| | `ReceiptBox` | 3a | `{ href?, fileName?, kind: pdf\|image, title?, viewLabel?, emptyText? }`. Borde rojo punteado + "Ver" (otra pestaña); miniatura si es imagen. Sin `href` = "Sin comprobante adjunto" (borde #3a362f). |
| `common.tsx` | `KeyValueList` | 3b / 5b | `{ items: {label, value, tone?: paper\|red-light\|yellow\|muted}[] }` |
| | `SummaryRows` | 3a / 4i | `{ rows: {label, value}[], total?: {label?, amount}, dashed?, size: md (34 px) \| sm (32 px) }` |
| | `MessageBox` | 5b | `{ children, meta?: ReactNode[] }` (caja ink + "Para: … · Presupuesto: …") |
| | `ClosedNote` | 5b | `{ children, action? }` (reemplaza los botones de un estado cerrado) |
| | `BackLink` | 4i | `{ href, children }` ("← Pedidos", 44 px táctil en mobile) |
| | `SectionHeading` | 2i | `{ children, aside? }` ("Turnos de hoy" + "6 TURNOS") |
| `agenda.tsx` | `WeekNav` | 3b | `{ label, prevHref, nextHref }` ("‹ 5 – 10 oct 2026 ›") |
| | `Legend` | 3b | `{ items: {label, swatch: yellow\|paper\|red-outline\|blocked\|selected}[], note? }` |
| | `AgendaCell` | 3b | `{ kind: empty\|closed\|blocked\|prueba\|asesoramiento\|otro, title?, sub?, unconfirmed?, selected?, dim?, extra?, href?, size: week\|day }` |
| | `WeekAgenda` | 3b | `{ days: {key, short, num, isToday?, href?}[], groups: {label, rows: {time, cells}[]}[], size }`. Columna de 56 px + n días, separador "Tarde". |
| `quote.tsx` (cliente) | `QuoteLinesEditor` | 5b | `{ lines, onChange?, onCommit?, readOnly?, addLabel? }`. Inputs que se ven como texto hasta el hover/foco, "✕" por línea, "+ Agregar ítem" punteado. |
| `modal.tsx` (cliente) | `Modal`, `FormError` | 3a / 3b / 5b | `{ open, onClose, title, children, footer?, width: 420\|480\|560 }` sobre `<dialog>` nativo. |

## Decisiones

- **Turno seleccionado ≠ "Sin confirmar"**: sin confirmar = borde rojo 1.5 px
  (como el prototipo); seleccionado = anillo amarillo de 2 px separado 2 px
  (`outline-offset`). Se pueden combinar.
- **Celda bloqueada** (no está en el handoff): fondo #1a1816, borde punteado
  #3a362f, "Bloqueado" + motivo.
- **Celda vacía con `href`**: muestra "+" al hover (carga un turno manual en
  ese horario). Las cerradas (sábado tarde) y las pasadas no son clickeables.
- **Empty de la agenda**: el borde #221f1c del prototipo no tiene token; se
  usa `border-line/60` (mismo valor visual).
- **Modal**: el handoff no dibuja diálogos; se arma con el lenguaje de los
  paneles (surface, borde line, radio 10, título 900 @70).
