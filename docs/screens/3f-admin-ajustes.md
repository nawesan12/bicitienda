# 3f · Admin Ajustes (local, turnos, pagos y mensajes de WhatsApp)

- PNG: [prototype/3f.png](prototype/3f.png)
- Ruta: `/admin/ajustes` (existe `app/admin/(panel)/ajustes/` heredado: `page.tsx`, `settings-editor.tsx`)
- Agente dueño: **D Admin**
- Fuente: `BiciTienda MDQ.dc.html` l.311–340; datos `adminVals()` → `sched`, `templates` (~l.721–727).

Artboard 1440 × ≥980, grilla `240px | minmax(0,1fr)`, fondo ink.

## Estructura (bloques en orden)

### 0. Sidebar
`AdminSidebar active="ajustes"` (Pedidos 7 · Turnos 14 · Presupuestos 2 · Productos 124). Ver `shell.md`.

### 1. Top bar
`padding:22px 40px`, `gap:14px`, borde inferior line. H1 "Ajustes" (900 44px/1 @66% uppercase) · spacer · botón primario "Guardar cambios" (yellow, `padding:12px 18px`, radio 6, 800 14px uppercase `.06em`, nowrap). Sin búsqueda.
Componente bt: `AdminTopBar { title: "Ajustes", actions: <Button variant="primary" size="header">Guardar cambios</Button> }`.

### 2. Cuerpo
Grilla `200px minmax(0,1fr)`, `gap:28px`, `padding:24px 40px 40px`, `align-items:start`.

#### 2.1 Sub-nav (200px)
`<nav>` column `gap:4px`. Ítems `padding:11px 14px`, radio 6, Archivo 14px uppercase `.06em`.
- Activo "Local": bg `#1f1d1a`, peso 800, `box-shadow: inset 3px 0 0 #ffd21f`, texto paper.
- Resto peso 700, color `#cfc8bb`: "Turnos" · "Pagos" · "Notificaciones" · "Usuarios".
**SIN componente bt** (nav vertical con barra amarilla; `SegmentedControl` es horizontal y la clase `selected-row` da el inset pero no el ítem).

#### 2.2 Columna de contenido (column `gap:20px`)
Cards: bg `#1f1d1a`, borde `1px #2b2824`, radio 10, `padding:24px`, column `gap:18px` (las de Servicios/Pagos `gap:14px`). Título: 900 26px/1 @70% uppercase. Labels: 700 12px uppercase `.08em` `#8d867a`, `gap:8px`. Controles: bg ink, borde `#3a362f`, radio 6, `padding:12px 14px`, 15px paper; placeholders "[… a confirmar]" en `#8d867a`.
Componente bt: `Panel { surface: "surface", padding: "lg" }` + `PanelTitle size="md"` + `Field` + `Input`/`Select { surface: "panel" }`.

**A. "Datos del local"** — grilla `1fr 1fr`, `gap:12px`:
- "Dirección" → "[Dirección a confirmar]"
- "WhatsApp del local" → "[Número a confirmar]"
- "Email de contacto" → "[Email a confirmar]"
- "Instagram" → "@bicitiendamdq"

**B. Fila de 2 columnas** — grilla `minmax(0,1.2fr) minmax(0,1fr)`, `gap:20px`, `align-items:start`.

B1. **"Horarios para turnos"** (izq.)
- Header flex `space-between` baseline: título + "EJEMPLO" (Mono 600 12px `#8d867a`).
- 7 filas: grilla `48px 110px 1fr 1fr`, `gap:10px`, `padding:8px 0`, `border-top:1px solid #2b2824`, 14px.
  - Switch 40×22 (on yellow/knob ink derecha; off `#3a362f`/knob `#8d867a` izquierda).
  - Día: 800; color paper si abre, `#8d867a` si cerrado.
  - Mañana / Tarde: "input" bg ink, borde `#3a362f`, radio 6, `padding:8px 10px`, 13px, color igual al día.
  - Valores exactos: Lunes–Viernes: on · "10:00 – 13:00" · "16:00 – 19:00". Sábado: on · "10:00 – 13:00" · "Cerrado". Domingo: off · "Cerrado" · "Cerrado" (texto `#8d867a`).
- Debajo, grilla `1fr 1fr 1fr`, `gap:10px`: "Por horario" → "1 turno ▾" · "Anticipación" → "2 horas ▾" · "Reservar hasta" → "30 días ▾".
Componente bt: `Toggle` (sin label, `aria-label`), `Input size="sm"` (bt sm = 10×12 14px; el prototipo 8×10 13px), `Select`. **SIN componente bt** para la fila de horario (toggle + día + 2 rangos).

B2. Columna derecha (column `gap:20px`):
- **"Servicios"** (`gap:14px`): 2 filas `space-between`: título 800 15px + bajada 13px `#8d867a`, switch a la derecha.
  - "Prueba de bici" / "30 min · se paga en el local" — on
  - "Asesoramiento de compra" / "30 min · se paga en el local" — on
  Componente bt: `Toggle { label, description }`.
- **"Pagos"** (`gap:14px`):
  - Fila "Mercado Pago" (800 15px) + pill "Conectado" (800 12px uppercase `.06em`, ink sobre yellow, `padding:5px 10px`, radio 999). → `Pill { tone: "yellow", size: "lg" }`.
  - Grilla `1fr 1fr`, `gap:10px`: "Off transferencia" → "10 %" · "Cuotas sin interés" → "Hasta 6".
  - "Alias / CBU" → "[Alias a confirmar]".
  - Fila "Efectivo al retirar" (700 15px) + switch on. → `Toggle { label }`.

**C. "Mensajes automáticos de WhatsApp"** (card ancho completo)
- Header `space-between` baseline: título + "Los campos entre llaves se completan solos" (13px `#8d867a`).
- Grilla `repeat(3,minmax(0,1fr))`, `gap:12px`. Cada plantilla: bg ink `#121110`, borde `1px #3a362f`, radio 8, `padding:16px`, column `gap:10px`.
  - Header: nombre 800 15px + "cuándo" (Mono 600 11px uppercase `#8d867a`), switch on a la derecha.
  - Burbuja: bg surface-3 `#26231f`, radio `8px 8px 8px 2px`, `padding:12px`, Archivo 14px/1.5 `#cfc8bb`.
- Copy exacto:
  1. "Turno confirmado" · "Al reservar" · "¡Hola {nombre}! Te esperamos el {día} a las {hora} para tu {servicio} en BiciTiendaMDQ. Si no podés venir, reprogramá acá: {link}"
  2. "Recordatorio" · "24 hs antes" · "Hola {nombre}, te recordamos tu turno de mañana a las {hora}. ¡Te esperamos en el local!"
  3. "Pedido listo" · "Al marcarlo listo" · "¡{nombre}, tu {producto} ya está armada y lista! Pasá a buscarla con tu DNI y el pedido {número}."
**SIN componente bt** para la card de plantilla + burbuja de WhatsApp (editable: la burbuja debería ser un `Textarea` con el estilo de burbuja).

## Estados e interacciones
- Prototipo estático (sin variantes PNG). Sub-nav con "Local" activo pero se ven todas las secciones apiladas.
- Toggles de día habilitan/deshabilitan los rangos (cerrado → "Cerrado" en `#8d867a`).
- Plantillas: edición del texto; placeholders válidos `{nombre} {día} {hora} {servicio} {producto} {número} {link}`.

## Datos
- Demo (`lib/data/demo/settings.ts`): `STORE_INFO` (address, whatsapp, email, instagram), `WEEKLY_SCHEDULE` (am 10:00–13:00 lun–sáb, pm 16:00–19:00 lun–vie), `APPOINTMENT_SETTINGS` (slotMinutes 30, slotCapacity 1, minNoticeMin 120, maxDaysAhead 30), `SERVICES` (`adminName`, `note`), `SCHEDULE_BLOCKS`, `PAYMENT_SETTINGS` (mercadoPago.connected, transferDiscountPct 10, maxInstallments 6, alias, cashEnabled), `WHATSAPP_TEMPLATES` (solo turno_confirmado y pedido_listo), `TEMPLATE_PLACEHOLDERS`.
- Real (lectura): `getAdminSettings()` (`admin-queries.ts`, fila `settings` "main": whatsapp, instagram, address, hours, transferAlias, transferDiscount, maxInstallments, cashEnabled, cashReservationHours, reservationHours, slotMinutes, slotCapacity, minNoticeMin, maxDaysAhead, autoConfirmAppointments…); `getAgendaSettings()`, `getScheduleRules()`, `getAppointmentServices()` (`appointments.ts`); `getWhatsAppTemplates()` (`whatsapp-templates.ts`); estado de pasarela: `isGatewayConfigured(method)` / `isOnlinePaymentAvailable(method)` (`payment-availability.ts`); opciones resultantes: `paymentOptions(runtime)` (`checkout-options.ts`).
- Acciones:
  - Local y pagos: `patchSettings(patch)` (`actions/settings.ts`) — acepta `whatsapp, instagram, address, hours, mapsUrl, transferDiscount, transferAlias, reservationHours, r3, r6, depositPct, depositMinTotal, localShippingCost, showPrices, ventaOnline, tiktok, whatsappGroupUrl` (autosave por campo).
  - Horarios: `adminSaveScheduleRules([{ weekday 0–6, startTime "HH:MM", endTime, active? }])` (dos franjas por día = dos reglas).
  - Por horario / Anticipación / Reservar hasta: `adminSaveAgendaSettings({ slotCapacity, minNoticeMin, maxDaysAhead, slotMinutes?, autoConfirmAppointments? })`.
  - Servicios: `adminPatchService(id, { active, name?, description?, durationMin?, priceNote? })`.
  - Plantillas: `adminSaveWhatsAppTemplate(id, body)` / `adminResetWhatsAppTemplate(id)` (`actions/whatsapp.ts`), `id: "turno_confirmado" | "pedido_listo"`.

## Componentes bt faltantes
- Sub-nav vertical de ajustes (ítem activo con bg surface + inset amarillo).
- Fila de horario semanal (toggle + día + rango mañana + rango tarde).
- Card de plantilla de WhatsApp (nombre, cuándo, toggle, burbuja editable con radio 8/8/8/2).
- (Menor) Input compacto 8×10 13px (bt `Input size="sm"` es 10×12 14px).

## Ambigüedades
- **"Usuarios"** en la sub-nav: el bt README y `settings.ts` dicen que no va (el admin entra con PIN). Sacarlo.
- **Plantilla "Recordatorio"**: `copy.ts` dice que no hay recordatorios automáticos y `WhatsAppTemplateId` es solo `turno_confirmado | pedido_listo`. Mostrar 2 cards (o la 3.ª deshabilitada), no 3.
- **"Mensajes automáticos"** y los toggles de plantilla: en el core nada se envía solo (el admin toca el botón y se abre wa.me). El título y los toggles prometen automatismo que no existe; sugerido "Mensajes de WhatsApp" y sin toggle (o toggle sin efecto definido).
- **Mercado Pago "Conectado"**: el core también soporta Payway (`isGatewayConfigured("payway")`) y Rodar usa Payway; definir qué pasarela muestra la fila y de dónde sale el estado (credenciales por env, no se conectan desde el admin).
- **`patchSettings` no acepta** `cashEnabled` ("Efectivo al retirar"), `maxInstallments` ("Cuotas sin interés: Hasta 6") ni email de contacto (no existe columna `email` en `settings`). Hace falta ampliar el schema/action o dejarlos de solo lectura.
- Horarios del local (`settings.hours`, texto libre del footer) vs horarios de turnos (`schedule rules`): el diseño solo muestra los de turnos; "Datos del local" no tiene campo "Horarios" pero el footer lo usa.
- "Guardar cambios" global vs autosave por campo de las actions.
- La pantalla apila todas las secciones aunque la sub-nav sugiera tabs: decidir anclas (scroll) o tabs por sección (`?s=turnos`).
- "Notificaciones" en la sub-nav = sección de plantillas WhatsApp (asumido).
- Bloqueos de agenda (`SCHEDULE_BLOCKS`, feriado 12/10) no tienen UI en 3f; están en 3b ("Bloquear horario").
