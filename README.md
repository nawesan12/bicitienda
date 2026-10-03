# BiciTienda MDQ

Tienda online de una bicicletería de Mar del Plata. Tiene catálogo con talles
y colores, compra con retiro en el local, turnos, presupuestos, cuentas de
cliente y un admin propio con PIN.

Es un **proyecto independiente**: se generó copiando `tienda-starter/` y
evoluciona solo. No comparte código en vivo con Rodar ni con otras tiendas, y
`rodar/` no se toca para extender esta tienda.

- Diseño: `design_handoff_bicitienda_mdq/` (no se versiona). Para verlo, abrí
  `BiciTienda MDQ.dc.html` con `npx serve` en esa carpeta.
- Plan completo, decisiones y estado: `~/.claude/plans/bicitienda-construccion.md`.
- Salida a producción: [`DEPLOY.md`](DEPLOY.md).

## Módulos

Se prenden y se apagan con `store.features` en `lib/config.ts`.

| Módulo | Flag | Qué hace |
|---|---|---|
| Variantes talle × color | `variants` | Stock y libro de movimientos por variante. El selector de color aparece solo si hay más de un color. Cada talle lleva la altura sugerida. |
| Cuentas de cliente | `accounts` | Email y contraseña, sin Google. Recupero por mail con link de un solo uso. Comprar no exige cuenta: se pide nombre, WhatsApp y email opcional. |
| Turnos | `appointments` | Agenda a partir de horarios y bloqueos, con capacidad por slot. El cliente reprograma o cancela desde su cuenta o desde el link del turno. |
| Presupuestos | `quotes` | Pedido de presupuesto (`P-` desde 0213). El admin cotiza y, cuando el cliente acepta, lo convierte en pedido. |
| Pagos | `payments: { payway: false, mp: true }` + `cashPayment` | Mercado Pago Checkout Pro (hasta `settings.maxInstallments` cuotas sin interés), transferencia (10% off, reserva 24 h, comprobante adjuntable) y efectivo en el local. Sin seña (`deposit: false`). |
| Solo retiro | `pickupOnly` | El checkout ofrece solo "Retiro en el local". |
| Importación de planilla | `csvImport` | CSV o XLSX con plantilla, preview con los errores de cada fila y upsert por SKU. |
| Mails | `emails` | Resend con los 14 mails de la tienda. |
| Clientes en el admin | `admin.customers` | Ficha, historial y exportación. |

Las plantillas de WhatsApp (turno confirmado, pedido listo, etc.) se editan
en Ajustes y abren `wa.me` con el mensaje armado. No hay Cloud API ni
recordatorios automáticos.

Números: pedidos `BT-` desde 10482 y presupuestos `P-` desde 0213.

**Flags apagados**: `comparador`, `blog`, `agenda`, `asesor`, `repairs`,
`community`, `pos`, `editorVisual`, `deposit`, `payments.payway` y
`admin.locations` (hay un solo local). Payway sigue en el core, listo para
prenderlo.

## Stack

- Next.js 16 (App Router) con Tailwind 4 y pnpm.
- Drizzle sobre **Neon Postgres** en producción y **PGlite** embebido en
  local (`.data/pglite`).
- Cloudinary para las imágenes y Resend para los mails.
- Mercado Pago Checkout Pro por REST, sin SDK. Payway también está en el
  core, apagado.
- Vercel en la región `gru1` (`vercel.json`), con un cron diario.

Todo corre en local sin credenciales: cada integración pasa a modo real
cuando se setea su variable.

| Pieza | Sin variable | Con variable |
|---|---|---|
| Base | PGlite en `.data/pglite` | Neon (`DATABASE_URL`) |
| Admin | PIN `000000` (solo en dev) | `ADMIN_PIN_HASH` + `ADMIN_SESSION_SECRET` |
| Imágenes | `public/`, y los uploads en `.data/uploads/` | Cloudinary (`CLOUDINARY_URL`) |
| Pagos | Sandbox local `/checkout/pago-simulado` | Mercado Pago (`MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`) |
| Mails | Outbox en `.data/outbox/*.html` | Resend (`RESEND_API_KEY`, `MAIL_FROM`) |

## Puesta en marcha local

```bash
pnpm install
cp .env.example .env.local     # opcional: en local todo anda sin envs
pnpm db:migrate                # PGlite en .data/pglite
pnpm db:seed                   # catálogo + operación demo
pnpm dev --port 3100
```

- **Puerto 3100**: el script `dev` es `next dev` a secas (puerto 3000), pero
  los links de los mails, del WhatsApp y los retornos del sandbox de pago
  apuntan a `http://localhost:3100` (`lib/site.ts`). Usá `--port 3100`, o
  seteá `DEV_SITE_URL` si usás otro puerto.
- **Una sola conexión a PGlite**: dos procesos sobre `.data/pglite` la
  corrompen. Por eso los scripts (`db:migrate`, `db:seed`, los tests) toman
  un lock y fallan si el dev server está abierto.
- **Auto-migrate de dev**: con `next dev` y sin `DATABASE_URL`, `getDb()`
  aplica solo las migraciones pendientes en el primer request después de que
  cambia `lib/server/db/migrations/meta/_journal.json`. Así una migración
  nueva entra sin cerrar el server. Nunca corre contra Neon ni en build o
  producción. Si falla, lo loguea y reintenta en el próximo request.
- **Refrescar las fechas de la demo**: los turnos y pedidos demo tienen
  fechas relativas al día del seed. Para recargarlos con fechas de hoy:
  1. Cerrá el dev server.
  2. `rm -rf .data/pglite`
  3. `pnpm db:migrate && pnpm db:seed`

  La operación demo entra solo en una base **sin clientes**, así que un
  `db:seed` sobre una base con datos no la recarga.

### Accesos locales

- Admin: `/admin`, PIN **`000000`**. Solo funciona en desarrollo y sin
  `ADMIN_PIN_HASH`.
- Cuenta demo: **`juanperez@gmail.com`** / **`bicitienda-demo`** (Juan
  Pérez, con pedidos, turnos anteriores y el próximo).
- Mails: quedan en `.data/outbox/`.
- Pago online: `/checkout/pago-simulado` simula un pago aprobado o
  rechazado.
- Cron: `curl localhost:3100/api/cron/diario` (en dev no pide header).

## Rutas

Los paths públicos salen de `routes` en `lib/config.ts`, y los links del core
siempre pasan por `lib/paths.ts`.

### Tienda (`app/(tienda)`)

| Ruta | Pantalla |
|---|---|
| `/` | Home |
| `/catalogo` · `/catalogo/[slug]` | Catálogo con filtros. El slug es una categoría o una ficha de producto. |
| `/checkout` | Carrito con pago integrado y tus datos |
| `/checkout/confirmacion/[numero]` | Confirmación (MP, transferencia con comprobante, efectivo) |
| `/checkout/pagar/[numero]` | Redirige a la pasarela |
| `/checkout/pago-simulado` | Sandbox local. Nunca se abre en producción. |
| `/seguimiento` · `/seguimiento/[numero]` | Seguimiento por WhatsApp o email |
| `/turnos` · `/turnos/[numero]` | Reserva de turno y gestión por link |
| `/presupuesto` | Pedir presupuesto |
| `/cuenta` | Mi cuenta: turno, pedidos, presupuestos y datos |
| `/cuenta/ingresar` · `/cuenta/registro` · `/cuenta/recuperar` | Login, registro y recupero |

### Admin (`app/admin`, cerrado por `proxy.ts`)

| Ruta | Sección |
|---|---|
| `/admin/ingresar` | Login con PIN (5 errores seguidos bloquean 15 minutos) |
| `/admin` | Resumen: KPIs del día, turnos de hoy, pedidos por atender |
| `/admin/pedidos` · `/admin/pedidos/[numero]` | Pedidos con máquina de estados, comprobante, WhatsApp y exportación (`/exportar`) |
| `/admin/turnos` | Agenda semanal y diaria, turno manual, bloqueos |
| `/admin/presupuestos` | Editor de ítems, avance de estado y crear pedido |
| `/admin/productos` · `/admin/productos/[id]` | Productos y editor con variantes y fotos |
| `/admin/productos/importar` · `/admin/productos/plantilla` | Importar planilla y bajar la plantilla |
| `/admin/clientes` | Ficha, historial y exportación (`/exportar`) |
| `/admin/consultas` | Clicks de WhatsApp y avisos (pago tardío), exportación (`/export`) |
| `/admin/ajustes` | Local, horarios de turnos, servicios, pagos y plantillas de WhatsApp |

### API y otras

- `/api/mp/webhook`: IPN de Mercado Pago. Responde 404 si faltan las credenciales.
- `/api/payway/webhook`: Payway (apagado).
- `/api/cron/diario`: vence las reservas sin pago. Lo llama Vercel Cron.
- `/api/leads`: registra los clicks de WhatsApp.
- `/api/dev/revalidate`: solo en local.
- `/admin/archivos/[kind]/[file]` y `/uploads/[...file]`: archivos locales
  cuando no hay Cloudinary.
- `sitemap.xml`, `robots.txt`, `manifest` y las imágenes OG.

Las rutas heredadas del starter que esta tienda no usa (comparador,
comunidad, nosotros, novedades, reparaciones; y en el admin contenido,
comunidad, stock, sucursales, test, etc.) se están borrando. Mientras
existan, sus flags las dejan fuera del sitio.

## Estructura

| Carpeta | Qué hay |
|---|---|
| `lib/config.ts` | Capa por tienda: datos del local, `features`, `routes`, medios de pago y entrega |
| `lib/data/` | Seed: `catalog.ts`, `content.ts`, `texts.ts`, `operations.ts` y los datos del prototipo en `lib/data/demo/` |
| `components/bt/` | Sistema de diseño de BiciTienda: componentes presentacionales con props tipadas, sin acceso a la base. También tiene los shells (Header, Footer, AdminSidebar). Ver [`components/bt/README.md`](components/bt/README.md) para tokens, props y decisiones. Muestra en `/bt-kit` (solo en dev). |
| `app/(tienda)/`, `app/admin/(panel)/` | Pantallas. Los componentes propios de una sola pantalla viven junto a ella (`_components`, `_screens`). |
| `lib/server/` | Core del servidor: pedidos, pagos, stock, turnos, presupuestos, cuentas, mails, importación y seed |
| `lib/server/actions/` | Server actions |
| `lib/server/screens/` | Queries que arman los datos de cada pantalla (una por área: tienda, compra, cliente, admin) |
| `lib/server/db/` | `schema.ts`, conexión (`index.ts`) y migraciones `0000`–`0011` |
| `emails/` | Plantillas de mail (React) |
| `docs/screens/` | Pack de pantallas: un md por pantalla con medidas, copy, datos y componentes, más las capturas del prototipo en `prototype/`. Índice en [`docs/screens/README.md`](docs/screens/README.md). |
| `docs/emails/` | Preview de los 14 mails (HTML, texto plano y PNG). Se abre con `docs/emails/index.html`. |
| `scripts/` | Migrate, seed, PIN, imágenes, tests y capturas |

## Scripts

| Comando | Qué hace |
|---|---|
| `pnpm dev --port 3100` | Dev server |
| `pnpm build` · `pnpm lint` | Build y ESLint |
| `pnpm db:migrate` | Migraciones contra Neon si hay `DATABASE_URL`, si no contra PGlite |
| `pnpm db:seed` | Catálogo, ajustes y contenido. En una base sin clientes, también la operación demo. |
| `pnpm db:generate` · `pnpm db:studio` | Nueva migración desde el schema y explorador de la base |
| `pnpm test:integration` | Tests de integración contra una PGlite temporal (`scripts/tests/`) |
| `pnpm exec tsx scripts/emails/preview.ts` | Regenera `docs/emails/` (`--no-png` para solo HTML y TXT) |
| `pnpm screens:prototype [ids]` | Recaptura el prototipo a `docs/screens/prototype/` (necesita red) |
| `pnpm demo:images` | Sube las fotos demo de Pexels a Cloudinary (`bicitienda-mdq/demo/`) y las mergea al manifest (`--dry-run`, `--force`) |
| `pnpm seed:images` | Sube fotos del seed y logos a Cloudinary (carpeta `bicitienda/`, el `store.slug`) y mergea `lib/data/image-manifest.json` |
| `pnpm optimize:images` | Originales de `public/products/src/` → WebP |
| `pnpm admin:pin` | Genera `ADMIN_PIN_HASH` y `ADMIN_SESSION_SECRET` |

## Datos que tiene que mandar el cliente

Hoy figuran como "[… a confirmar]" en la web y en el admin.

| Dato | Dónde se carga |
|---|---|
| Dirección | Admin → Ajustes → Local |
| Horarios de atención | Ajustes → Local (texto visible). El horario de turnos va en Ajustes → Horarios para turnos. Si cambia, actualizar también `openingHours` (schema.org) en `lib/config.ts`. |
| WhatsApp | Ajustes → Local. Hoy es un número inexistente (`WHATSAPP_PENDING` en `lib/config.ts`). |
| CBU, titular, banco y alias | Ajustes → Pagos |
| Marcas | Columna `marca` de la planilla de importación (crea las que falten) o el editor de producto. El seed trae una sola marca, "[Marca a confirmar]". |
| Precios reales | Planilla de importación o Admin → Productos |
| Fotos | Editor de producto (con `CLOUDINARY_URL`) o columna `fotos` de la planilla |
| Email de contacto | **No tiene columna en `settings`**: se edita en `STORE_INFO.email` (`lib/data/demo/settings.ts`) y en Ajustes aparece de solo lectura. |
| Dominio | `store.siteUrl` en `lib/config.ts` (provisorio: `bicitiendamdq.com.ar`) y `NEXT_PUBLIC_SITE_URL` |

## Estado y pendientes (2026-10-03)

En producción, vacía: https://bicitienda-mdq.vercel.app (Neon `bicitienda-db`).

Hecho:

- Core, identidad, sistema de diseño y todas las pantallas (Olas 0 y 1, con
  su cierre).
- 404 con estética bt; sin "6 cuotas" en la web: Mercado Pago aparece a
  secas.
- **El taller va al frente** (pedido del cliente: es lo que más le deja).
  - Página `/reparaciones`, bloque en la home, "Taller" en header, menú
    mobile y footer, y servicio de turnos `reparacion`.
  - En el admin: "Taller hoy" en el resumen y la card "Taller" en Ajustes
    para editar `content.rep`.
  - Los servicios se muestran sin precios; el presupuesto se pasa por
    WhatsApp.
- **Sin pruebas de bici.**
  - La migración 0012 apaga el servicio `prueba` y pone `test_ride` y
    `allows_product` en false.
  - Esas columnas siguen en el schema pero no se usan: no hizo falta una
    migración destructiva.

Falta (cuando el cliente pase las cuentas):

- Credenciales de Mercado Pago y `RESEND_API_KEY`. Sin Resend, los mails se
  saltean con un aviso en el log.
- Cloudinary del cliente (sección 5 de DEPLOY.md).
- Dominio: `NEXT_PUBLIC_SITE_URL`, `store.siteUrl` y
  `scripts/emails/preview.ts`.
- Foto real del taller para el hero de `/reparaciones` (hoy es de stock).
- E2E con Playwright: quedaron para más adelante. Hoy cubren los tests de
  integración (31 suites) y un smoke de rutas.
