# tienda-starter

Plantilla base de la fábrica de tiendas. **No se edita a mano**: se regenera
desde la tienda de referencia (`rodar/`, su HEAD commiteado) con
`./factory/bin/tiendas make-starter`. Para crear una tienda real, desde la
raíz de `tiendas/`:

```bash
./factory/bin/tiendas new-store <slug> "<Marca>" [--theme base|carbono|editorial|rio]
```

Stack: Next.js 16 + Tailwind 4 · Drizzle sobre Neon Postgres (PGlite en
local) · Cloudinary para imágenes · admin con PIN · Payway (o Mercado Pago)
· Resend · Instagram Login. Todo corre en local sin credenciales.

## Qué es cada cosa

**CAPA POR TIENDA** — lo único que se toca al crear una tienda:

| Archivo | Qué define |
|---|---|
| `lib/config.ts` | `slug`, marca, WhatsApp, alias, recargos, seña, sucursales, zona horaria, horarios schema.org, `features` (módulos, `payments` payway/mp, secciones `admin`), `routes` |
| `app/theme.css` + `app/fonts.ts` | Identidad: tokens `@theme` y par tipográfico display/UI |
| `app/layout.tsx` | Metadata y SEO del sitio |
| `lib/data/catalog.ts` | Seed: marcas, categorías (`label`, `single`, `sub`, `home`, `pathSlug`) y productos |
| `lib/data/content.ts` | `lexicon` (copy de rubro de la web, `admin` y `commerce`), seed de `content` (hero, nosotros, service, beneficios, galería, recomendaciones del test), notas, agenda, mensajes de WhatsApp, etiquetas de consultas |
| `lib/data/texts.ts` | `TEXTS`: textos sueltos editables desde /admin → Contenido (seed); `TEXT_GROUPS` arma ese formulario |
| `lib/data/image-manifest.json` | Path local → URL de Cloudinary. Arranca `{}`; lo escribe `pnpm seed:images` |
| `lib/advisor.ts` | Preguntas, perfiles y `pickKey` del test "¿Cuál es para mí?" (qué producto recomienda cada perfil es contenido: `content.test`) |
| `public/brand/` + `public/products/` | Logos (`logo-white.png`, `logo-black.png`) y fotos del seed |
| `app/icon.png` · `apple-icon` · `opengraph-image` · `twitter-image` | Íconos y OG de la marca |
| `.env.example` | Variables de entorno (todas opcionales en local) |

**CORE** — todo el resto (`app/` rutas, `components/`, `lib/` salvo lo de
arriba, `lib/server/`, `emails/`, `scripts/`, migraciones). Si encontrás un
bug o mejora del core, arreglalo en la tienda de referencia (`rodar/`) y
regenerá el starter: así lo heredan las tiendas nuevas.

## Scripts

| Script | Qué hace |
|---|---|
| `pnpm dev` / `pnpm build` | Next |
| `pnpm lint` | ESLint |
| `pnpm db:migrate` | Corre las migraciones (`lib/server/db/migrations`) contra Neon si hay `DATABASE_URL`, si no contra PGlite en `.data/pglite` |
| `pnpm db:seed` | Puebla la base desde la capa por tienda (idempotente) |
| `pnpm db:generate` | Genera una migración nueva desde el schema (drizzle-kit) |
| `pnpm db:studio` | Explorador de la base |
| `pnpm admin:pin` | Genera `ADMIN_PIN_HASH` + `ADMIN_SESSION_SECRET` (acceso al admin) |
| `pnpm optimize:images` | Originales de `public/products/src/` → WebP optimizados en `public/products/` |
| `pnpm seed:images` | Sube fotos del seed y logos a Cloudinary (carpeta `<slug>/`) y escribe `image-manifest.json` (`--dry-run` para probar; `--pdf` suma el PDF del catálogo) |

## Flujo de una tienda nueva

1. `./factory/bin/tiendas new-store mitienda "Mi Tienda" --theme editorial`
2. `cd mitienda && pnpm install` (pnpm comparte las libs entre todas las
   tiendas: una sola copia física en disco)
3. `pnpm db:migrate && pnpm db:seed && pnpm dev` — admin en `/admin` con el
   PIN `000000` (solo en desarrollo, sin `ADMIN_PIN_HASH`).
4. Editá la capa por tienda (tabla de arriba) con la identidad, el copy y el
   catálogo reales. Cambios en el seed → `pnpm db:seed` de nuevo.
5. Fotos: originales a `public/products/src/` → `pnpm optimize:images`.
   Para producción, con `CLOUDINARY_URL`: `pnpm seed:images` (commiteá el
   manifest) y después `pnpm db:seed`.
6. `pnpm build` para verificar, y deploy a Vercel cuando esté aprobada
   (Neon desde el Marketplace de Vercel, envs de `.env.example`,
   `pnpm db:migrate && pnpm db:seed` contra Neon). La guía completa de
   deploy es la de la tienda de referencia: `rodar/DEPLOY.md`.

## Sin credenciales (modo local)

| Pieza | Sin env | Con env |
|---|---|---|
| Base | PGlite en `.data/pglite` | Neon (`DATABASE_URL`) |
| Admin | PIN `000000` en dev | `ADMIN_PIN_HASH` + `ADMIN_SESSION_SECRET` |
| Imágenes | `public/` y uploads en `.data/uploads/` | Cloudinary (`CLOUDINARY_URL`) |
| Pagos | Sandbox local `/checkout/pago-simulado` | Payway (`PAYWAY_*`) o Mercado Pago (`MP_*`) |
| Emails | Outbox en `.data/outbox/` | Resend |
| Instagram | Placeholders (`igSlots`) | Botón "Conectar Instagram" en Admin → Ajustes (`IG_APP_ID`/`IG_APP_SECRET`/`IG_REDIRECT_URI`) |

## Multi-sucursal

El starter viene con **dos sucursales de ejemplo** en `store.locations`
(`lib/config.ts`): "Central" y "Puerto", con `features.admin.locations`
prendido. La **primera de la lista es la principal**: todo el stock del seed
entra ahí, y desde el admin se reparte entre sucursales (cada movimiento
queda asentado en el libro de movimientos). Una tienda de un solo local
deja una sola entrada y apaga `features.admin.locations`.

## Rutas públicas

Los paths públicos de las secciones de rubro salen de `routes` en
`lib/config.ts`. El starter usa los neutros — **`/catalogo`** y
**`/comunidad`** — que son las carpetas reales del core, así que no hace
falta ningún rewrite. Una tienda puede definir otros (`/productos`,
`/club`…) y `next.config` genera solo el **rewrite** hacia la ruta interna
más el **redirect** inverso. Los links del core siempre pasan por
`lib/paths.ts`: nunca hardcodeés estos paths.

La marca placeholder es **"Faro"**: si ves "Faro" o `faro` en algo publicado,
falta reemplazar un valor de la capa por tienda.
