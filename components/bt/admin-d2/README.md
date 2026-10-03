# components/bt/admin-d2: piezas del admin (ola 1, agente D2)

Componentes que faltaban en `components/bt` para 3c–3f y para el admin en el celular.
Siguen las mismas reglas que bt: presentacionales, sin fetch y con los tokens de
`app/theme.css`. Se importan por ruta (no están en `components/bt/index.ts`):

```tsx
import { SortablePhotoGrid } from "@/components/bt/admin-d2/sortable-photo-grid";
```

| Componente | Archivo | Uso |
|---|---|---|
| `ResponsiveTopBar` `{ ...AdminTopBarProps, mobileActions?: ReactNode \| null }` | `top-bar.tsx` | Desde `lg` es el `AdminTopBar` tal cual. Debajo arma su propia barra: volver, título 40/.9 @66, buscador a lo ancho y acciones en 2 columnas (`mobileActions`; `null` = ninguna). |
| `SortablePhotoGrid` `{ photos: {key,src,alt?}[], onChange, coverLabel?, trailing?, disabled? }` (cliente) | `sortable-photo-grid.tsx` | 3d Fotos: 5 columnas (3 en mobile). La primera es la portada (borde amarillo y tag "Portada"). Se ordena arrastrando o con los botones ← →, y ✕ quita la foto; los botones se ven con hover o foco, y siempre en pantallas táctiles. `trailing` = `UploadDropzone variant="tile"`. |
| `ComputedField` `{ tone: red\|muted }` | `fields.tsx` | Campo calculado de solo lectura con borde punteado. `red` = 800 17 px #ff6a5c ("Con transferencia (auto)"). `muted` = dato que viene de Ajustes (cuotas). |
| `DangerTextButton` | `fields.tsx` | "Eliminar producto": 800 13 px uppercase, #ff6a5c, padding 8. |
| `COMPACT_INPUT` (clases) | `fields.tsx` | Input compacto de 3f: 8×10, 13 px. |
| `HistoryList` `{ title?, items: {kind: pedido\|turno\|presupuesto, text, href?}[], empty? }` | `history-list.tsx` | Historial de 3e: grilla de 72 px + texto. Colores del tipo: Pedido en amarillo, Turno en paper y Presupuesto en #ff6a5c (no está en el prototipo). |
| `KpiCell` `{ label, value, tone?, small? }` | `history-list.tsx` | KPI de la ficha de cliente: 30 px, o 24/1.1 con `small` (Gastado). |
| `SettingsSubNav` `{ items: {id,label}[] }` (cliente) | `settings.tsx` | Sub-nav de 3f: vertical, y el activo lleva fondo surface y barra amarilla. Son anclas a cada sección y el activo sigue al scroll. En mobile es una fila con scroll horizontal. |
| `ScheduleDayRow` `{ day, open, am, pm, onOpen, onAm, onPm, invalid? }` (cliente) | `settings.tsx` | Fila del horario: switch, día, rango de mañana y rango de tarde. Un rango vacío o un día apagado se ve como "Cerrado". |
| `WhatsAppTemplateCard` `{ name, when, value, onChange, footer? }` (cliente) | `settings.tsx` | Plantilla editable en forma de burbuja (radios 8/8/8/2, fondo #26231f). No tiene switch porque nada se manda solo. |

## Decisiones

- **Menú del admin en mobile** (`components/admin/bt-admin-nav.tsx`): no está dibujado, así que se armó con el lenguaje del menú 5c. Cada fila mide 60 px, la sección va en 900 28 @70 y el contador en una pill mono. La sección activa va en amarillo con una barra. Abajo están "Ver tienda ↗" y "Salir". El header dice "Admin · {sección}".
- **Nav**: se suma "Consultas" entre Clientes y Ajustes. El sidebar replica `AdminSidebar` porque la lista de bt está fija.
- **Tablas anchas** (3c, 3e, Consultas): desde `xl`/`lg` se ven como `Table`; debajo, como lista de cards.
