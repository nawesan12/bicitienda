CREATE TABLE "appointment_services" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"duration_min" integer DEFAULT 30 NOT NULL,
	"price_note" text DEFAULT '' NOT NULL,
	"allows_product" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appointment_slots" (
	"starts_at" timestamp with time zone PRIMARY KEY NOT NULL,
	"booked" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" text NOT NULL,
	"customer_id" uuid NOT NULL,
	"account_id" uuid,
	"service_id" text NOT NULL,
	"product_slug" text,
	"variant_id" text,
	"starts_at" timestamp with time zone NOT NULL,
	"duration_min" integer NOT NULL,
	"status" text NOT NULL,
	"source" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"internal_note" text DEFAULT '' NOT NULL,
	"manage_token" text NOT NULL,
	"rescheduled_from_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "appointments_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "customer_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"session_version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone,
	CONSTRAINT "customer_accounts_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "password_resets" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"account_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" text PRIMARY KEY NOT NULL,
	"product_slug" text NOT NULL,
	"size" text DEFAULT 'Único' NOT NULL,
	"color" text DEFAULT '' NOT NULL,
	"height_range" text,
	"sku" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "product_variants_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "quote_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"quote_id" uuid NOT NULL,
	"name" text NOT NULL,
	"price" integer NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"product_slug" text,
	"variant_id" text,
	"order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" text NOT NULL,
	"kind" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"detail" text NOT NULL,
	"for_bike" text DEFAULT '' NOT NULL,
	"budget" text DEFAULT '' NOT NULL,
	"photos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"customer_id" uuid NOT NULL,
	"account_id" uuid,
	"status" text DEFAULT 'nuevo' NOT NULL,
	"eta" text DEFAULT '' NOT NULL,
	"valid_until" date,
	"order_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quote_requests_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "schedule_blocks" (
	"id" serial PRIMARY KEY NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedule_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"weekday" integer NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"trigger" text DEFAULT '' NOT NULL,
	"body" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ALTER COLUMN "product_slug" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "parent_slug" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "account_id" uuid;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "variant_id" text;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "variant_label" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "transfer_receipt_url" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "account_id" uuid;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "quote_id" uuid;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "sku" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "rodado" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "test_ride" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "hide_when_out" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "status" text DEFAULT 'publicado' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "online_reservation_minutes" integer DEFAULT 60 NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "cash_reservation_hours" integer;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "cash_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "max_installments" integer DEFAULT 6 NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "slot_minutes" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "slot_capacity" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "min_notice_min" integer DEFAULT 120 NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "max_days_ahead" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "auto_confirm_appointments" boolean DEFAULT true NOT NULL;--> statement-breakpoint
-- Variantes: cada producto existente recibe una variante "Único" (id =
-- slug + "--u") y su stock/libro se mudan a ella, sin pérdida.
INSERT INTO "product_variants" ("id", "product_slug", "size", "color", "sku", "order", "active")
SELECT "slug" || '--u', "slug", 'Único', '', upper("slug") || '-U', 0, true FROM "products";--> statement-breakpoint
ALTER TABLE "product_stock" ADD COLUMN "variant_id" text;--> statement-breakpoint
UPDATE "product_stock" SET "variant_id" = "product_slug" || '--u';--> statement-breakpoint
ALTER TABLE "product_stock" ALTER COLUMN "variant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "product_stock" DROP CONSTRAINT "product_stock_product_slug_location_id_pk";--> statement-breakpoint
ALTER TABLE "product_stock" ADD CONSTRAINT "product_stock_variant_id_location_id_pk" PRIMARY KEY("variant_id","location_id");--> statement-breakpoint
ALTER TABLE "stock_movements" ADD COLUMN "variant_id" text;--> statement-breakpoint
UPDATE "stock_movements" SET "variant_id" = "product_slug" || '--u';--> statement-breakpoint
ALTER TABLE "stock_movements" ALTER COLUMN "variant_id" SET NOT NULL;--> statement-breakpoint
UPDATE "order_items" SET "variant_id" = "product_slug" || '--u' WHERE "product_slug" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_account_id_customer_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."customer_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_service_id_appointment_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."appointment_services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_account_id_customer_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."customer_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_slug_products_slug_fk" FOREIGN KEY ("product_slug") REFERENCES "public"."products"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_lines" ADD CONSTRAINT "quote_lines_quote_id_quote_requests_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quote_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_account_id_customer_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."customer_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appointments_starts_idx" ON "appointments" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "appointments_customer_idx" ON "appointments" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "password_resets_account_idx" ON "password_resets" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_variants_combo" ON "product_variants" USING btree ("product_slug","size","color");--> statement-breakpoint
CREATE INDEX "product_variants_product_idx" ON "product_variants" USING btree ("product_slug");--> statement-breakpoint
CREATE INDEX "quote_requests_created_idx" ON "quote_requests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "schedule_blocks_starts_idx" ON "schedule_blocks" USING btree ("starts_at");--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_slug_categories_slug_fk" FOREIGN KEY ("parent_slug") REFERENCES "public"."categories"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_account_id_customer_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."customer_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_account_id_customer_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."customer_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_stock" ADD CONSTRAINT "product_stock_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "customers_phone_unique" ON "customers" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "customers_email_idx" ON "customers" USING btree ("email");--> statement-breakpoint
CREATE INDEX "product_stock_product_idx" ON "product_stock" USING btree ("product_slug");--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_sku_unique" UNIQUE("sku");