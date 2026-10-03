# components/bt/compra-b: componentes de compra (agente B, ola 1)

Son componentes presentacionales que suman a `components/bt` para el carrito
(2d/4d), la confirmación (2e), el seguimiento y el pago simulado. No se
exportan desde `components/bt/index.ts`: se importan por ruta.

```tsx
import { CartLine } from "@/components/bt/compra-b/cart-line";
import { SummaryRows, SummaryRow, SummaryTotal } from "@/components/bt/compra-b/summary-rows";
import { CalloutLink, InfoBox, SuccessMark, OrderSummaryItem, KeyValueList } from "@/components/bt/compra-b/blocks";
import { CopyButton } from "@/components/bt/compra-b/copy-button";
```

| Componente | Archivo | Props | Uso |
|---|---|---|---|
| `CartLine` (cliente) | `cart-line.tsx` | `{ image, name, eyebrow?, variant?, quantity, max, price: number \| null, onQuantityChange, onRemove, removeLabel?, warning? }` | Fila del carrito. Desktop (md+): grilla 160 \| 1fr \| 150 \| 150, foto 160×120, mono "CATEGORÍA / MARCA", "Quitar", `QtyStepper md` y precio 30 @75. Mobile: 88 \| 1fr, foto 88×88, stepper `sm` (mínimo 0: bajar a 0 saca la línea) y precio 22 @75. `warning` es el aviso de stock en rojo claro. Es un `<li>`: va dentro de un `<ul>` con `border-t`. |
| `SummaryRows` / `SummaryRow` / `SummaryTotal` | `summary-rows.tsx` | `tone: dark \| paper`; `SummaryRow { label, value, variant: default \| discount }`; `SummaryTotal { label, amount, note? }` | Totales con borde dashed. `dark`: 2d/4d (etiquetas #cfc8bb, total amarillo 44/40, nota a la derecha). `paper`: pie del resumen de 2e (#4c463d, valores 700, total ink 40). El descuento sale #ff6a5c sobre oscuro y #b81d16 sobre paper. Es un `<dl>`. |
| `CalloutLink` | `blocks.tsx` | `{ href, title, text?, cta }` | Banner-link horizontal ("¿Querés probar la MTB antes de pagar?" → "Reservar prueba →"). |
| `InfoBox` | `blocks.tsx` | `{ title, children? }` | Caja informativa con borde #3a362f r8 (retiro en el local del carrito). |
| `SuccessMark` | `blocks.tsx` | `{ tone: done \| waiting \| muted, symbol? }` | Círculo de 88 (mobile 72) de 2e: amarillo con ✓, borde amarillo (pendiente) o apagado (rechazado/vencido). |
| `OrderSummaryItem` | `blocks.tsx` | `{ image, name, meta?, price }` | Ítem del resumen sobre paper (72 \| 1fr \| auto, foto 72×56). Es un `<li>`. |
| `KeyValueList` | `blocks.tsx` | `{ items: { label, value, mono?, action? }[] }` | Filas etiqueta/valor con divisor #2b2824 (datos bancarios, pago en el local, sandbox). `action` va a la derecha. |
| `CopyButton` (cliente) | `copy-button.tsx` | `{ value, label?, doneLabel? }` | "Copiar" → "Copiado" (CBU, alias). |

## Decisiones

- **CartLine** dibuja los dos steppers (mobile y desktop) y muestra uno por breakpoint, porque en mobile no hay "Quitar" y el mínimo es 0.
- **SummaryTotal paper** usa 40 px también en desktop (como el inline de 2e). `Price size="total"` da 44.
- **SuccessMark** con variantes `waiting` y `muted`: 2e solo diseña el ✓ amarillo.
- **KeyValueList** no está en el handoff. Es la `KeyValueList` del consolidado de `docs/screens/README.md`, versión sobre oscuro.
