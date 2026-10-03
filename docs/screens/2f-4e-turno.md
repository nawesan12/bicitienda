# 2f / 4e · Reserva de turno

- PNG desktop: [2f (Prueba · jue 8 · 17:30)](prototype/2f.png) · [2f--asesoramiento-dia9-sin-horario](prototype/2f--asesoramiento-dia9-sin-horario.png)
- PNG mobile: [4e](prototype/4e.png) · [4e--asesoramiento-dia9-sin-horario](prototype/4e--asesoramiento-dia9-sin-horario.png)
- Ruta: **`/turnos`** (acepta producto a probar, p. ej. `/turnos?producto=<slug>&variante=<id>` desde 2c "Reservar una prueba" y desde el banner de 2d).
- Agente dueño: **C Cliente**.
- Fuente: `BiciTienda MDQ.dc.html` l.520–561 (2f), l.142–152 (4e); `renderVals()`: `services`, `isPrueba`, `dows`, `cal`, `am`, `pm`, `svcName`, `dayText`, `timeText`; constantes `AM`, `PM`, `TAKEN`, `DOWS`.

## Estructura desktop (1440, gutter 56)

1. **Header** `<Header active="turnos" />` (cart por defecto). Ver `shell.md`.
2. **Encabezado** — padding `40px 56px 0`, flex-col gap 12.
   - Eyebrow "Turnos en el local · no pagás nada online": Archivo 700 14px uppercase .08em `#ffd21f`. → bt `Eyebrow tone="yellow" size="lg"`.
   - H1 "Reservá tu turno": Archivo 900 96px/.86 stretch 66% uppercase. → bt `Display size="page"`.
3. **Cuerpo** — grid `minmax(0,1fr) 400px`, gap 40, padding `32px 56px 80px`, `align-items:start`. Columna izquierda flex-col gap 36.

### Columna izquierda

4. **"1 · ¿Qué necesitás?"** (flex-col gap 14). Rótulo de paso (igual en los 4 pasos): Archivo 700 13px uppercase .08em `#8d867a` → `Eyebrow tone="muted" size="md"`.
   - Grid `1fr 1fr`, gap 12. Card servicio: radius 10, padding 24, gap 10, `border:1.5px solid`. Fila título `space-between` baseline: nombre Archivo 900 36px/.95 stretch 70% uppercase + "30 MIN" JetBrains Mono 600 12px. Descripción 15px/1.45.
     - Seleccionada: bg `#ffd21f`, texto `#121110`, desc `#3a362f`, borde `#ffd21f`.
     - No seleccionada: bg `#1f1d1a`, texto `#f4efe4`, desc `#cfc8bb`, borde `#3a362f`.
   - Copy: "Prueba de bici" / "Elegís el modelo y salís a dar una vuelta con ella." · "Asesoramiento" / "Te ayudamos con talle, rodado, uso y presupuesto."
   - → bt `OptionCard { title, description, meta="30 MIN", selectedStyle="fill", titleStyle="display-lg", surface="surface", padding="lg", radius={10}, name="service" }`.
5. **Bici a probar** (solo si servicio = prueba, `isPrueba`) — bg `#1f1d1a`, `border:1px solid #2b2824`, radius 10, padding 14, flex gap 14 center.
   - Foto 72×54 radius 6.
   - "BICI A PROBAR" (Mono 600 12px `#8d867a`) + "MTB rodado 29 · 21 vel. · talle M" (800 16px).
   - "Cambiar": 700 14px `#ffd21f` subrayado, padding-right 8.
   - **SIN componente bt** (fila producto seleccionado con acción). Armar con `Panel surface="surface" padding="sm"` + `Mono` + `TextLink tone="yellow" underline`. "Cambiar" abre un selector de bicis con prueba (no diseñado).
6. **Día + Horario** — grid `minmax(0,1.1fr) minmax(0,1fr)`, gap 32.
   - **"2 · Elegí el día"** (gap 14): fila rótulo + navegación de mes "‹  Octubre 2026  ›" (Archivo 800 16px uppercase .04em).
     - Grilla `repeat(7,1fr)`, gap 6. Cabecera "LU MA MI JU VI SÁ DO": Mono 600 12px `#8d867a`, centrado, padding `4px 0`.
     - Celda día: height 52, radius 6, Archivo 800 17px, centrado.
       - Disponible: bg `#1f1d1a`, `#f4efe4`, pointer.
       - Seleccionado: bg `#ffd21f`, `#121110`.
       - Cerrado/pasado: bg transparente, `#4a453e`, `text-decoration:line-through`, cursor default.
       - Relleno (antes del 1 / fin de mes): vacío.
     - Nota: "Domingos cerrado · días tachados sin turnos" (13px `#8d867a`).
     - **SIN componente bt** (calendario mensual). Nuevo `MonthCalendar { month, days: {date, state: 'available'|'closed'|'selected'}[], onSelect, onPrev, onNext, size: lg|sm }`.
   - **"3 · Elegí el horario"** (gap 14):
     - "Mañana" / "Tarde": Archivo 800 15px `#cfc8bb` ("Tarde" con margin-top 6).
     - Grillas `repeat(3,1fr)`, gap 8. Slot: padding `13px 0`, radius 6, Archivo 800 16px, `border:1px solid`.
       - Libre: transparente, `#f4efe4`, borde `#3a362f`.
       - Seleccionado: bg/borde `#ffd21f`, `#121110`.
       - Tomado: `#4a453e`, borde `#2b2824`, line-through, no clickeable.
     - Horarios: AM "10:00 10:30 11:00 11:30 12:00 12:30", PM "16:00 16:30 17:00 17:30 18:00 18:30".
     - **SIN componente bt** (`TimeSlotGrid` / `SlotButton`). Podría derivar de `OptionChip type="radio"` pero los estados tomado/seleccionado y medidas no coinciden; crear componente.
7. **"4 · Tus datos"** (gap 14): grid `1fr 1fr 1fr`, gap 12. Inputs bg `#1f1d1a`, `border:1px solid #3a362f`, radius 6, padding `15px 16px`, 15px, placeholders "Nombre y apellido" · "WhatsApp" · "Email (opcional)" (placeholder `#8d867a`). Sin labels visibles. → bt `Input surface="page" size="lg"` (+ `aria-label`, o `Field` con label visualmente oculto). Con sesión: ocultar o prellenar.

### Panel derecho (400px) · resumen amarillo

8. bg `#ffd21f`, texto `#121110`, radius 10, padding 28, gap 20. → bt `Panel surface="yellow" padding="lg" radius={10}` (gap 20 no está en `GAP`: `xl`=22 o className).
   - "Tu turno": 700 13px uppercase .08em.
   - `svcName`: Archivo 900 48px/.9 stretch 66% uppercase — "Prueba de bici" / "Asesoramiento de compra". (`Display` no tiene 48@66 con esa línea; `h2` es 48/.9 @66 → `Display size="h2" as="p"`.)
   - Tabla `border-top:1.5px solid #121110`; filas padding `14px 0`, 16px, `space-between`, separador `1px solid rgba(18,17,16,.25)` (la última sin borde); valor en `<strong>`:
     - "Día" … `dayText` (ej. "Jueves 8 de octubre")
     - "Horario" … `timeText` ("17:30 hs" o "Elegí un horario")
     - "Duración" … "30 minutos"
     - "Dónde" … "[Local a confirmar]"
   - CTA "Confirmar turno": bg `#121110`, texto `#ffd21f`, padding `19px 0`, radius 6, 800 16px uppercase .06em, ancho completo. → bt `Button variant="ink" size="full-lg"` (bg-ink text-yellow).
   - Nota 14px/1.45: "Te mandamos la confirmación y un recordatorio por WhatsApp. Podés reprogramar desde tu cuenta." → usar la versión de `COPY.appointment.note` (sin "y un recordatorio", ver Ambigüedades).
   - **SIN componente bt** para la lista clave/valor del resumen (mismo faltante `SummaryRow` que 2d, variante sobre amarillo).
9. **Footer** → `shell.md`.

## Mobile (4e, 390, gutter 16)

- `MobileHeader showSearch={false}`. Contenedor padding `20px 16px 28px`, gap 20.
- Eyebrow "No pagás nada online" (700 12px uppercase .08em `#ffd21f`) + H1 "Reservá tu turno" Archivo 900 **60px**/.88 stretch 66% (el inline dice 56 y lo pisa `font-size:60px`).
- "1 · Qué necesitás" (sin "¿?", 700 12px): cards apiladas gap 8, radius 8, padding 16, gap 6; nombre 900 28px/.95 @70; "30 MIN" Mono 600 11px; desc 14px/1.4. → `OptionCard padding="md" radius={8}` (`display-lg` ya da 28 en mobile).
- **Sin** bloque "Bici a probar" y **sin** "4 · Tus datos" en 4e.
- "2 · Día" + "‹ Octubre 2026 ›" (800 14px uppercase). Grilla gap 4; cabecera Mono 600 10px padding `2px 0`; celdas height 44, 800 15px.
- "3 · Horario": una sola grilla `repeat(4,1fr)` gap 6 con AM y PM seguidos (sin rótulos Mañana/Tarde); slots min-height 44, 800 14px.
- Resumen: bg `#ffd21f`, radius 8, padding 18, gap 10: `svcName` 900 30px/.9 @66 uppercase; "{dayText} · {timeText}" 700 16px; "30 minutos · [Local a confirmar]" 14px; CTA "Confirmar turno" min-height 52, bg `#121110` texto `#ffd21f`, 800 15px uppercase (link a 4f). Sin nota de WhatsApp.

## Estados e interacciones

Estado: `svc: 'prueba'|'asesor'` (default `prueba`), `day` (default 8), `time` (default `'17:30'`).

- Click servicio → `svc`; muestra/oculta "Bici a probar"; `svcName` = "Prueba de bici" | "Asesoramiento de compra".
- Calendario oct 2026 (offset 3: el 1 es jueves). Cerrados (tachados, no clickeables): domingos, días `< 2` (pasado: hoy = 1 oct), y el **12** (feriado, `SCHEDULE_BLOCKS`). Click en día disponible → `day=d`, **`time=null`** (resetea el horario).
- Slots tomados (`TAKEN`): día 8 → 11:00, 16:30, 18:00; día 9 → 10:00, 17:30; cualquier otro día → 12:30. Tomado = tachado, no clickeable.
- `dayText` = "{Día de semana} {d} de octubre"; `timeText` = "{hh:mm} hs" o "Elegí un horario" si no hay hora.
- Variante capturada `--asesoramiento-dia9-sin-horario`: card Asesoramiento amarilla, sin "Bici a probar", día 9 seleccionado, 10:00 y 17:30 tachados, resumen "Asesoramiento de compra" / "Viernes 9 de octubre" / "Elegí un horario".
- El prototipo no deshabilita "Confirmar turno" sin horario: en la app, deshabilitar hasta tener servicio + día + horario (+ nombre/WhatsApp válidos o sesión).
- "Confirmar turno" lleva a 2g/4f (Mi cuenta). Para invitados no hay pantalla de éxito diseñada.
- Navegación de mes ‹ › no funcional en el prototipo.

## Datos

- Demo: `COPY.appointment.*` (`eyebrow`, `eyebrowMobile`, `title`, `step1..4`, `step2Mobile`, `step3Mobile`, `durationBadge` "{min} MIN", `bikeToTry`, `change`, `calendarNote`, `morning`, `afternoon`, `summaryTitle`, `summary.{day,time,duration,where}`, `durationValue`, `pickTime`, `cta`, `note`, `summaryServiceName`); `SERVICES` (key, name, description, durationMin 30); `SLOTS_AM` / `SLOTS_PM`; `WEEKLY_SCHEDULE` (sáb tarde y dom cerrados); `SCHEDULE_BLOCKS` (12/10 feriado); `APPOINTMENT_SETTINGS` (slotMinutes 30, slotCapacity 1, minNoticeMin 120, maxDaysAhead 30); `DEMO_TODAY`; `STORE_INFO.address`; `APPOINTMENTS` (ocupación real; `TAKEN` no se exporta).
- Server:
  - `getAppointmentServices({ activeOnly: true }): Promise<ServiceRow[]>` (`lib/server/appointments.ts`): `{ id, name, description, durationMin, priceNote, allowsProduct, active, order }`. `allowsProduct` decide si se muestra "Bici a probar".
  - `getAvailability({ from?, days?, now? }): Promise<{ days: AvailabilityDay[]; settings }>` (server component) o la action `fetchAvailability(from?, days?)` (`lib/server/actions/appointments.ts`, cliente al cambiar de mes). `AvailabilityDay = { date, weekday, open, available, slots: Slot[] }`, `Slot = { time, startsAt, state: libre|ocupado|bloqueado|anticipacion|pasado|fuera_de_rango, available, booked }` (`lib/schedule.ts`). Día tachado = `!open || !available`; slot tachado = `!available`.
  - `bookAppointment(input): Promise<AppointmentActionResult>`: `{ serviceId, name, phone, email?, note?, productSlug?, variantId?, startsAt } | {..., date, time}`. Con sesión toma name/phone/email de la cuenta. → `{ ok:true, appointment:{ id, number, status, startsAt, manageToken } } | { ok:false, error, code? }` (errores de slot: "Ese horario se acaba de ocupar. Elegí otro.", etc.).
  - `getMyAccount()` (`lib/server/actions/account.ts`) para saber si pedir "Tus datos".
  - Producto a probar: `getProduct(slug)` (`lib/server/queries.ts`) + `getVariantsBySlug` (`lib/server/variants.ts`); listado para "Cambiar": `getVisibleProducts()` filtrando bicis con prueba.
  - Confirmación por WhatsApp: plantilla "Turno confirmado" (`lib/server/whatsapp-templates.ts`, `appointmentWhatsApp(appointmentId)`), sale del server.

## Componentes bt faltantes

- **MonthCalendar** (calendario mensual con navegación, cabecera mono, estados disponible/seleccionado/cerrado; tamaños desktop 52 / mobile 44).
- **TimeSlotGrid / SlotButton** (grilla de horarios libre/seleccionado/tomado; desktop 3 col con rótulos Mañana/Tarde, mobile 4 col sin rótulos).
- **SelectedProductRow** ("Bici a probar" con foto 72×54 + "Cambiar") y el selector de bici que abre "Cambiar" (no diseñado).
- **SummaryRow** sobre fondo amarillo (lista Día/Horario/Duración/Dónde con borde superior 1.5 ink y divisores `rgba(18,17,16,.25)`).
- `Panel` sin gap 20 (`GAP` tiene 18/22).

## Ambigüedades

- **Nota de WhatsApp**: prototipo "Te mandamos la confirmación y un recordatorio por WhatsApp…" vs `COPY.appointment.note` sin "y un recordatorio" (no hay recordatorios automáticos). Manda `copy.ts`.
- **Sábado a la tarde**: el prototipo ofrece slots PM todos los días; `WEEKLY_SCHEDULE` lo cierra (manda Ajustes / `getAvailability`).
- **Horarios tomados**: `TAKEN` es inventado y no coincide con la agenda 3b; la app usa disponibilidad real.
- **"Hoy"**: el calendario trata el 1 oct como hoy pero preselecciona el 8 (coincide con la agenda 3b); en la app, sin preselección o primer día disponible.
- **Mobile sin "Tus datos" ni "Bici a probar"**: el handoff exige nombre + WhatsApp (o cuenta) también en mobile; agregarlos replicando desktop en 1 columna.
- **Pantalla de éxito**: el CTA navega a Mi cuenta; para invitados no hay confirmación diseñada (la acción devuelve `number` + `manageToken` para el link de gestión).
- **Servicio "Asesoramiento"** en la card vs "Asesoramiento de compra" en el resumen (`SERVICES[].adminName` / `COPY.appointment.summaryServiceName`); la DB tiene un solo `name`.
- H1 mobile 60px (inline) vs `Display size="page"` 56 mobile.
- Paso 1 desktop "1 · ¿Qué necesitás?" vs mobile "1 · Qué necesitás" (sin signos), y mobile "2 · Día"/"3 · Horario".
- Duración "30 MIN"/"30 minutos" debe salir de `durationMin` del servicio; "[Local a confirmar]" de la dirección del local.
