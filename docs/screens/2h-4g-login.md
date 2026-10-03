# 2h / 4g · Login / registro (+ recuperar contraseña)

- PNG: [2h ingresar](prototype/2h.png) · [2h crear cuenta](prototype/2h--registro.png) · [4g ingresar](prototype/4g.png) · [4g crear cuenta](prototype/4g--registro.png)
- Rutas: `/cuenta/ingresar` (tab Ingresar), `/cuenta/registro` (tab Crear cuenta), `/cuenta/recuperar` (**sin diseño**, derivada de 2h, ver abajo)
- Dueño: **C Cliente**
- Fuente: `BiciTienda MDQ.dc.html` l.590–610 (2h), l.164–178 (4g); estado `tab` / `tabs` / `isReg` / `isLogin` / `authTitle` / `authCta` en `renderVals()`.

## Estructura desktop (2h, 1440)

0. **Header** `active=""`, sin `account`/`cart` (default "Cuenta", "Carrito · 2" en el prototipo). Ver `shell.md`. **Sin Footer** en el artboard.

1. **Split**: grid `1fr 1fr`, `min-height:760px`.

2. **Columna izquierda (foto)**: `position:relative; overflow:hidden`, flex column `justify-content:flex-end`, padding 56, gap 16.
   - Foto Pexels 132695 (`alt="Bicicletas colgadas en el local"`), `position:absolute; inset:0; object-fit:cover`.
   - Gradiente `linear-gradient(180deg, rgba(18,17,16,.15) 30%, rgba(18,17,16,.92))`.
   - H2: "Tus turnos y pedidos, " + `<span>` yellow "en un lugar." — Archivo 900 88px/.86 @66% uppercase.
   - Párrafo: "Reprogramá una prueba, seguí el armado de tu bici y comprá más rápido la próxima vez." — 18px/1.5 text-2 `#cfc8bb`, max-width 480.
   - Componentes bt: `Display` + `Highlight` (no hay size 88/.86: más cercano `page` 96/.86 → usar `className`). **SIN componente bt** para el panel foto+gradiente → falta `PhotoPanel { image, alt, gradient: "auth"|"hero", children }` (el hero de 2a usa el mismo patrón con otro gradiente).

3. **Columna derecha (formulario)**: flex centrado, padding 56; caja `width:100%; max-width:440px`, column gap 22.
   1. **Tabs**: grid `1fr 1fr`, bg surface `#1f1d1a`, radius 8, padding 4. Tab: padding 13×0, radius 6, 800 15px uppercase .06em, centrado; activa bg yellow / ink; inactiva transparente / text-2. Copy: "Ingresar" · "Crear cuenta". → `SegmentedControl tone="yellow"` con `href` a `/cuenta/ingresar` y `/cuenta/registro` (ya replica 13px/15px .06em en md).
   2. **H1** `authTitle`: "Hola de nuevo" (login) / "Creá tu cuenta" (registro) — 900 56px/.9 @66% uppercase. → `Display` (sin size 56/.9: `className`).
   3. **Solo registro**: grid `1fr 1fr` gap 12 con 2 inputs **sin label** (solo placeholder): "Nombre", "WhatsApp". Input: bg surface, borde 1px line-strong `#3a362f`, radius 6, padding 15×16, 15px, texto paper. → `Input surface="page" size="lg"` (con `aria-label`).
   4. **Email**: `<label>` column gap 8, 700 13px uppercase .08em text-3: "Email" + input placeholder "vos@email.com" (mismo estilo). → `Field size="md" label="Email"` + `Input surface="page" size="lg" type="email"`.
   5. **Contraseña**: label "Contraseña" + `type=password` placeholder "••••••••". → `Field` + `Input`.
   6. **Solo login**: link "Me olvidé la contraseña" — `align-self:flex-end`, 600 14px yellow, subrayado → `/cuenta/recuperar`. → `TextLink tone="yellow" underline`.
   7. **CTA** `authCta`: "Ingresar" / "Crear cuenta" — bg yellow, ink, padding 18×0, radius 6, 800 16px uppercase .06em, ancho completo. → `Button variant="primary" size="full-lg" type="submit"`.
   8. Divisor "o": flex gap 14, 13px text-3, líneas 1px line `#2b2824` a cada lado. **SIN componente bt** (`Divider` no lleva texto).
   9. "Continuar con Google": borde 1.5px line-btn `#4a453e`, padding 16×0, radius 6, 700 15px centrado. **NO implementar** (ver Ambigüedades).
   10. Nota: "También podés comprar y reservar sin cuenta. Te pedimos solo nombre y WhatsApp." — 14px/1.5 text-3, centrado.

## Mobile (4g, 390)

- **MobileHeader** `search=false`.
- **Foto** arriba: alto 220, padding 16, `align-items:flex-end`, gradiente `linear-gradient(180deg, rgba(18,17,16,.1), rgba(18,17,16,.92))` (distinto del desktop); H2 900 44px/.9 @66% uppercase (inline dice 40px y lo pisa `font-size:44px`), mismo copy con "en un lugar." amarillo. Sin párrafo.
- Formulario: padding `20px 16px 32px`, column gap 16.
  - Tabs: igual pero min-height 44, 800 14px .06em.
  - H1: 900 48px/.88 @66% (inline 56 pisado por `font-size:48px`).
  - Registro: Nombre y WhatsApp **apilados** (column gap 10).
  - Email y Contraseña **sin label**: placeholder "Email" / "Contraseña" (no "vos@email.com"/"••••••••"). Inputs padding 15×14, 16px.
  - "Me olvidé la contraseña": igual + padding 6×0 (hit target).
  - CTA min-height 52, 800 15px.
  - "Continuar con Google": min-height 50, borde `#4a453e`, 700 15px sin uppercase. **No va** (sin divisor "o" en mobile).
  - Nota corta: "También podés comprar y reservar sin cuenta." 13px/1.5 text-3 centrado.

## Estados e interacciones

- State `tab: 'login' | 'reg'` (default `login`). En la app: dos rutas, el `SegmentedControl` navega entre ellas (o un solo componente cliente con tabs y `router.replace`).
- Errores de servidor: los devuelve la action como `{ ok:false, error }`; **sin diseño de error** → mostrar con `Field error` (texto 13px 600 red-light `#ff6a5c`) o un mensaje arriba del CTA en red-light.
- Éxito login/registro → redirect a `/cuenta` (o a `?next=` si vino de checkout/turnos). `registerAccount` devuelve `linked` (pedidos/turnos previos vinculados por email/teléfono): se puede avisar "Sumamos N pedidos/turnos anteriores" (sin diseño).
- Validaciones (zod en `actions/account.ts`): email válido ("Revisá el email."), contraseña ≥ `MIN_PASSWORD` = 8 ("La contraseña tiene que tener al menos 8 caracteres."), nombre ≥ 2 ("Completá tu nombre."), WhatsApp AR `isValidArPhone` ("Revisá el WhatsApp: 10 dígitos con la característica (ej. 223 555-0182)."). Login fallido: "Email o contraseña incorrectos.". Rate limit: "Demasiados intentos. Esperá un minuto.".
- Cuentas apagadas (`store.features.accounts === false`): las actions devuelven "Las cuentas no están disponibles." → las rutas deberían 404 o redirigir.

### /cuenta/recuperar (sin diseño, propuesta)

Mismo layout que 2h/4g (foto izquierda + caja 440px), sin tabs:
1. Paso pedir: H1 "Recuperá tu contraseña" (mismo estilo que `authTitle`), texto 14–15px text-2, `Field "Email"` + CTA primario "Mandame el link" → `requestPasswordReset({ email })`. Respuesta siempre igual (no revela si existe): "Si hay una cuenta con ese email, te mandamos un link. Vence en 60 minutos." (`RESET_TTL_MIN = 60`). Link "← Volver a ingresar" (`TextLink tone="yellow"`).
2. Paso con token (`/cuenta/recuperar?token=…`: es la URL que arma `sendPasswordResetEmail` en `lib/server/mail.ts` con `paths.recover()`): `checkResetToken(token)`; si inválido → `EmptyState` "El link venció" + volver a pedir; si válido → `Field "Contraseña nueva"` + CTA "Guardar e ingresar" → `resetPassword({ token, password })` (ingresa y redirige a `/cuenta`).
Todo el copy de esta pantalla es propuesto (no está en el handoff ni en `COPY.auth`).

## Datos

| Bloque | Demo / copy | Real |
|---|---|---|
| Foto + textos | `COPY.auth.photo` (`DEMO_PHOTOS.local`), `photoAlt`, `asideTitleLead`, `asideTitleHighlight`, `asideText` | `demoPhoto()` / Cloudinary |
| Tabs, títulos, CTAs, campos | `COPY.auth.tabs`, `titles`, `ctas`, `fields`, `forgot`, `guestNote`, `guestNoteMobile` | idem |
| Ingresar | — | `loginAccount({ email, password })` → `AccountResult` |
| Crear cuenta | — | `registerAccount({ name, phone, email, password })` → `AccountResult` (`linked?`) |
| Recuperar | — | `requestPasswordReset({ email })`, `checkResetToken(token)`, `resetPassword({ token, password })` |
| Sesión | — | `getMyAccount()` (si ya hay sesión, `/cuenta/ingresar` redirige a `/cuenta`) |

Todas en `lib/server/actions/account.ts`; internamente usan `lib/server/accounts.ts` (`authenticate`, `registerAccount`, `createPasswordReset`, `isResetTokenValid`, `consumePasswordReset`).

## Componentes bt faltantes

- `PhotoPanel` (o `AuthAside`) — foto cover + gradiente + contenido abajo (2h izquierda, 4g arriba; reusable por el hero de 2a con su gradiente).
- `TextDivider` — divisor con texto "o" (solo si se mantiene algún login alternativo; sin Google no hace falta).
- `Display` sin tamaños 88/.86, 56/.9, 48/.88, 44/.9 (`className`).

## Ambigüedades

- **"Continuar con Google"**: está en 2h y 4g y el README lo marca "opcional"; `copy.ts` lo saca ("cuentas solo con email + contraseña"). **No se implementa** (ni el divisor "o").
- **Labels**: desktop usa label arriba para Email/Contraseña pero solo placeholder para Nombre/WhatsApp; mobile solo placeholders. Por accesibilidad, usar `aria-label` (o labels visibles uniformes en ambos — decisión de C).
- Placeholders distintos desktop ("vos@email.com", "••••••••") vs mobile ("Email", "Contraseña").
- El prototipo pide en registro solo nombre + WhatsApp + email + contraseña; no hay "repetir contraseña" ni términos.
- `/cuenta/recuperar` y el estado "link enviado" / "link vencido" no tienen diseño (propuesta arriba).
- Header del prototipo muestra "Carrito · 2" en 2h (default del componente); en la app, el contador real.
