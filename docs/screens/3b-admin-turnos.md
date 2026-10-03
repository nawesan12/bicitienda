# 3b · Admin Turnos (agenda semanal + detalle)

- PNG: [default: Juan Pérez, prueba, jue 8](prototype/3b.png) · [sin confirmar: Laura Paz](prototype/3b--sin-confirmar.png) · [asesoramiento: Valentina Ortiz](prototype/3b--asesoramiento.png)
- Ruta: `/admin/turnos` (no existe todavía; `?semana=YYYY-MM-DD&sel=<id>`)
- Agente dueño: **D Admin**
- Fuente: l.231–255; lógica `adminVals()` → `WD`, `APPTS`, `wdays`, `row()`, `weekAM`, `weekPM`, `ad`.
- No hay versión mobile del 3b en el handoff (mobile admin = "día", ver 4h).

## Estructura (desktop 1440)

Contenedor grid `240px | minmax(0,1fr)`, min-height 980.

1. **Sidebar** `active="turnos"` (count Turnos 14). Componente bt: `AdminShell` + `AdminSidebar`.
2. **Top bar**: flex center, gap 14, padding 22×40, border-bottom line.
   - H1 "Turnos" 900 44px/1 stretch 66% uppercase.
   - Navegador de semana "‹  5 – 10 oct 2026  ›": Archivo 800 16px uppercase ls .04em, margin-left 16. **SIN componente bt** (`WeekNav` con prev/next).
   - spacer.
   - Segmentado "Semana | Día": contenedor bg surface `#1f1d1a`, radius 6, padding 3; ítem padding 8×14, Archivo 800 13px uppercase; activo "Semana" bg paper, fg ink, radius 4; inactivo text-2 `#cfc8bb`.
     Componente bt: `SegmentedControl { tone:"paper", items:[Semana, Día] }`.
   - "Bloquear horario": secundario (border 1.5px `#4a453e`, padding 11×18, 800 14px uppercase ls .06em).
   - "+ Turno manual": primario (yellow, padding 12×18).
   Componente bt: `AdminTopBar { title, children:<WeekNav/>, actions }` + `Button`.
   - Sin buscador.
3. **Leyenda**: flex gap 20, padding `16px 40px 0`, Archivo 600 13px text-2. Swatch 14×14 radius 3: yellow "Prueba de bici" · paper "Asesoramiento" · borde 2px red `#d7261e` "Sin confirmar". A la derecha (margin-left auto, text-3): "Horarios de ejemplo · a confirmar".
   **SIN componente bt** (`Legend`/`LegendSwatch`).
4. **Cuerpo**: grid `minmax(0,1fr) | 360px`, gap 24, padding `16px 40px 40px`, align start.
   - **Grilla semanal** (flex column gap 6). Todas las filas: grid `56px | repeat(6,minmax(0,1fr))`, gap 6.
     - Cabecera días (padding-bottom 6): celda flex baseline gap 6, padding 6×8, border-bottom 2px. Día "Lun" Archivo 700 12px uppercase ls .08em text-3; número 900 26px/1 stretch 72%. Día actual (jue 8): número y borde yellow; resto número paper y borde line `#2b2824`.
       Días: Lun 5 · Mar 6 · Mié 7 · Jue 8 · Vie 9 · Sáb 10.
     - Filas mañana: 10:00, 10:30, 11:00, 11:30, 12:00, 12:30 (hora Mono 600 12px text-3).
     - Separador "Tarde": Archivo 700 12px uppercase ls .08em text-3, padding `10px 0 4px`.
     - Filas tarde: 16:00 … 18:30.
     - Celda: alto 56, radius 6, padding 6×8, border 1.5px, flex column centrado gap 1, overflow hidden. Nombre 800 13px/1.15 ellipsis; sub 600 11px/1.15 opacity .8 ellipsis.
       - Vacía: transparent, borde `#221f1c` (sin token: entre ink y line), cursor default. **Sábado tarde**: borde transparent (cerrado).
       - Prueba: bg yellow, fg ink, borde yellow, sub "Prueba · <detalle>".
       - Asesoramiento: bg paper, fg ink, borde paper, sub "Asesor. · <detalle>".
       - Sin confirmar o seleccionada: borde red `#d7261e`.
     **SIN componente bt** (`WeekAgenda` + `AgendaCell`).
   - **Panel detalle** (bg surface, border line, radius 10, padding 24, gap 16):
     1. Chip servicio (self start): 800 11px uppercase ls .06em, padding 5×10, radius 999, fg ink, bg yellow (Prueba de bici) o paper (Asesoramiento). Componente bt: `Pill tone="yellow"|"paper"`.
     2. Nombre 900 40px/.95 stretch 70% uppercase.
     3. Lista clave/valor (border-top line, 14px): filas padding 12×0 con border-bottom line (la última sin). Clave text-3, valor `<strong>`: "Cuándo" → "Jueves 8 oct · 17:30"; "Detalle" → "MTB R29 21v · talle M" (right); "WhatsApp" → "223 555-0163"; "Estado" → "Confirmado" (paper) / "Sin confirmar" (red-light `#ff6a5c`).
        **SIN componente bt** (`KeyValueList`).
     4. Nota interna: caja bg ink, border 1px `#3a362f`, radius 6, padding 12×14, min-height 72, 14px text-3: "Nota interna: preparar la bici en el talle indicado 10 min antes." (en la app: `Textarea surface="page"`).
     5. **Solo si "Sin confirmar"**: primario full "Confirmar por WhatsApp" (padding 14×0, 800 14px uppercase).
     6. Grid `1fr 1fr` gap 8, botones secundarios (border 1.5px `#4a453e`, padding 12×0, 800 13px uppercase): "Vino ✓" · "No vino" · "Reprogramar" (span 2).
     Componente bt: `Panel` + `Button`.

## Estados e interacciones

- Click en celda con turno → `selAppt` → panel. Celdas vacías no clickeables.
- Semana / Día, flechas de semana, "Bloquear horario", "+ Turno manual" sin comportamiento en el prototipo.
- Estados del prototipo: "Confirmado" | "Sin confirmar". Mapeo al core (`AppointmentStatus`): Sin confirmar = `pendiente`, Confirmado = `confirmado`; "Vino ✓" → `asistio`, "No vino" → `no_asistio`; "Reprogramar" → `reprogramado` (+ turno nuevo). `AppointmentPill` existe en bt para mostrar el estado si se quiere usar como pill.
- Turnos de la semana demo (14): a1 Lun 10:00 Ana Torres asesor · a2 Lun 17:00 Ramiro Luna prueba · a3 Mar 11:30 Gustavo Peralta prueba · a4 Mar 16:30 Marta Ríos asesor · a5 Mié 10:30 Nicolás Vera prueba · a6 Mié 18:00 Laura Paz asesor **Sin confirmar** · a7 Jue 11:00 Tomás Gil prueba · a8 Jue 16:00 Sofía Díaz asesor · a9 Jue 17:30 Juan Pérez prueba (default) · a10 Jue 18:00 Valentina Ortiz asesor · a11 Vie 10:00 Federico Paz prueba · a12 Vie 17:00 Camila Rey asesor **Sin confirmar** · a13 Sáb 10:30 Hernán Costa prueba · a14 Sáb 11:30 Julia Sanz prueba.

## Datos

- Demo: `lib/data/demo/appointments.ts` → `AGENDA_WEEK`, `SLOTS_AM`, `SLOTS_PM`, `SERVICE_LABEL`, `APPOINTMENT_STATUS_LABEL`, `APPOINTMENTS`; horarios/cierre sábado tarde en `settings.ts` (`WEEKLY_SCHEDULE`, `SCHEDULE_BLOCKS`).
- Lectura: `getAppointmentsBetween(fromDate, toDate, { statuses? })` y `getBlocksBetween(fromDate, toDate)` (`lib/server/appointments.ts`); detalle `getAppointmentView(id)` → `AppointmentView { appointment, customer, service, productLabel, date, time, dayLabel, manageUrl }`. Grilla de horarios: `getScheduleRules()` + `getAgendaSettings()`.
- Acciones (`lib/server/actions/admin-appointments.ts`, todas devuelven `AdminAppointmentResult`): `adminConfirmAppointment(id)` · `adminMarkAttendance(id, attended)` (Vino/No vino) · `adminRescheduleAppointment(id, slot)` · `adminCancelAppointment(id)` · `adminCreateAppointment(input)` (+ Turno manual) · `adminSetAppointmentNote(id, note)` (nota interna) · `adminBlockSchedule(input)` / `adminDeleteBlock(id)` (Bloquear horario).
- WhatsApp: "Confirmar por WhatsApp" → `adminAppointmentWhatsApp(appointmentId)` (`actions/whatsapp.ts`) → plantilla "Turno confirmado" (`appointmentWhatsApp`) `{ text, url }`; probablemente junto con `adminConfirmAppointment`.

## Componentes bt faltantes

- `WeekAgenda` (grilla 56px + 6 días, separador "Tarde", celdas vacías/cerradas/ocupadas/seleccionadas).
- `AgendaCell` (variantes prueba/asesoramiento/sin confirmar/seleccionada/vacía/cerrada).
- `WeekNav` ("‹ 5 – 10 oct 2026 ›").
- `Legend` (swatches de la agenda).
- `KeyValueList` (filas clave/valor del panel; se repite en 3a/5b/3e).
- Vista "Día" de la agenda: no diseñada.

## Ambigüedades

- La selección y "sin confirmar" usan el **mismo** borde rojo: no se distingue el turno seleccionado de uno sin confirmar (ver PNG default: Juan Pérez seleccionado tiene borde rojo). Definir otro indicador de selección (ej. inset amarillo como en tablas).
- Leyenda "Horarios de ejemplo · a confirmar": copy de prototipo, no va a producción (horarios salen de Ajustes).
- Sábado: la grilla muestra filas de tarde con borde transparente (cerrado) pero la reserva 2f ofrecía tarde el sábado; manda Ajustes.
- Jue 8 resaltado como "hoy" mientras 2i dice "jueves 1 oct" (dos "hoy").
- Teléfonos inventados `'223 555-0' + (100 + n*7)`: no coinciden con 3e (resuelto en demo, ver nota de `appointments.ts`).
- "Cuándo" usa "Jueves 8 oct · 17:30" (con mayúscula); `AppointmentView.dayLabel` da "jueves 8 de octubre".
- No hay botón "Cancelar" en el panel aunque el README pide confirm/reprogram/cancel/WhatsApp; tampoco "Avisar por WhatsApp" para turnos confirmados.
- La nota interna aparece como texto fijo (no input) en el prototipo.
- Sidebar dice Turnos 14 (= turnos de la semana); en 2i `adminNav` dice 6.
