CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ts" timestamp DEFAULT now() NOT NULL,
	"type" text NOT NULL,
	"label" text NOT NULL,
	"detail" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'nueva' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "texts" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- (editado a mano) categories.name pasa a ser label: se renombra para no
-- perder los nombres editados.
ALTER TABLE "categories" RENAME COLUMN "name" TO "label";--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "single" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "sub" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "home" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "img_product_id" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "stock_override" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "custom" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "address" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "hours" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "maps_url" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "r3" real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "r6" real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "venta_online" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "ig_token" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "ig_token_expires_at" timestamp;--> statement-breakpoint
CREATE INDEX "leads_ts_idx" ON "leads" USING btree ("ts");--> statement-breakpoint
-- ── Backfill (editado a mano) ─────────────────────────────────
-- Singular de las tarjetas: el plural en mayúsculas hasta que el seed (o el
-- admin) cargue el real.
UPDATE "categories" SET "single" = upper("label") WHERE "single" = '';--> statement-breakpoint
-- Destacados: todo producto con rank queda destacado (el orden pasa a ser
-- el del catálogo).
UPDATE "products" SET "featured" = true WHERE "featured_rank" IS NOT NULL;--> statement-breakpoint
-- El descuento por transferencia pasa de fracción (0.05) a porcentaje
-- entero como el `dto` del handoff (5). La guarda lo hace idempotente.
UPDATE "settings" SET "transfer_discount" = "transfer_discount" * 100 WHERE "transfer_discount" > 0 AND "transfer_discount" < 1;--> statement-breakpoint
-- Dirección, horario y Maps visibles vuelven a settings (editables desde
-- Ajustes): arrancan con los de la sucursal principal.
UPDATE "settings" s SET
  "address" = l."address",
  "hours" = l."hours",
  "maps_url" = l."maps_url"
FROM (
  SELECT "address", "hours", "maps_url" FROM "locations"
  WHERE "active" ORDER BY "order", "id" LIMIT 1
) l
WHERE s."address" = '';--> statement-breakpoint
ALTER TABLE "categories" DROP COLUMN "tagline";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "featured_rank";--> statement-breakpoint
ALTER TABLE "settings" DROP COLUMN "installments";--> statement-breakpoint
ALTER TABLE "settings" DROP COLUMN "modo_installments";--> statement-breakpoint
ALTER TABLE "settings" DROP COLUMN "tienda_nube_url";--> statement-breakpoint
ALTER TABLE "settings" DROP COLUMN "link_tienda";