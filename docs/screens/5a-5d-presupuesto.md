# 5a / 5d · Pedir presupuesto

- PNG desktop: [5a (Producto importado, default)](prototype/5a.png) · [Bicicleta](prototype/5a--bicicleta.png) · [Repuesto](prototype/5a--repuesto.png) · [Otra consulta](prototype/5a--otra-consulta.png)
- PNG mobile: [5d](prototype/5d.png) · [Bicicleta](prototype/5d--bicicleta.png) · [Repuesto](prototype/5d--repuesto.png) · [Otra consulta](prototype/5d--otra-consulta.png)
- Ruta: `/presupuesto`
- Dueño: **C Cliente** (lo que se envía llega al admin 5b, dueño D)
- Fuente: `BiciTienda MDQ.dc.html` l.15–37 (5a), l.77–88 (5d); `quoteVals()` (`KINDS`, `qKinds`, `qPh`), state `qKind` (default `'imp'`).

## Estructura desktop (5a, 1440)

0. **Header** `active="presupuesto"` (ítem "Pedir presupuesto" amarillo + borde inferior 2px). Ver `shell.md`.

1. **Intro**: padding `40px 56px 0`, column gap 12.
   - Eyebrow "Presupuesto sin cargo": 700 14px uppercase .08em yellow → `Eyebrow tone="yellow" size="lg"`.
   - H1 "¿Qué estás buscando?": 900 96px/.86 @66% uppercase → `Display size="page"`.
   - Párrafo: "Una bici, un repuesto o algo que hay que traer de afuera: contanos qué necesitás y te pasamos precio y demora por WhatsApp." — 18px/1.5 text-2 `#cfc8bb`, max-width 680, `text-wrap:pretty`. **SIN componente bt** (texto simple).

2. **Grid principal**: `minmax(0,1fr) 400px`, gap 40, padding `32px 56px 80px`, `align-items:start`.

3. **Card formulario**: bg surface `#1f1d1a`, borde 1px line `#2b2824`, radius 10, padding 32, column gap 30. → `Panel surface="surface" padding="xl" gap="2xl"` (xl = 20 mobile / 32 md; gap 2xl = 30).
   Cada paso: column gap 12, con título de paso 700 12px uppercase .08em text-3 → `Eyebrow tone="muted" size="sm"`.

   3.1 **"1 · Qué necesitás"**: grid `repeat(4, minmax(0,1fr))`, gap 10. Card: borde 1.5px, radius 8, padding 18, column gap 8, `cursor:pointer`.
   - Título 900 26px/.95 @70% uppercase; descripción 13px/1.4.
   - Sin seleccionar: bg transparente, borde line-strong `#3a362f`, título paper, desc text-3 `#8d867a`.
   - Seleccionada: bg yellow, borde yellow, título ink, desc `#3a362f`.
   - Copy (título / desc):
     - "Bicicleta" / "Te recomendamos modelo y talle."
     - "Repuesto" / "Para tu bici, nuevo u original."
     - "Producto importado" / "Lo traemos aunque no esté en la tienda."
     - "Otra consulta" / "Contanos y lo vemos."
   - → `OptionCard type="radio" name="kind" selectedStyle="fill" titleStyle="display" surface="transparent" padding="md" radius={8}` (está documentado para 5a).

   3.2 **"2 · Contanos el detalle"**:
   - Textarea: bg ink `#121110`, borde 1px line-strong, radius 6, padding 13×14, 15px/1.5, min-height 120; **placeholder según tipo** (`qPh`):
     - bici: "Ej: bici urbana para ir al trabajo. Mido 1,65 m y la quiero con canasto y luces."
     - rep: "Ej: cadena y cassette 11-42 para Shimano Deore 11v. Si podés, sumá una foto de la pieza."
     - imp: "Ej: rodillo smart compatible con Zwift, para eje pasante 12 mm. Si lo viste en otra web, pegá el link."
     - otro: "Contanos qué necesitás y te respondemos."
     → `Textarea surface="panel" size="md"` (min-h 120 ya incluido), con `aria-label`/`Field` (el diseño no tiene label visible).
   - Grid `1fr 1fr` gap 12 con dos `<label>` (column gap 8, 700 12px uppercase .08em text-3):
     - "Para qué bici (opcional)" — placeholder "Marca, modelo o rodado".
     - "Presupuesto aproximado (opcional)" — placeholder "Ej: hasta $ 300.000".
     → `Field size="sm"` + `Input surface="panel" size="md"`. Ojo: el label incluye "(opcional)" literal en mayúsculas; `Field optional` puede agregar su propio sufijo — usar el texto literal del diseño.
   - Upload: min-height 64, borde 1.5px dashed line-btn `#4a453e`, radius 8, centrado gap 10, 700 14px text-2: "+ Subí una foto o captura " + `<span>` 400 text-3 "(opcional)". → `UploadDropzone variant="bar" name="photos" accept="image/*" multiple` (defaults del componente: label "Subí una foto o captura" con "+ " antepuesto, hint "(opcional)"; min-h 52 mobile / 64 md: coincide con 5a y 5d). En mobile pasar `label="Agregar foto"`.

   3.3 **"3 · Tus datos"**: grid `repeat(3, minmax(0,1fr))` gap 12; labels como arriba:
   - "Nombre" — placeholder "Nombre y apellido" (requerido)
   - "WhatsApp" — placeholder "223 …" (requerido, `inputMode="tel"`)
   - "Email (opcional)" — placeholder "tu@email.com"
   → `Field size="sm"` + `Input surface="panel" size="md"`. Con sesión, prellenar desde la cuenta (o esconder el paso, ver Ambigüedades).

   3.4 **Pie**: flex `align-items:center` gap 20, padding-top 6, border-top 1px line.
   - CTA "Enviar pedido de presupuesto": bg yellow, ink, padding 18×30, radius 6, 800 16px uppercase .06em, margin-top 18 → `Button variant="primary" size="lg" type="submit"` (lg = 17×28; diseño 18×30: diferencia mínima, aceptar o `className`).
   - Nota "Te respondemos por WhatsApp en 24 hs hábiles." 14px text-3, margin-top 18.

4. **Aside** (400px): column gap 16.
   4.1 **"Cómo sigue"**: bg surface, borde 1px line, radius 10, padding 28, column gap 4. Título 900 30px/1 @70% uppercase, padding-bottom 12 → `PanelTitle size="lg"`. Panel: `padding="lg"` (18 mobile / 28 md).
   Tres filas grid `44px 1fr`, gap 12, padding 14×0, border-top line: número 900 30px/1 @70% yellow; título 800 15px; texto 14px/1.4 text-3.
   - "01" "Lo revisamos en el local" — "Vemos stock, compatibilidad y proveedores."
   - "02" "Te escribimos por WhatsApp" — "Con precio, demora y formas de pago."
   - "03" "Si te sirve, lo encargamos" — "Y te avisamos cuando esté para retirar."
   → **SIN componente bt** para la lista numerada (`StepList` de 2e es de timeline con check/círculos, no esta variante con número display amarillo). Falta `NumberedSteps { items: {n,title,text}[], variant: "aside"|"home" }` (el bloque de 3 pasos de 2a es similar).
   4.2 **Contacto directo**: borde 1px line (sin fondo), radius 10, padding 24, column gap 14.
   - "¿Preferís hablarlo directo?" 800 16px.
   - Botón "Escribinos por WhatsApp": min-height 50, borde 1.5px line-btn, radius 6, 800 14px uppercase .06em → `Button variant="secondary" size="full" href={wa.me} external`.
   - "[Número a confirmar]" 13px text-3 → número del local.
   → `Panel surface="outline"` con padding 24: `padding="md"` (16 mobile / 24 md); gap 14 = `gap="md"`.

5. **Footer** (ver `shell.md`).

## Mobile (5d, 390)

- **MobileHeader** `search=false` (hint 70px: solo la fila superior).
- Contenedor padding `22px 16px 28px`, column gap 22.
- Intro (gap 8): eyebrow 700 **12px** yellow "Presupuesto sin cargo"; H1 900 54px/.86 @66% "¿Qué estás buscando?"; párrafo corto "Te pasamos precio y demora por WhatsApp." 15px/1.5 text-2.
- **Sin card contenedora**: los pasos van directo sobre la página (column gap 10 cada uno).
- "1 · Qué necesitás": grid `1fr 1fr` gap 8; card min-height 64, `box-sizing:border-box`, borde 1.5px, radius 8, padding 14, `align-items:flex-end`, **solo título** 900 22px/.95 @70% uppercase (sin descripción). Mismos colores. → `OptionCard selectedStyle="fill" titleStyle="display-sm" padding="sm"` sin `description` en mobile (o `description` oculta `max-md:hidden`).
- "2 · El detalle" (copy distinto): textarea con **bg surface `#1f1d1a`** (no ink), mismo placeholder por tipo, min-height 120 → `Textarea surface="page"`. Upload min-height 52: "+ Agregar foto (opcional)". **No hay** "Para qué bici" ni "Presupuesto aproximado" en mobile.
- "3 · Tus datos": dos inputs apilados bg surface, **sin label**: placeholders "Nombre y apellido", "WhatsApp". **No hay email** en mobile.
- CTA (column gap 10): "Enviar pedido" min-height 52, 800 15px uppercase .06em, ancho completo → `Button variant="primary" size="full"`; nota centrada 13px text-3 "Te respondemos en 24 hs hábiles."
- **Sin aside** ("Cómo sigue" y contacto directo no están en 5d) y sin footer en el artboard.

## Estados e interacciones

- State `qKind: 'bici'|'rep'|'imp'|'otro'`, default `'imp'` (Producto importado). Tocar una card la selecciona (fill amarillo) y cambia el placeholder del textarea. Variantes capturadas en los PNG `--bicicleta`, `--repuesto`, `--otra-consulta`.
- Implementar con radios nativos (`OptionCard` usa `:checked`), así el formulario funciona sin JS; el cambio de placeholder sí necesita un componente cliente (o mostrar un placeholder genérico sin JS).
- **Validación** (README + `submitQuoteRequest`):
  - tipo requerido → "Elegí qué necesitás."
  - detalle ≥ 10 caracteres → action: "Contanos un poco más (al menos 10 caracteres)." (`COPY.quote.validation.detail` dice "mínimo 10 caracteres": ver Ambigüedades)
  - nombre requerido (≥ 2 en la action) → "Completá tu nombre." (copy demo: "Decinos tu nombre.")
  - WhatsApp AR 10 dígitos con característica (`isValidArPhone`) → "Revisá el WhatsApp: 10 dígitos con la característica (ej. 223 555-0182)."
  - email opcional, válido si viene → "Revisá el email."
  - fotos: hasta 4 (`MAX_PHOTOS`), imágenes ≤ 6 MB, sin PDF → "Hasta 4 fotos."
  - rate limit → "Demasiados pedidos seguidos. Esperá un minuto."
  Errores sin diseño: usar `Field error` (red-light 13px 600) bajo el campo + `Input invalid`.
- **Éxito**: la action devuelve `{ ok: true, number }` (ej. "P-0214"). **No hay pantalla de éxito diseñada** (el prototipo linkea a 5b). Propuesta: reemplazar el formulario por un panel de confirmación con el número, "Te respondemos por WhatsApp en 24 hs hábiles." y CTA "Seguir mirando" → `/catalogo` (o `EmptyState` con `eyebrow` = número).
- Feature apagada (`store.features.quotes === false`): la action responde "Los presupuestos no están disponibles." → la ruta debería 404 y el nav ocultar "Pedir presupuesto".
- Botón "Escribinos por WhatsApp": `https://wa.me/549223XXXXXXX?text=...` prellenado (README) — `customerWhatsApp(phone, text)` de `lib/server/whatsapp-templates.ts` arma links al cliente; para el número del local usar `getStore()`/settings.

## Datos

| Bloque | Demo / copy (`lib/data/demo`) | Real |
|---|---|---|
| Textos (eyebrow, título, intro, pasos, labels, placeholders, CTA, notas, "Cómo sigue", contacto) | `COPY.quote.*` (`eyebrow`, `title`, `intro`, `introMobile`, `step1..3`, `step2Mobile`, `forBike`, `budget`, `upload`, `uploadOptional`, `uploadMobile`, `fields`, `cta`, `ctaMobile`, `ctaNote`, `ctaNoteMobile`, `howTitle`, `how`, `directTitle`, `directCta`, `validation`) | idem |
| Tipos (título, descripción, placeholder) | `QUOTE_KINDS` (`key`, `label`, `description`, `placeholder`), `DEFAULT_QUOTE_KIND = "importado"` | enviar `kind` como `bici`/`rep`/`imp`/`otro` (`lib/types.ts` `QuoteKind`) |
| Número de WhatsApp del local | `STORE_INFO` (`settings.ts`) | `getStore()` / `getSettings()` (`lib/server/queries.ts`) |
| Envío | — | `submitQuoteRequest(formData)` (`lib/server/actions/quotes.ts`): FormData `kind`, `detail`, `forBike`, `budget`, `name`, `phone`, `email`, `photos` (≤4). Con sesión, `name/phone/email` se completan de la cuenta si vienen vacíos. Guarda fotos con `savePrivateUpload("presupuestos", …)` (no usar `actions/uploads.ts`, que es para imágenes del sitio). |
| Usuario logueado | — | `getMyAccount()` (`actions/account.ts`) para prellenar |

## Componentes bt faltantes

- `NumberedSteps` — lista "Cómo sigue" (número display amarillo 30px @70 + título 800 15 + texto 14 text-3, divisores). Reutilizable para los 3 pasos del home (2a/4a).
- (Menor) `OptionCard` no tiene modo "solo título en mobile" con `align-items:flex-end` y min-h 64: resolver con `className` o una prop `compactOnMobile`.
- (Menor) pantalla/estado de éxito del envío: sin diseño; `EmptyState` puede cubrirlo.

## Ambigüedades

- **Claves del tipo**: el prototipo y `lib/types.ts`/`submitQuoteRequest` usan `bici|rep|imp|otro`; el demo (`QUOTE_KINDS`, `DEFAULT_QUOTE_KIND`) usa `bici|repuesto|importado|otro`. La UI debe mapear `repuesto→rep`, `importado→imp` al enviar.
- **Mobile pide menos datos**: 5d no tiene "Para qué bici", "Presupuesto aproximado" ni Email, y los campos van sin label. Decidir si mobile los muestra igual (recomendado: mismos campos opcionales, colapsados) o respeta el diseño.
- **Copy de validación**: README dice "detail ≥ 10 chars"; la action dice "Contanos un poco más (al menos 10 caracteres)." y `COPY.quote.validation.detail` "…(mínimo 10 caracteres)."; nombre "Completá tu nombre." vs "Decinos tu nombre."; WhatsApp con texto distinto. Mandan los mensajes de la action (son los que llegan al cliente).
- **Con sesión**: el diseño no muestra un estado logueado; ¿se ocultan "Tus datos" o se prellenan? (la action acepta vacíos y completa desde la cuenta).
- **Fotos**: el diseño dice "una foto"; el server acepta hasta 4. El dropzone debería permitir múltiples y mostrar las elegidas (`selected`).
- **Pantalla de éxito** y estado de envío (loading) no diseñados.
- "[Número a confirmar]" y el `wa.me` del local son pendientes del cliente.
- Header activo "presupuesto": verificar que `StoreNavKey` lo incluya (lo incluye según `components/bt/README.md`).
