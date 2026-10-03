# Guía de deploy: BiciTienda MDQ

Checklist para el día que se decida publicar. **Todavía no se deploya**: es
decisión del usuario. Hoy todo corre en local (PGlite, sandbox de pagos,
outbox de mails y PIN de desarrollo). Publicar es sobre todo provisionar
servicios y cargar variables, pero antes hay que resolver los puntos de la
sección 0.

Stack de producción: **Vercel** (región `gru1`, São Paulo) · **Neon
Postgres** · **Cloudinary** · **Mercado Pago Checkout Pro** · **Resend**.
Payway está en el core pero apagado (`features.payments.payway = false`).
Instagram no se usa: "Conectar Instagram" no vuelve (decisión del usuario) y
la tienda no muestra feed.

**Un único deploy de producción, sin previews.** Es la preferencia del
usuario: un solo proyecto en Vercel, las variables cargadas solo en
*Production* y los deploys de preview desactivados. Si existe un proyecto
viejo, se borra.

## 0. Antes de empezar

### Datos del cliente

- [ ] Dirección, horarios de atención y WhatsApp real (Admin → Ajustes →
      Local). El WhatsApp de hoy es un número inexistente.
- [ ] CBU, titular, banco y alias (Ajustes → Pagos).
- [ ] Email de contacto: va en `STORE_INFO.email` (`lib/data/demo/settings.ts`)
      porque no tiene columna en `settings`.
- [ ] Planilla con el catálogo real: marcas, precios, talles, colores, stock
      y fotos.
- [ ] Cuenta de Mercado Pago del local con credenciales de producción.
- [ ] **Dominio** definido. El provisorio es `bicitiendamdq.com.ar`, en
      `store.siteUrl` (`lib/config.ts`) y en `SITE` de
      `scripts/emails/preview.ts`.
- [ ] Horario de turnos confirmado. Si cambia, actualizar también
      `openingHours` en `lib/config.ts` (schema.org).

### Cambios de código pendientes

- [ ] Ola 2 y Ola 3 cerradas y aprobadas por el usuario (ver el README).

## 1. Repo y proyecto en Vercel

1. El repo no tiene remoto. Crearlo privado, por ejemplo
   `gh repo create bicitienda-mdq --private --source . --push`.
2. Vercel → **Add New → Project** → importar el repo. Framework Next.js,
   comando de build por defecto (`next build`) e instalación con pnpm.
3. Desactivar los previews: Settings → Git → que solo deploye la rama de
   producción (`main`). Las variables se cargan solo en **Production**.
4. `vercel.json` ya fija la región `gru1` y el cron diario.
   `.vercelignore` deja afuera `.env*`, `.data`, el handoff y el tooling.

## 2. Base: Neon

1. En el proyecto: **Storage → Create Database → Neon** (plan free). Elegí
   la región **AWS São Paulo (`sa-east-1`)**, la más cerca de las funciones
   en `gru1`. Neon inyecta `DATABASE_URL` en el proyecto.
2. Traé la URL a local para los scripts: `vercel env pull .env.local`, o
   copiala a mano.
3. Corré las migraciones contra Neon (`0000` → `0011`):
   ```bash
   DATABASE_URL="postgres://…" pnpm db:migrate
   ```
   Con `DATABASE_URL` el script va a Neon. Sin ella iría a PGlite local. El
   auto-migrate de dev nunca toca Neon: en producción las migraciones se
   corren siempre a mano con este comando.

## 3. Seed inicial y catálogo real

`pnpm db:seed` carga categorías, contenido, textos, ajustes, plantillas de
WhatsApp, horarios, servicios y los **13 productos demo** del prototipo.
Además, en una base sin clientes carga la **operación demo**.

**No va a producción:**

- La operación demo: clientes, pedidos `BT-…`, turnos, presupuestos y la
  cuenta demo `juanperez@gmail.com`. Correr el seed **sin demo** (ver la
  sección 0). Si se corrió con demo por error, la base de Neon se puede
  vaciar y volver a migrar.
- Los 13 productos demo con fotos de Pexels.
- La marca placeholder "[Marca a confirmar]".

Cómo arrancar con el catálogo real:

1. Seed sin demo contra Neon (una sola vez):
   ```bash
   DATABASE_URL="postgres://…" pnpm db:seed --sin-demo
   ```
   El seed hace upsert sobre los ids del seed. Volver a correrlo pisa
   ajustes, textos y precios que el dueño haya editado: **no repetirlo en
   producción**.
2. Admin → Productos → **Importar** (`/admin/productos/importar`). Bajar la
   plantilla (`/admin/productos/plantilla`), completarla con el catálogo
   real y subirla. Antes de escribir muestra un preview con los errores de
   cada fila. El upsert es por `sku_producto` / `sku_variante`, el stock es
   absoluto y las marcas que no existen se crean.
3. Borrar los productos demo desde su editor (`/admin/productos/[id]`).
4. Ajustes: local, WhatsApp, pagos (CBU, titular, banco, alias, tope de
   cuotas, reservas), horarios de turnos, servicios y plantillas de WhatsApp.

## 4. Admin: PIN

```bash
pnpm admin:pin      # pide el PIN (6 dígitos o más, sin eco)
```

Imprime `ADMIN_PIN_HASH` y `ADMIN_SESSION_SECRET`: cargalos en Vercel
(Production). Sin el hash, en producción el login falla (el PIN `000000`
es solo de desarrollo). Cinco PIN incorrectos seguidos bloquean esa IP 15
minutos. Cambiar `ADMIN_SESSION_SECRET` cierra todas las sesiones.

Las cuentas de cliente usan otra cookie y otro secreto:
`CUSTOMER_SESSION_SECRET` (16 caracteres o más, por ejemplo
`openssl rand -hex 24`). Sin ella, en producción el login y el registro de
clientes fallan con "Falta CUSTOMER_SESSION_SECRET.". Cambiarla cierra las
sesiones de los clientes.

## 5. Imágenes: Cloudinary

1. Dashboard de Cloudinary → API Keys → "API environment variable" →
   `CLOUDINARY_URL` en Vercel y en `.env.local`.
2. Carpetas:
   - `bicitienda-mdq/demo/`: fotos demo de Pexels (`pnpm demo:images`).
     Solo las usa el seed demo.
   - `bicitienda/`: el `store.slug`. Ahí van `pnpm seed:images` (fotos del
     seed y logos), los uploads del admin (`bicitienda/uploads/…`) y los
     archivos privados, como comprobantes de transferencia y fotos de
     presupuestos (`bicitienda/privado/…`).
3. Si se suben logos o fotos del seed: `pnpm seed:images` y commitear
   `lib/data/image-manifest.json` (mergea, no borra las claves `pexels:*`).
4. Sin `CLOUDINARY_URL`, las fotos del admin y los comprobantes irían a
   `.data/uploads/`, que **en Vercel no persiste**. En producción es
   obligatoria.

## 6. Mails: Resend

1. Cuenta de Resend a nombre del cliente (el free alcanza).
2. **Verificar el dominio**: registros SPF y DKIM en el DNS.
3. Envs: `RESEND_API_KEY` y `MAIL_FROM`, por ejemplo
   `BiciTienda MDQ <pedidos@bicitiendamdq.com.ar>`. Sin `MAIL_FROM` el
   remitente es `pedidos@resend.dev`, que solo sirve para pruebas. Sin la
   key los mails van al outbox local: en producción tiene que estar.
4. Los links de los mails salen de `NEXT_PUBLIC_SITE_URL` (si falta, de
   `store.siteUrl`). Nunca apuntan a localhost en producción.

## 7. Pagos: Mercado Pago

1. https://www.mercadopago.com.ar/developers → Tus integraciones → crear
   la aplicación (Checkout Pro).
2. `MP_ACCESS_TOKEN`: primero el de prueba para el smoke test, después el
   de producción.
3. **Webhook**: en la aplicación → Webhooks, URL
   `https://<dominio>/api/mp/webhook`, evento **"Pagos"**. Copiar la clave
   secreta de firma a `MP_WEBHOOK_SECRET`. Sin token o sin secreto, el
   webhook responde 404 y los pagos no se concilian. Cada preferencia manda
   igual su `notification_url` y las `back_urls` a
   `/checkout/confirmacion/<numero>`, armadas con `NEXT_PUBLIC_SITE_URL`.
4. **Cuotas**: el tope de cuotas sin interés es `maxInstallments` en Admin →
   Ajustes → Pagos (1, 3, 6, 9 o 12; el seed trae 6). Viaja en la
   preferencia, y las cuotas que el cliente eligió se leen del pago al
   conciliar ("Mercado Pago · 6 cuotas"). Las cuotas sin interés también hay
   que activarlas en la cuenta de MP: la tienda solo pone el tope.
5. Un pedido con MP reserva el stock 60 minutos
   (`settings.onlineReservationMinutes`). Si vence y el pago llega tarde,
   el pedido se reactiva. Si el pedido ya estaba cancelado, queda un aviso
   "Pago tardío" en Admin → Consultas.
6. El sandbox `/checkout/pago-simulado` no se abre nunca con
   `VERCEL_ENV=production`, aunque haya quedado `PAYMENT_SANDBOX=1`. Sin
   credenciales, en producción Mercado Pago desaparece del checkout.

**Payway** (opcional): el core lo soporta (`lib/server/payway.ts`,
`/api/payway/webhook`). Para usarlo hay que poner
`features.payments.payway = true` en `lib/config.ts` y cargar `PAYWAY_ENV`,
`PAYWAY_SITE_ID`, `PAYWAY_PUBLIC_KEY`, `PAYWAY_PRIVATE_KEY` y
`PAYWAY_WEBHOOK_TOKEN`. La guía de Payway está en `rodar/DEPLOY.md`.

## 8. Sitio, cron y región

- `NEXT_PUBLIC_SITE_URL=https://<dominio>`, sin barra final. Define
  canonicals, sitemap, OG, links de los mails y del WhatsApp, y las URLs de
  Mercado Pago. Si falta, se usa `store.siteUrl`.
- `CRON_SECRET`: string largo aleatorio (`openssl rand -hex 24`).
  `vercel.json` agenda `GET /api/cron/diario` todos los días a las 09:00
  UTC (06:00 en Argentina). El plan Hobby permite un cron por día. El cron
  vence las reservas sin pago, devuelve el stock y manda el mail de
  "vencido". Vercel manda `Authorization: Bearer <CRON_SECRET>`. **Sin la
  variable, el endpoint responde 401 en producción** y el cron no hace
  nada. El barrido también corre al leer pedidos.
- Región: `gru1` (`vercel.json`). La base de Neon, en `sa-east-1`.

## 9. Dominio y DNS

1. Primer deploy: push a `main`. Revisar el build en Vercel.
2. Vercel → Domains: agregar el dominio (y `www` con redirect) y apuntar el
   DNS como indique Vercel (A o CNAME).
3. En el mismo DNS, los registros de Resend (SPF y DKIM).
4. Si el dominio final no es `bicitiendamdq.com.ar`: actualizar
   `store.siteUrl`, `NEXT_PUBLIC_SITE_URL` y la URL del webhook de MP, y
   redeployar.

## 10. Smoke test en producción

Con las credenciales de prueba de MP primero, y después una compra real
chica.

- [ ] **Mercado Pago**: compra con cuotas. El pedido aparece pagado en Admin
      → Pedidos con sus cuotas, el stock baja y llega el mail.
- [ ] **Transferencia**: 10% off, mail con CBU, titular, banco y alias,
      subir el comprobante en la confirmación y verlo en el admin. Confirmar
      a mano y avanzar hasta "Retirado".
- [ ] **Efectivo**: Paga en local → "Registrar pago y retiro" → Retirado.
- [ ] Cancelar un pedido: el stock vuelve y llega el mail.
- [ ] **Turno**: reservar desde `/turnos`, recibir el mail, reprogramar y
      cancelar desde el link o desde la cuenta. Verlo en Admin → Turnos.
- [ ] **Presupuesto**: pedirlo desde `/presupuesto`, cotizarlo en el admin,
      aceptarlo y crear el pedido. Llegan los mails de recibido y cotizado.
- [ ] **Cuenta**: registro, login y recupero de contraseña (el link llega
      por mail y sirve una sola vez).
- [ ] **Mails**: llegan desde el dominio verificado, no van a spam y
      **ningún link apunta a localhost**.
- [ ] `/admin`: sin sesión redirige al PIN, el PIN real entra y 5 errores
      bloquean.
- [ ] Una foto subida desde el admin queda con URL de Cloudinary.
- [ ] Un click en WhatsApp aparece en Admin → Consultas. El número es el
      real.
- [ ] `/checkout/pago-simulado` no ofrece pagar (sandbox cerrado).
- [ ] Cron: Vercel → Cron Jobs → correr `/api/cron/diario` a mano y ver
      `{"ok":true,…}`.
- [ ] `/sitemap.xml`, `robots.txt` y OG correctos al compartir un link.

## Variables de entorno

Salen de `.env.example` y de `grep -r "process.env" lib app`. Las que tienen
default (`NEXT_PUBLIC_SITE_URL`, `MAIL_FROM`, `DEV_SITE_URL`) no pueden
quedar **vacías**: o llevan valor o no se cargan.

| Variable | Qué hace | ¿Obligatoria en prod? |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | URL pública (`https://…`, sin barra). Canonicals, sitemap, OG, links de mails y WhatsApp, URLs de MP. | Sí (si falta usa `store.siteUrl`) |
| `DATABASE_URL` | Neon. Sin ella, PGlite local. | Sí |
| `ADMIN_PIN_HASH` | Hash scrypt del PIN (`pnpm admin:pin`) | Sí |
| `ADMIN_SESSION_SECRET` | Firma de la cookie del admin, 16 caracteres o más (`pnpm admin:pin`) | Sí |
| `CUSTOMER_SESSION_SECRET` | Firma de la cookie de las cuentas de cliente, 16 caracteres o más. También la genera `pnpm admin:pin`. | Sí (sin ella falla el login de clientes) |
| `CRON_SECRET` | Autoriza el cron diario `/api/cron/diario` | Sí (sin ella el cron da 401) |
| `CLOUDINARY_URL` | `cloudinary://key:secret@cloud`. Fotos y comprobantes. | Sí |
| `RESEND_API_KEY` | Envío de mails. Sin ella, outbox local. | Sí |
| `MAIL_FROM` | Remitente del dominio verificado | Sí (default `pedidos@resend.dev`, solo pruebas) |
| `MP_ACCESS_TOKEN` | Credencial de Mercado Pago (crea la preferencia y consulta los pagos) | Sí (sin ella MP no aparece en el checkout) |
| `MP_WEBHOOK_SECRET` | Clave de firma del webhook de MP | Sí (sin ella el webhook da 404) |
| `PAYWAY_ENV` · `PAYWAY_SITE_ID` · `PAYWAY_PUBLIC_KEY` · `PAYWAY_PRIVATE_KEY` · `PAYWAY_WEBHOOK_TOKEN` | Payway | No (apagado por flag) |
| `IG_APP_ID` · `IG_APP_SECRET` · `IG_REDIRECT_URI` · `IG_USER_ID` · `IG_TOKEN` | Instagram (heredado del core) | No (la tienda no lo usa) |
| `DEV_SITE_URL` | Origin de los links en dev (default `http://localhost:3100`). Se ignora en producción. | No |
| `PAYMENT_SANDBOX` | `1` abre el sandbox en un build local. Ignorada con `VERCEL_ENV=production`. | No (no cargarla) |
| `VERCEL_ENV` · `NODE_ENV` | Las pone Vercel o Next | Automáticas |
