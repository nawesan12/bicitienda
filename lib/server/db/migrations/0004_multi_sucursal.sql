CREATE TABLE "locations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"short_name" text NOT NULL,
	"address" text NOT NULL,
	"hours" text NOT NULL,
	"maps_url" text DEFAULT '' NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_stock" (
	"product_slug" text NOT NULL,
	"location_id" text NOT NULL,
	"qty" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "product_stock_product_slug_location_id_pk" PRIMARY KEY("product_slug","location_id")
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_slug" text NOT NULL,
	"location_id" text NOT NULL,
	"delta" integer NOT NULL,
	"qty_after" integer NOT NULL,
	"reason" text NOT NULL,
	"order_id" uuid,
	"actor" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "pickup_location_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "fulfillment_location_id" text;--> statement-breakpoint
ALTER TABLE "product_stock" ADD CONSTRAINT "product_stock_product_slug_products_slug_fk" FOREIGN KEY ("product_slug") REFERENCES "public"."products"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_stock" ADD CONSTRAINT "product_stock_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_pickup_location_id_locations_id_fk" FOREIGN KEY ("pickup_location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_fulfillment_location_id_locations_id_fk" FOREIGN KEY ("fulfillment_location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- ── Backfill (editado a mano) ─────────────────────────────────
-- En una base existente el stock vivía en products.stock y la dirección en
-- settings. Antes de tirar esas columnas: se crea una sucursal 'local' de
-- arranque (el seed la reconcilia con lib/config.ts) y el stock actual pasa
-- entero a esa sucursal, con su movimiento 'seed' en el libro.
INSERT INTO "locations" ("id", "name", "short_name", "address", "hours", "maps_url", "order", "active")
SELECT 'local',
       COALESCE((SELECT s."address" FROM "settings" s WHERE s."id" = 'main'), ''),
       COALESCE((SELECT s."address" FROM "settings" s WHERE s."id" = 'main'), ''),
       COALESCE((SELECT s."address" FROM "settings" s WHERE s."id" = 'main'), ''),
       COALESCE((SELECT s."hours" FROM "settings" s WHERE s."id" = 'main'), ''),
       '', 0, true
WHERE NOT EXISTS (SELECT 1 FROM "locations");--> statement-breakpoint
INSERT INTO "product_stock" ("product_slug", "location_id", "qty")
SELECT p."slug",
       (SELECT l."id" FROM "locations" l WHERE l."active" ORDER BY l."order", l."id" LIMIT 1),
       p."stock"
FROM "products" p
WHERE NOT EXISTS (
  SELECT 1 FROM "product_stock" ps WHERE ps."product_slug" = p."slug"
);--> statement-breakpoint
INSERT INTO "stock_movements" ("product_slug", "location_id", "delta", "qty_after", "reason")
SELECT ps."product_slug", ps."location_id", ps."qty", ps."qty", 'seed'
FROM "product_stock" ps
WHERE ps."qty" > 0
  AND NOT EXISTS (SELECT 1 FROM "stock_movements");--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "stock";--> statement-breakpoint
ALTER TABLE "settings" DROP COLUMN "address";--> statement-breakpoint
ALTER TABLE "settings" DROP COLUMN "hours";