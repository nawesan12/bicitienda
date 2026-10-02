CREATE TABLE "stock_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_slug" text NOT NULL,
	"email" text NOT NULL,
	"notified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "deposit_min_total" integer DEFAULT 2000000 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "stock_alerts_slug_email" ON "stock_alerts" USING btree ("product_slug","email");